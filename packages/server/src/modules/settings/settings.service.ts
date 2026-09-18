import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

export const DEFAULT_SETTINGS: Record<string, string> = {
  payment_due_day: '15',
  organization_name: 'OTB Water System',
  currency: 'BOB',
  openwa_api_key: process.env.OPENWA_API_KEY || '',
  openwa_consumption_template_id:
    process.env.OPENWA_CONSUMPTION_TEMPLATE_ID || '',
  openwa_welcome_template_id: process.env.OPENWA_WELCOME_TEMPLATE_ID || '',
  openwa_meter_registered_template_id:
    process.env.OPENWA_METER_REGISTERED_TEMPLATE_ID || '',
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repository: Repository<Setting>,
  ) {}

  async getValue(key: string): Promise<string> {
    const setting = await this.repository.findOne({ where: { key } });
    return setting?.value ?? DEFAULT_SETTINGS[key];
  }

  async getPaymentDueDay(): Promise<number> {
    return parseInt(await this.getValue('payment_due_day'), 10);
  }

  async getCurrency(): Promise<string> {
    return this.getValue('currency');
  }

  async getOrganizationName(): Promise<string> {
    return this.getValue('organization_name');
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.repository.find();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  }

  async updateAll(
    values: Record<string, string>,
  ): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(values)) {
      const existing = await this.repository.findOne({ where: { key } });
      if (existing) {
        existing.value = String(value);
        await this.repository.save(existing);
      } else {
        await this.repository.save(this.repository.create({ key, value }));
      }
    }
    return this.getAll();
  }

  async initializeDefaults(): Promise<void> {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.repository.findOne({ where: { key } });
      if (!existing) {
        await this.repository.save(this.repository.create({ key, value }));
      }
    }

    const validKeys = Object.keys(DEFAULT_SETTINGS);
    const obsolete = await this.repository
      .createQueryBuilder('setting')
      .where('setting.key NOT IN (:...validKeys)', { validKeys })
      .getMany();
    if (obsolete.length > 0) {
      await this.repository.remove(obsolete);
    }
  }
}
