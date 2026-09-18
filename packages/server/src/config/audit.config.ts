import { registerAs } from '@nestjs/config';

export interface AuditConfig {
  enabled: boolean;
  retentionDays: number;
}

export default registerAs('audit', (): AuditConfig => ({
  enabled: true,
  retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '0', 10),
}));
