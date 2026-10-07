import { DEFAULT_SETTINGS } from './settings.service';
import { DEFAULT_PERMISSIONS } from './seeder.service';

describe('financial responsibility configuration defaults', () => {
  it('defines both water responsibility settings with an empty default', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty(
      'water_bill_responsible_user_id',
      '',
    );
    expect(DEFAULT_SETTINGS).toHaveProperty(
      'water_share_responsible_user_id',
      '',
    );
  });

  it('does not define the removed activity fine responsible setting', () => {
    expect(DEFAULT_SETTINGS).not.toHaveProperty(
      'activity_fine_responsible_user_id',
    );
  });

  it('seeds the visibility-only finances.all permission', () => {
    const permission = DEFAULT_PERMISSIONS.find(
      (p) => p.resource === 'finances' && p.action === 'all',
    );
    expect(permission).toBeDefined();
    expect(permission?.description).toMatch(/never financial responsibility/i);
  });

  it('does not seed finances.all into read-only roles by default', () => {
    const financesPermissions = DEFAULT_PERMISSIONS.filter(
      (p) => p.resource === 'finances',
    ).map((p) => `${p.resource}.${p.action}`);
    expect(financesPermissions).toContain('finances.all');
    expect(financesPermissions).toContain('finances.read');
  });
});
