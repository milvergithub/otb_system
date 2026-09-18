/**
 * Builds the invoice code: OTB-DB-{meterCode}-{YYYYMMDD-HHMMSS}.
 */
export function buildInvoiceCode(meterCode: string, date: Date): string {
  const sanitizedCode = meterCode.replace(/[^\w.-]/g, '-');
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp =
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `OTB-DB-${sanitizedCode}-${timestamp}`;
}
