jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { Brackets } from 'typeorm';
import { BillingService } from './billing.service';
import { SurchargeService } from './surcharge.service';
import { Surcharge, SurchargeType } from './entities/surcharge.entity';
import { Discount, DiscountType } from './entities/discount.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentHistory } from './entities/payment-history.entity';
import { PaymentDiscount } from './entities/payment-discount.entity';
import { PaymentSurcharge } from './entities/payment-surcharge.entity';
import { PayBillDto } from './dto/billing.dto';

function makeQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  qb.leftJoinAndSelect = jest.fn(() => qb);
  qb.withDeleted = jest.fn(() => qb);
  qb.where = jest.fn(() => qb);
  qb.orWhere = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.addOrderBy = jest.fn(() => qb);
  qb.skip = jest.fn(() => qb);
  qb.take = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => [[], 0]);
  return qb;
}

type MockQueryBuilder = ReturnType<typeof makeQueryBuilder>;

function makeService() {
  const qb = makeQueryBuilder();
  const paymentsRepository = {
    createQueryBuilder: jest.fn(() => qb),
  };
  const service = new BillingService(
    paymentsRepository as never,
    {} as never, // history
    {} as never, // paymentDiscounts
    {} as never, // paymentSurcharges
    {} as never, // consumptions
    {} as never, // tariffs
    {} as never, // baseTariff
    {} as never, // settings
    {} as never, // discountService
    {} as never, // surchargeService
    {} as never, // eventEmitter
    {} as never, // storage
    {} as never, // finances
    {} as never, // responsibility
    {} as never, // paymentMethods
    {} as never, // dataSource
  );
  return { service, paymentsRepository, qb };
}

function searchBrackets(qb: MockQueryBuilder): Brackets[] {
  return qb.andWhere.mock.calls
    .map((call) => call[0])
    .filter((arg): arg is Brackets => arg instanceof Brackets);
}

function expand(bracket: unknown): MockQueryBuilder {
  const inner = makeQueryBuilder();
  (bracket as Brackets).whereFactory(inner as never);
  return inner;
}

describe('BillingService search', () => {
  it('does not filter when the search is blank', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, { search: '   ' });

    expect(searchBrackets(qb)).toHaveLength(0);
  });

  it('matches a single token across member name and meter code, accent-insensitively', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      search: 'martinez',
    });

    const brackets = searchBrackets(qb);
    expect(brackets).toHaveLength(1);

    const tokenFilters = expand(brackets[0]).andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(1);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%martinez%' });

    const token = expand(tokenFilters[0][0]);
    const columns = [
      ...token.where.mock.calls,
      ...token.orWhere.mock.calls,
    ].map((call) => call[0]);
    expect(columns).toEqual([
      'unaccent(member.first_name) ILIKE unaccent(:searchToken0)',
      'unaccent(member.last_name) ILIKE unaccent(:searchToken0)',
      'unaccent(meter.code) ILIKE unaccent(:searchToken0)',
    ]);
  });

  it('ANDs every token so a full name matches across columns', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      search: '  Juan   Martinez ',
    });

    const outer = expand(searchBrackets(qb)[0]);
    const tokenFilters = outer.andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(2);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%Juan%' });
    expect(tokenFilters[1][1]).toEqual({ searchToken1: '%Martinez%' });
  });

  it('applies the meter filter alongside the search', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      meterId: 'meter-1',
      search: 'jose',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'consumption.meter_id = :meterId',
      { meterId: 'meter-1' },
    );
    expect(searchBrackets(qb)).toHaveLength(1);
  });
});

