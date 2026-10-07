import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityEvidence,
  EvidenceType,
} from './entities/activity-evidence.entity';
import { ActivitiesService } from './activities.service';
import { CreateActivityEvidenceDto } from './dto/activity-evidence.dto';
import { StorageService } from '../consumption/storage.service';

const FOLDER = 'activities-evidence';
const ONLY_IMAGES_AND_PDF = 'Solo se permiten imágenes y PDF';

@Injectable()
export class ActivityEvidenceService {
  constructor(
    @InjectRepository(ActivityEvidence)
    private readonly repo: Repository<ActivityEvidence>,
    private readonly activitiesService: ActivitiesService,
    private readonly storageService: StorageService,
  ) {}

  private withUrl(evidence: ActivityEvidence) {
    return {
      ...evidence,
      url: this.storageService.getPublicUrl(evidence.file_key),
    };
  }

  async findAll(activityId: string): Promise<ActivityEvidence[]> {
    await this.activitiesService.findOne(activityId);
    const items = await this.repo.find({
      where: { activity_id: activityId },
      relations: ['uploadedBy'],
      order: { created_at: 'DESC' },
    });
    return items.map((item) => this.withUrl(item));
  }

  async create(
    activityId: string,
    dto: CreateActivityEvidenceDto,
    userId: string,
  ): Promise<ActivityEvidence> {
    await this.activitiesService.findOne(activityId);

    if (dto.type === EvidenceType.VIDEO || !this.isAllowedMime(dto.mimeType)) {
      throw new BadRequestException(ONLY_IMAGES_AND_PDF);
    }

    const type = dto.type ?? this.inferType(dto.mimeType);

    let stored: {
      file_key: string;
      file_name: string;
      mime_type: string;
      file_size: number;
    } | null;
    try {
      stored = await this.storageService.uploadDocument(
        dto.fileBase64,
        FOLDER,
        dto.fileName,
      );
    } catch (error) {
      // Storage connectivity problems must not surface as an opaque 500.
      throw new ServiceUnavailableException(
        'El almacenamiento de evidencias no está disponible',
      );
    }

    if (!stored) {
      throw new BadRequestException('No se pudo guardar el archivo');
    }

    const saved = await this.repo.save(
      this.repo.create({
        activity_id: activityId,
        type,
        file_key: stored.file_key,
        file_name: stored.file_name,
        mime_type: stored.mime_type,
        size: String(stored.file_size),
        description: dto.description ?? null,
        uploaded_by_user_id: userId,
      }),
    );
    return this.withUrl(saved);
  }

  async remove(activityId: string, id: string): Promise<void> {
    const evidence = await this.repo.findOneBy({ id, activity_id: activityId });
    if (!evidence) throw new NotFoundException('Evidencia no encontrada');
    await this.repo.remove(evidence);
    try {
      await this.storageService.delete(evidence.file_key);
    } catch {
      // The row is already gone; an orphan object is preferable to failing the
      // request.
    }
  }

  private isAllowedMime(mimeType: string): boolean {
    const mime = mimeType.toLowerCase();
    return mime.startsWith('image/') || mime === 'application/pdf';
  }

  private inferType(mimeType: string): EvidenceType {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith('image/')) return EvidenceType.PHOTO;
    if (mime === 'application/pdf') return EvidenceType.PDF;
    return EvidenceType.DOCUMENT;
  }
}
