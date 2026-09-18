import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { SharePayment } from './entities/share-payment.entity';

export interface ShareReceiptData {
  fullName: string;
  address: string;
  phone: string;
  meterCode: string;
  actionName: string;
  amount: string;
  method: string;
  reference: string;
  notes: string;
  paidDate: string;
}

@Injectable()
export class ShareReceiptService {
  constructor(
    @InjectRepository(SharePayment)
    private readonly sharePaymentsRepository: Repository<SharePayment>,
  ) {}

  async generateShareReceipt(sharePaymentId: string): Promise<Buffer> {
    const payment = await this.sharePaymentsRepository.findOne({
      where: { id: sharePaymentId },
      relations: ['meter', 'meter.member', 'meter.type', 'share'],
    });
    if (!payment) {
      throw new NotFoundException('Share payment record not found');
    }

    const member = payment.meter.member;
    const meter = payment.meter;

    const data: ShareReceiptData = {
      fullName: `${member.first_name} ${member.last_name}`,
      address: member.address || '-',
      phone: member.phone || '-',
      meterCode: meter.code,
      actionName: payment.share?.name || '-',
      amount: `${parseFloat(String(payment.amount)).toFixed(2)} Bs`,
      method: this.methodLabel(payment.payment_method),
      reference: payment.reference || '-',
      notes: payment.notes || '-',
      paidDate: this.formatDate(payment.paid_at),
    };

    return this.generateSharePdf(data);
  }

  private async generateSharePdf(data: ShareReceiptData): Promise<Buffer> {
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

    const textColor = rgb(0.5, 0.5, 0.5);
    const fontSize = 10;

    page.drawText(data.fullName, {
      x: 130,
      y: 649,
      size: fontSize,
      font,
      color: textColor,
    });
    page.drawText(data.address, {
      x: 135,
      y: 631,
      size: fontSize,
      font,
      color: textColor,
    });
    page.drawText(data.phone, {
      x: 132,
      y: 614,
      size: fontSize,
      font,
      color: textColor,
    });

    this.drawLabeledValue(
      page,
      font,
      'Medidor:',
      data.meterCode,
      175,
      561,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Acción:',
      data.actionName,
      155,
      545,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Fecha pago:',
      data.paidDate,
      190,
      528,
      fontSize,
    );

    this.drawLabeledValue(
      page,
      font,
      'Monto:',
      data.amount,
      400,
      528,
      12,
      fontBold,
    );

    this.drawLabeledValue(
      page,
      font,
      'Ref:',
      data.reference,
      190,
      512,
      fontSize,
    );
    this.drawLabeledValue(page, font, 'Notas:', data.notes, 190, 494, fontSize);
    this.drawLabeledValue(
      page,
      font,
      'Método:',
      data.method,
      400,
      512,
      fontSize,
    );

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
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
    page.drawText(value, {
      x,
      y,
      size,
      font: valueFont ?? font,
      color,
    });
  }

  private formatDate(value: string | Date): string {
    return new Date(value).toLocaleDateString('es-BO');
  }

  private methodLabel(method: string | null | undefined): string {
    const map: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      card: 'Tarjeta',
    };
    return (method && map[method]) || method || '-';
  }
}