function makeSurchargeFixture(
  id: string,
  type: SurchargeType,
  value: string,
): Surcharge {
  return {
    id,
    name: `surcharge-${id}`,
    type,
    value,
    description: undefined,
    is_active: true,
    is_default: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as Surcharge;
}

let billSeq = 0;
function makeBillFixture(
  totalAmount: string,
  amountPaid: string,
  dueDate = '2026-01-15',
) {
  billSeq += 1;
  return {
    id: `bill-${billSeq}`,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    status: 'overdue',
    due_date: dueDate,
  };
}

function makeConsumptionFixture(
  id: string,
  month: number,
  meterId = 'meter-1',
  code = 'VL-592020',
) {
  return {
    id,
    meter_id: meterId,
    cubic_meters: '6',
    year: 2026,
    month,
    meter: {
      code,
      type_id: 'type-1',
      member: { id: 'member-1', first_name: 'Juan', last_name: 'Perez' },
    },
  };
}

type GenerateBillOptions = {
  lateFeeEnabled?: boolean;
  minMonths?: number;
  overdueBills?: Record<string, unknown>[];
  defaults?: Surcharge[];
  /** Full surcharge pool used to validate explicit user selections. */
  allSurcharges?: Surcharge[];
  discounts?: Discount[];
  consumptions?: Record<string, unknown>[];
};

function makeGenerateBillService(opts: GenerateBillOptions = {}) {
  const {
    lateFeeEnabled = true,
    minMonths = 3,
    overdueBills = [],
    defaults = [],
    allSurcharges = defaults,
    discounts = [],
    consumptions = [makeConsumptionFixture('consumption-1', 9)],
  } = opts;

  const overdueQb: Record<string, jest.Mock> = {};
  overdueQb.leftJoin = jest.fn(() => overdueQb);
  overdueQb.where = jest.fn(() => overdueQb);
  overdueQb.andWhere = jest.fn(() => overdueQb);
  overdueQb.getMany = jest.fn(async () => overdueBills);

  const paymentsStore = new Map<string, Record<string, unknown>>();
  let paymentSeq = 0;
  const paymentsRepository = {
    findOne: jest.fn(async (findOpts: { where?: Record<string, unknown> }) => {
      const where = findOpts?.where ?? {};
      if (where.consumption_id) {
        return paymentsStore.get(String(where.consumption_id)) ?? null;
      }
      if (where.id) {
        return (
          [...paymentsStore.values()].find((p) => p.id === where.id) ?? null
        );
      }
      return null;
    }),
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn(async (data: Record<string, unknown>) => {
      if (!data.id) {
        paymentSeq += 1;
        data.id = `payment-${paymentSeq}`;
      }
      if (data.consumption_id) {
        paymentsStore.set(String(data.consumption_id), data);
      }
      return data;
    }),
    createQueryBuilder: jest.fn(() => overdueQb),
  };

  const consumptionsById = new Map<string, Record<string, unknown>>(
    consumptions.map(
      (c) => [String(c.id), c] as [string, Record<string, unknown>],
    ),
  );
  const consumptionsRepository = {
    findOne: jest.fn(
      async (findOpts: { where?: Record<string, unknown> }) =>
        consumptionsById.get(String(findOpts?.where?.id)) ?? null,
    ),
  };

  const savedSurcharges: Record<string, unknown>[] = [];
  const paymentSurchargesRepository = {
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn(async (data: Record<string, unknown>) => {
      savedSurcharges.push(data);
      return data;
    }),
  };

  const savedDiscounts: Record<string, unknown>[] = [];
  const paymentDiscountsRepository = {
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn(async (data: Record<string, unknown>) => {
      savedDiscounts.push(data);
      return data;
    }),
  };

  const settingsService = {
    getPaymentDueDay: jest.fn(async () => 15),
    getLateFeeEnabled: jest.fn(async () => lateFeeEnabled),
    getLateFeeMinMonths: jest.fn(async () => minMonths),
  };

  const realSurchargeService = new SurchargeService({} as never);
  // Real findSelected validation (exists + active) over the fixture pool.
  const selectedService = new SurchargeService({
    find: jest.fn(
      async (findOpts?: { where?: { id?: { value?: unknown } } }) => {
        const ids = (findOpts?.where?.id?.value ?? []) as unknown[];
        return allSurcharges.filter((s) => ids.includes(s.id));
      },
    ),
  } as never);
  const surchargeService = {
    findDefaults: jest.fn(async () => defaults),
    findSelected: jest.fn(selectedService.findSelected.bind(selectedService)),
    calculateSurchargeAmount:
      realSurchargeService.calculateSurchargeAmount.bind(realSurchargeService),
  };

  const discountsById = new Map(discounts.map((d) => [d.id, d]));
  const discountService = {
    findOne: jest.fn(async (id: string) => {
      const discount = discountsById.get(id);
      if (!discount) throw new Error('DISCOUNT_NOT_FOUND');
      return discount;
    }),
    calculateDiscountAmount: (totalAmount: number, discount: Discount) => {
      const value = parseFloat(discount.value);
      if (discount.type === DiscountType.FIXED) {
        return Math.min(value, totalAmount);
      }
      return totalAmount * (value / 100);
    },
  };

  const service = new BillingService(
    paymentsRepository as never,
    {} as never, // history
    paymentDiscountsRepository as never,
    paymentSurchargesRepository as never,
    consumptionsRepository as never,
    {
      getValidForDate: jest.fn(async () => ({ price_per_cubic_meter: '5' })),
    } as never, // tariffs
    { getValidForDate: jest.fn(async () => ({ amount: '10' })) } as never, // baseTariff
    settingsService as never,
    discountService as never,
    surchargeService as never,
    { emit: jest.fn() } as never, // eventEmitter
    {} as never, // storage
    {} as never, // finances
    {} as never, // responsibility
    {} as never, // paymentMethods
    {} as never, // dataSource
  );

  return {
    service,
    surchargeService,
    overdueQb,
    savedSurcharges,
    savedDiscounts,
    paymentsStore,
    consumptionsById,
  };
}

function makeDiscountFixture(
  id: string,
  type: DiscountType,
  value: string,
): Discount {
  return {
    id,
    name: `discount-${id}`,
    type,
    value,
    description: '',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as Discount;
}

describe('BillingService.generateBill late fees', () => {
  it('re-evaluates overdue bills on each generation (Abril)', async () => {
    const { service, savedSurcharges } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [
        makeBillFixture('30', '0'),
        makeBillFixture('25', '0'),
        makeBillFixture('15', '0'),
      ],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
      consumptions: [makeConsumptionFixture('consumption-1', 4)],
    });

    const payment = await service.generateBill('consumption-1');

    // original = max(base 10, 6 m3 * 5) = 30
    expect(payment.late_fee_amount).toBe('10.00');
    expect(payment.total_amount).toBe('40.00');
    expect(savedSurcharges).toHaveLength(1);
    expect(savedSurcharges[0]).toMatchObject({
      payment_id: payment.id,
      surcharge_id: 's1',
      amount: '10.00',
    });
  });

  it('applies a fresh surcharge again on the next month (Mayo)', async () => {
    const stillOverdue = [
      makeBillFixture('30', '0'),
      makeBillFixture('25', '0'),
      makeBillFixture('15', '0'),
    ];
    const { service, savedSurcharges, paymentsStore } = makeGenerateBillService(
      {
        minMonths: 3,
        overdueBills: stillOverdue,
        defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
        consumptions: [
          makeConsumptionFixture('consumption-1', 4),
          makeConsumptionFixture('consumption-2', 5),
        ],
      },
    );

    const abril = await service.generateBill('consumption-1');
    const mayo = await service.generateBill('consumption-2');

    expect(abril.id).not.toBe(mayo.id);
    expect(abril.late_fee_amount).toBe('10.00');
    expect(mayo.late_fee_amount).toBe('10.00');
    expect(savedSurcharges).toHaveLength(2);
    expect(savedSurcharges.map((s) => s.payment_id)).toEqual([
      abril.id,
      mayo.id,
    ]);
    expect(paymentsStore.size).toBe(2);
  });

  it('does not apply a surcharge once prior bills have no pending balance', async () => {
    const { service, savedSurcharges, surchargeService } =
      makeGenerateBillService({
        minMonths: 3,
        // all three prior bills are now fully paid
        overdueBills: [
          makeBillFixture('30', '30'),
          makeBillFixture('25', '25'),
          makeBillFixture('15', '15'),
        ],
        defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
        consumptions: [makeConsumptionFixture('consumption-1', 5)],
      });

    const payment = await service.generateBill('consumption-1');

    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
    expect(payment.late_fee_amount).toBe('0.00');
    expect(payment.total_amount).toBe('30.00');
    expect(savedSurcharges).toHaveLength(0);
  });

  it('applies one surcharge for the new bill, not one per overdue bill', async () => {
    const { service, savedSurcharges } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [
        makeBillFixture('30', '10'),
        makeBillFixture('25', '0'),
        makeBillFixture('15', '5'),
      ],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
      consumptions: [makeConsumptionFixture('consumption-1', 4)],
    });

    const payment = await service.generateBill('consumption-1');

    expect(savedSurcharges).toHaveLength(1);
    expect(payment.late_fee_amount).toBe('10.00');
  });

  it('does not duplicate the surcharge when the request is retried', async () => {
    const { service, savedSurcharges } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [
        makeBillFixture('30', '0'),
        makeBillFixture('25', '0'),
        makeBillFixture('15', '0'),
      ],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
      consumptions: [makeConsumptionFixture('consumption-1', 4)],
    });

    const payment = await service.generateBill('consumption-1');
    await expect(service.generateBill('consumption-1')).rejects.toMatchObject({
      code: 'BILL_ALREADY_EXISTS',
    });

    expect(savedSurcharges).toHaveLength(1);
    const stored = savedSurcharges[0];
    expect(stored.payment_id).toBe(payment.id);
    expect(payment.late_fee_amount).toBe('10.00');
  });

  it('keeps discounts and surcharges independent (total = original - discount + surcharge)', async () => {
    const { service, savedDiscounts, savedSurcharges } =
      makeGenerateBillService({
        minMonths: 3,
        overdueBills: [
          makeBillFixture('30', '0'),
          makeBillFixture('25', '0'),
          makeBillFixture('15', '0'),
        ],
        defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
        discounts: [makeDiscountFixture('d1', DiscountType.FIXED, '5')],
        consumptions: [makeConsumptionFixture('consumption-1', 4)],
      });

    const payment = await service.generateBill('consumption-1', ['d1']);

    // original 30 stays untouched as the basis of the bill
    expect(payment.discount_amount).toBe('5.00');
    expect(payment.late_fee_amount).toBe('10.00');
    expect(payment.total_amount).toBe('35.00');
    expect(savedDiscounts).toHaveLength(1);
    expect(savedDiscounts[0].amount).toBe('5.00');
    expect(savedSurcharges).toHaveLength(1);
    expect(savedSurcharges[0].amount).toBe('10.00');
  });

  it('scopes overdue detection to the meter and resolves before the new bill exists', async () => {
    const { service, overdueQb } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [
        makeBillFixture('30', '0'),
        makeBillFixture('25', '0'),
        makeBillFixture('15', '0'),
      ],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
      consumptions: [makeConsumptionFixture('consumption-1', 4)],
    });

    await service.generateBill('consumption-1');

    expect(overdueQb.where).toHaveBeenCalledWith(
      'consumption.meter_id = :meterId',
      { meterId: 'meter-1' },
    );
    // The late fee is resolved before the payment row is created, so the
    // query never needs to exclude the new bill (it cannot exist yet).
    expect(overdueQb.andWhere).not.toHaveBeenCalledWith(
      'payment.id != :excludeId',
      expect.anything(),
    );
    expect(overdueQb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('member_id'),
      expect.anything(),
    );
  });

  it('sums every default surcharge into the new bill', async () => {
    const { service, savedSurcharges, surchargeService } =
      makeGenerateBillService({
        minMonths: 1,
        overdueBills: [makeBillFixture('30', '0')],
        defaults: [
          makeSurchargeFixture('s-fixed-10', SurchargeType.FIXED, '10'),
          makeSurchargeFixture('s-fixed-5', SurchargeType.FIXED, '5'),
          makeSurchargeFixture('s-pct-2', SurchargeType.PERCENTAGE, '2'),
        ],
      });

    const payment = await service.generateBill('consumption-1');

    // originalAmount = max(base 10, 6 m3 * 5) = 30
    // late fee = 10 + 5 + 2% of 30 = 15.60
    expect(payment.late_fee_amount).toBe('15.60');
    expect(payment.total_amount).toBe('45.60');
    expect(payment.discount_amount).toBe('0.00');
    expect(savedSurcharges).toHaveLength(3);
    expect(savedSurcharges.map((s) => s.amount)).toEqual([
      '10.00',
      '5.00',
      '0.60',
    ]);
    expect(savedSurcharges.map((s) => s.surcharge_id)).toEqual([
      's-fixed-10',
      's-fixed-5',
      's-pct-2',
    ]);
    expect(surchargeService.findDefaults).toHaveBeenCalledTimes(1);
  });

  it('applies a percentage surcharge over the bill amount', async () => {
    const { service } = makeGenerateBillService({
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      defaults: [
        makeSurchargeFixture('s-pct-2', SurchargeType.PERCENTAGE, '2'),
      ],
    });

    const payment = await service.generateBill('consumption-1');

    expect(payment.late_fee_amount).toBe('0.60');
    expect(payment.total_amount).toBe('30.60');
  });

  it('adds no surcharge when there are no default surcharges', async () => {
    const { service, savedSurcharges } = makeGenerateBillService({
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      defaults: [],
    });

    const payment = await service.generateBill('consumption-1');

    expect(payment.late_fee_amount).toBe('0.00');
    expect(payment.total_amount).toBe('30.00');
    expect(savedSurcharges).toHaveLength(0);
  });

  it('never consults default surcharges when late fees are disabled', async () => {
    const { service, surchargeService } = makeGenerateBillService({
      lateFeeEnabled: false,
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
    });

    const payment = await service.generateBill('consumption-1');

    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
    expect(payment.late_fee_amount).toBe('0.00');
    expect(payment.total_amount).toBe('30.00');
  });

  it('skips default surcharges while overdue bills are below minMonths', async () => {
    const { service, surchargeService } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [makeBillFixture('30', '0'), makeBillFixture('25', '0')],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
    });

    const payment = await service.generateBill('consumption-1');

    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
    expect(payment.late_fee_amount).toBe('0.00');
    expect(payment.total_amount).toBe('30.00');
  });

  it('applies defaults once overdue bills reach minMonths', async () => {
    const { service, surchargeService } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [
        makeBillFixture('30', '0'),
        makeBillFixture('25', '0'),
        makeBillFixture('15', '0'),
      ],
      defaults: [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')],
    });

    const payment = await service.generateBill('consumption-1');

    expect(surchargeService.findDefaults).toHaveBeenCalledTimes(1);
    expect(payment.late_fee_amount).toBe('10.00');
    expect(payment.total_amount).toBe('40.00');
  });
});

