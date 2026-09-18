import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { DataSource, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Member } from '../members/entities/member.entity';
import { SharePayment } from '../shares/entities/share-payment.entity';
import { SharePaymentsService } from '../shares/share-payments.service';
import { SharesService } from '../shares/shares.service';
import { BaseTariffService } from '../tariffs/base-tariff.service';
import { CreateMeterDto, UpdateMeterDto } from './dto/meter.dto';
import { Meter, MeterStatus } from './entities/meter.entity';

export interface MeterListItem extends Meter {
  sharePaid: number;
  shareTotal: number;
}

const SORT_COLUMNS: Record<string, string> = {
  code: 'meter.code',
  type: 'type.name',
  status: 'meter.status',
  address: 'meter.address',
  installed_at: 'meter.installed_at',
  created_at: 'meter.created_at',
  member: 'member.first_name',
};

@Injectable()
export class MetersService {
  private readonly logger = new Logger(MetersService.name);

  constructor(
    @InjectRepository(Meter)
    private readonly metersRepository: Repository<Meter>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(SharePayment)
    private readonly sharePaymentsRepository: Repository<SharePayment>,
    private readonly sharePaymentsService: SharePaymentsService,
    private readonly sharesService: SharesService,
    private readonly baseTariffService: BaseTariffService,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters: { status?: MeterStatus; type?: string; search?: string } = {},
  ): Promise<PaginatedResult<MeterListItem>> {
    const { page, limit, sortBy, sortOrder } = pagination;
    const query = this.metersRepository
      .createQueryBuilder('meter')
      .leftJoinAndSelect('meter.member', 'member')
      .leftJoinAndSelect('meter.type', 'type');

    if (filters.status) {
      query.andWhere('meter.status = :status', { status: filters.status });
    }
    if (filters.type) {
      query.andWhere('meter.type_id = :typeId', { typeId: filters.type });
    }
    if (filters.search) {
      query.andWhere(
        '(meter.code ILIKE :search OR member.first_name ILIKE :search OR member.last_name ILIKE :search OR member.ci ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const sortColumns = buildOrder(sortBy, sortOrder, SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) {
          query.orderBy(column, dir);
        } else {
          query.addOrderBy(column, dir);
        }
      });
    } else {
      query.orderBy('meter.created_at', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const sharePaidMap = await this.sharePaymentsService.sumPaidByMeters(
      items.map((m) => m.id),
    );
    const activeShare = await this.sharesService.getActiveForDate(new Date());
    const shareTotal = activeShare ? parseFloat(activeShare.amount) : 0;

    const itemsWithShare: MeterListItem[] = items.map((meter) => ({
      ...meter,
      sharePaid: sharePaidMap.get(meter.id) ?? 0,
      shareTotal,
    }));

    return {
      items: itemsWithShare,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Meter> {
    const meter = await this.metersRepository.findOne({
      where: { id },
      relations: ['member', 'consumptions'],
    });
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    return meter;
  }

  async findAllForMap(): Promise<Meter[]> {
    return this.metersRepository.find({
      relations: ['member'],
    });
  }

  async findByMember(memberId: string): Promise<Meter[]> {
    return this.metersRepository.find({
      where: { member_id: memberId },
      relations: ['member'],
    });
  }

  async create(dto: CreateMeterDto): Promise<Meter> {
    const existing = await this.metersRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('A meter with this code already exists');
    }
    const member = await this.membersRepository.findOne({
      where: { id: dto.memberId },
    });
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    const activeShare = await this.sharesService.getActiveForDate(new Date());

    const evidenceKey = dto.shareEvidenceBase64
      ? await this.sharePaymentsService.uploadEvidence(dto.shareEvidenceBase64)
      : undefined;

    const meter = await this.dataSource.transaction(async (manager) => {
      const meterRepo = manager.getRepository(Meter);
      const created = await meterRepo.save(
        meterRepo.create({
          code: dto.code,
          member_id: dto.memberId,
          address: dto.address,
          latitude: dto.latitude?.toString(),
          longitude: dto.longitude?.toString(),
          type_id: dto.typeId,
          status: dto.status || MeterStatus.ACTIVE,
        }),
      );

      if (dto.shareAmount) {
        const sharePaymentsRepo = manager.getRepository(SharePayment);
        await sharePaymentsRepo.save(
          sharePaymentsRepo.create({
            meter_id: created.id,
            share_id: activeShare?.id,
            amount: dto.shareAmount.toString(),
            payment_method: dto.sharePaymentMethod,
            reference: dto.shareReference,
            notes: dto.shareNotes,
            evidence_key: evidenceKey,
            paid_at: new Date().toISOString().split('T')[0],
          }),
        );
      }

      return created;
    });

    const created = await this.findOne(meter.id);

    if (member?.phone) {
      setImmediate(async () => {
        try {
          let amount = '';
          const baseTariff = await this.baseTariffService.getValidForDate(
            new Date(),
            created.type_id,
          );
          if (baseTariff) {
            amount = baseTariff.amount;
          } else {
            this.logger.warn(
              `No base tariff found for meter type ${created.type_id}, sending without amount`,
            );
          }

          const location =
            created.latitude && created.longitude
              ? `https://www.google.com/maps?q=${created.latitude},${created.longitude}`
              : '';

          this.eventEmitter.emit('meter.created', {
            phone: member.phone,
            phone_country: member.phone_country,
            vars: {
              fullName: `${member.first_name} ${member.last_name}`,
              meterCode: created.code,
              meterType: created.type?.name ?? '',
              amount,
              location,
            },
          });
        } catch (error) {
          this.logger.warn(
            `Meter registered send failed in background: ${
              (error as Error).message ?? error
            }`,
          );
        }
      });
    }

    if (dto.shareAmount && member?.phone) {
      setImmediate(async () => {
        try {
          const sharePayment = await this.sharePaymentsRepository.findOne({
            where: { meter_id: created.id },
            relations: ['meter', 'meter.member'],
            order: { created_at: 'DESC' },
          });
          if (sharePayment) {
            this.eventEmitter.emit('share.payment.created', {
              sharePaymentId: sharePayment.id,
              phone: member.phone,
              phone_country: member.phone_country,
              filename: `comprobante-accion-${new Date().toISOString().split('T')[0]}.pdf`,
            });
          }
        } catch (error) {
          this.logger.warn(
            `Share receipt send failed in background: ${
              (error as Error).message ?? error
            }`,
          );
        }
      });
    }

    return created;
  }

  async update(id: string, dto: UpdateMeterDto): Promise<Meter> {
    const meter = await this.findOne(id);
    if (dto.code && dto.code !== meter.code) {
      const existing = await this.metersRepository.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException('A meter with this code already exists');
      }
    }
    if (dto.memberId) {
      const member = await this.membersRepository.findOne({
        where: { id: dto.memberId },
      });
      if (!member) {
        throw new BadRequestException('Member not found');
      }
    }
    Object.assign(meter, {
      code: dto.code ?? meter.code,
      member_id: dto.memberId ?? meter.member_id,
      address: dto.address ?? meter.address,
      latitude:
        dto.latitude !== undefined ? dto.latitude.toString() : meter.latitude,
      longitude:
        dto.longitude !== undefined
          ? dto.longitude.toString()
          : meter.longitude,
      type_id: dto.typeId ?? meter.type_id,
      status: dto.status ?? meter.status,
    });
    return this.metersRepository.save(meter);
  }

  async decommission(id: string): Promise<Meter> {
    const meter = await this.findOne(id);
    meter.status = MeterStatus.DECOMMISSIONED;
    return this.metersRepository.save(meter);
  }

  async remove(id: string): Promise<void> {
    const meter = await this.findOne(id);
    await this.metersRepository.remove(meter);
  }
}
