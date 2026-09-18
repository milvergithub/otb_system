import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingModule } from '../billing/billing.module';
import { SharesModule } from '../shares/shares.module';
import { ActivitiesModule } from '../activities/activities.module';
import { SettingsModule } from '../settings/settings.module';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    HttpModule,
    BillingModule,
    SharesModule,
    ActivitiesModule,
    SettingsModule,
  ],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