describe('BillingService.generateBill explicit surcharge selection', () => {
  const pool = [
    makeSurchargeFixture('s-default', SurchargeType.FIXED, '10'),
    makeSurchargeFixture('s-a', SurchargeType.FIXED, '7'),
    makeSurchargeFixture('s-pct', SurchargeType.PERCENTAGE, '2'),
  ];
  const eligibleOverdue = [makeBillFixture('30', '0')];
  const consumption = [makeConsumptionFixture('consumption-1', 4)];

  it('persists only the selected surcharges with server-computed amounts', async () => {
    const { service, savedSurcharges, surchargeService } =
      makeGenerateBillService({
        minMonths: 1,
        overdueBills: eligibleOverdue,
        defaults: [pool[0]],
        allSurcharges: pool,
        consumptions: consumption,
      });

    const payment = await service.generateBill('consumption-1', undefined, [
      's-pct',
      's-a',
    ]);

    // base 30: 2% = 0.60 + fixed 7 = 7.60; the default not selected stays out
    expect(payment.late_fee_amount).toBe('7.60');
    expect(payment.total_amount).toBe('37.60');
    expect(savedSurcharges).toHaveLength(2);
    expect(savedSurcharges.map((s) => s.surcharge_id)).toEqual([
      's-pct',
      's-a',
    ]);
    expect(savedSurcharges[0].amount).toBe('0.60');
    expect(savedSurcharges[1].amount).toBe('7.00');
    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
    expect(surchargeService.findSelected).toHaveBeenCalledWith([
      's-pct',
      's-a',
    ]);
  });

  it('applies none when the user deselects every surcharge', async () => {
    const { service, savedSurcharges, surchargeService } =
      makeGenerateBillService({
        minMonths: 1,
        overdueBills: eligibleOverdue,
        defaults: [pool[0]],
        allSurcharges: pool,
        consumptions: consumption,
      });

    const payment = await service.generateBill('consumption-1', undefined, []);

    expect(payment.late_fee_amount).toBe('0.00');
    expect(payment.total_amount).toBe('30.00');
    expect(savedSurcharges).toHaveLength(0);
    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
  });

  it('keeps the legacy default path when the client omits the selection', async () => {
    const { service, savedSurcharges, surchargeService } =
      makeGenerateBillService({
        minMonths: 1,
        overdueBills: eligibleOverdue,
        defaults: [pool[0]],
        allSurcharges: pool,
        consumptions: consumption,
      });

    const payment = await service.generateBill('consumption-1');

    expect(payment.late_fee_amount).toBe('10.00');
    expect(payment.total_amount).toBe('40.00');
    expect(savedSurcharges).toHaveLength(1);
    expect(surchargeService.findSelected).not.toHaveBeenCalled();
    expect(surchargeService.findDefaults).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown ids without creating a bill', async () => {
    const { service, paymentsStore } = makeGenerateBillService({
      minMonths: 1,
      overdueBills: eligibleOverdue,
      allSurcharges: pool,
      consumptions: consumption,
    });

    await expect(
      service.generateBill('consumption-1', undefined, ['nope']),
    ).rejects.toMatchObject({ code: 'SURCHARGE_NOT_FOUND' });
    expect(paymentsStore.size).toBe(0);
  });

  it('rejects inactive surcharges', async () => {
    const inactive = { ...pool[1], is_active: false };
    const { service, paymentsStore } = makeGenerateBillService({
      minMonths: 1,
      overdueBills: eligibleOverdue,
      allSurcharges: [pool[0], inactive],
      consumptions: consumption,
    });

    await expect(
      service.generateBill('consumption-1', undefined, ['s-a']),
    ).rejects.toMatchObject({ code: 'SURCHARGE_INACTIVE' });
    expect(paymentsStore.size).toBe(0);
  });

  it('rejects a non-empty selection while the bill is not eligible', async () => {
    const { service, paymentsStore } = makeGenerateBillService({
      minMonths: 3,
      overdueBills: [],
      allSurcharges: pool,
      consumptions: consumption,
    });

    await expect(
      service.generateBill('consumption-1', undefined, ['s-a']),
    ).rejects.toMatchObject({ code: 'LATE_FEE_NOT_ELIGIBLE' });
    expect(paymentsStore.size).toBe(0);
  });

  it('rejects a selection when late fees are disabled', async () => {
    const { service, paymentsStore } = makeGenerateBillService({
      lateFeeEnabled: false,
      minMonths: 1,
      overdueBills: eligibleOverdue,
      allSurcharges: pool,
      consumptions: consumption,
    });

    await expect(
      service.generateBill('consumption-1', undefined, ['s-a']),
    ).rejects.toMatchObject({ code: 'LATE_FEE_NOT_ELIGIBLE' });
    expect(paymentsStore.size).toBe(0);
  });

  it('combines selected surcharges with the chosen discounts', async () => {
    const { service, savedSurcharges, savedDiscounts } =
      makeGenerateBillService({
        minMonths: 1,
        overdueBills: eligibleOverdue,
        defaults: [],
        allSurcharges: pool,
        discounts: [makeDiscountFixture('d5', DiscountType.FIXED, '5')],
        consumptions: consumption,
      });

    const payment = await service.generateBill(
      'consumption-1',
      ['d5'],
      ['s-default'],
    );

    // 30 - 5 discount + 10 fee = 35; discounts keep their own base (30)
    expect(payment.discount_amount).toBe('5.00');
    expect(payment.late_fee_amount).toBe('10.00');
    expect(payment.total_amount).toBe('35.00');
    expect(savedDiscounts).toHaveLength(1);
    expect(savedSurcharges).toHaveLength(1);
    expect(savedSurcharges[0].amount).toBe('10.00');
  });
});

