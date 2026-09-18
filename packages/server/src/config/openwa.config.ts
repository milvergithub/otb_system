import { registerAs } from '@nestjs/config';

export interface OpenwaConfig {
  enabled: boolean;
  baseUrl: string;
  sessionId: string;
  templateId: string;
  welcomeTemplateId: string;
  meterRegisteredTemplateId: string;
  apiKey: string;
  timeoutMs: number;
}

export default registerAs('openwa', (): OpenwaConfig => ({
  enabled: process.env.OPENWA_ENABLED === 'true',
  baseUrl: process.env.OPENWA_BASE_URL || 'http://localhost:2785',
  sessionId: process.env.OPENWA_SESSION_ID || '',
  templateId: process.env.OPENWA_CONSUMPTION_TEMPLATE_ID || '',
  welcomeTemplateId: process.env.OPENWA_WELCOME_TEMPLATE_ID || '',
  meterRegisteredTemplateId:
    process.env.OPENWA_METER_REGISTERED_TEMPLATE_ID || '',
  apiKey: process.env.OPENWA_API_KEY || '',
  timeoutMs: parseInt(process.env.OPENWA_TIMEOUT_MS || '10000', 10),
}));
