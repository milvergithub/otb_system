import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../billing/entities/payment.entity';
import { Consumption } from '../consumption/entities/consumption.entity';
import { Member } from '../members/entities/member.entity';
import { Meter } from '../meters/entities/meter.entity';
import { SharePayment } from '../shares/entities/share-payment.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Consumption)
    private readonly consumptionsRepository: Repository<Consumption>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Meter)
    private readonly metersRepository: Repository<Meter>,
    @InjectRepository(SharePayment)
    private readonly sharePaymentsRepository: Repository<SharePayment>,
  ) {}

  async getDashboard(month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const totalMembers = await this.membersRepository.count();
    const totalMeters = await this.metersRepository.count();

    const monthlyPayments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .where('consumption.month = :month', { month: targetMonth })
      .andWhere('consumption.year = :year', { year: targetYear })
      .getMany();

    const totalCollected = monthlyPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount_paid),
      0,
    );
    const totalBilled = monthlyPayments.reduce(
      (sum, p) => sum + parseFloat(p.total_amount),
      0,
    );
    const overdueCount = await this.paymentsRepository.count({
      where: { status: PaymentStatus.OVERDUE },
    });
    const pendingCount = await this.paymentsRepository.count({
      where: { status: PaymentStatus.PENDING },
    });

    const totalConsumption = await this.consumptionsRepository
      .createQueryBuilder('c')
      .where('c.year = :year', { year: targetYear })
      .andWhere('c.month = :month', { month: targetMonth })
      .select('SUM(CAST(c.cubic_meters AS FLOAT))', 'total')
      .getRawOne<{ total: string }>();

    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const monthEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const shareCollected = await this.sharePaymentsRepository
      .createQueryBuilder('sp')
      .select('SUM(CAST(sp.amount AS FLOAT))', 'total')
      .where('sp.paid_at >= :monthStart', { monthStart })
      .andWhere('sp.paid_at <= :monthEnd', { monthEnd })
      .getRawOne<{ total: string | null }>();

    const shareTotal = shareCollected?.total ? Number(shareCollected.total) : 0;

    return {
      totalMembers,
      totalMeters,
      totalCollected: Number((totalCollected + shareTotal).toFixed(2)),
      totalBilled: Number(totalBilled.toFixed(2)),
      shareCollected: Number(shareTotal.toFixed(2)),
      collectionRate:
        totalBilled > 0
          ? Number(
              (((totalCollected + shareTotal) / totalBilled) * 100).toFixed(1),
            )
          : 0,
      overdueCount,
      pendingCount,
      totalConsumption: totalConsumption?.total
        ? Number(totalConsumption.total)
        : 0,
      month: targetMonth,
      year: targetYear,
    };
  }

  async getMonthlyRevenue(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-01-01`;
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const startYear = parseInt(start.substring(0, 4), 10);
    const startMonth = parseInt(start.substring(5, 7), 10);
    const endYear = parseInt(end.substring(0, 4), 10);
    const endMonth = parseInt(end.substring(5, 7), 10);

    const rows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.consumption', 'consumption')
      .select('consumption.year', 'year')
      .addSelect('consumption.month', 'month')
      .addSelect('SUM(CAST(payment.amount_paid AS FLOAT))', 'water_collected')
      .addSelect('SUM(CAST(payment.total_amount AS FLOAT))', 'billed')
      .where(
        '(consumption.year > :startYear OR (consumption.year = :startYear AND consumption.month >= :startMonth))',
        { startYear, startMonth },
      )
      .andWhere(
        '(consumption.year < :endYear OR (consumption.year = :endYear AND consumption.month <= :endMonth))',
        { endYear, endMonth },
      )
      .groupBy('consumption.year')
      .addGroupBy('consumption.month')
      .orderBy('consumption.year', 'ASC')
      .addOrderBy('consumption.month', 'ASC')
      .getRawMany();

    const shareRows = await this.sharePaymentsRepository
      .createQueryBuilder('sp')
      .select('EXTRACT(YEAR FROM sp.paid_at)', 'year')
      .addSelect('CAST(EXTRACT(MONTH FROM sp.paid_at) AS INT)', 'month')
      .addSelect('SUM(CAST(sp.amount AS FLOAT))', 'share_collected')
      .where('sp.paid_at >= :start', { start })
      .andWhere('sp.paid_at <= :end', { end })
      .groupBy('year')
      .addGroupBy('month')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany<{ year: number; month: number; share_collected: string }>();

    const monthsInRange: { year: number; month: number }[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      monthsInRange.push({ year: y, month: m });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    const result = monthsInRange.map(({ year: y, month: m }) => {
      const row = rows.find(
        (r) => Number(r.year) === y && Number(r.month) === m,
      );
      const shareRow = shareRows.find(
        (r) => Number(r.year) === y && Number(r.month) === m,
      );
      const waterCollected = row ? Number(row.water_collected) : 0;
      const shareCollected = shareRow ? Number(shareRow.share_collected) : 0;
      return {
        year: y,
        month: m,
        waterCollected: Number(waterCollected.toFixed(2)),
        shareCollected: Number(shareCollected.toFixed(2)),
        total: Number((waterCollected + shareCollected).toFixed(2)),
        billed: row ? Number(row.billed) : 0,
      };
    });
    return result;
  }

  async getOverdueMembers() {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .where('payment.status IN (:...statuses)', {
        statuses: [
          PaymentStatus.OVERDUE,
          PaymentStatus.PARTIAL,
          PaymentStatus.PENDING,
        ],
      })
      .orderBy('payment.due_date', 'ASC')
      .getMany();
  }

  async exportCsv(startDate?: string, endDate?: string): Promise<string> {
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-01-01`;
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const startYear = parseInt(start.substring(0, 4), 10);
    const startMonth = parseInt(start.substring(5, 7), 10);
    const endYear = parseInt(end.substring(0, 4), 10);
    const endMonth = parseInt(end.substring(5, 7), 10);

    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .where(
        '(consumption.year > :startYear OR (consumption.year = :startYear AND consumption.month >= :startMonth))',
        { startYear, startMonth },
      )
      .andWhere(
        '(consumption.year < :endYear OR (consumption.year = :endYear AND consumption.month <= :endMonth))',
        { endYear, endMonth },
      )
      .orderBy('consumption.year', 'ASC')
      .addOrderBy('consumption.month', 'ASC')
      .getMany();

    const sharePayments = await this.sharePaymentsRepository
      .createQueryBuilder('sp')
      .select('sp.meter_id', 'meter_id')
      .addSelect('SUM(CAST(sp.amount AS FLOAT))', 'share_paid')
      .where('sp.paid_at >= :start', { start })
      .andWhere('sp.paid_at <= :end', { end })
      .groupBy('sp.meter_id')
      .getRawMany<{ meter_id: string; share_paid: string }>();

    const shareByMeter = new Map(
      sharePayments.map((sp) => [sp.meter_id, Number(sp.share_paid)]),
    );

    const header = [
      'Member',
      'CI',
      'Meter Code',
      'Meter Type',
      'Month',
      'Year',
      'Cubic Meters',
      'Total Amount',
      'Amount Paid',
      'Water Paid',
      'Share Paid',
      'Status',
      'Due Date',
    ].join(',');

    const rows = payments.map((p) => {
      const sharePaid = shareByMeter.get(p.consumption.meter.id) ?? 0;
      return [
        `"${p.consumption.meter.member.first_name} ${p.consumption.meter.member.last_name}"`,
        `"${p.consumption.meter.member.ci}"`,
        `"${p.consumption.meter.code}"`,
        p.consumption.meter.type,
        p.consumption.month,
        p.consumption.year,
        p.consumption.cubic_meters,
        p.total_amount,
        p.amount_paid,
        p.amount_paid,
        sharePaid,
        p.status,
        p.due_date,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}
