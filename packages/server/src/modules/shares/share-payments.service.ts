import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { Repository } from 'typeorm';
import { StorageService } from '../consumption/storage.service';
import { Meter } from '../meters/entities/meter.entity';
import { CreateSharePaymentDto } from './dto/share-payment.dto';
import { SharePayment } from './entities/share-payment.entity';
import { SharesService } from './shares.service';

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

    const payment = this.repository.create({
      meter_id: meterId,
      share_id: active?.id,
      amount: dto.amount.toString(),
      payment_method: dto.paymentMethod,
      reference: dto.reference,
      notes: dto.notes,
      paid_at: dto.paidAt || new Date().toISOString().split('T')[0],
      evidence_key: evidenceKey,
    });
    const saved = await this.repository.save(payment);

    const savedWithRelations = await this.repository.findOne({
      where: { id: saved.id },
      relations: ['meter', 'meter.member'],
    });
    const member = savedWithRelations?.meter?.member;
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
