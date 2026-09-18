import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Activity } from './entities/activity.entity';
import { Member } from '../members/entities/member.entity';
import { Fine, FineStatus } from './entities/fine.entity';
import { FineType, FineTypeCode } from './entities/fine-type.entity';
import { ControlAttendanceDto } from './dto/attendance.dto';

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

  async saveInitialControl(
    activityId: string,
    dto: ControlAttendanceDto,
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
    const existing = await this.attendanceRepo.find({
      where: { activity_id: activityId },
    });
    const existingMap = new Map(existing.map((a) => [a.member_id, a]));

    let presentAtStart = 0;
    let absentAtStart = 0;

    for (const member of members) {
      const isPresent = presentIds.has(member.id);
      const attendance =
        existingMap.get(member.id) ??
        this.attendanceRepo.create({
          activity_id: activityId,
          member_id: member.id,
        });

      attendance.present_at_start = isPresent;
      attendance.checked_at_start = isPresent ? now : null;
      attendance.status = this.calculateStatus(attendance);
      await this.attendanceRepo.save(attendance);

      if (isPresent) presentAtStart++;
      else absentAtStart++;
    }

    activity.initial_control_at = now;
    await this.activityRepo.save(activity);

    return {
      processed: members.length,
      presentAtStart,
      absentAtStart,
      recordedAt: now,
    };
  }

  async saveFinalControl(
    activityId: string,
    dto: ControlAttendanceDto,
  ): Promise<{
    processed: number;
    presentAtEnd: number;
    absentAtEnd: number;
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
    const members = await this.memberRepo.find({
      select: ['id'],
    });

    const now = new Date();
    const existing = await this.attendanceRepo.find({
      where: { activity_id: activityId },
    });
    const existingMap = new Map(existing.map((a) => [a.member_id, a]));

    let presentAtEnd = 0;
    let absentAtEnd = 0;
    let finesGenerated = 0;
    let finesReconciled = 0;

    for (const member of members) {
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
      attendance.status = this.calculateStatus(attendance);
      await this.attendanceRepo.save(attendance);

      if (isPresent) presentAtEnd++;
      else absentAtEnd++;

      const generated = await this.reconcileFines(activity, attendance);
      if (generated.fineCreated) finesGenerated++;
      if (generated.pendingCancelled) finesReconciled++;
    }

    activity.final_control_at = now;
    await this.activityRepo.save(activity);

    return {
      processed: members.length,
      presentAtEnd,
      absentAtEnd,
      finesGenerated,
      finesReconciled,
      recordedAt: now,
    };
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

  private async getAutoFineTypeMap(): Promise<Map<FineTypeCode, FineType>> {
    const types = await this.fineTypeRepo.find({ where: { is_active: true } });
    const map = new Map<FineTypeCode, FineType>();
    for (const type of types) {
      if (
        [
          FineTypeCode.ABSENT_START,
          FineTypeCode.ABSENT_END,
          FineTypeCode.ABSENT_BOTH,
        ].includes(type.code)
      ) {
        map.set(type.code, type);
      }
    }
    return map;
  }

  private async reconcileFines(
    activity: Activity,
    attendance: Attendance,
  ): Promise<{ fineCreated: boolean; pendingCancelled: boolean }> {
    const autoTypes = await this.getAutoFineTypeMap();

    const pending = await this.fineRepo.find({
      where: {
        member_id: attendance.member_id,
        activity_id: activity.id,
        status: FineStatus.PENDING,
      },
    });
    const autoIds = new Set([...autoTypes.values()].map((t) => t.id));
    const pendingAuto = pending.filter((f) => autoIds.has(f.fine_type_id));

    for (const fine of pendingAuto) {
      fine.status = FineStatus.CANCELLED;
      fine.notes = fine.notes
        ? `${fine.notes} (anulada por regrabación del control)`
        : 'Anulada por regrabación del control';
      await this.fineRepo.save(fine);
    }

    if (attendance.status === AttendanceStatus.PRESENT) {
      return {
        fineCreated: false,
        pendingCancelled: pendingAuto.length > 0,
      };
    }

    const fineTypeCode = this.getFineTypeCode(attendance.status);
    const fineType = fineTypeCode ? autoTypes.get(fineTypeCode) : undefined;
    if (!fineType) {
      return {
        fineCreated: false,
        pendingCancelled: pendingAuto.length > 0,
      };
    }

    const fine = this.fineRepo.create({
      member_id: attendance.member_id,
      activity_id: activity.id,
      fine_type_id: fineType.id,
      amount: fineType.amount,
      notes: `Asistencia: ${
        attendance.present_at_start ? 'presente' : 'ausente'
      } al inicio, ${attendance.present_at_end ? 'presente' : 'ausente'} al final`,
    });
    await this.fineRepo.save(fine);

    return {
      fineCreated: true,
      pendingCancelled: pendingAuto.length > 0,
    };
  }

  private getFineTypeCode(status: AttendanceStatus): FineTypeCode | null {
    switch (status) {
      case AttendanceStatus.ABSENT_START:
        return FineTypeCode.ABSENT_START;
      case AttendanceStatus.ABSENT_BOTH:
        return FineTypeCode.ABSENT_BOTH;
      case AttendanceStatus.ABSENT_END:
        return FineTypeCode.ABSENT_END;
      default:
        return null;
    }
  }
}
