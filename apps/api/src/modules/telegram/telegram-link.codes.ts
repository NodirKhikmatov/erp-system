/** Bog‘lash kodi: DB da saqlangan random hex bilan mos bo‘lishi kerak */

export const TELEGRAM_LINK_CODE_BYTE_LENGTH = 5;
export const TELEGRAM_LINK_CODE_HEX_LENGTH = TELEGRAM_LINK_CODE_BYTE_LENGTH * 2;

/**
 * Telegramdan kelgan `/start …` qiymati: boshqa belgilarni chiqarib, `[0-9a-f]` 10 baytli hex qoldiriladi.
 */
export function normalizeTelegramLinkCode(raw: string): string | null {
  const hex = raw
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, "");
  return hex.length === TELEGRAM_LINK_CODE_HEX_LENGTH ? hex : null;
}
