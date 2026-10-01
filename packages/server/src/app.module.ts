import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import auditConfig from './config/audit.config';
import openwaConfig from './config/openwa.config';
import loggerConfig from './config/logger.config';
import { HttpLogInterceptor } from './core/http-log.interceptor';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';
import { ContextModule } from './modules/context/context.module';
import { AuditContextInterceptor } from './modules/context/context.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ConsumptionModule } from './modules/consumption/consumption.module';
import { MembersModule } from './modules/members/members.module';
import { MetersModule } from './modules/meters/meters.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SharesModule } from './modules/shares/shares.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { UsersModule } from './modules/users/users.module';
import { ZonesModule } from './modules/zones/zones.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AuditSubscriber } from './modules/audit/audit.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        auditConfig,
        openwaConfig,
        loggerConfig,
      ],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') || '5433', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // ssl: {
        //   rejectUnauthorized: false,
        // },
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        subscribers: [AuditSubscriber],
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = configService.get('logger');
        return {
          level: logger?.level ?? 'info',
          transports: logger?.transports ?? [],
        };
      },
    }),
    ContextModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    MembersModule,
    MetersModule,
    TariffsModule,
    SettingsModule,
    ConsumptionModule,
    BillingModule,
    NotificationsModule,
    ReportsModule,
    SharesModule,
    ZonesModule,
    ActivitiesModule,
    WhatsAppModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
