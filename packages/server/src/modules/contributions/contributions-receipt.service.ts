import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { ContributionPaymentStatus } from './entities/contribution-payment.entity';
import { ContributionPayment } from './entities/contribution-payment.entity';
import { Contribution } from './entities/contribution.entity';
import { ContributionsService } from './contributions.service';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class ContributionsReceiptService {
  constructor(
    @InjectRepository(ContributionPayment)
    private readonly paymentsRepo: Repository<ContributionPayment>,
    private readonly contributionsService: ContributionsService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /** Payment receipt by ids, with the same view scope as the detail page. */
  async generatePaymentReceipt(
    contributionId: string,
    paymentId: string,
    userId?: string,
    canViewAll = false,
  ): Promise<Buffer> {
    await this.contributionsService.findOne(contributionId, userId, canViewAll);
    const payment = await this.loadPayment(contributionId, paymentId);
    return this.renderPayment(payment, payment.contribution);
  }

  /** Convenience entry point for the WhatsApp background listener. */
  async generatePaymentReceiptById(paymentId: string): Promise<Buffer> {
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId },
      relations: [
        'member',
        'obligation',
        'collectorUser',
        'registeredByUser',
        'contribution',
        'contribution.responsibleUser',
        'contribution.collectorUser',
      ],
    });
    if (!payment) throw new AppError('CONTRIBUTION_PAYMENT_NOT_FOUND');
    return this.renderPayment(payment, payment.contribution);
  }

  /**
   * Rendición de cuentas PDF: campaign header, obligation tallies (expected /
   * collected / pending recovery / exonerated) and the ledger income, expenses
   * and balance of the campaign.
   */
  async generateRendition(
    contributionId: string,
    userId?: string,
    canViewAll = false,
  ): Promise<Buffer> {
    const summary = await this.contributionsService.getSummary(
      contributionId,
      userId,
      canViewAll,
    );

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const title = 'Rendición de cuentas - Aporte extraordinario';
    const gray = rgb(0.35, 0.35, 0.35);
    const black = rgb(0.1, 0.1, 0.1);

    let y = 790;
    page.drawText(title, { x: 50, y, size: 16, font: fontBold, color: black });
    y -= 28;

    const c = summary.contribution;
    const rows: Array<[string, string]> = [
      ['Campaña', c.title],
      ['Propósito', c.purpose ?? '-'],
      ['Estado', this.statusLabel(c.status)],
      ['Monto por socio', `${parseFloat(c.amount_per_member).toFixed(2)} Bs`],
      ['Responsable de rendición', this.userName(c.responsibleUser)],
      ['Cobrador', this.userName(c.collectorUser)],
      ['Creado el', this.formatDate(c.created_at)],
      ['Activado el', c.activated_at ? this.formatDate(c.activated_at) : '-'],
      ['Finalizado el', c.completed_at ? this.formatDate(c.completed_at) : '-'],
      ['Cancelado el', c.cancelled_at ? this.formatDate(c.cancelled_at) : '-'],
      ['Motivo de cancelación', c.cancel_reason ?? '-'],
    ];
    for (const [label, value] of rows) {
      this.drawRow(page, font, fontBold, label, value, y);
      y -= 18;
    }

    y -= 14;
    page.drawText('Obligaciones', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: black,
    });
    y -= 22;

    const o = summary.obligations;
    const obligationRows: Array<[string, string]> = [
      ['Socios con obligación', String(o.total)],
      ['Pendientes', String(o.pending)],
      ['Parciales', String(o.partial)],
      ['Pagados', String(o.paid)],
      ['Exonerados', String(o.exonerated)],
      ['Cancelados', String(o.cancelled)],
      ['Monto esperado', `${o.expectedAmount.toFixed(2)} Bs`],
      ['Exonerado', `${o.exoneratedAmount.toFixed(2)} Bs`],
      ['Recaudado', `${o.collectedAmount.toFixed(2)} Bs`],
      ['Pendiente de recuperar', `${o.pendingRecoveryAmount.toFixed(2)} Bs`],
    ];
    for (const [label, value] of obligationRows) {
      this.drawRow(page, font, fontBold, label, value, y, fontBold);
      y -= 18;
    }

    y -= 14;
    page.drawText('Finanzas del aporte', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: black,
    });
    y -= 22;

    const f = summary.finance;
    const financeRows: Array<[string, string]> = [
      ['Ingresos registrados', `${f.income.toFixed(2)} Bs`],
      ['Egresos registrados', `${f.expenses.toFixed(2)} Bs`],
      ['Balance', `${f.balance.toFixed(2)} Bs`],
    ];
    for (const [label, value] of financeRows) {
      this.drawRow(page, font, fontBold, label, value, y, fontBold);
      y -= 18;
    }

    y -= 20;
    page.drawText(
      `Generado el ${new Date().toLocaleDateString('es-BO', {
        timeZone: 'America/La_Paz',
      })}`,
      { x: 50, y, size: 9, font, color: gray },
    );

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async loadPayment(
    contributionId: string,
    paymentId: string,
  ): Promise<ContributionPayment> {
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId, contribution_id: contributionId },
      relations: [
        'member',
        'obligation',
        'collectorUser',
        'registeredByUser',
        'contribution',
        'contribution.responsibleUser',
        'contribution.collectorUser',
      ],
    });
    if (!payment) throw new AppError('CONTRIBUTION_PAYMENT_NOT_FOUND');
    return payment;
  }

  private async renderPayment(
    payment: ContributionPayment,
    contribution: Contribution,
  ): Promise<Buffer> {
    const templatePath = join(
      __dirname,
      '..',
      '..',
      'core',
      'templates',
      'template.pdf',
    );
    const templateBytes = await readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0.5, 0.5, 0.5);

    const member = payment.member;
    const memberName = member
      ? `${member.first_name} ${member.last_name}`
      : '-';

    this.drawLabeledValue(page, font, 'Socio:', memberName, 130, 649, 10);
    this.drawLabeledValue(
      page,
      font,
      'Campaña:',
      contribution.title,
      155,
      631,
      10,
    );
    this.drawLabeledValue(
      page,
      font,
      'Obligación:',
      payment.obligation ? `${payment.obligation.amount} Bs` : '-',
      170,
      614,
      10,
    );

    this.drawLabeledValue(
      page,
      font,
      'Monto:',
      `${parseFloat(payment.amount).toFixed(2)} Bs`,
      155,
      561,
      12,
      fontBold,
    );
    this.drawLabeledValue(
      page,
      font,
      'Fecha:',
      this.formatDate(payment.paid_at),
      140,
      545,
      10,
    );
    this.drawLabeledValue(
      page,
      font,
      'Estado:',
      this.paymentStatusLabel(payment.status),
      155,
      528,
      10,
    );
    this.drawLabeledValue(
      page,
      font,
      'Método:',
      await this.methodLabel(payment.payment_method),
      160,
      512,
      10,
    );
    this.drawLabeledValue(
      page,
      font,
      'Ref:',
      payment.reference ?? '-',
      130,
      494,
      10,
    );
    this.drawLabeledValue(
      page,
      font,
      'Cobrador:',
      this.userName(payment.collectorUser ?? contribution.collectorUser),
      165,
      476,
      10,
    );

    if (payment.status === ContributionPaymentStatus.VOIDED) {
      page.drawText('PAGO ANULADO', {
        x: 400,
        y: 700,
        size: 18,
        font: fontBold,
        color: rgb(0.75, 0.1, 0.1),
      });
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  private drawRow(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    label: string,
    value: string,
    y: number,
    valueFont?: PDFFont,
  ): void {
    const gray = rgb(0.35, 0.35, 0.35);
    page.drawText(label, { x: 50, y, size: 10, font, color: gray });
    page.drawText(value, { x: 220, y, size: 10, font: valueFont ?? font });
  }

  private drawLabeledValue(
    page: PDFPage,
    font: PDFFont,
    label: string,
    value: string,
    x: number,
    y: number,
    size: number,
    valueFont?: PDFFont,
  ): void {
    const color = rgb(0.5, 0.5, 0.5);
    const labelWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: x - labelWidth - 4,
      y,
      size,
      font,
      color,
    });
    page.drawText(value, { x, y, size, font: valueFont ?? font, color });
  }

  private userName(user: { full_name?: string } | null | undefined): string {
    return user?.full_name?.trim() || '-';
  }

  private formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('es-BO');
  }

  private async methodLabel(
    method: string | null | undefined,
  ): Promise<string> {
    if (!method) return '-';
    const found = await this.paymentMethodsService.findByCode(method);
    return found?.name ?? method;
  }

  private paymentStatusLabel(status: ContributionPaymentStatus): string {
    return status === ContributionPaymentStatus.VOIDED ? 'Anulado' : 'Activo';
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      active: 'Activo',
      paused: 'Pausado',
      completed: 'Finalizado',
      cancelled: 'Cancelado',
    };
    return map[status] ?? status;
  }
}