type PayOptions = {
  payment: Record<string, unknown>;
  lateFeeEnabled?: boolean;
  minMonths?: number;
  overdueBills?: Record<string, unknown>[];
  defaults?: Surcharge[];
  allSurcharges?: Surcharge[];
  discounts?: Discount[];
};

function makePayService(opts: PayOptions) {
  const {
    payment,
    lateFeeEnabled = true,
    minMonths = 1,
    overdueBills = [],
    defaults = [],
    allSurcharges = defaults,
    discounts = [],
  } = opts;

  const store: { payment: Record<string, unknown> } = {
    payment: { ...payment },
  };
  const savedSurcharges: Record<string, unknown>[] = [];

  const overdueQb: Record<string, jest.Mock> = {};
  overdueQb.leftJoin = jest.fn(() => overdueQb);
  overdueQb.where = jest.fn(() => overdueQb);
  overdueQb.andWhere = jest.fn(() => overdueQb);
  overdueQb.getMany = jest.fn(async () => overdueBills);

  function makeTxPaymentsQb() {
    const qb: Record<string, jest.Mock> = {};
    let patch: Record<string, unknown> = {};
    qb.update = jest.fn(() => qb);
    qb.set = jest.fn((value: Record<string, unknown>) => {
      patch = value;
      return qb;
    });
    qb.where = jest.fn(() => qb);
    qb.andWhere = jest.fn(() => qb);
    qb.returning = jest.fn(() => qb);
    qb.execute = jest.fn(async () => {
      const resolved: Record<string, unknown> = { ...patch };
      if (typeof resolved.amount_paid === 'function') {
        // The callback returns the SQL fragment: `"amount_paid" + 40.00`
        const sql = String((resolved.amount_paid as () => string)());
        const match = /\+\s*([\d.]+)/.exec(sql);
        const added = match ? parseFloat(match[1]) : 0;
        const newPaid = parseFloat(String(store.payment.amount_paid)) + added;
        const newTotal = parseFloat(String(store.payment.total_amount));
        // Mirrors the SQL guard "amount_paid" + amt <= "total_amount" + 0.001
        if (newPaid > newTotal + 0.001) {
          return { raw: [] };
        }
        resolved.amount_paid = newPaid.toFixed(2);
      }
      Object.assign(store.payment, resolved);
      return {
        raw: [
          {
            amount_paid: store.payment.amount_paid,
            total_amount: store.payment.total_amount,
          },
        ],
      };
    });
    return qb;
  }

  const txPaymentsRepo = {
    findOne: jest.fn(async () => ({ ...store.payment })),
    createQueryBuilder: jest.fn(() => makeTxPaymentsQb()),
  };
  const historyRepo = {
    create: jest.fn((data: Record<string, unknown>) => data),
    save: jest.fn(async (data: Record<string, unknown>) => ({
      id: 'history-1',
      ...data,
    })),
  };
  const discountsRepo = {
    delete: jest.fn(async () => undefined),
    create: jest.fn((data: Record<string, unknown>) => data),
    save: jest.fn(async (data: Record<string, unknown>) => data),
  };
  const surchargesRepo = {
    count: jest.fn(
      async () => (store.payment.paymentSurcharges as unknown[])?.length ?? 0,
    ),
    create: jest.fn((data: Record<string, unknown>) => data),
    save: jest.fn(async (data: Record<string, unknown>) => {
      savedSurcharges.push(data);
      return data;
    }),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Payment) return txPaymentsRepo;
      if (entity === PaymentHistory) return historyRepo;
      if (entity === PaymentDiscount) return discountsRepo;
      if (entity === PaymentSurcharge) return surchargesRepo;
      throw new Error('unexpected repository requested');
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
      cb(manager),
    ),
  };

  const paymentsRepository = {
    findOne: jest.fn(async () => store.payment),
    createQueryBuilder: jest.fn(() => overdueQb),
  };

  const settingsService = {
    getPaymentDueDay: jest.fn(async () => 15),
    getLateFeeEnabled: jest.fn(async () => lateFeeEnabled),
    getLateFeeMinMonths: jest.fn(async () => minMonths),
  };

  const realSurchargeService = new SurchargeService({} as never);
  const selectedService = new SurchargeService({
    find: jest.fn(
      async (findOpts?: { where?: { id?: { value?: unknown } } }) => {
        const ids = (findOpts?.where?.id?.value ?? []) as unknown[];
        return allSurcharges.filter((s) => ids.includes(s.id));
      },
    ),
  } as never);
  const surchargeService = {
    findDefaults: jest.fn(async () => defaults),
    findSelected: jest.fn(selectedService.findSelected.bind(selectedService)),
    calculateSurchargeAmount:
      realSurchargeService.calculateSurchargeAmount.bind(realSurchargeService),
  };

  const discountsById = new Map(discounts.map((d) => [d.id, d]));
  const discountService = {
    findOne: jest.fn(async (id: string) => {
      const discount = discountsById.get(id);
      if (!discount) throw new Error('DISCOUNT_NOT_FOUND');
      return discount;
    }),
    calculateDiscountAmount: (totalAmount: number, discount: Discount) => {
      const value = parseFloat(discount.value);
      if (discount.type === DiscountType.FIXED) {
        return Math.min(value, totalAmount);
      }
      return totalAmount * (value / 100);
    },
  };

  const service = new BillingService(
    paymentsRepository as never,
    historyRepo as never,
    discountsRepo as never,
    surchargesRepo as never,
    {} as never, // consumptions
    {} as never, // tariffs
    {} as never, // baseTariff
    settingsService as never,
    discountService as never,
    surchargeService as never,
    { emit: jest.fn() } as never, // eventEmitter
    {
      uploadOptimizedImage: jest.fn(async () => 'water-payment/evidence/k1'),
    } as never,
    {
      validateMovement: jest.fn(async () => undefined),
      recordIncome: jest.fn(async () => undefined),
    } as never, // finances
    {
      resolveWaterBillResponsibleUserId: jest.fn(async () => 'user-resp'),
      resolveCollectorUserId: jest.fn(
        (collector?: string, registrant?: string) => collector ?? registrant,
      ),
    } as never, // responsibility
    { validateCode: jest.fn(async () => undefined) } as never, // paymentMethods
    dataSource as never,
  );

  return {
    service,
    store,
    savedSurcharges,
    dataSource,
    surchargeService,
    historyRepo,
    discountsRepo,
    surchargesRepo,
  };
}

