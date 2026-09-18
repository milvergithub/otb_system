import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { OnEvent } from '@nestjs/event-emitter';
import { lastValueFrom } from 'rxjs';
import { OpenwaConfig } from '../../config/openwa.config';
import { ReceiptService } from '../billing/receipt.service';
import { ShareReceiptService } from '../shares/share-receipt.service';
import { FinesReceiptService } from '../activities/fines-receipt.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly envConfig: OpenwaConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly receiptService: ReceiptService,
    private readonly shareReceiptService: ShareReceiptService,
    private readonly finesReceiptService: FinesReceiptService,
    private readonly settingsService: SettingsService,
  ) {
    this.envConfig = this.configService.get<OpenwaConfig>('openwa')!;
  }

  private async getApiKey(): Promise<string> {
    return this.settingsService.getValue('openwa_api_key');
  }

  private async getTemplateId(): Promise<string> {
    return this.settingsService.getValue('openwa_consumption_template_id');
  }

  private async getWelcomeTemplateId(): Promise<string> {
    return this.settingsService.getValue('openwa_welcome_template_id');
  }

  private async getMeterRegisteredTemplateId(): Promise<string> {
    return this.settingsService.getValue('openwa_meter_registered_template_id');
  }

  private async isConfigured(phone: string): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return !!(
      this.envConfig.enabled &&
      this.envConfig.baseUrl &&
      this.envConfig.sessionId &&
      apiKey &&
      phone
    );
  }

  private readonly DIAL_CODES: Record<string, string> = {
    AR: '54',
    BO: '591',
    BR: '55',
    CL: '56',
    CO: '57',
    EC: '593',
    GY: '592',
    PY: '595',
    PE: '51',
    SR: '597',
    UY: '598',
    VE: '58',
    US: '1',
  };

  private normalizePhone(phone: string, country = 'BO'): string {
    const digits = phone.replace(/\D/g, '');
    const dial = this.DIAL_CODES[country] ?? '591';
    return digits.startsWith(dial) ? digits : `${dial}${digits}`;
  }

  private async checkContact(
    phone: string,
  ): Promise<{ exists: boolean; whatsappId?: string } | null> {
    try {
      const url = `${this.envConfig.baseUrl}/api/sessions/${this.envConfig.sessionId}/contacts/check/${phone}`;
      const { data } = await lastValueFrom(
        this.httpService.get(url, {
          headers: { 'X-API-Key': await this.getApiKey() },
          timeout: this.envConfig.timeoutMs,
        }),
      );
      return { exists: data?.exists === true, whatsappId: data?.whatsappId };
    } catch (error) {
      this.logger.warn(`OpenWA check contact failed for ${phone}: ${error}`);
      return null;
    }
  }

  async sendText(phone: string, text: string, country = 'BO'): Promise<void> {
    if (!(await this.isConfigured(phone))) {
      return;
    }

    const normalized = this.normalizePhone(phone, country);
    const contact = await this.checkContact(normalized);

    if (contact && !contact.exists) {
      this.logger.warn(`Phone ${normalized} does not exist on WhatsApp`);
      return;
    }

    const chatId = (contact && contact.whatsappId) || `${normalized}@lid`;

    try {
      const url = `${this.envConfig.baseUrl}/api/sessions/${this.envConfig.sessionId}/messages/send-text`;
      await lastValueFrom(
        this.httpService.post(
          url,
          { chatId, text },
          {
            headers: { 'X-API-Key': await this.getApiKey() },
            timeout: this.envConfig.timeoutMs,
          },
        ),
      );
      this.logger.log(`WhatsApp message sent to ${chatId}`);
    } catch (error) {
      this.logger.warn(`OpenWA send text failed: ${error}`);
    }
  }

  async sendTemplate(
    phone: string,
    vars: Record<string, any>,
    templateId?: string,
    country = 'BO',
  ): Promise<void> {
    if (!(await this.isConfigured(phone))) {
      return;
    }

    const normalized = this.normalizePhone(phone, country);
    const contact = await this.checkContact(normalized);

    if (contact && !contact.exists) {
      this.logger.warn(`Phone ${normalized} does not exist on WhatsApp`);
      return;
    }

    const chatId = (contact && contact.whatsappId) || `${normalized}@lid`;

    try {
      const url = `${this.envConfig.baseUrl}/api/sessions/${this.envConfig.sessionId}/messages/send-template`;
      await lastValueFrom(
        this.httpService.post(
          url,
          {
            chatId: chatId,
            templateId: templateId ?? (await this.getTemplateId()),
            vars: vars,
          },
          {
            headers: { 'X-API-Key': await this.getApiKey() },
            timeout: this.envConfig.timeoutMs,
          },
        ),
      );
      this.logger.log(`WhatsApp message sent to ${chatId}`);
    } catch (error) {
      this.logger.warn(`OpenWA send text failed: ${error}`);
    }
  }

  @OnEvent('bill.generated')
  async handleBillGenerated(payload: {
    phone: string;
    phone_country?: string;
    vars: Record<string, any>;
  }): Promise<void> {
    try {
      await this.sendTemplate(
        payload.phone,
        payload.vars,
        undefined,
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `WhatsApp template send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }

  @OnEvent('member.created')
  async handleMemberCreated(payload: {
    phone: string;
    phone_country?: string;
    fullName: string;
  }): Promise<void> {
    try {
      await this.sendTemplate(
        payload.phone,
        { fullName: payload.fullName },
        await this.getWelcomeTemplateId(),
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `WhatsApp welcome send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }

  @OnEvent('meter.created')
  async handleMeterCreated(payload: {
    phone: string;
    phone_country?: string;
    vars: Record<string, any>;
  }): Promise<void> {
    try {
      await this.sendTemplate(
        payload.phone,
        payload.vars,
        await this.getMeterRegisteredTemplateId(),
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `WhatsApp meter registered send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }

  async sendDocument(
    phone: string,
    base64: string,
    filename: string,
    mimetype = 'application/pdf',
    country = 'BO',
  ): Promise<void> {
    if (!(await this.isConfigured(phone))) {
      return;
    }

    const normalized = this.normalizePhone(phone, country);
    const contact = await this.checkContact(normalized);

    if (contact && !contact.exists) {
      this.logger.warn(`Phone ${normalized} does not exist on WhatsApp`);
      return;
    }

    const chatId = (contact && contact.whatsappId) || `${normalized}@lid`;

    try {
      const url = `${this.envConfig.baseUrl}/api/sessions/${this.envConfig.sessionId}/messages/send-document`;
      await lastValueFrom(
        this.httpService.post(
          url,
          { chatId, base64, mimetype, filename },
          {
            headers: { 'X-API-Key': await this.getApiKey() },
            timeout: this.envConfig.timeoutMs,
          },
        ),
      );
      this.logger.log(`WhatsApp document sent to ${chatId}`);
    } catch (error) {
      this.logger.warn(`OpenWA send document failed: ${error}`);
    }
  }

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: {
    paymentId: string;
    phone: string;
    phone_country?: string;
    filename: string;
  }): Promise<void> {
    try {
      const buffer = await this.receiptService.generateReceipt(
        payload.paymentId,
      );
      await this.sendDocument(
        payload.phone,
        buffer.toString('base64'),
        payload.filename,
        'application/pdf',
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `Receipt send failed in background: ${(error as Error).message ?? error}`,
      );
    }
  }

  @OnEvent('share.payment.created')
  async handleSharePaymentCreated(payload: {
    sharePaymentId: string;
    phone: string;
    phone_country?: string;
    filename: string;
  }): Promise<void> {
    try {
      const buffer = await this.shareReceiptService.generateShareReceipt(
        payload.sharePaymentId,
      );
      await this.sendDocument(
        payload.phone,
        buffer.toString('base64'),
        payload.filename,
        'application/pdf',
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `Share receipt send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }

  @OnEvent('fine.paid')
  async handleFinePaid(payload: {
    fineId: string;
    phone: string;
    phone_country?: string;
    filename: string;
  }): Promise<void> {
    try {
      const buffer = await this.finesReceiptService.generateFineReceipt(
        payload.fineId,
      );
      await this.sendDocument(
        payload.phone,
        buffer.toString('base64'),
        payload.filename,
        'application/pdf',
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `Fine receipt send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }

  @OnEvent('fines.paid.bulk')
  async handleFinesPaidBulk(payload: {
    fineIds: string[];
    phone: string;
    phone_country?: string;
    filename: string;
  }): Promise<void> {
    try {
      const buffer =
        await this.finesReceiptService.generateFinesReceiptsSummary(
          payload.fineIds,
        );
      await this.sendDocument(
        payload.phone,
        buffer.toString('base64'),
        payload.filename,
        'application/pdf',
        payload.phone_country ?? 'BO',
      );
    } catch (error) {
      this.logger.warn(
        `Fines summary receipt send failed in background: ${
          (error as Error).message ?? error
        }`,
      );
    }
  }
}
