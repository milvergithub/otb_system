import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Payment } from './entities/payment.entity';

export interface PaymentReceiptData {
  fullName: string;
  address: string;
  phone: string;
  invoiceNumber: string;
  meterCode: string;
  meterType: string;
  cubicMeters: string;
  expirationDate: string;
  status: string;
  period: string;
  totalPaid: string;
  totalAmount: string;
  history: { date: string; amount: string; method: string }[];
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async generateReceipt(paymentId: string): Promise<Buffer> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: [
        'consumption',
        'consumption.meter',
        'consumption.meter.member',
        'consumption.meter.type',
        'history',
      ],
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const member = payment.consumption.meter.member;
    const meter = payment.consumption.meter;
    const consumption = payment.consumption;

    const data: PaymentReceiptData = {
      fullName: `${member.first_name} ${member.last_name}`,
      address: member.address || '-',
      phone: member.phone || '-',
      invoiceNumber: payment.invoice_code ?? payment.id,
      meterCode: meter.code,
      meterType: meter.type?.name || '-',
      cubicMeters: `${parseFloat(String(consumption.cubic_meters)).toFixed(2)} m³`,
      expirationDate: this.formatDate(payment.due_date),
      status: this.statusLabel(payment.status),
      period: `${this.monthName(consumption.month)} ${consumption.year}`,
      totalPaid: `${parseFloat(String(payment.amount_paid)).toFixed(2)} Bs`,
      totalAmount: `${parseFloat(String(payment.total_amount)).toFixed(2)} Bs`,
      history: (payment.history ?? [])
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((entry) => ({
          date: this.formatDate(entry.created_at),
          amount: `${parseFloat(String(entry.amount)).toFixed(2)} Bs`,
          method: this.methodLabel(entry.payment_method),
        })),
    };

    return this.generateInvoicePdf(data);
  }

  private async generateInvoicePdf(data: PaymentReceiptData): Promise<Buffer> {
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

    // N. DE FACTURA
    page.drawText(data.invoiceNumber, {
      x: 345,
      y: 645,
      size: 12,
      font: fontBold,
      color: rgb(0.145, 0.302, 0.031),
    });

    // DETALLE DEL MEDIDOR Y CONSUMO
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
      'Tipo:',
      data.meterType,
      155,
      545,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'm³:',
      data.cubicMeters,
      150,
      528,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Vence:',
      data.expirationDate,
      190,
      512,
      fontSize,
    );

    // ESTADO Y PERIODO
    page.drawText(data.status, {
      x: 450,
      y: 578,
      size: fontSize,
      font: fontBold,
      color: textColor,
    });
    this.drawLabeledValue(
      page,
      font,
      'Período:',
      data.period,
      405,
      545,
      fontSize,
    );

    // TOTALES
    this.drawLabeledValue(
      page,
      font,
      'Pagado:',
      data.totalPaid,
      400,
      528,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Total:',
      data.totalAmount,
      395,
      510,
      12,
      fontBold,
    );

    // HISTORIAL DE PAGOS
    if (data.history.length > 0) {
      page.drawText('FECHA', {
        x: 150,
        y: 430,
        size: 9,
        font: fontBold,
        color: textColor,
      });
      page.drawText('MONTO', {
        x: 300,
        y: 430,
        size: 9,
        font: fontBold,
        color: textColor,
      });
      page.drawText('MÉTODO', {
        x: 400,
        y: 430,
        size: 9,
        font: fontBold,
        color: textColor,
      });

      let rowY = 414;
      for (const entry of data.history) {
        page.drawText(entry.date, {
          x: 150,
          y: rowY,
          size: fontSize,
          font,
          color: textColor,
        });
        page.drawText(entry.amount, {
          x: 300,
          y: rowY,
          size: fontSize,
          font,
          color: textColor,
        });
        page.drawText(entry.method, {
          x: 400,
          y: rowY,
          size: fontSize,
          font,
          color: textColor,
        });
        rowY -= 14;
        if (rowY < 40) break;
      }
    }

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

  private monthName(month: number): string {
    const names = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return names[month - 1] ?? String(month);
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'PENDIENTE',
      paid: 'PAGADO',
      overdue: 'VENCIDO',
      partial: 'PARCIAL',
    };
    return map[status] ?? status.toUpperCase();
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
