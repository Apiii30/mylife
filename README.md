# MyLife

Satu ruang untuk seluruh hidupmu — keuangan, to-do, kalender, jurnal, memories, dan goals.

Monorepo (npm workspaces):

| Folder     | Isi                                                              |
| ---------- | ---------------------------------------------------------------- |
| `apps/web` | Next.js 16 · Tailwind 4 · NextAuth v5 · next-intl (ID/EN) · Motion |
| `apps/api` | Express 5 · Prisma 7 · PostgreSQL · JWT · Zod                    |

## Menjalankan di lokal

1. **Install dependency** (dari root):

   ```bash
   npm install
   ```

2. **Buat database** Postgres bernama `mylife`:

   ```bash
   createdb mylife
   ```

3. **Isi environment**
   - `apps/api/.env` → ganti `PASSWORD_KAMU` di `DATABASE_URL`
   - `apps/web/.env.local` → sudah terisi; `INTERNAL_API_SECRET` harus sama dengan milik API
   - (Untuk clone baru, salin dari `.env.example` di masing-masing folder.)

4. **Migrasi database**:

   ```bash
   npm run db:migrate
   ```

5. **Jalankan web + API sekaligus**:

   ```bash
   npm run dev
   ```

   - Web: http://localhost:3000
   - API: http://localhost:4000/health

## Login Google (opsional)

1. Buat OAuth Client di https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Isi `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` di `apps/web/.env.local`

Tombol Google otomatis muncul jika kedua variabel terisi.

## Cara kerja login

```
Browser ──signIn()──▶ NextAuth (Next.js) ──POST /auth/login──▶ Express
                         │                                       │
                         ◀──────────── accessToken (JWT) ────────┘
                         │ disimpan di sesi NextAuth
Browser ──fetch + Authorization: Bearer <token>──▶ Express (requireAuth)
```

## Perintah lain

| Perintah             | Fungsi                         |
| -------------------- | ------------------------------ |
| `npm run db:studio`  | Lihat isi database (Prisma Studio) |
| `npm run build`      | Build API + web                |
