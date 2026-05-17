import type { AbstractIntlMessages } from "next-intl";

import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enDashboard from "../../messages/en/dashboard.json";
import enErrors from "../../messages/en/errors.json";
import enExpenses from "../../messages/en/expenses.json";
import enOrders from "../../messages/en/orders.json";
import enReports from "../../messages/en/reports.json";
import enSettings from "../../messages/en/settings.json";
import enTasks from "../../messages/en/tasks.json";
import enValidation from "../../messages/en/validation.json";
import enWorkers from "../../messages/en/workers.json";

import uzAuth from "../../messages/uz/auth.json";
import uzCommon from "../../messages/uz/common.json";
import uzDashboard from "../../messages/uz/dashboard.json";
import uzErrors from "../../messages/uz/errors.json";
import uzExpenses from "../../messages/uz/expenses.json";
import uzOrders from "../../messages/uz/orders.json";
import uzReports from "../../messages/uz/reports.json";
import uzSettings from "../../messages/uz/settings.json";
import uzTasks from "../../messages/uz/tasks.json";
import uzValidation from "../../messages/uz/validation.json";
import uzWorkers from "../../messages/uz/workers.json";

import type { AppLocale } from "./routing";
import { routing } from "./routing";

/** Turbopack JSON moduli eski keshlangan bo‘lsa ba’zi kalitlar yo‘qolishi mumkin — faylda bor qiymat ustun (`...`). */

const COMMON_UZ_GAP = {
  upload: {
    pickImage: "Rasm yuklash…",
    uploading: "Yuklanmoqda…",
    success: "Rasm yuklandi.",
    successMany: "{count} ta rasm yuklandi.",
    failed: "Rasm yuklab bo‘lmadi.",
    typesHint: "JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF yoki BMP.",
    maxLines: "Eng ko‘pi bilan {max} ta rasm qo‘shish mumkin.",
    filteredNonImages: "{count} ta rasm bo‘lmagan fayl chiqarildi.",
    extraFilesIgnored:
      "Faqat bitta uchun: {count} ta qoʻshimcha tanlov chiqarildi.",
    batchLimited:
      "Bir partiyada {kept} tagacha — yangi safari {removed} tasini tanlang.",
    limitReached: "Rasm qoʻshish uchun boʻsh joy qolmagan.",
    truncatedToSlots:
      "Limit uchun {skipped} tasini chiqardik ({uploaded} ta yuklanadi).",
    partialOutcome: "{ok} ta tayyor, {fail} tasida xato.",
    dragDropHint:
      "Rasmlarni shu blokka qoʻllab uchiring yoki tugma bilan tanlang (bir martada koʻp fayl ham mumkin).",
    dropNoFiles:
      "Bu yerga rasm fayllarini tashlang — papka yoki boʻsh hudud ishlamaydi.",
    busyWait: "Hozirgi yuklash tugaguncha kuting.",
    blockedDisabled:
      "Hozir rasm tanlash/yuklash ishlamayapti (masalan, forma yuborayotganda).",
    pickEmpty: "Hech qanday fayl tanlanmadi.",
    notQueued: "Yuklash uchun navbat boʻsh.",
  },
} as const;

const COMMON_EN_GAP = {
  upload: {
    pickImage: "Upload image…",
    uploading: "Uploading…",
    success: "Image uploaded.",
    successMany: "{count} images uploaded.",
    failed: "Could not upload the image.",
    typesHint: "JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF, or BMP.",
    maxLines: "You can add at most {max} images.",
    filteredNonImages: "Skipped {count} non-image file(s).",
    extraFilesIgnored:
      "{count} extra selection(s) ignored (single image only here).",
    batchLimited:
      "Only {kept} at a time — try again with the remaining {removed}.",
    limitReached: "No slots left for more images.",
    truncatedToSlots: "{skipped} skipped due to limit; uploading {uploaded}.",
    partialOutcome: "{ok} succeeded, {fail} failed.",
    dragDropHint:
      "Drop images here or use the button (multi-select supported).",
    dropNoFiles:
      "Drop image files here — folders or empty drops do not upload.",
    busyWait: "Wait for the current upload to finish.",
    blockedDisabled:
      "Image upload is unavailable right now (for example while submitting).",
    pickEmpty: "No file was selected.",
    notQueued: "Nothing was queued for upload.",
  },
} as const;

const ORDERS_UZ_GAP = {
  deleteOrder: "Buyurtmani o‘chirish",
  deleteOrderConfirm:
    "«{title}» buyurtmasi oʻchirilsinmi? Bog‘langan vazifalar va buyurtma xarajatlari arxivlanadi.",
  toastOrderDeleted: "Buyurtma o‘chirildi.",
} as const;

const ORDERS_EN_GAP = {
  deleteOrder: "Remove order",
  deleteOrderConfirm:
    "Remove order «{title}»? Its tasks and order-linked expenses will be archived.",
  toastOrderDeleted: "Order removed.",
} as const;

const TASKS_UZ_GAP = {
  deleteTask: "Vazifani o‘chirish",
  deleteTaskConfirm: "«{title}» vazifasi oʻchirilsinmi?",
  toastTaskDeleted: "Vazifa o‘chirildi.",
  managerDeleteHint:
    "Vazifalarni menejer yoki administrator o‘chirib tashlashi mumkin.",
} as const;

const TASKS_EN_GAP = {
  deleteTask: "Remove task",
  deleteTaskConfirm: "Remove task «{title}»?",
  toastTaskDeleted: "Task removed.",
  managerDeleteHint: "Tasks can be permanently archived by managers.",
} as const;

const EXPENSES_UZ_GAP = {
  amountRequired: "Xarajat summasini kiriting.",
  amountInvalid: "Musbat son kiriting (o‘nlik lar bilan bo‘lishi mumkin).",
} as const;

const EXPENSES_EN_GAP = {
  amountRequired: "Enter the expense amount.",
  amountInvalid: "Enter a valid positive amount (decimals allowed).",
} as const;

const bundles: Record<AppLocale, AbstractIntlMessages> = {
  uz: {
    auth: uzAuth,
    common: { ...COMMON_UZ_GAP, ...uzCommon },
    dashboard: uzDashboard,
    orders: { ...ORDERS_UZ_GAP, ...uzOrders },
    tasks: { ...TASKS_UZ_GAP, ...uzTasks },
    workers: uzWorkers,
    expenses: { ...EXPENSES_UZ_GAP, ...uzExpenses },
    reports: uzReports,
    settings: uzSettings,
    validation: uzValidation,
    errors: uzErrors,
  },
  en: {
    auth: enAuth,
    common: { ...COMMON_EN_GAP, ...enCommon },
    dashboard: enDashboard,
    orders: { ...ORDERS_EN_GAP, ...enOrders },
    tasks: { ...TASKS_EN_GAP, ...enTasks },
    workers: enWorkers,
    expenses: { ...EXPENSES_EN_GAP, ...enExpenses },
    reports: enReports,
    settings: enSettings,
    validation: enValidation,
    errors: enErrors,
  },
};

/** Statik import — Turbopack dynamic `import(locale)` ba’zan noto‘g‘ri locale modulini keshlaydi. */
export async function loadMessages(
  locale: string,
): Promise<AbstractIntlMessages> {
  const safe: AppLocale = routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;

  return bundles[safe];
}
