import { FinancialResponsibilityService } from './financial-responsibility.service';
import { SettingsService } from '../settings/settings.service';

describe('FinancialResponsibilityService', () => {
  let service: FinancialResponsibilityService;
  let settings: { getValue: jest.Mock };

  beforeEach(() => {
    settings = { getValue: jest.fn() };
    service = new FinancialResponsibilityService(
      settings as unknown as SettingsService,
    );
  });

  describe('resolveWaterBillResponsibleUserId', () => {
    it('returns the configured responsible user', async () => {
      settings.getValue.mockResolvedValue('user-123');
      await expect(service.resolveWaterBillResponsibleUserId()).resolves.toBe(
        'user-123',
      );
      expect(settings.getValue).toHaveBeenCalledWith(
        'water_bill_responsible_user_id',
      );
    });

    it('returns null when the setting is empty or whitespace', async () => {
      settings.getValue.mockResolvedValueOnce('   ').mockResolvedValueOnce('');
      await expect(
        service.resolveWaterBillResponsibleUserId(),
      ).resolves.toBeNull();
      await expect(
        service.resolveWaterBillResponsibleUserId(),
      ).resolves.toBeNull();
    });
  });

  describe('resolveWaterShareResponsibleUserId', () => {
    it('returns the configured responsible user for acción de agua', async () => {
      settings.getValue.mockResolvedValue('user-456');
      await expect(service.resolveWaterShareResponsibleUserId()).resolves.toBe(
        'user-456',
      );
      expect(settings.getValue).toHaveBeenCalledWith(
        'water_share_responsible_user_id',
      );
    });

    it('returns null when no responsible is configured', async () => {
      settings.getValue.mockResolvedValue(undefined);
      await expect(
        service.resolveWaterShareResponsibleUserId(),
      ).resolves.toBeNull();
    });
  });

  describe('resolveCollectorUserId', () => {
    it('prefers the explicitly provided collector', () => {
      expect(
        service.resolveCollectorUserId('collector-1', 'registrant-1'),
      ).toBe('collector-1');
    });

    it('falls back to the authenticated registrant', () => {
      expect(service.resolveCollectorUserId(null, 'registrant-1')).toBe(
        'registrant-1',
      );
      expect(service.resolveCollectorUserId(undefined, 'registrant-1')).toBe(
        'registrant-1',
      );
    });

    it('returns null when nothing is known', () => {
      expect(service.resolveCollectorUserId(null, null)).toBeNull();
      expect(service.resolveCollectorUserId(undefined, undefined)).toBeNull();
    });
  });
});
