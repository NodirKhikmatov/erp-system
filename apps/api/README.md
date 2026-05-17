# API (NestJS)

Mebel ishlab chiqarish ERP ning server qismi: REST API, ma’lumotlar bazasi, autentifikatsiya.

## Talablar

- Node.js **20+**
- PostgreSQL — loyihada Docker: loyiha **ildizidan** **`pnpm db:up`**

## Sozlash

1. `apps/api/.env` yarating — **`apps/api/.env.example`** dan nusxa.
2. **`JWT_ACCESS_SECRET`** — **kamida 32 belgi** (qisqa bo‘lsa ilova **`ConfigModule`** da yiqiladi, **4000-port ochilmaydi**).
3. **`DATABASE_URL`** — Docker bilan misol: `postgresql://furniture:furniture@localhost:5433/furniture_erp?schema=public`

## Birinchi marta (ildizdan)

```bash
pnpm install
pnpm db:bootstrap    # postgres + migrate deploy + seed
pnpm dev             # api + web birga (turbo)
```

Faqat API: **`pnpm --filter api dev`**. Port: **`4000`** (`.env` dagi **`PORT`**).

## Muhim yo‘llar

- Ildiz manzili: `/`
- Salomatlik (server javob bermoqdami): `/salomatlik/jonli` yoki **`/health/live`**
- Tayyorlik (bazaga ulanish): `/salomatlik` yoki **`/health`**
- Interaktiv API hujjatlari: `/hujjatlar`
- Tizimga kirish so‘rovi: `/autentifikatsiya/kirish` (`POST`)
- Ro‘yxatdan o‘tish (WORKER/MANAGER): `/autentifikatsiya/register` (`POST`, `201`)
- Ishchilar (JWT + ADMIN/Menejer): `/workers` — CRUD, statistika, ishchining vazifalari

## Demo akkaunt (seed dan keyin)

`prisma/seed.ts` dan: masalan **`admin@mebel-erp.local`** — parol fayldagi **`DEV_PASSWORD`**.

Xabarlar tili: so‘rov sarlavhasi `Accept-Language` bo‘yicha tanlanadi (`en…` — inglizcha, aks holda o‘zbekcha). Misol: `Accept-Language: en-US`.

Manba: `src/modules/`.
