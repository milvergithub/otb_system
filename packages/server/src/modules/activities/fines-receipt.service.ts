import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Fine } from './entities/fine.entity';

@Injectable()
export class FinesReceiptService {
  constructor(
    @InjectRepository(Fine)
    private readonly repo: Repository<Fine>,
  ) {}

  async generateFineReceipt(fineId: string): Promise<Buffer> {
    const fine = await this.repo.findOne({
      where: { id: fineId },
      relations: ['member', 'activity', 'fineType'],
    });
    if (!fine) throw new NotFoundException('Multa no encontrada');

    const member = fine.member;
    const data = {
      fullName: `${member.first_name} ${member.last_name}`,
      phone: member.phone || '-',
      activityName: fine.activity?.name || '-',
      fineTypeName: fine.fineType?.name || '-',
      amount: `${parseFloat(String(fine.amount)).toFixed(2)} Bs`,
      paidDate: this.formatDate(fine.paid_at),
      notes: fine.notes || '-',
    };

    return this.generateSinglePdf(data);
  }

  async generateFinesReceiptsSummary(fineIds: string[]): Promise<Buffer> {
    const fines = await this.repo.find({
      where: { id: In(fineIds) },
      relations: ['member', 'activity', 'fineType'],
    });
    if (fines.length === 0)
      throw new NotFoundException('No se encontraron multas');

    const member = fines[0].member;
    const total = fines.reduce(
      (sum, f) => sum + parseFloat(String(f.amount)),
      0,
    );

    const rows = fines.map((f, i) => ({
      index: i + 1,
      activityName: f.activity?.name || '-',
      fineTypeName: f.fineType?.name || '-',
      amount: parseFloat(String(f.amount)).toFixed(2),
    }));

    return this.generateSummaryPdf({
      fullName: `${member.first_name} ${member.last_name}`,
      paidDate: this.formatDate(new Date()),
      rows,
      total: total.toFixed(2),
    });
  }

  private async generateSinglePdf(data: {
    fullName: string;
    phone: string;
    activityName: string;
    fineTypeName: string;
    amount: string;
    paidDate: string;
    notes: string;
  }): Promise<Buffer> {
    const { pdfDoc, page, font, fontBold } = await this.loadTemplate();
    const fontSize = 10;

    page.drawText(data.fullName, {
      x: 130,
      y: 649,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(data.phone, {
      x: 132,
      y: 631,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    this.drawLabeledValue(
      page,
      font,
      'Actividad:',
      data.activityName,
      190,
      590,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Tipo multa:',
      data.fineTypeName,
      190,
      572,
      fontSize,
    );
    this.drawLabeledValue(
      page,
      font,
      'Fecha pago:',
      data.paidDate,
      190,
      554,
      fontSize,
    );

    this.drawLabeledValue(
      page,
      font,
      'Monto:',
      data.amount,
      400,
      554,
      12,
      fontBold,
    );

    this.drawLabeledValue(page, font, 'Notas:', data.notes, 190, 536, fontSize);

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  private async generateSummaryPdf(data: {
    fullName: string;
    paidDate: string;
    rows: {
      index: number;
      activityName: string;
      fineTypeName: string;
      amount: string;
    }[];
    total: string;
  }): Promise<Buffer> {
    const { pdfDoc, page, font, fontBold } = await this.loadTemplate();
    const fontSize = 9;
    const headerColor = rgb(0.3, 0.3, 0.3);
    const textColor = rgb(0.5, 0.5, 0.5);
    const xCol = { n: 100, activity: 140, type: 300, amount: 420 };
    let y = 649;

    page.drawText('Comprobante de Pago de Multas', {
      x: 150,
      y,
      size: 14,
      font: fontBold,
      color: headerColor,
    });
    y -= 25;

    page.drawText(`Socio: ${data.fullName}`, {
      x: 100,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
    page.drawText(`Fecha: ${data.paidDate}`, {
      x: 380,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
    y -= 20;

    page.drawText('N°', {
      x: xCol.n,
      y,
      size: fontSize,
      font: fontBold,
      color: headerColor,
    });
    page.drawText('Actividad', {
      x: xCol.activity,
      y,
      size: fontSize,
      font: fontBold,
      color: headerColor,
    });
    page.drawText('Tipo', {
      x: xCol.type,
      y,
      size: fontSize,
      font: fontBold,
      color: headerColor,
    });
    page.drawText('Monto', {
      x: xCol.amount,
      y,
      size: fontSize,
      font: fontBold,
      color: headerColor,
    });
    y -= 2;

    const lineStart = 90;
    const lineEnd = 470;
    page.drawLine({
      start: { x: lineStart, y: y + 12 },
      end: { x: lineEnd, y: y + 12 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 14;

    for (const row of data.rows) {
      page.drawText(String(row.index), {
        x: xCol.n,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
      page.drawText(row.activityName, {
        x: xCol.activity,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
      page.drawText(row.fineTypeName, {
        x: xCol.type,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
      page.drawText(row.amount, {
        x: xCol.amount,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
      y -= 14;
    }

    y -= 6;
    page.drawLine({
      start: { x: lineStart, y: y + 6 },
      end: { x: lineEnd, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 18;

    page.drawText(`Total: ${data.total} Bs`, {
      x: 340,
      y,
      size: 12,
      font: fontBold,
      color: headerColor,
    });

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  private async loadTemplate() {
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
    return { pdfDoc, page, font, fontBold };
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
}
