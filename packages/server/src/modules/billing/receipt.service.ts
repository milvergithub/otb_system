import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Payment } from './entities/payment.entity';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { AppError } from '../../common/errors/app-error';

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
  baseAmount: string;
  totalPaid: string;
  totalAmount: string;
  lateFeeAmount: string;
  discountLines: { label: string; amount: string }[];
  surchargeLines: { label: string; amount: string }[];
  history: { date: string; amount: string; method: string }[];
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly paymentMethodsService: PaymentMethodsService,
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
        'paymentDiscounts',
        'paymentDiscounts.discount',
        'paymentSurcharges',
        'paymentSurcharges.surcharge',
      ],
      withDeleted: true,
    });
    if (!payment) {
      throw new AppError('PAYMENT_RECORD_NOT_FOUND');
    }

    const member = payment.consumption.meter.member;
    const meter = payment.consumption.meter;
    const consumption = payment.consumption;

    const methodNames = await this.paymentMethodsService.namesFor(
      (payment.history ?? [])
        .map((entry) => entry.payment_method)
        .filter(Boolean) as string[],
    );

    const baseAmountNum =
      parseFloat(String(payment.total_amount)) +
      parseFloat(String(payment.discount_amount ?? 0)) -
      parseFloat(String(payment.late_fee_amount ?? 0));

    const discountLines = (payment.paymentDiscounts ?? [])
      .filter((pd) => pd && pd.amount && parseFloat(String(pd.amount)) > 0)
      .map((pd) => {
        const d = pd.discount;
        if (d?.type === 'percentage') {
          const label = `${d.name} (${d.value}%)`;
          return {
            label,
            amount: `-${parseFloat(String(pd.amount)).toFixed(2)} Bs`,
          };
        }
        return {
          label: d?.name || 'Descuento',
          amount: `-${parseFloat(String(pd.amount)).toFixed(2)} Bs`,
        };
      });

    const surchargeLines = (payment.paymentSurcharges ?? [])
      .filter((ps) => ps && ps.amount && parseFloat(String(ps.amount)) > 0)
      .map((ps) => {
        const s = ps.surcharge;
        if (s?.type === 'percentage') {
          const label = `${s.name} (${s.value}%)`;
          return {
            label,
            amount: `+${parseFloat(String(ps.amount)).toFixed(2)} Bs`,
          };
        }
        return {
          label: s?.name || 'Recargo',
          amount: `+${parseFloat(String(ps.amount)).toFixed(2)} Bs`,
        };
      });

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
      baseAmount: `${baseAmountNum.toFixed(2)} Bs`,
      totalPaid: `${parseFloat(String(payment.amount_paid)).toFixed(2)} Bs`,
      totalAmount: `${parseFloat(String(payment.total_amount)).toFixed(2)} Bs`,
      lateFeeAmount: `${parseFloat(String(payment.late_fee_amount ?? '0')).toFixed(2)} Bs`,
      discountLines,
      surchargeLines,
      history: (payment.history ?? [])
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((entry) => ({
          date: this.formatDate(entry.created_at),
          amount: `${parseFloat(String(entry.amount)).toFixed(2)} Bs`,
          method: this.methodLabel(entry.payment_method, methodNames),
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
      'Subtotal/Original:',
      data.baseAmount,
      395,
      528,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Recargo mora:',
      data.lateFeeAmount,
      395,
      510,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Pagado:',
      data.totalPaid,
      400,
      492,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Total:',
      data.totalAmount,
      395,
      474,
      12,
      fontBold,
    );

    // DESCUENTOS Y CARGOS APLICADOS
    let detailY = 450;
    const detailFontSize = 8;
    if (data.discountLines.length > 0) {
      page.drawText('DESCUENTOS APLICADOS', {
        x: 150,
        y: detailY,
        size: 8,
        font: fontBold,
        color: textColor,
      });
      detailY -= 12;
      for (const d of data.discountLines) {
        if (d.label.length > 40) {
          page.drawText(d.label.substring(0, 40), {
            x: 150,
            y: detailY,
            size: detailFontSize,
            font,
            color: textColor,
          });
        } else {
          page.drawText(d.label, {
            x: 150,
            y: detailY,
            size: detailFontSize,
            font,
            color: textColor,
          });
        }
        page.drawText(d.amount, {
          x: 330,
          y: detailY,
          size: detailFontSize,
          font,
          color: textColor,
        });
        detailY -= 11;
        if (detailY < 380) break;
      }
    }
    if (data.surchargeLines.length > 0) {
      page.drawText('CARGOS/RECARGOS APLICADOS', {
        x: 150,
        y: detailY,
        size: 8,
        font: fontBold,
        color: textColor,
      });
      detailY -= 12;
      for (const s of data.surchargeLines) {
        if (s.label.length > 40) {
          page.drawText(s.label.substring(0, 40), {
            x: 150,
            y: detailY,
            size: detailFontSize,
            font,
            color: textColor,
          });
        } else {
          page.drawText(s.label, {
            x: 150,
            y: detailY,
            size: detailFontSize,
            font,
            color: textColor,
          });
        }
        page.drawText(s.amount, {
          x: 330,
          y: detailY,
          size: detailFontSize,
          font,
          color: textColor,
        });
        detailY -= 11;
        if (detailY < 380) break;
      }
    }
    if (data.discountLines.length === 0 && data.surchargeLines.length === 0) {
      page.drawText('SIN DESCUENTOS NI RECARGOS ADICIONALES', {
        x: 150,
        y: detailY,
        size: 8,
        font: fontBold,
        color: textColor,
      });
    }

    // HISTORIAL DE PAGOS
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

  private methodLabel(
    method: string | null | undefined,
    names: Record<string, string>,
  ): string {
    return (method && names[method]) || method || '-';
  }
}
