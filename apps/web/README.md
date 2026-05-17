# Veb ilova (Next.js)

Bu paket mebel ishlab chiqarish ERP ning foydalanuvchi boshqaruv paneli parchasidir.

## Ishga tushirish

Loyiha ildizidan (**API bilan birga ishlaydi**):

```bash
pnpm dev
```

Faqat veb uchun (monoreppo ichida **`apps/web`** da): **`pnpm dev`**.

**Muhim:** bunda Nest API **ishi majburiyat emas** — lekin **kirish/ro‘yxatdan o‘tish** va **`/api/proxy/...`** uchun backend kerak (**odatda 4000**). Kirish uchun alohida terminalda **`pnpm --filter api dev`** ishga tushing yoki loyiha **ildizidan** **`pnpm dev`** (turbo ikki paketni birdan ko‘taradi).

Murakkab xato chiqsa (`.next`/kesh): loyiha **ildizidan** **`pnpm dev:fresh`**.

Migratsiya + seed uchun (bu papkada ham ishlaydi):

```bash
pnpm db:bootstrap
```

**`.next`** buzilganda (**`ENOENT`**, **`Cannot find module './…js'`**): loyiha ildizidan **`pnpm clean:dev`**, so‘ng **`pnpm dev`**.

Brauzerda ochiladi: standart til — `http://localhost:3000/uz`; inglizcha: `http://localhost:3000/en`. Loyiha bosh sahifasida til almashtirgichi bor.

Agar boshqa port/domen uchun API yozilgan boʻlsa (`apps/web/.env.local`): **`API_URL=http://127.0.0.1:4000`** (yoki boshqa manzil) bilan moslang.

## Playwright smoke

Birinchi marta: **`pnpm test:e2e:install`** (bu paketda). Keyin boshqa terminalda loyiha ildizidan **`pnpm dev`** ishga tushirib, ildizdan **`pnpm test:e2e`** yoki bu yerda **`pnpm test:e2e`**.


## Sozlash

API manzilini ko‘rsating: loyiha ildizidagi `.env.example` dan nusxa olib `apps/web/.env.local` yarating.

## Tuzilma

Asosiy sahifa: `src/app/page.tsx`. Yo‘l topilmasa — `src/app/not-found.tsx` ko‘rinadi.
