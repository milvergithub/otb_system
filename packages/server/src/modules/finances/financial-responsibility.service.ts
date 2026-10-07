import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Central resolver of financial responsibility.
 *
 * Financial responsibility is independent from roles/permissions: a role only
 * determines what a user can do, never who is responsible for the money.
 * Every module that writes a FinanceTransaction must resolve responsibility
 * through this service (or through the explicit value of an origin entity
 * such as Activity) instead of falling back to the authenticated user.
 *
 * All resolvers return a snapshot value at the moment of the call; the caller
 * stores it on the movement, so later configuration changes never rewrite
 * history.
 */
@Injectable()
export class FinancialResponsibilityService {
  constructor(private readonly settingsService: SettingsService) {}

  /** Responsible user for water bill collection (settings-driven). */
  async resolveWaterBillResponsibleUserId(): Promise<string | null> {
    return this.normalize(
      await this.settingsService.getValue('water_bill_responsible_user_id'),
    );
  }

  /** Responsible user for water share ("acción de agua") collection. */
  async resolveWaterShareResponsibleUserId(): Promise<string | null> {
    return this.normalize(
      await this.settingsService.getValue('water_share_responsible_user_id'),
    );
  }

  /**
   * Single collector fallback rule, used by every flow: an explicitly provided
   * collector wins; otherwise the authenticated user that registers the
   * operation is assumed to be the one who physically collected it.
   */
  resolveCollectorUserId(
    explicitCollectorUserId: string | null | undefined,
    registeredByUserId: string | null | undefined,
  ): string | null {
    return explicitCollectorUserId ?? registeredByUserId ?? null;
  }

  private normalize(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
