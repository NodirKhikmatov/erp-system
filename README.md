# Mebel ERP (monorepo)

Uzbek‑til UI bilan mebel-ishlab chiqarish ERP (NestJS API + Next.js veb‑panel).

## Talablar

- Node.js **20** yoki ustki
- [pnpm](https://pnpm.io) **9.x** (`package.json`dag `packageManager` bilan mos keladi)

## Loyiha tuzilishi

| Paket        | Yo‘lak      | Mazmuni                                      |
|-------------|-------------|----------------------------------------------|
| **api**     | `apps/api` | REST API, JWT, Prisma                        |
| **web**     | `apps/web` | Next.js 15 (`[locale]` — `uz`, `en`)         |

Umumiy turlarni ildizdan ishga tushiring: **`pnpm dev`**, **`pnpm build`**, **`pnpm typecheck`**.

## Tez ishga tushirish

```bash
pnpm install
# API uchun apps/api/.env — nomuna apps/api/.env.example (DATABASE_URL + JWT_SECRET kamida 32 belgi)
pnpm db:bootstrap        # Postgres + migratsiya + seed (bir marta / DB yangilaganingizdan keyin ham)
pnpm dev                 # turbo: API (4000) + Next (3000) birgalikda — faqat apps/web ichida emas
```

Veb ochiladi (odatda **`http://127.0.0.1:3000/uz`**). API batafsil: `apps/api/README.md`; veb: `apps/web/README.md`. **`apps/web`** papkasida ham **`pnpm db:bootstrap`** ishlaydi (skript loyiha ildiziga yo‘naltirilgan).

### Kunlik eng oson va samarali yo‘l

| Maqsad | Buyruq (loyiha **ildizi**) |
|--------|----------------------------|
| Oddiy rivojlantirish (API + veb birga) | **`pnpm dev`** |
| `.next`/kesh yoki **`dist/main`** bilan chalkash | **`pnpm dev:fresh`** |
| Chunk kesh churn (ENOENT `./…js`) — faqat kerak tug‘ilganda | **`NEXT_DISABLE_WEBPACK_CACHE=1 pnpm dev`** (tuzilish sekinlashadi) |
| Bir martalik DB | **`pnpm db:bootstrap`** |

**Kerak boʻlmas:** `pnpm dev` ishlab turgan paytda boshqa terminaldan **`pnpm build`** / **`pnpm verify:all`** qilmasdan qoling — **`apps/web/.next`** bilan ziddiyat va xatoliklar chiqadi.

### 4000 ochilmasa yoki kirish **`unreachable`**

Bu yuzaga keladi agar **`pnpm dev`** faqat **`apps/web`** da ishlatilgan yoki Nest **xato bilan chiqib ketgan** (4000 hech narsa eshitmaydi).

1. **Ildizdan** **`pnpm dev`** qiling — terminalda **`api:dev`** satrlari va API logida **`…/salomatlik/jonli`** haqidagi eslatma chiqishi kerak.
2. **`apps/api/.env`**: **`JWT_ACCESS_SECRET` kamida 32 ta belgi** boʻlishi kerak (qisqa bo‘lsa Nest umuman ishga tushmaydi — 4000 bo‘sh).
3. Postgres: **`pnpm db:up`**, ichida DATABASE_URL **`localhost:5433`** bilan mos boʻladi (Docker `postgres`).
4. Ma’lumotlar va demo akkaunt: **`pnpm db:bootstrap`** (yoki migratsiya tayyor boʻlgan boʻlsa **`pnpm db:seed`**).
5. Tekshirish: brauzer yoki **`curl http://127.0.0.1:4000/salomatlik/jonli`** — JSON chiqsa API ishlab turibdi.
6. Kirish uchun seed akkaunt (**parol:** `seed` kodidagi `DEV_PASSWORD`): **`apps/api/prisma/seed.ts`** da (`admin@mebel-erp.local` va hokazo).

Agar **`api:dev`** da **qizil xato** koʻrsangiz (masalan `dist/main`, Prisma, JWT) — shu blokni nusxalab yuborsangiz, aniq tuzatish yo‘li aytiladi.

## SSR va ichki sorovlar

Server komponentlarida `Cookie` bilan API chaqirishda veb oʻz originiga (`/api/proxy/…`) ulanadi — **JWT yangilash** zanjiri shu yerda ishlaydi. Ishlab chiqarishdan oldin ishlab chiqarish hostini aniq tasdiqlang:

- **`NEXT_PUBLIC_APP_URL`** — jamoat URL (agar ishlatsa).
- **`AUTH_INTERNAL_ORIGIN`** — server ichki **`fetch`** uchun toʻgʻri asos (masalan `https://erp.sizning-domeningiz`), bo‘masa SSR da cookie/proxy toʻgʻri chiqmasligi mumkin.

## Yakuniy integratsiya testlari (Playwright)

`playwright` CLI **`apps/web`** paketida (`@playwright/test`), shuning uchun **ildizdan** `pnpm exec playwright` ishlamaydi — quyidagi usulardan foydalaning.

Brauzer (Chromium) ikkilamchi fayllarini birinchi marta o‘rnating:

```bash
pnpm test:e2e:install
```

(`apps/web` ichida boʻlsangiz: **`pnpm test:e2e:install`** yoki **`pnpm exec playwright install chromium`**.)

**Muhim:** testlar **`BASE_URL`** (standart **`http://127.0.0.1:3000`**) ga ulana oladi — avval boshqa terminalda **`pnpm dev`** ni ishga tushing. Aks holda **`net::ERR_CONNECTION_REFUSED`** chiqadi.

Keyin ildizdan:

```bash
pnpm test:e2e
```

Yoki **`apps/web`** da: **`pnpm test:e2e`**.

Boshqa portda ishlayotganda (masalan 3001): **`BASE_URL=http://127.0.0.1:3001 pnpm --filter web test:e2e`** (yoki `apps/web` ichida **`BASE_URL=... pnpm test:e2e`**).

Agar sahifa **Runtime Error / Cannot find module './....js'** bersa — dev ustida **`pnpm build`** ketgan **`apps/web/.next`** kesh chalkash boʻladi: **`pnpm dev` ni toʻxtating**, **`rm -rf apps/web/.next`** (yoki ildizdan **`pnpm clean:dev`**), qayta **`pnpm dev`**.

API **`Cannot find module .../apps/api/dist/main`** bo‘lsa: **`pnpm dev`** paytida `apps/api/dist` yoʻq yoki boshqa jarayon (`pnpm build`) uni tozalagan. **`pnpm clean:dev`**dan keyin yoki **`rm -rf apps/api/dist`** qilib qayta **`pnpm dev`** — birinchi marta `nest build` avtomatik ishlaydi (**`ensure-dist`**).

## Avtomatik tekshirish (`verify`)

```bash
pnpm verify        # typecheck + lint + API unit testlari
pnpm verify:all    # yuqoridagiga qo‘shimcha ravishda production build
```


**English (short)** — Turborepo: `pnpm dev` starts API + Web. Set **`AUTH_INTERNAL_ORIGIN`** (and/or **`NEXT_PUBLIC_APP_URL`**) so server-side proxy fetches use the correct app origin for cookies and JWT refresh. E2E (from repo root): **`pnpm test:e2e:install`**, keep **`pnpm dev`** running in another terminal, then **`pnpm test:e2e`**. Plain `pnpm exec playwright …` from the repo root fails because Playwright lives in **`apps/web`**.
