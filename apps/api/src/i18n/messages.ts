import type { AppLocale } from "@furniture/types";

export const messages: Record<AppLocale, Record<string, string>> = {
  uz: {
    "validation.invalid":
      "Yuborilgan ma’lumotlar noto‘g‘ri yoki ruhsatsiz maydonlar bor",
    "auth.invalidCredentials": "Pochta yoki parol noto‘g‘ri",
    "auth.emailTaken":
      "Bu elektron pochta allaqachon ro‘yxatdan o‘tgan. Boshqa manzil tanlang yoki tizimga kiring.",
    "auth.invalidRefresh": "Yaroqsiz yangilanish jetoni",
    "auth.userInactive": "Foydalanuvchi topilmadi yoki faol emas",
    "auth.jwtInvalid": "Kirish jetoni yaroqsiz yoki foydalanuvchi faol emas",
    "auth.unauthorized": "Tizimga kirish talab qilinadi",
    "auth.forbidden": "Kirish rad etildi",
    "auth.insufficientRole": "Rol yetarli emas",
    "health.ok": "Tizim yaroqli",
    "root.name": "Mebel ishlab chiqarish ERP API",
    "worker.notFound": "Foydalanuvchi topilmadi",
    "worker.emailTaken": "Bu elektron pochta allaqachon ro‘yxatdan o‘tgan",
    "worker.cannotTargetSelf": "O‘z profilingiz uchun bu amal ruxsat etilmaydi",
    "worker.lastAdminProtected":
      "Sistemadagi oxirgi administratorni o‘chirish yoki nofaollashtirib bo‘lmaydi",
    "client.notFound": "Mijoz topilmadi",
    "order.notFound": "Buyurtma topilmadi",
    "order.assigneeInvalid": "Biriktirilgan ijrochi topilmadi yoki faol emas",
    "order.clientRequired": "Mijoz ID yoki mijoz ismi kiritilishi kerak",
    "order.clientRefConflict":
      "clientId va clientName bir vaqtda yuborilmasin — bittasini tanlang",
    "task.notFound": "Vazifa topilmadi",
    "task.forbidden": "Bu vazifaga kirish rad etildi",
    "task.doneReadonly": "Tugallangan vazifani o‘zgartirib bo‘lmaydi",
    "dailyReport.notFound": "Hisobot topilmadi",
    "dailyReport.forbidden": "Bu hisobotga ruxsat yo‘q",
    "dailyReport.workerIdRequired": "Ishchi ID majburiy (ADMIN/MANAGER)",
    "dailyReport.taskMismatch": "Bu vazifa tanlangan ishchiga biriktirilmagan",
    "upload.fileRequired": "Fayl yuborilmadi",
    "upload.invalidType":
      "Ruxsat berilgan formatlar: JPEG, PNG, WebP, GIF, HEIC/HEIF, AVIF, BMP, TIFF. Baʼzan `application/octet-stream` boʻladi — faylda kengaytma boʻlishi kerak.",
    "upload.tooLarge": "Fayl hajmi cheklovdan oshdi",
    "upload.storageFailed":
      "Rasmni server diski yoki URL qilish muvaffaqiyatsiz",
    "upload.deleteFailed": "Faylni o‘chirib bo‘lmadi",
    "telegram.chatUserMissing":
      "Foydalanuvchini aniqlab bo‘lmadi. Shaxsiy chatdan yozing.",
    "telegram.notLinked":
      "Sizning akkauntingiz ulanmagan. Veb-ilovadan kirish kodi oling va: /start KOD",
    "telegram.startWelcome":
      "Salom! Veb-ilovada Sozlamalar → Telegram bo‘limidan «Kodni olish» tugmasini bosing.\n\nBitta xabar yuboring: /start probel va vebda chiqgan 10 ta belgi (faqat 0–9 va a–f). «CODE» degan so‘zni emas, aynan kodni yozing.\n\nBuyruqlar:\n• /vazifalar — sizga biriktirilgan ishlar\n• /bajarildi — vazifani tugatish (keyin vazifa identifikatori)\n• /hisobot — kunlik hisobot matni",
    "telegram.linkCodeMissing": "Bog‘lash kodi kiritilmadi.",
    "telegram.linkCodeFormat":
      "Noto‘g‘ri kod shakli. Sozlamalardan chiqgan 10 ta belgini boshqa matnsiz /start bilan bir xabar yuboring: faqat 0–9 va a–f. «CODE» yozmang.",
    "telegram.linkCodeInvalid":
      "Bu kod bazada yoʻq yoki 15 daqiqadan oʻtib eskirgan. Sozlamalardan yangi kod oling va darhol yozing.",

    "telegram.telegramBusy": "Bu Telegram hisobi boshqa akkauntga ulangan.",
    "telegram.userAlreadyLinked":
      "Sizning akkauntingiz boshqa Telegram hisobiga ulangan.",
    "telegram.linkSuccess":
      "Telegram akkauntingiz ulandi. Vazifalarni ko‘rish uchun /vazifalar buyrug‘ini yuboring.",
    "telegram.tasksEmpty": "Hozircha sizga tegishli vazifalar yo‘q.",
    "telegram.tasksHeader": "📋 Sizning vazifalaringiz",
    "telegram.doneUsage":
      "Namuna: /bajarildi keyin vazifa identifikatori (UUID)\nIdentifikatorni /vazifalar ro‘yxatidan nusxalang.",
    "telegram.doneOk": 'Vazifa "bajarildi" deb belgilandi.',
    "telegram.reportUsage":
      "Namuna: /hisobot Bugun stol yig‘ish va pojojnikni qayta yig‘ish bilan shug‘ullandim…",
    "telegram.reportTooLong": "Matn juda uzun (chegara: 20000 belgi).",
    "telegram.reportOk": "Kunlik hisobot saqlandi.",
    "telegram.errNotFound": "Ma’lumot topilmadi (vazifa yoki buyurtma).",
    "telegram.errForbidden": "Bu amal uchun ruxsat yo‘q.",
    "telegram.errBadRequest": "So‘rov qabul qilinmadi. Ma’lumotni tekshiring.",
    "telegram.errGeneric": "Xatolik yuz berdi. Keyinroq qayta urinib ko‘ring.",
  },
  en: {
    "validation.invalid":
      "The submitted data is invalid or contains disallowed fields",
    "auth.invalidCredentials": "Invalid email or password",
    "auth.emailTaken":
      "This email is already registered. Use another address or sign in.",
    "auth.invalidRefresh": "Invalid refresh token",
    "auth.userInactive": "User not found or inactive",
    "auth.jwtInvalid": "Invalid access token or user is inactive",
    "auth.unauthorized": "Authentication required",
    "auth.forbidden": "Access denied",
    "auth.insufficientRole": "Insufficient role",
    "health.ok": "System healthy",
    "root.name": "Furniture production ERP API",
    "worker.notFound": "User not found",
    "worker.emailTaken": "This email is already registered",
    "worker.cannotTargetSelf":
      "You cannot perform this action on your own account",
    "worker.lastAdminProtected":
      "The last administrator cannot be deleted or deactivated",
    "client.notFound": "Client not found",
    "order.notFound": "Order not found",
    "order.assigneeInvalid": "Assignee not found or inactive",
    "order.clientRequired": "Provide a client id or client name",
    "order.clientRefConflict": "Send either clientId or clientName, not both",
    "task.notFound": "Task not found",
    "task.forbidden": "You do not have access to this task",
    "task.doneReadonly": "Completed tasks cannot be modified",
    "dailyReport.notFound": "Report not found",
    "dailyReport.forbidden": "You do not have access to this report",
    "dailyReport.workerIdRequired": "workerId is required for this role",
    "dailyReport.taskMismatch": "Task is not assigned to the selected worker",
    "upload.fileRequired": "No file was uploaded",
    "upload.invalidType":
      "Allowed: JPEG, PNG, WebP, GIF, HEIC/HEIF, AVIF, BMP, TIFF. Sometimes sent as octet-stream — filename must include a known extension.",
    "upload.tooLarge": "File exceeds the maximum size limit",
    "upload.storageFailed": "Could not store the image or build its public URL",
    "upload.deleteFailed": "Could not delete the file",
    "telegram.chatUserMissing":
      "Could not identify the user. Message from a private chat.",
    "telegram.notLinked":
      "Your account is not linked. Get a link code in the web app, then send: /start CODE",
    "telegram.startWelcome":
      "Hi! In the web app open Settings → Telegram and tap Get link code. Send ONE message here: /start (space) then paste the ten characters shown (digits 0–9 and letters a–f only—not the English word CODE). Commands: /tasks; /done with task id; /report with daily text.",
    "telegram.linkCodeMissing": "No link code provided.",
    "telegram.linkCodeFormat":
      'Wrong code shape. Copy the 10 characters from the web (only 0–9 and a–f). Do not type the word "CODE" — send: /start yourcode.',
    "telegram.linkCodeInvalid":
      "Unknown or expired code (codes expire after 15 minutes). Open Settings → Get a new code and sent it immediately in one message: /start yourcode.",

    "telegram.telegramBusy":
      "This Telegram account is already linked to another user.",
    "telegram.userAlreadyLinked":
      "Your account is already linked to a different Telegram account.",
    "telegram.linkSuccess": "Telegram linked successfully. Try /tasks.",
    "telegram.tasksEmpty": "You have no assigned tasks right now.",
    "telegram.tasksHeader": "📋 Your tasks",
    "telegram.doneUsage":
      "Format: /done task-UUID\n(Copy the UUID from the /tasks list)",
    "telegram.doneOk": "Task marked as done.",
    "telegram.reportUsage": "Format: /report Today I …",
    "telegram.reportTooLong": "Message is too long (limit: 20000 characters).",
    "telegram.reportOk": "Daily report saved.",
    "telegram.errNotFound": "Not found (task or order).",
    "telegram.errForbidden": "You are not allowed to do this.",
    "telegram.errBadRequest":
      "Request could not be accepted. Check your input.",
    "telegram.errGeneric": "Something went wrong. Please try again later.",
  },
};

export function t(lang: AppLocale, key: string): string {
  const v = messages[lang][key];
  return typeof v === "string" ? v : key;
}
