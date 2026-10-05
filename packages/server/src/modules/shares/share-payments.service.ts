import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { DataSource, Repository } from 'typeorm';
import { StorageService } from '../consumption/storage.service';
import { Meter } from '../meters/entities/meter.entity';
import { Member } from '../members/entities/member.entity';
import { CreateSharePaymentDto } from './dto/share-payment.dto';
import { SharePayment } from './entities/share-payment.entity';
import { SharesService } from './shares.service';
import { FinancesService } from '../finances/finances.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';

export interface SharePaymentSummary {
  paid: number;
  total: number;
  status: 'paid' | 'partial' | 'pending';
}

@Injectable()
export class SharePaymentsService {
  constructor(
    @InjectRepository(SharePayment)
    private readonly repository: Repository<SharePayment>,
    @InjectRepository(Meter)
    private readonly metersRepository: Repository<Meter>,
    private readonly sharesService: SharesService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly financesService: FinancesService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadEvidence(imageBase64?: string): Promise<string | undefined> {
    return this.storageService.uploadOptimizedImage(
      imageBase64,
      'water-actions/share-evidence',
    );
  }

  async findByMeter(meterId: string): Promise<SharePayment[]> {
    return this.repository.find({
      where: { meter_id: meterId },
      relations: ['share'],
      order: { paid_at: 'DESC', created_at: 'DESC' },
    });
  }

  async getSummary(meterId: string): Promise<SharePaymentSummary> {
    const payments = await this.findByMeter(meterId);
    const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const active = await this.sharesService.getActiveForDate(new Date());
    const total = active ? parseFloat(active.amount) : paid;

    const status: SharePaymentSummary['status'] =
      paid <= 0 ? 'pending' : paid >= total ? 'paid' : 'partial';

    return { paid, total, status };
  }

  async create(
    meterId: string,
    dto: CreateSharePaymentDto,
  ): Promise<SharePayment> {
    const meter = await this.metersRepository.findOne({
      where: { id: meterId },
    });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }

    const active = await this.sharesService.getActiveForDate(new Date());

    const evidenceKey = await this.uploadEvidence(dto.evidenceBase64);

    const paidAt = dto.paidAt || new Date().toISOString().split('T')[0];

    const member = await this.resolveMeterMember(meterId);

    const movement = {
      sourceType: FinanceSourceType.WATER_MEMBERSHIP_FEE,
      amount: dto.amount,
      concept: `Acción de agua${active?.name ? ` - ${active.name}` : ''}`,
      date: paidAt,
      memberId: member?.id ?? null,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      notes: dto.notes,
    };

    // Fails before the payment row exists, so a bad reference never leaves a
    // collected share without its ledger movement.
    await this.financesService.validateMovement({
      ...movement,
      sourceId: 'pending',
    });

    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SharePayment);
      const payment = repo.create({
        meter_id: meterId,
        share_id: active?.id,
        amount: dto.amount.toString(),
        payment_method: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        paid_at: paidAt,
        evidence_key: evidenceKey,
      });
      const created = await repo.save(payment);

      await this.financesService.recordIncome(
        { ...movement, sourceId: created.id },
        undefined,
        manager,
      );

      return created;
    });

    if (member?.phone) {
      setImmediate(() => {
        this.eventEmitter.emit('share.payment.created', {
          sharePaymentId: saved.id,
          phone: member.phone,
          phone_country: member.phone_country,
          filename: `comprobante-accion-${new Date().toISOString().split('T')[0]}.pdf`,
        });
      });
    }

    return saved;
  }

  private async resolveMeterMember(meterId: string): Promise<Member | null> {
    const meter = await this.metersRepository.findOne({
      where: { id: meterId },
      relations: ['member'],
    });
    return meter?.member ?? null;
  }

  async sumPaidByMeters(meterIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (meterIds.length === 0) {
      return result;
    }

    const rows = await this.repository
      .createQueryBuilder('sp')
      .select('sp.meter_id', 'meterId')
      .addSelect('SUM(CAST(sp.amount AS FLOAT))', 'paid')
      .where('sp.meter_id IN (:...meterIds)', { meterIds })
      .groupBy('sp.meter_id')
      .getRawMany<{ meterId: string; paid: string }>();

    for (const row of rows) {
      result.set(row.meterId, Number(row.paid));
    }
    return result;
  }
}
