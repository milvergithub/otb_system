import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Attendance,
  AttendanceResult,
  AttendanceStatus,
} from './entities/attendance.entity';
import { Activity } from './entities/activity.entity';
import { Member } from '../members/entities/member.entity';
import { Fine, FineSource, FineStatus } from './entities/fine.entity';
import { FineType, FineTypeAppliesTo } from './entities/fine-type.entity';
import {
  ActivityAttendanceSession,
  AttendanceSessionType,
} from './entities/activity-attendance-session.entity';
import {
  ControlAttendanceDto,
  BulkAttendanceDto,
  BulkAttendanceSession,
  BulkAttendanceStatus,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Fine)
    private readonly fineRepo: Repository<Fine>,
    @InjectRepository(FineType)
    private readonly fineTypeRepo: Repository<FineType>,
    @InjectRepository(ActivityAttendanceSession)
    private readonly sessionRepo: Repository<ActivityAttendanceSession>,
  ) {}

  async findByActivity(activityId: string): Promise<Attendance[]> {
    const activity = await this.activityRepo.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');

    return this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.member', 'member')
      .where('a.activity_id = :activityId', { activityId })
      .orderBy('member.last_name', 'ASC')
      .addOrderBy('member.first_name', 'ASC')
      .getMany();
  }

  /**
   * Upserts the session row for a control so re-saving a control updates the
   * same session instead of leaving duplicates behind. The first actor to open
   * the control is preserved as the session owner.
   */
  private async recordSession(
    activityId: string,
    type: AttendanceSessionType,
    now: Date,
    userId?: string,
  ): Promise<void> {
    const existing = await this.sessionRepo.findOne({
      where: { activity_id: activityId, type },
    });
    if (existing) {
      existing.ended_at = now;
      existing.ended_by_user_id = userId ?? existing.ended_by_user_id;
      await this.sessionRepo.save(existing);
      return;
    }
    await this.sessionRepo.save(
      this.sessionRepo.create({
        activity_id: activityId,
        type,
        started_at: now,
        ended_at: now,
        started_by_user_id: userId ?? null,
        ended_by_user_id: userId ?? null,
      }),
    );
  }

  async saveInitialControl(
    activityId: string,
    dto: ControlAttendanceDto,
    userId?: string,
    /** When provided, only these members are evaluated (used by the bulk
     * endpoint). Members left out keep their current value instead of being
     * marked as absent. */
    memberIdsInScope?: string[],
  ): Promise<{
    processed: number;
    presentAtStart: number;
    absentAtStart: number;
    recordedAt: Date;
  }> {
    const activity = await this.activityRepo.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.final_control_at) {
      throw new BadRequestException(
        'El control inicial no puede modificarse una vez realizado el control final',
      );
    }

    const presentIds = new Set(dto.memberIds);
    const members = await this.memberRepo.find({
      select: ['id'],
    });

    const now = new Date();
    await this.recordSession(
      activityId,
      AttendanceSessionType.INITIAL,
      now,
      userId,
    );
    const existing = await this.attendanceRepo.find({
      where: { activity_id: activityId },
    });
    const existingMap = new Map(existing.map((a) => [a.member_id, a]));
    const inScope = memberIdsInScope
      ? members.filter((m) => memberIdsInScope.includes(m.id))
      : members;

    let presentAtStart = 0;
    let absentAtStart = 0;

    for (const member of inScope) {
      const isPresent = presentIds.has(member.id);
      const attendance =
        existingMap.get(member.id) ??
        this.attendanceRepo.create({
          activity_id: activityId,
          member_id: member.id,
        });

      attendance.present_at_start = isPresent;
      attendance.checked_at_start = isPresent ? now : null;
      attendance.initial_marked_at = now;
      attendance.initial_marked_by_user_id = userId ?? null;
      attendance.status = this.calculateStatus(attendance);
      await this.attendanceRepo.save(attendance);

      if (isPresent) presentAtStart++;
      else absentAtStart++;
    }

    activity.initial_control_at = now;
    await this.activityRepo.save(activity);

    return {
      processed: inScope.length,
      presentAtStart,
      absentAtStart,
      recordedAt: now,
    };
  }

  async saveFinalControl(
    activityId: string,
    dto: ControlAttendanceDto,
    userId?: string,
    /** See saveInitialControl: restricts the evaluation to the given members. */
    memberIdsInScope?: string[],
  ): Promise<{
    processed: number;
    presentAtEnd: number;
    absentAtEnd: number;
    /** Absences that were excused, reported apart so the UI does not label
     * them as real absences. */
    excusedAtEnd: number;
    finesGenerated: number;
    finesReconciled: number;
    recordedAt: Date;
  }> {
    const activity = await this.activityRepo.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (!activity.initial_control_at) {
      throw new BadRequestException(
        'Debe realizarse primero el control de asistencia inicial',
      );
    }

    const presentIds = new Set(dto.memberIds);
    const excusedIds = new Set(dto.excusedMemberIds ?? []);
    const members = await this.memberRepo.find({
      select: ['id'],
    });

    const now = new Date();
    await this.recordSession(
      activityId,
      AttendanceSessionType.FINAL,
      now,
      userId,
    );
    const existing = await this.attendanceRepo.find({
      where: { activity_id: activityId },
    });
    const existingMap = new Map(existing.map((a) => [a.member_id, a]));

    const inScope = memberIdsInScope
      ? members.filter((m) => memberIdsInScope.includes(m.id))
      : members;

    let presentAtEnd = 0;
    let absentAtEnd = 0;
    let excusedAtEnd = 0;
    let finesGenerated = 0;
    let finesReconciled = 0;

    for (const member of inScope) {
      const isPresent = presentIds.has(member.id);
      const attendance =
        existingMap.get(member.id) ??
        this.attendanceRepo.create({
          activity_id: activityId,
          member_id: member.id,
          present_at_start: false,
        });

      attendance.present_at_end = isPresent;
      attendance.checked_at_end = isPresent ? now : null;
      attendance.final_marked_at = now;
      attendance.final_marked_by_user_id = userId ?? null;
      attendance.status = this.calculateStatus(attendance);
      attendance.result = excusedIds.has(member.id)
        ? AttendanceResult.EXCUSED
        : this.calculateResult(attendance);
      await this.attendanceRepo.save(attendance);

      if (isPresent) presentAtEnd++;
      else if (excusedIds.has(member.id)) excusedAtEnd++;
      else absentAtEnd++;

      const generated = await this.reconcileFines(
        activity,
        attendance,
        userId,
        now,
      );
      if (generated.fineCreated) finesGenerated++;
      if (generated.pendingCancelled) finesReconciled++;
    }

    activity.final_control_at = now;
    await this.activityRepo.save(activity);

    return {
      processed: inScope.length,
      presentAtEnd,
      absentAtEnd,
      excusedAtEnd,
      finesGenerated,
      finesReconciled,
      recordedAt: now,
    };
  }

  /**
   * Bulk upsert of one attendance control. Accepts an explicit per-member status
   * so a single request can record the whole activity (hundreds of members)
   * instead of one request per member, and delegates to the same transactional
   * path used by the initial/final control flows.
   */
  async saveBulk(activityId: string, dto: BulkAttendanceDto, userId?: string) {
    const memberIds = dto.attendance
      .filter((entry) => entry.status === BulkAttendanceStatus.PRESENT)
      .map((entry) => entry.memberId);
    const excusedMemberIds = dto.attendance
      .filter((entry) => entry.status === BulkAttendanceStatus.EXCUSED)
      .map((entry) => entry.memberId);

    const control: ControlAttendanceDto = {
      memberIds,
      excusedMemberIds,
    };
    const memberIdsInScope = dto.attendance.map((entry) => entry.memberId);

    return dto.session === BulkAttendanceSession.INITIAL
      ? this.saveInitialControl(activityId, control, userId, memberIdsInScope)
      : this.saveFinalControl(activityId, control, userId, memberIdsInScope);
  }

  async findAll(
    filters: { memberId?: string; activityId?: string; status?: string } = {},
  ): Promise<Attendance[]> {
    const query = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.member', 'member')
      .leftJoinAndSelect('a.activity', 'activity');

    if (filters.memberId) {
      query.andWhere('a.member_id = :memberId', { memberId: filters.memberId });
    }
    if (filters.activityId) {
      query.andWhere('a.activity_id = :activityId', {
        activityId: filters.activityId,
      });
    }
    if (filters.status) {
      query.andWhere('a.status = :status', { status: filters.status });
    }

    query.orderBy('activity.date', 'DESC');

    return query.getMany();
  }

  async getMemberAttendanceSummary(
    memberId: string,
    activityId: string,
  ): Promise<{
    total: number;
    present: number;
    absentStart: number;
    absentEnd: number;
    absentBoth: number;
  }> {
    const result = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.member_id = :memberId', { memberId })
      .andWhere('a.activity_id = :activityId', { activityId })
      .groupBy('a.status')
      .getRawMany();

    const summary = {
      total: 0,
      present: 0,
      absentStart: 0,
      absentEnd: 0,
      absentBoth: 0,
    };

    for (const row of result) {
      const count = parseInt(row.count, 10);
      summary.total += count;
      switch (row.status) {
        case AttendanceStatus.PRESENT:
          summary.present = count;
          break;
        case AttendanceStatus.ABSENT_START:
          summary.absentStart = count;
          break;
        case AttendanceStatus.ABSENT_END:
          summary.absentEnd = count;
          break;
        case AttendanceStatus.ABSENT_BOTH:
          summary.absentBoth = count;
          break;
      }
    }

    return summary;
  }

  private calculateResult(attendance: Attendance): AttendanceResult {
    if (attendance.present_at_start && attendance.present_at_end) {
      return AttendanceResult.PRESENT;
    }
    if (!attendance.present_at_start && attendance.present_at_end) {
      return AttendanceResult.LATE;
    }
    if (attendance.present_at_start && !attendance.present_at_end) {
      return AttendanceResult.LEFT_EARLY;
    }
    return AttendanceResult.ABSENT;
  }

  private calculateStatus(attendance: Attendance): AttendanceStatus {
    if (attendance.present_at_start && attendance.present_at_end) {
      return AttendanceStatus.PRESENT;
    }
    if (!attendance.present_at_start && attendance.present_at_end) {
      return AttendanceStatus.ABSENT_START;
    }
    if (attendance.present_at_start && !attendance.present_at_end) {
      return AttendanceStatus.ABSENT_END;
    }
    return AttendanceStatus.ABSENT_BOTH;
  }

  private async getAutoFineTypeMap(): Promise<
    Map<FineTypeAppliesTo, FineType>
  > {
    const types = await this.fineTypeRepo.find({ where: { is_active: true } });
    const map = new Map<FineTypeAppliesTo, FineType>();
    for (const type of types) {
      if (
        type.applies_to &&
        [
          FineTypeAppliesTo.ABSENT,
          FineTypeAppliesTo.LATE,
          FineTypeAppliesTo.LEFT_EARLY,
        ].includes(type.applies_to)
      ) {
        map.set(type.applies_to, type);
      }
    }
    return map;
  }

  private async reconcileFines(
    activity: Activity,
    attendance: Attendance,
    userId?: string,
    now = new Date(),
  ): Promise<{ fineCreated: boolean; pendingCancelled: boolean }> {
    const autoTypes = await this.getAutoFineTypeMap();

    const pending = await this.fineRepo.find({
      where: {
        member_id: attendance.member_id,
        activity_id: activity.id,
        status: FineStatus.PENDING,
        source: FineSource.ATTENDANCE,
      },
    });
    const autoIds = new Set([...autoTypes.values()].map((t) => t.id));
    const pendingAuto = pending.filter(
      (f) => autoIds.has(f.fine_type_id) || f.attendance_id,
    );

    const result = attendance.result;
    const appliesTo =
      result === AttendanceResult.LATE
        ? FineTypeAppliesTo.LATE
        : result === AttendanceResult.LEFT_EARLY
          ? FineTypeAppliesTo.LEFT_EARLY
          : result === AttendanceResult.ABSENT
            ? FineTypeAppliesTo.ABSENT
            : null;

    if (!appliesTo) {
      for (const fine of pendingAuto) {
        fine.status = FineStatus.CANCELLED;
        fine.notes = fine.notes
          ? `${fine.notes} (anulada por regrabación del control)`
          : 'Anulada por regrabación del control';
        await this.fineRepo.save(fine);
      }
      return { fineCreated: false, pendingCancelled: pendingAuto.length > 0 };
    }

    const targetType = autoTypes.get(appliesTo);
    if (!targetType) {
      return { fineCreated: false, pendingCancelled: pendingAuto.length > 0 };
    }

    const existingSame = pendingAuto.find(
      (f) => f.fine_type_id === targetType.id,
    );
    let pendingCancelled = 0;
    for (const fine of pendingAuto) {
      if (fine === existingSame) continue;
      fine.status = FineStatus.CANCELLED;
      fine.notes = fine.notes
        ? `${fine.notes} (anulada por regrabación del control)`
        : 'Anulada por regrabación del control';
      await this.fineRepo.save(fine);
      pendingCancelled++;
    }

    if (existingSame) {
      return { fineCreated: false, pendingCancelled: pendingCancelled > 0 };
    }

    const fine = this.fineRepo.create({
      member_id: attendance.member_id,
      activity_id: activity.id,
      attendance_id: attendance.id,
      fine_type_id: targetType.id,
      amount: targetType.amount,
      source: FineSource.ATTENDANCE,
      created_by_user_id: userId ?? null,
      issued_at: now,
      notes: `Asistencia: ${
        attendance.present_at_start ? 'presente' : 'ausente'
      } al inicio, ${attendance.present_at_end ? 'presente' : 'ausente'} al final`,
    });
    await this.fineRepo.save(fine);

    return { fineCreated: true, pendingCancelled: pendingCancelled > 0 };
  }
}
