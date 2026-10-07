import { BadRequestException } from '@nestjs/common';
import { ActivityEvidenceService } from './activity-evidence.service';
import { EvidenceType } from './entities/activity-evidence.entity';

function makeService() {
  const repo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, id: 'ev-1' })),
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn().mockResolvedValue(null),
    remove: jest.fn(),
  };
  const activitiesService = {
    findOne: jest.fn().mockResolvedValue({ id: 'act-1' }),
  };
  const storageService = {
    uploadDocument: jest.fn().mockResolvedValue({
      file_key: 'activities-evidence/x.jpg',
      file_name: 'x.jpg',
      mime_type: 'image/jpeg',
      file_size: 100,
    }),
    getPublicUrl: jest.fn().mockReturnValue('https://cdn/x.jpg'),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ActivityEvidenceService(
    repo as never,
    activitiesService as never,
    storageService as never,
  );
  return { service, repo, activitiesService, storageService };
}

function dto(overrides: Record<string, unknown> = {}) {
  return {
    fileBase64: 'data:image/png;base64,AAAA',
    fileName: 'evidencia.png',
    mimeType: 'image/png',
    ...overrides,
  } as never;
}

describe('ActivityEvidenceService', () => {
  it('rejects video mime types without touching storage', async () => {
    const { service, storageService } = makeService();

    await expect(
      service.create(
        'act-1',
        dto({ mimeType: 'video/mp4', fileName: 'v.mp4' }),
        'u-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(storageService.uploadDocument).not.toHaveBeenCalled();
  });

  it('rejects an explicit video type even with an image mime', async () => {
    const { service, storageService } = makeService();

    await expect(
      service.create('act-1', dto({ type: EvidenceType.VIDEO }), 'u-1'),
    ).rejects.toThrow('Solo se permiten imágenes y PDF');
    expect(storageService.uploadDocument).not.toHaveBeenCalled();
  });

  it('rejects other non image/pdf mime types', async () => {
    const { service, storageService } = makeService();

    await expect(
      service.create(
        'act-1',
        dto({ mimeType: 'text/plain', fileName: 'a.txt' }),
        'u-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(storageService.uploadDocument).not.toHaveBeenCalled();
  });

  it('accepts image mime types and stores them as photo', async () => {
    const { service, repo, storageService } = makeService();

    const result = await service.create('act-1', dto(), 'u-1');

    expect(storageService.uploadDocument).toHaveBeenCalledWith(
      'data:image/png;base64,AAAA',
      'activities-evidence',
      'evidencia.png',
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: EvidenceType.PHOTO }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'ev-1' }));
  });

  it('accepts application/pdf and stores it as pdf', async () => {
    const { service, repo } = makeService();

    await service.create(
      'act-1',
      dto({ mimeType: 'application/pdf', fileName: 'acta.pdf' }),
      'u-1',
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: EvidenceType.PDF }),
    );
  });

  it('keeps an explicit non-video type when the mime is allowed', async () => {
    const { service, repo } = makeService();

    await service.create('act-1', dto({ type: EvidenceType.DOCUMENT }), 'u-1');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: EvidenceType.DOCUMENT }),
    );
  });
});
