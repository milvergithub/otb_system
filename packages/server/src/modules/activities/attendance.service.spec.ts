import { AttendanceService } from './attendance.service';

import { Attendance, AttendanceResult } from './entities/attendance.entity';
import { Fine, FineSource, FineStatus } from './entities/fine.entity';
import { FineType, FineTypeAppliesTo } from './entities/fine-type.entity';

type ServiceInternals = {
  saveBulk(
    activityId: string,
    dto: {
      session: 'initial' | 'final';
      attendance: {
        memberId: string;
        status: 'present' | 'absent' | 'excused';
      }[];
    },
    userId?: string,
  ): Promise<{ processed: number; excusedAtEnd?: number }>;
};

type Internals = {
  calculateResult(attendance: Attendance): AttendanceResult;
  getAutoFineTypeMap(): Promise<Map<FineTypeAppliesTo, FineType>>;
  reconcileFines(
    activity: { id: string },
    attendance: Attendance,
    userId?: string,
    now?: Date,
  ): Promise<{ fineCreated: boolean; pendingCancelled: boolean }>;
};

function attendanceWith(
  presentAtStart: boolean,
  presentAtEnd: boolean,
): Attendance {
  return {
    id: 'att-1',
    member_id: 'member-1',
    present_at_start: presentAtStart,
    present_at_end: presentAtEnd,
  } as Attendance;
}

function makeService(fineTypes: FineType[] = [], fines: Fine[] = []) {
  const fineRepo = {
    find: jest.fn().mockResolvedValue(fines),
    create: jest.fn((value) => value as Fine),
    save: jest.fn(async (value) => value as Fine),
  };
  const fineTypeRepo = {
    find: jest.fn().mockResolvedValue(fineTypes),
  };
  const service = new AttendanceService(
    {} as never, // attendanceRepo
    {} as never, // activityRepo
    {} as never, // memberRepo
    fineRepo as never,
    fineTypeRepo as never,
    {} as never, // sessionRepo
  ) as unknown as Internals;
  return { service, fineRepo };
}

describe('AttendanceService evaluation rules', () => {
  describe('calculateResult', () => {
    it('PRESENT -> PRESENT results in PRESENT (no fine)', () => {
      const { service } = makeService();
      expect(service.calculateResult(attendanceWith(true, true))).toBe(
        AttendanceResult.PRESENT,
      );
    });

    it('ABSENT -> PRESENT results in LATE (fine applies)', () => {
      const { service } = makeService();
      expect(service.calculateResult(attendanceWith(false, true))).toBe(
        AttendanceResult.LATE,
      );
    });

    it('PRESENT -> ABSENT results in LEFT_EARLY (fine applies)', () => {
      const { service } = makeService();
      expect(service.calculateResult(attendanceWith(true, false))).toBe(
        AttendanceResult.LEFT_EARLY,
      );
    });

    it('ABSENT -> ABSENT results in ABSENT (fine applies)', () => {
      const { service } = makeService();
      expect(service.calculateResult(attendanceWith(false, false))).toBe(
        AttendanceResult.ABSENT,
      );
    });
  });

  describe('reconcileFines', () => {
    const lateType = {
      id: 'ft-late',
      name: 'Llegada tardía',
      amount: '10.00',
      applies_to: FineTypeAppliesTo.LATE,
      is_active: true,
    } as FineType;

    it('generates the fine matching the result and links the attendance', async () => {
      const { service, fineRepo } = makeService([lateType]);
      const attendance = attendanceWith(false, true);
      attendance.result = AttendanceResult.LATE;

      const outcome = await service.reconcileFines(
        { id: 'act-1' },
        attendance,
        'user-1',
      );

      expect(outcome.fineCreated).toBe(true);
      expect(fineRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          member_id: 'member-1',
          activity_id: 'act-1',
          attendance_id: 'att-1',
          fine_type_id: 'ft-late',
          source: FineSource.ATTENDANCE,
          created_by_user_id: 'user-1',
        }),
      );
    });

    it('bulk only evaluates the submitted members', async () => {
      const saved: string[] = [];
      const attendanceRepo = {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => {
          saved.push(value.member_id);
          return value;
        }),
        findOne: jest.fn(),
      };
      const service = new AttendanceService(
        attendanceRepo as never,
        {
          findOne: jest.fn().mockResolvedValue({
            id: 'act-1',
            initial_control_at: new Date(),
          }),
          save: jest.fn(async (v) => v),
        } as never,
        {
          find: jest
            .fn()
            .mockResolvedValue([{ id: 'm-1' }, { id: 'm-2' }, { id: 'm-3' }]),
        } as never,
        {
          find: jest.fn().mockResolvedValue([]),
          create: jest.fn((v) => v),
          save: jest.fn(async (v) => v),
        } as never,
        { find: jest.fn().mockResolvedValue([]) } as never,
        {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((v) => v),
          save: jest.fn(async (v) => v),
        } as never,
      ) as unknown as ServiceInternals;

      const result = await service.saveBulk('act-1', {
        session: 'final',
        attendance: [
          { memberId: 'm-1', status: 'present' },
          { memberId: 'm-2', status: 'excused' },
        ],
      });

      expect(result.processed).toBe(2);
      expect(result.excusedAtEnd).toBe(1);
      expect(saved).toEqual(['m-1', 'm-2']);
    });

    it('does not duplicate the fine when the same result is evaluated twice', async () => {
      const existing = {
        id: 'fine-1',
        fine_type_id: 'ft-late',
        status: FineStatus.PENDING,
        attendance_id: 'att-1',
      } as Fine;
      const { service, fineRepo } = makeService([lateType], [existing]);
      const attendance = attendanceWith(false, true);
      attendance.result = AttendanceResult.LATE;

      const outcome = await service.reconcileFines({ id: 'act-1' }, attendance);

      expect(outcome.fineCreated).toBe(false);
      expect(fineRepo.create).not.toHaveBeenCalled();
      expect(fineRepo.save).not.toHaveBeenCalled();
    });

    it('cancels a stale pending fine when the result no longer applies', async () => {
      const stale = {
        id: 'fine-1',
        fine_type_id: 'ft-late',
        status: FineStatus.PENDING,
        attendance_id: 'att-1',
      } as Fine;
      const { service, fineRepo } = makeService([lateType], [stale]);
      const attendance = attendanceWith(true, true);
      attendance.result = AttendanceResult.PRESENT;

      const outcome = await service.reconcileFines({ id: 'act-1' }, attendance);

      expect(outcome.fineCreated).toBe(false);
      expect(fineRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fine-1', status: FineStatus.CANCELLED }),
      );
    });

    it('creates no fine when there is no fine type for the result', async () => {
      const { service, fineRepo } = makeService([]);
      const attendance = attendanceWith(false, false);
      attendance.result = AttendanceResult.ABSENT;

      const outcome = await service.reconcileFines({ id: 'act-1' }, attendance);

      expect(outcome.fineCreated).toBe(false);
      expect(fineRepo.create).not.toHaveBeenCalled();
    });
  });
});