function makePayPaymentFixture(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'payment-1',
    consumption_id: 'consumption-1',
    total_amount: '30.00',
    amount_paid: '0.00',
    status: PaymentStatus.PENDING,
    due_date: '2026-01-15',
    discount_amount: '0.00',
    late_fee_amount: '0.00',
    paymentSurcharges: [],
    paymentDiscounts: [],
    history: [],
    consumption: {
      id: 'consumption-1',
      year: 2026,
      month: 4,
      meter_id: 'meter-1',
      meter: { code: 'VL-592020', member: {} },
    },
    ...extra,
  };
}

describe('BillingService.pay surcharge selection', () => {
  const payPool = [makeSurchargeFixture('s1', SurchargeType.FIXED, '10')];

  it('applies the selected surcharges to a bill generated without them', async () => {
    const { service, store, savedSurcharges } = makePayService({
      payment: makePayPaymentFixture(),
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      allSurcharges: payPool,
    });

    await service.pay('payment-1', {
      amount: 40,
      paymentMethod: 'cash',
      surchargeIds: ['s1'],
    });

    expect(savedSurcharges).toHaveLength(1);
    expect(savedSurcharges[0]).toMatchObject({
      payment_id: 'payment-1',
      surcharge_id: 's1',
      amount: '10.00',
    });
    expect(store.payment.late_fee_amount).toBe('10.00');
    expect(store.payment.total_amount).toBe('40.00');
    expect(store.payment.status).toBe(PaymentStatus.PAID);
  });

  it('counts the selected fee in the balance limit', async () => {
    const { service, dataSource } = makePayService({
      payment: makePayPaymentFixture(),
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      allSurcharges: payPool,
    });

    // 30 + 10 fee = 40 max; 41 exceeds
    await expect(
      service.pay('payment-1', {
        amount: 41,
        paymentMethod: 'cash',
        surchargeIds: ['s1'],
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_EXCEEDS_BALANCE' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('never rewrites surcharges persisted at generation time', async () => {
    const { service, store, savedSurcharges, dataSource } = makePayService({
      payment: makePayPaymentFixture({
        total_amount: '40.00',
        late_fee_amount: '10.00',
        paymentSurcharges: [
          { id: 'ps-1', surcharge_id: 's1', amount: '10.00' },
        ],
      }),
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      allSurcharges: payPool,
    });

    await service.pay('payment-1', {
      amount: 10,
      paymentMethod: 'cash',
      surchargeIds: ['s1'],
    });

    expect(savedSurcharges).toHaveLength(0);
    expect(store.payment.late_fee_amount).toBe('10.00');
    expect(store.payment.total_amount).toBe('40.00');
    // the payment itself is still recorded normally
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(store.payment.amount_paid).toBe('10.00');
  });

  it('rejects a selection when the bill is not eligible', async () => {
    const { service, store, savedSurcharges, dataSource } = makePayService({
      payment: makePayPaymentFixture(),
      minMonths: 3,
      overdueBills: [],
      allSurcharges: payPool,
    });

    await expect(
      service.pay('payment-1', {
        amount: 10,
        paymentMethod: 'cash',
        surchargeIds: ['s1'],
      }),
    ).rejects.toMatchObject({ code: 'LATE_FEE_NOT_ELIGIBLE' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(savedSurcharges).toHaveLength(0);
    expect(store.payment.total_amount).toBe('30.00');
  });

  it('rejects unknown ids before recording anything', async () => {
    const { service, dataSource, savedSurcharges } = makePayService({
      payment: makePayPaymentFixture(),
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      allSurcharges: payPool,
    });

    await expect(
      service.pay('payment-1', {
        amount: 10,
        paymentMethod: 'cash',
        surchargeIds: ['nope'],
      }),
    ).rejects.toMatchObject({ code: 'SURCHARGE_NOT_FOUND' });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(savedSurcharges).toHaveLength(0);
  });

  it('keeps the legacy behaviour when no selection is sent', async () => {
    const { service, store, savedSurcharges, surchargeService } =
      makePayService({
        payment: makePayPaymentFixture(),
        minMonths: 1,
        overdueBills: [makeBillFixture('30', '0')],
        defaults: payPool,
        allSurcharges: payPool,
      });

    await service.pay('payment-1', { amount: 10, paymentMethod: 'cash' });

    expect(surchargeService.findSelected).not.toHaveBeenCalled();
    expect(surchargeService.findDefaults).not.toHaveBeenCalled();
    expect(savedSurcharges).toHaveLength(0);
    expect(store.payment.late_fee_amount).toBe('0.00');
    expect(store.payment.total_amount).toBe('30.00');
  });

  it('combines discounts and selected surcharges in one payment', async () => {
    const { service, store, savedSurcharges, discountsRepo } = makePayService({
      payment: makePayPaymentFixture(),
      minMonths: 1,
      overdueBills: [makeBillFixture('30', '0')],
      allSurcharges: payPool,
      discounts: [makeDiscountFixture('d5', DiscountType.FIXED, '5')],
    });

    await service.pay('payment-1', {
      amount: 35,
      paymentMethod: 'cash',
      discountIds: ['d5'],
      surchargeIds: ['s1'],
    });

    // 30 - 5 discount + 10 fee = 35
    expect(discountsRepo.delete).toHaveBeenCalledWith({
      payment_id: 'payment-1',
    });
    expect(savedSurcharges).toHaveLength(1);
    expect(store.payment.discount_amount).toBe('5.00');
    expect(store.payment.late_fee_amount).toBe('10.00');
    expect(store.payment.total_amount).toBe('35.00');
    expect(store.payment.status).toBe(PaymentStatus.PAID);
  });
});
