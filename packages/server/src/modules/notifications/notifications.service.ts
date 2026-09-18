import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingService } from '../billing/billing.service';
import { Payment, PaymentStatus } from '../billing/entities/payment.entity';
import { Member } from '../members/entities/member.entity';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly billingService: BillingService,
  ) {}

  async findAll(memberId?: string): Promise<Notification[]> {
    const where = memberId ? { member_id: memberId } : {};
    return this.notificationsRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async unreadCount(): Promise<number> {
    return this.notificationsRepository.count({ where: { is_read: false } });
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.is_read = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationsRepository.update(
      { is_read: false },
      { is_read: true },
    );
  }

  private async createNotification(
    memberId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    await this.notificationsRepository.save(
      this.notificationsRepository.create({
        member_id: memberId,
        type,
        title,
        message,
      }),
    );
  }

  async notifyOverdue(): Promise<void> {
    const overdue = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .where('payment.status = :status', { status: PaymentStatus.OVERDUE })
      .getMany();

    for (const payment of overdue) {
      const member = payment.consumption.meter.member;
      if (!member) continue;
      await this.createNotification(
        member.id,
        NotificationType.OVERDUE,
        'Overdue payment',
        `You have an overdue balance for meter ${payment.consumption.meter.code}: ${payment.total_amount}`,
      );
    }
  }

  async notifyPending(): Promise<void> {
    const pending = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .where('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
      })
      .getMany();

    for (const payment of pending) {
      const member = payment.consumption.meter.member;
      if (!member) continue;
      const dueDate = new Date(payment.due_date);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        await this.createNotification(
          member.id,
          NotificationType.EXPIRATION,
          'Payment due soon',
          `Your bill for meter ${payment.consumption.meter.code} is due in ${daysUntilDue} day(s).`,
        );
      }
    }
  }

  // Runs daily to update overdue statuses and generate notifications
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'America/La_Paz' })
  async handleDailyBillingTasks(): Promise<void> {
    await this.billingService.updateOverdueStatuses();
    await this.notifyOverdue();
    await this.notifyPending();
  }

  // Runs monthly on the 1st to generate bills
  @Cron('0 6 1 * *', { timeZone: 'America/La_Paz' })
  async handleMonthlyBillingGeneration(): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    await this.billingService.generateBillsForMonth(month, year);
  }
}
