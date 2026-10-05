export const ASSET_CODE_PREFIX = 'OTB-BIE-';
const SEQUENCE_LENGTH = 6;

/**
 * Builds the asset code: OTB-BIE-{000123}.
 */
export function buildAssetCode(sequence: number): string {
  return `${ASSET_CODE_PREFIX}${String(sequence).padStart(
    SEQUENCE_LENGTH,
    '0',
  )}`;
}

/**
 * Extracts the numeric sequence out of an asset code.
 * Returns null when the code does not follow the OTB-BIE-NNNNNN shape.
 */
export function parseAssetCodeSequence(code: string): number | null {
  if (!code.startsWith(ASSET_CODE_PREFIX)) return null;
  const raw = code.slice(ASSET_CODE_PREFIX.length);
  if (!/^\d+$/.test(raw)) return null;
  return parseInt(raw, 10);
}
