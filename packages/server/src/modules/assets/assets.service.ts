import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Not, Repository } from 'typeorm';
import type { StoredDocument } from '../consumption/storage.service';
import { StorageService } from '../consumption/storage.service';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { buildAssetCode } from '../../common/utils/asset-code';
import {
  Asset,
  AssetAcquisitionType,
  AssetCondition,
  AssetStatus,
} from './entities/asset.entity';
import {
  AssetDocument,
  AssetDocumentKind,
} from './entities/asset-document.entity';
import { AssetLocation } from './entities/asset-location.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import {
  AssetMovement,
  AssetMovementType,
} from './entities/asset-movement.entity';
import {
  CreateAssetDto,
  CreateAssetsBulkDto,
  ReportLostAssetDto,
  RestoreAssetDto,
  RetireAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import { UploadAssetDocumentDto } from './dto/asset-document.dto';
import {
  LoanAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
} from './dto/asset-movement.dto';
import {
  CreateAssetMaintenanceDto,
  FinishAssetMaintenanceDto,
} from './dto/asset-maintenance.dto';
import { FilterAssetDto } from './dto/filter-asset.dto';
import { FinancesService } from '../finances/finances.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';

const SORT_COLUMNS: Record<string, string> = {
  code: 'asset.code',
  name: 'asset.name',
  status: 'asset.status',
  condition: 'asset.condition',
  acquisition_date: 'asset.acquisition_date',
  acquisition_value: 'asset.acquisition_value',
  category: 'category.name',
  location: 'location.name',
  created_at: 'asset.created_at',
};

const ASSET_RELATIONS = [
  'category',
  'location',
  'currentResponsibleUser',
  'currentResponsibleMember',
  'retirementResponsibleUser',
];

const CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(AssetCategory)
    private readonly categoriesRepo: Repository<AssetCategory>,
    @InjectRepository(AssetLocation)
    private readonly locationsRepo: Repository<AssetLocation>,
    @InjectRepository(AssetMovement)
    private readonly movementsRepo: Repository<AssetMovement>,
    @InjectRepository(AssetMaintenance)
    private readonly maintenancesRepo: Repository<AssetMaintenance>,
    @InjectRepository(AssetDocument)
    private readonly documentsRepo: Repository<AssetDocument>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Member)
    private readonly membersRepo: Repository<Member>,
    private readonly storageService: StorageService,
    private readonly financesService: FinancesService,
    private readonly dataSource: DataSource,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async findAll(filter: FilterAssetDto): Promise<PaginatedResult<Asset>> {
    const { page, limit, sortBy, sortOrder } = filter;

    const query = this.assetsRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location')
      .leftJoinAndSelect('asset.currentResponsibleUser', 'responsibleUser')
      .leftJoinAndSelect('asset.currentResponsibleMember', 'responsibleMember');

    if (filter.search) {
      query.andWhere(
        '(asset.name ILIKE :search OR asset.code ILIKE :search OR asset.description ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }
    if (filter.categoryId) {
      query.andWhere('asset.category_id = :categoryId', {
        categoryId: filter.categoryId,
      });
    }
    if (filter.locationId) {
      query.andWhere('asset.location_id = :locationId', {
        locationId: filter.locationId,
      });
    }
    if (filter.status) {
      query.andWhere('asset.status = :status', { status: filter.status });
    }
    if (filter.condition) {
      query.andWhere('asset.condition = :condition', {
        condition: filter.condition,
      });
    }
    if (filter.acquisitionType) {
      query.andWhere('asset.acquisition_type = :acquisitionType', {
        acquisitionType: filter.acquisitionType,
      });
    }
    if (filter.responsibleMemberId) {
      query.andWhere('asset.current_responsible_member_id = :memberId', {
        memberId: filter.responsibleMemberId,
      });
    }
    if (filter.responsibleUserId) {
      query.andWhere('asset.current_responsible_user_id = :userId', {
        userId: filter.responsibleUserId,
      });
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
      query.orderBy('asset.created_at', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  findAllForSelect(): Promise<
    Pick<Asset, 'id' | 'code' | 'name' | 'status'>[]
  > {
    return this.assetsRepo.find({
      select: ['id', 'code', 'name', 'status'],
      where: { status: Not(AssetStatus.RETIRED) },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string, includeHistory = false): Promise<Asset> {
    const asset = await this.assetsRepo.findOne({
      where: { id },
      relations: ASSET_RELATIONS,
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (includeHistory) {
      asset.movements = await this.movementsRepo.find({
        where: { asset_id: asset.id },
        relations: [
          'fromLocation',
          'toLocation',
          'responsibleUser',
          'responsibleMember',
        ],
        order: { moved_at: 'DESC', created_at: 'DESC' },
      });
      asset.maintenances = await this.maintenancesRepo.find({
        where: { asset_id: asset.id },
        relations: ['expenseTransaction'],
        order: { started_at: 'DESC', created_at: 'DESC' },
      });
      asset.documents = await this.documentsRepo.find({
        where: { asset_id: asset.id },
        order: { created_at: 'DESC' },
      });
    }

    return asset;
  }

  /**
   * Minimal projection used to resolve a scanned asset code. Deliberately
   * omits notes, acquisition value and retirement details.
   */
  async findPublicByCode(code: string): Promise<{
    code: string;
    name: string;
    description: string | null;
    status: AssetStatus;
    condition: AssetCondition;
    category: string | null;
    location: string | null;
    responsible: string | null;
  }> {
    const asset = await this.assetsRepo.findOne({
      where: { code },
      relations: [
        'category',
        'location',
        'currentResponsibleUser',
        'currentResponsibleMember',
      ],
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const member = asset.currentResponsibleMember;
    const user = asset.currentResponsibleUser;

    return {
      code: asset.code,
      name: asset.name,
      description: asset.description,
      status: asset.status,
      condition: asset.condition,
      category: asset.category?.name ?? null,
      location: asset.location?.name ?? null,
      responsible: member
        ? `${member.first_name} ${member.last_name}`
        : (user?.full_name ?? null),
    };
  }

  /**
   * QR descriptor. The payload is the asset code so the encoded value stays
   * stable and human readable; the path is what a label should point to.
   */
  async getQrPayload(id: string): Promise<{
    code: string;
    payload: string;
    path: string;
  }> {
    const asset = await this.findOne(id);
    return {
      code: asset.code,
      payload: asset.code,
      path: `/bienes/${encodeURIComponent(asset.code)}`,
    };
  }

  async create(dto: CreateAssetDto): Promise<Asset> {
    await this.assertAssetReferences(dto);

    const asset = this.assetsRepo.create({
      code: await this.generateUniqueCode(),
      name: dto.name,
      description: dto.description ?? null,
      category_id: dto.categoryId ?? null,
      location_id: dto.locationId ?? null,
      status: AssetStatus.ACTIVE,
      condition: dto.condition ?? AssetCondition.GOOD,
      quantity: dto.quantity ?? 1,
      acquisition_date: dto.acquisitionDate ?? null,
      acquisition_value:
        dto.acquisitionValue !== undefined
          ? dto.acquisitionValue.toFixed(2)
          : null,
      acquisition_type: dto.acquisitionType ?? null,
      current_responsible_user_id: dto.currentResponsibleUserId ?? null,
      current_responsible_member_id: dto.currentResponsibleMemberId ?? null,
      notes: dto.notes ?? null,
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Asset).save(asset);

      await this.recordPurchaseExpense(saved, manager);

      return saved;
    });
  }

  /**
   * Pushes the acquisition cost of a purchased asset into the ledger as expense.
   * Donations, transfers and constructions are not money leaving the OTB, so they
   * are ignored. Idempotent through the asset id as source id.
   */
  private async recordPurchaseExpense(
    asset: Asset,
    manager?: EntityManager,
  ): Promise<void> {
    if (asset.acquisition_type !== AssetAcquisitionType.PURCHASE) return;
    const value = asset.acquisition_value
      ? parseFloat(asset.acquisition_value)
      : 0;
    if (!Number.isFinite(value) || value <= 0) return;

    const input = {
      sourceType: FinanceSourceType.ASSET_PURCHASE,
      sourceId: asset.id,
      amount: value,
      concept: `Compra de bien ${asset.code} - ${asset.name}`,
      date: asset.acquisition_date ?? undefined,
      assetId: asset.id,
      notes: asset.description ?? undefined,
    };

    if (!manager) {
      await this.financesService.recordExpense(input);
      return;
    }

    await this.financesService.validateMovement(input, manager);
    await this.financesService.recordExpense(input, undefined, manager);
  }

  /**
   * Registers one expense for the whole bulk lot. Each unit keeps its share of the
   * acquisition value on the asset record, while the ledger gets a single movement
   * matching the real purchase. Source id is the code range so a replayed lot maps
   * to the same movement.
   */
  private async recordBulkPurchaseExpense(
    dto: CreateAssetsBulkDto,
    assets: Asset[],
    manager?: EntityManager,
  ): Promise<void> {
    if (dto.acquisitionType !== AssetAcquisitionType.PURCHASE) return;
    const total = dto.acquisitionValue ?? 0;
    if (!Number.isFinite(total) || total <= 0 || assets.length === 0) return;

    const first = assets[0].code;
    const last = assets[assets.length - 1].code;

    const input = {
      sourceType: FinanceSourceType.ASSET_PURCHASE,
      sourceId: `bulk:${first}-${last}`,
      amount: total,
      concept: `Compra de lote ${assets.length} x ${dto.name} (${first} a ${last})`,
      date: dto.acquisitionDate ?? undefined,
      notes: dto.description ?? undefined,
    };

    if (!manager) {
      await this.financesService.recordExpense(input);
      return;
    }

    await this.financesService.validateMovement(input, manager);
    await this.financesService.recordExpense(input, undefined, manager);
  }

  /**
   * Creates N individual assets sharing the same data, each with its own
   * sequential code. Homogeneous lots stay traceable unit by unit.
   */
  async createBulk(dto: CreateAssetsBulkDto): Promise<Asset[]> {
    await this.assertAssetReferences(dto);

    const start = await this.nextCodeSequence();
    const codes: string[] = [];
    for (let index = 0; index < dto.count; index++) {
      codes.push(buildAssetCode(start + index));
    }

    const taken = await this.assetsRepo
      .createQueryBuilder('a')
      .where('a.code IN (:...codes)', { codes })
      .getCount();
    if (taken > 0) {
      throw new ConflictException(
        'Asset codes were already taken, please retry the bulk creation',
      );
    }

    const unitValue =
      dto.acquisitionValue !== undefined
        ? (dto.acquisitionValue / dto.count).toFixed(2)
        : null;

    const assets = codes.map((code) =>
      this.assetsRepo.create({
        code,
        name: dto.name,
        description: dto.description ?? null,
        category_id: dto.categoryId ?? null,
        location_id: dto.locationId ?? null,
        status: AssetStatus.ACTIVE,
        condition: dto.condition ?? AssetCondition.GOOD,
        quantity: 1,
        acquisition_date: dto.acquisitionDate ?? null,
        acquisition_value: unitValue,
        acquisition_type: dto.acquisitionType ?? null,
        notes: dto.notes ?? null,
      }),
    );

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Asset).save(assets);

      await this.recordBulkPurchaseExpense(dto, saved, manager);

      return saved;
    });
  }

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException(
        'A retired asset cannot be edited. Restore it first.',
      );
    }
    await this.assertAssetReferences(dto);
    this.assertSingleResponsible(dto);

    Object.assign(asset, {
      name: dto.name ?? asset.name,
      description: dto.description ?? asset.description,
      category_id: dto.categoryId ?? asset.category_id,
      location_id: dto.locationId ?? asset.location_id,
      condition: dto.condition ?? asset.condition,
      quantity: dto.quantity ?? asset.quantity,
      acquisition_date: dto.acquisitionDate ?? asset.acquisition_date,
      acquisition_value:
        dto.acquisitionValue !== undefined
          ? dto.acquisitionValue.toFixed(2)
          : asset.acquisition_value,
      acquisition_type: dto.acquisitionType ?? asset.acquisition_type,
      current_responsible_user_id:
        dto.currentResponsibleUserId ?? asset.current_responsible_user_id,
      current_responsible_member_id:
        dto.currentResponsibleMemberId ?? asset.current_responsible_member_id,
      notes: dto.notes ?? asset.notes,
    });

    return this.assetsRepo.save(asset);
  }

  /**
   * Hard delete is only allowed while the asset has no history. Anything with
   * movements or maintenances must be retired instead.
   */
  async remove(id: string): Promise<void> {
    const asset = await this.findOne(id);

    const [movements, maintenances] = await Promise.all([
      this.movementsRepo.countBy({ asset_id: asset.id }),
      this.maintenancesRepo.countBy({ asset_id: asset.id }),
    ]);

    if (movements > 0 || maintenances > 0) {
      throw new BadRequestException(
        'Assets with movement or maintenance history cannot be deleted. Retire the asset instead.',
      );
    }

    await this.deleteStoredDocuments(asset.id);
    await this.assetsRepo.remove(asset);
  }

  async loan(id: string, dto: LoanAssetDto, userId?: string): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('A retired asset cannot be loaned');
    }
    if (asset.status === AssetStatus.IN_MAINTENANCE) {
      throw new BadRequestException(
        'Finish the maintenance before loaning this asset',
      );
    }
    if (asset.status === AssetStatus.LOANED) {
      throw new BadRequestException('This asset already has an open loan');
    }

    if (!dto.responsibleUserId && !dto.responsibleMemberId) {
      throw new BadRequestException(
        'A loan requires a responsible user or member',
      );
    }
    this.assertSingleResponsible(dto);
    await this.assertLocationExists(dto.toLocationId);
    await this.assertResponsibleExists(dto);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        asset_id: asset.id,
        type: AssetMovementType.LOAN,
        from_location_id: asset.location_id,
        to_location_id: dto.toLocationId ?? asset.location_id,
        responsible_user_id: dto.responsibleUserId ?? null,
        responsible_member_id: dto.responsibleMemberId ?? null,
        motive: dto.motive,
        moved_at: dto.movedAt ?? this.today(),
        returned_at: null,
        notes: dto.notes ?? null,
        created_by: userId ?? null,
      }),
    );

    asset.status = AssetStatus.LOANED;
    asset.location_id = dto.toLocationId ?? asset.location_id;
    asset.current_responsible_user_id = dto.responsibleUserId ?? null;
    asset.current_responsible_member_id = dto.responsibleMemberId ?? null;

    return this.assetsRepo.save(asset);
  }

  async returnAsset(id: string, dto: ReturnAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('A retired asset cannot be returned');
    }

    const openLoan = await this.findOpenLoan(asset.id);
    if (!openLoan) {
      throw new BadRequestException('This asset has no open loan');
    }

    await this.assertLocationExists(dto.returnLocationId);

    openLoan.returned_at = dto.returnedAt ?? this.today();
    if (dto.notes) {
      openLoan.notes = dto.notes;
    }
    await this.movementsRepo.save(openLoan);

    asset.status = AssetStatus.ACTIVE;
    asset.location_id =
      dto.returnLocationId ?? openLoan.from_location_id ?? asset.location_id;
    asset.current_responsible_user_id = null;
    asset.current_responsible_member_id = null;

    return this.assetsRepo.save(asset);
  }

  async transfer(
    id: string,
    dto: TransferAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('A retired asset cannot be transferred');
    }
    if (asset.status === AssetStatus.LOANED) {
      throw new BadRequestException(
        'Return the asset before changing its location',
      );
    }
    if (dto.toLocationId === asset.location_id) {
      throw new BadRequestException(
        'The destination location is already the current location',
      );
    }
    await this.assertLocationExists(dto.toLocationId);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        asset_id: asset.id,
        type: AssetMovementType.TRANSFER,
        from_location_id: asset.location_id,
        to_location_id: dto.toLocationId,
        motive: dto.motive ?? null,
        moved_at: dto.movedAt ?? this.today(),
        returned_at: dto.movedAt ?? this.today(),
        created_by: userId ?? null,
        notes: dto.notes ?? null,
      }),
    );

    asset.location_id = dto.toLocationId;
    return this.assetsRepo.save(asset);
  }

  async reportLost(
    id: string,
    dto: ReportLostAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.LOST) {
      throw new BadRequestException('This asset is already marked as lost');
    }
    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('A retired asset cannot be marked as lost');
    }
    if (asset.status === AssetStatus.LOANED) {
      throw new BadRequestException(
        'Return the asset before marking it as lost',
      );
    }
    if (asset.status === AssetStatus.IN_MAINTENANCE) {
      throw new BadRequestException(
        'Finish the maintenance before marking it as lost',
      );
    }

    await this.movementsRepo.save(
      this.movementsRepo.create({
        asset_id: asset.id,
        type: AssetMovementType.LOST,
        from_location_id: asset.location_id,
        to_location_id: null,
        motive: dto.reason ?? null,
        moved_at: this.today(),
        returned_at: this.today(),
        created_by: userId ?? null,
      }),
    );

    asset.status = AssetStatus.LOST;
    asset.current_responsible_user_id = null;
    asset.current_responsible_member_id = null;

    return this.assetsRepo.save(asset);
  }

  async retire(
    id: string,
    dto: RetireAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException('This asset is already retired');
    }

    const openLoan = await this.findOpenLoan(asset.id);
    if (openLoan) {
      throw new BadRequestException('Return the asset before retiring it');
    }
    const openMaintenance = await this.findOpenMaintenance(asset.id);
    if (openMaintenance) {
      throw new BadRequestException(
        'Finish the maintenance before retiring this asset',
      );
    }
    await this.assertUserExists(dto.responsibleUserId);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        asset_id: asset.id,
        type: AssetMovementType.RETIREMENT,
        from_location_id: asset.location_id,
        to_location_id: null,
        responsible_user_id: dto.responsibleUserId ?? null,
        motive: dto.reason,
        moved_at: dto.retiredAt,
        returned_at: dto.retiredAt,
        notes: dto.notes ?? null,
        created_by: userId ?? null,
      }),
    );

    asset.status = AssetStatus.RETIRED;
    asset.retired_at = dto.retiredAt;
    asset.retirement_reason = dto.reason;
    asset.retirement_responsible_user_id = dto.responsibleUserId ?? null;
    asset.current_responsible_user_id = null;
    asset.current_responsible_member_id = null;

    return this.assetsRepo.save(asset);
  }

  async restore(
    id: string,
    dto: RestoreAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);

    if (asset.status !== AssetStatus.RETIRED) {
      throw new BadRequestException('Only retired assets can be restored');
    }

    await this.movementsRepo.save(
      this.movementsRepo.create({
        asset_id: asset.id,
        type: AssetMovementType.RESTORE,
        from_location_id: null,
        to_location_id: asset.location_id,
        motive: null,
        moved_at: this.today(),
        returned_at: this.today(),
        notes: dto.notes ?? null,
        created_by: userId ?? null,
      }),
    );

    asset.status = AssetStatus.ACTIVE;
    asset.retired_at = null;
    asset.retirement_reason = null;
    asset.retirement_responsible_user_id = null;

    return this.assetsRepo.save(asset);
  }

  async addMaintenance(
    id: string,
    dto: CreateAssetMaintenanceDto,
    userId?: string,
  ): Promise<AssetMaintenance> {
    const asset = await this.findOne(id);

    if (asset.status === AssetStatus.RETIRED) {
      throw new BadRequestException(
        'A retired asset cannot be sent to maintenance',
      );
    }
    if (asset.status === AssetStatus.LOANED) {
      throw new BadRequestException(
        'Return the asset before sending it to maintenance',
      );
    }
    if (asset.status === AssetStatus.LOST) {
      throw new BadRequestException(
        'A lost asset cannot be sent to maintenance',
      );
    }

    const existing = await this.findOpenMaintenance(asset.id);
    if (existing) {
      throw new BadRequestException(
        'This asset already has an open maintenance',
      );
    }

    const maintenance = await this.maintenancesRepo.save(
      this.maintenancesRepo.create({
        asset_id: asset.id,
        reason: dto.reason,
        started_at: dto.startedAt ?? this.today(),
        finished_at: null,
        cost: dto.cost !== undefined ? dto.cost.toFixed(2) : null,
        provider: dto.provider ?? null,
        notes: dto.notes ?? null,
        created_by: userId ?? null,
      }),
    );

    asset.status = AssetStatus.IN_MAINTENANCE;
    await this.assetsRepo.save(asset);

    return maintenance;
  }

  async finishMaintenance(
    id: string,
    maintenanceId: string,
    dto: FinishAssetMaintenanceDto,
  ): Promise<AssetMaintenance> {
    const asset = await this.findOne(id);

    const maintenance = await this.maintenancesRepo.findOneBy({
      id: maintenanceId,
      asset_id: asset.id,
    });
    if (!maintenance) {
      throw new NotFoundException(
        `Asset maintenance ${maintenanceId} not found`,
      );
    }
    if (maintenance.finished_at) {
      throw new BadRequestException('This maintenance is already closed');
    }

    maintenance.finished_at = dto.finishedAt ?? this.today();
    if (dto.cost !== undefined) {
      maintenance.cost = dto.cost.toFixed(2);
    }
    maintenance.provider = dto.provider ?? maintenance.provider;
    maintenance.notes = dto.notes ?? maintenance.notes;

    if (dto.condition) {
      asset.condition = dto.condition;
    }
    asset.status = AssetStatus.ACTIVE;

    return this.dataSource.transaction(async (manager) => {
      const savedMaintenance = await manager
        .getRepository(AssetMaintenance)
        .save(maintenance);
      const savedAsset = await manager.getRepository(Asset).save(asset);

      await this.recordMaintenanceExpense(
        savedAsset,
        savedMaintenance,
        manager,
      );

      return savedMaintenance;
    });
  }

  /**
   * Pushes the closed maintenance cost into the ledger as expense and links the
   * resulting movement on the maintenance record. The cost is expensed when the
   * maintenance is closed, because that is when the real amount is known.
   * Idempotent through the maintenance id as source id.
   */
  private async recordMaintenanceExpense(
    asset: Asset,
    maintenance: AssetMaintenance,
    manager?: EntityManager,
  ): Promise<void> {
    const cost = maintenance.cost ? parseFloat(maintenance.cost) : 0;
    if (!Number.isFinite(cost) || cost <= 0) return;

    const input = {
      sourceType: FinanceSourceType.ASSET_MAINTENANCE,
      sourceId: maintenance.id,
      amount: cost,
      concept: `Mantenimiento ${asset.code} - ${asset.name}`,
      date: maintenance.finished_at ?? undefined,
      assetId: asset.id,
      provider: maintenance.provider ?? undefined,
      notes: maintenance.reason,
    };

    const transaction = manager
      ? await this.financesService.recordExpense(input, undefined, manager)
      : await this.financesService.recordExpense(input);

    if (!transaction) return;

    maintenance.expense_transaction_id = transaction.id;
    await (
      manager ? manager.getRepository(AssetMaintenance) : this.maintenancesRepo
    ).save(maintenance);
  }

  listMovements(assetId: string): Promise<AssetMovement[]> {
    return this.movementsRepo.find({
      where: { asset_id: assetId },
      relations: [
        'fromLocation',
        'toLocation',
        'responsibleUser',
        'responsibleMember',
      ],
      order: { moved_at: 'DESC', created_at: 'DESC' },
    });
  }

  listMaintenances(assetId: string): Promise<AssetMaintenance[]> {
    return this.maintenancesRepo.find({
      where: { asset_id: assetId },
      order: { started_at: 'DESC', created_at: 'DESC' },
    });
  }

  listDocuments(assetId: string): Promise<AssetDocument[]> {
    return this.documentsRepo.find({
      where: { asset_id: assetId },
      order: { created_at: 'DESC' },
    });
  }

  async addDocument(
    id: string,
    dto: UploadAssetDocumentDto,
    userId?: string,
  ): Promise<AssetDocument> {
    const asset = await this.findOne(id);

    let stored: StoredDocument | null;
    try {
      stored = await this.storageService.uploadDocument(
        dto.fileBase64,
        'assets/documents',
        dto.fileName,
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    if (!stored) {
      throw new BadRequestException('Could not store the uploaded document');
    }

    return this.documentsRepo.save(
      this.documentsRepo.create({
        asset_id: asset.id,
        file_key: stored.file_key,
        file_name: stored.file_name,
        mime_type: stored.mime_type,
        file_size: stored.file_size,
        kind:
          dto.kind ??
          (stored.mime_type.startsWith('image/')
            ? AssetDocumentKind.PHOTO
            : AssetDocumentKind.INVOICE),
        uploaded_by: userId ?? null,
      }),
    );
  }

  async removeDocument(assetId: string, documentId: string): Promise<void> {
    const document = await this.documentsRepo.findOneBy({
      id: documentId,
      asset_id: assetId,
    });
    if (!document) {
      throw new NotFoundException(`Asset document ${documentId} not found`);
    }

    await this.documentsRepo.remove(document);
    await this.deleteStoredObject(document.file_key);
  }

  async getDocumentContent(
    assetId: string,
    documentId: string,
  ): ReturnType<StorageService['getObjectStream']> {
    const document = await this.documentsRepo.findOneBy({
      id: documentId,
      asset_id: assetId,
    });
    if (!document) {
      throw new NotFoundException(`Asset document ${documentId} not found`);
    }
    return this.storageService.getObjectStream(document.file_key);
  }

  async getStatusSummary(): Promise<Record<AssetStatus, number>> {
    const rows = await this.assetsRepo
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('asset.status')
      .getRawMany<{ status: string; total: string }>();

    const summary: Record<AssetStatus, number> = {
      [AssetStatus.ACTIVE]: 0,
      [AssetStatus.LOANED]: 0,
      [AssetStatus.IN_MAINTENANCE]: 0,
      [AssetStatus.LOST]: 0,
      [AssetStatus.RETIRED]: 0,
    };

    for (const row of rows) {
      const key = row.status as AssetStatus;
      if (key in summary) {
        summary[key] = Number(row.total);
      }
    }

    return summary;
  }

  async getPortfolioValue(): Promise<number> {
    const row = await this.assetsRepo
      .createQueryBuilder('asset')
      .select(
        'COALESCE(SUM(CAST(asset.acquisition_value AS FLOAT)), 0)',
        'total',
      )
      .where('asset.status != :retired', { retired: AssetStatus.RETIRED })
      .getRawOne<{ total: string }>();

    return Number(row?.total ?? 0);
  }

  private findOpenLoan(assetId: string): Promise<AssetMovement | null> {
    return this.movementsRepo.findOne({
      where: {
        asset_id: assetId,
        type: AssetMovementType.LOAN,
        returned_at: IsNull(),
      },
      order: { moved_at: 'DESC', created_at: 'DESC' },
    });
  }

  private findOpenMaintenance(
    assetId: string,
  ): Promise<AssetMaintenance | null> {
    return this.maintenancesRepo.findOne({
      where: { asset_id: assetId, finished_at: IsNull() },
      order: { started_at: 'DESC', created_at: 'DESC' },
    });
  }

  private async nextCodeSequence(): Promise<number> {
    const row = await this.assetsRepo
      .createQueryBuilder('asset')
      .select('COUNT(*)', 'total')
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0) + 1;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = buildAssetCode(await this.nextCodeSequence());
      const existing = await this.assetsRepo.findOneBy({ code });
      if (!existing) return code;
    }
    throw new InternalServerErrorException(
      'Could not generate a unique asset code',
    );
  }

  private assertSingleResponsible(dto: {
    currentResponsibleUserId?: string;
    currentResponsibleMemberId?: string;
    responsibleUserId?: string;
    responsibleMemberId?: string;
  }): void {
    const userId =
      dto.currentResponsibleUserId ?? dto.responsibleUserId ?? undefined;
    const memberId =
      dto.currentResponsibleMemberId ?? dto.responsibleMemberId ?? undefined;

    if (userId && memberId) {
      throw new BadRequestException(
        'An asset can only have one responsible party at a time',
      );
    }
  }

  private async assertAssetReferences(dto: {
    categoryId?: string;
    locationId?: string;
    currentResponsibleUserId?: string;
    currentResponsibleMemberId?: string;
  }): Promise<void> {
    if (dto.categoryId) {
      const category = await this.categoriesRepo.findOneBy({
        id: dto.categoryId,
      });
      if (!category) {
        throw new BadRequestException('Asset category not found');
      }
    }
    if (dto.locationId) {
      await this.assertLocationExists(dto.locationId);
    }
    if (dto.currentResponsibleUserId) {
      await this.assertUserExists(dto.currentResponsibleUserId);
    }
    if (dto.currentResponsibleMemberId) {
      const member = await this.membersRepo.findOneBy({
        id: dto.currentResponsibleMemberId,
      });
      if (!member) {
        throw new BadRequestException('Member not found');
      }
    }
  }

  private async assertResponsibleExists(dto: {
    responsibleUserId?: string;
    responsibleMemberId?: string;
  }): Promise<void> {
    if (dto.responsibleUserId) {
      await this.assertUserExists(dto.responsibleUserId);
    }
    if (dto.responsibleMemberId) {
      const member = await this.membersRepo.findOneBy({
        id: dto.responsibleMemberId,
      });
      if (!member) {
        throw new BadRequestException('Member not found');
      }
    }
  }

  private async assertUserExists(userId?: string | null): Promise<void> {
    if (!userId) return;
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }
  }

  private async assertLocationExists(
    locationId?: string | null,
  ): Promise<void> {
    if (!locationId) return;
    const location = await this.locationsRepo.findOneBy({ id: locationId });
    if (!location) {
      throw new BadRequestException('Asset location not found');
    }
  }

  private async deleteStoredDocuments(assetId: string): Promise<void> {
    const documents = await this.documentsRepo.findBy({ asset_id: assetId });
    await Promise.all(
      documents.map((document) => this.deleteStoredObject(document.file_key)),
    );
  }

  private async deleteStoredObject(key: string): Promise<void> {
    try {
      await this.storageService.delete(key);
    } catch (error) {
      this.logger.warn(
        `Could not delete stored object ${key}: ${(error as Error).message}`,
      );
    }
  }
}
