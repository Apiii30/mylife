// Akun demo "Hafidz" berisi data lengkap (semua modul kecuali Memories).
// Pakai: node apps/api/scripts/seed-demo.mjs [API_URL] [EMAIL] [PASSWORD] [--reset]
//   --reset  hapus dulu akun dengan email itu (mis. sisa percobaan yang gagal di tengah), lalu buat ulang
// Semua data dikirim lewat API publik (sama seperti dari aplikasi), jadi aman dipakai ke server lokal maupun online.
const RESET = process.argv.includes("--reset");
const [API = "http://localhost:4000", EMAIL = "hafidz@demo.test", PASSWORD = "hafidz123"] = process.argv.slice(2).filter((a) => a !== "--reset");
const TODAY = "2026-10-22";

// PRNG deterministik agar hasil bisa diulang
let seed = 20261022;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (min, max, step = 1000) => Math.round((min + rand() * (max - min)) / step) * step;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const at = (date, time) => new Date(`${date}T${time}:00+07:00`).toISOString();

// ─── Akun ──────────────────────────────────────────────────
const json = { "content-type": "application/json" };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (RESET) {
  const login = await fetch(`${API}/auth/login`, { method: "POST", headers: json, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then((r) => r.json());
  if (login.accessToken) {
    const r = await fetch(`${API}/users/me`, { method: "DELETE", headers: { ...json, authorization: `Bearer ${login.accessToken}` }, body: JSON.stringify({ email: EMAIL }) });
    console.log(r.ok ? `Akun lama ${EMAIL} dihapus.` : `Gagal menghapus akun lama (${r.status}).`);
  }
}

const reg = await fetch(`${API}/auth/register`, {
  method: "POST",
  headers: json,
  body: JSON.stringify({ name: "Hafidz", email: EMAIL, password: PASSWORD, locale: "id" }),
}).then((r) => r.json());
if (!reg.accessToken) {
  const hint = reg.error?.code === "EMAIL_TAKEN" ? "\nEmail sudah terdaftar — jalankan ulang dengan --reset untuk menghapus akun lama lalu membuat ulang." : "";
  throw new Error("Register gagal: " + JSON.stringify(reg) + hint);
}
const H = { ...json, authorization: `Bearer ${reg.accessToken}` };
let calls = 0;
const send = async (method, path, body) => {
  calls++;
  // Server serverless sesekali gagal saat "bangun" (5xx / koneksi putus) → coba lagi sampai 3 kali
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(API + path, { method, headers: H, body: body && JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return data;
      if (r.status < 500 || attempt === 3) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
    } catch (error) {
      if (attempt === 3 || String(error.message).includes(" → 4")) throw error;
    }
    await wait(1000 * attempt);
  }
};
const post = (p, b) => send("POST", p, b);
const patch = (p, b) => send("PATCH", p, b);
const get = (p) => send("GET", p);

const categories = (await get("/categories")).categories;
const cat = (kind, name) => {
  const c = categories.find((x) => x.kind === kind && x.name === name);
  if (!c) throw new Error(`Kategori ${kind}/${name} tidak ada`);
  return c.id;
};

// ─── Keuangan: Des 2025 – Okt 2026 ─────────────────────────
const MONTHS = [
  [2025, 12], [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5],
  [2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10],
];
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const tx = [];
const add = (type, category, amount, date, note) => {
  if (date > TODAY) return;
  tx.push({ type, categoryId: cat(type, category), amount, date, note });
};

const FOOD = ["Makan siang kantin", "Kopi susu", "Nasi padang", "Belanja bulanan", "Makan malam bareng teman", "Sarapan bubur", "Martabak", "GoFood ayam geprek", "Seblak", "Bakso"];
const TRANSPORT = ["Bensin motor", "Grab ke kampus", "KRL", "Parkir", "Gojek", "Tol"];
const SHOPPING = ["Kemeja kerja", "Sepatu lari", "Headphone", "Skincare", "Tas laptop", "Keyboard mekanikal", "Kaos"];
const FUN = ["Nonton bioskop", "Spotify Premium", "Netflix", "Konser", "Futsal", "Karaoke"];
const HEALTH = ["Vitamin", "Periksa gigi", "Obat flu", "Gym bulanan"];
const FREELANCE = ["Desain landing page", "Website UMKM", "Revisi aplikasi kasir", "Desain logo", "Dashboard admin", "Slicing UI"];

for (const [y, m] of MONTHS) {
  const end = lastDay(y, m);
  const salary = y === 2026 && m >= 7 ? 31_000_000 : 28_500_000;
  add("INCOME", "Gaji", salary, ymd(y, m, 1), `Gaji ${new Date(Date.UTC(y, m - 1)).toLocaleString("id-ID", { month: "long", timeZone: "UTC" })}`);
  for (let i = 0, n = 1 + Math.floor(rand() * 2); i < n; i++) add("INCOME", "Freelance", between(2_500_000, 9_000_000, 50_000), ymd(y, m, 5 + Math.floor(rand() * 20)), pick(FREELANCE));
  if (rand() < 0.35) add("INCOME", "Lainnya", between(300_000, 1_800_000, 50_000), ymd(y, m, 3 + Math.floor(rand() * 24)), pick(["Jual barang bekas", "Cashback", "Komisi referral"]));

  for (let i = 0, n = 10 + Math.floor(rand() * 6); i < n; i++) add("EXPENSE", "Makan & Minum", between(18_000, 420_000, 500), ymd(y, m, 1 + Math.floor(rand() * end)), pick(FOOD));
  for (let i = 0, n = 4 + Math.floor(rand() * 3); i < n; i++) add("EXPENSE", "Transportasi", between(15_000, 280_000, 500), ymd(y, m, 1 + Math.floor(rand() * end)), pick(TRANSPORT));
  for (let i = 0, n = 1 + Math.floor(rand() * 3); i < n; i++) add("EXPENSE", "Belanja", between(150_000, 2_400_000, 5_000), ymd(y, m, 1 + Math.floor(rand() * end)), pick(SHOPPING));
  for (let i = 0, n = 1 + Math.floor(rand() * 3); i < n; i++) add("EXPENSE", "Hiburan", between(45_000, 650_000, 1_000), ymd(y, m, 1 + Math.floor(rand() * end)), pick(FUN));
  if (rand() < 0.5) add("EXPENSE", "Kesehatan", between(60_000, 550_000, 1_000), ymd(y, m, 1 + Math.floor(rand() * end)), pick(HEALTH));
  add("EXPENSE", "Tagihan", 3_500_000, ymd(y, m, 2), "Sewa kos");
  add("EXPENSE", "Tagihan", between(380_000, 760_000, 500), ymd(y, m, 6), "Listrik");
  add("EXPENSE", "Tagihan", 385_000, ymd(y, m, 10), "Internet rumah");
  add("EXPENSE", "Tagihan", 150_000, ymd(y, m, 12), "Paket data");
  if (rand() < 0.4) add("EXPENSE", "Pendidikan", between(90_000, 450_000, 1_000), ymd(y, m, 1 + Math.floor(rand() * end)), pick(["Buku referensi", "Kursus online", "Print skripsi", "Langganan jurnal"]));
  if (rand() < 0.2) add("EXPENSE", "Lainnya", between(100_000, 900_000, 5_000), ymd(y, m, 1 + Math.floor(rand() * end)), pick(["Kondangan", "Donasi", "Kado ulang tahun"]));
}
// Momen besar
add("INCOME", "Hadiah", 28_500_000, "2026-03-13", "THR Lebaran");
add("EXPENSE", "Pendidikan", 7_500_000, "2026-02-09", "UKT semester genap");
add("EXPENSE", "Pendidikan", 7_500_000, "2026-08-10", "UKT semester ganjil");
add("EXPENSE", "Lainnya", 2_000_000, "2026-03-18", "Angpao keponakan");
add("EXPENSE", "Belanja", 4_850_000, "2026-03-15", "Baju Lebaran keluarga");
add("EXPENSE", "Hiburan", 3_200_000, "2026-06-20", "Liburan ke Malang");

// ─── Goals (setoran tercatat otomatis sebagai pengeluaran "Tabungan") ───
const deposits = [];
const goal = async (body) => (await post("/goals", body)).goal;
const macbook = await goal({ title: "MacBook Pro M5", type: "FINANCIAL", targetAmount: 32_000_000, deadline: "2026-12-31", color: "blue", icon: "laptop", description: "Untuk ngoding & desain, ganti laptop lama yang sudah lemot." });
const darurat = await goal({ title: "Dana Darurat", type: "FINANCIAL", targetAmount: 60_000_000, deadline: "2027-06-30", color: "green", icon: "piggy-bank", description: "6x pengeluaran bulanan." });
const jepang = await goal({ title: "Liburan ke Jepang", type: "FINANCIAL", targetAmount: 25_000_000, deadline: "2027-03-20", color: "pink", icon: "plane", description: "Tokyo – Kyoto – Osaka, musim sakura." });
const iphone = await goal({ title: "iPhone 17", type: "FINANCIAL", targetAmount: 18_000_000, deadline: "2026-07-31", color: "purple", icon: "smartphone" });
for (const [y, m] of MONTHS) {
  const d = ymd(y, m, 3);
  if (d > TODAY) continue;
  deposits.push([darurat.id, 2_500_000, d]);
  if (y === 2026 && m >= 3) deposits.push([macbook.id, between(2_400_000, 3_200_000, 100_000), ymd(y, m, 4)]);
  if (y === 2026 && m >= 6) deposits.push([jepang.id, 2_000_000, ymd(y, m, 5)]);
}
for (const [amount, date] of [[3_000_000, "2025-12-05"], [3_000_000, "2026-01-05"], [3_000_000, "2026-02-05"], [4_000_000, "2026-03-14"], [2_500_000, "2026-04-05"], [2_500_000, "2026-05-05"]]) deposits.push([iphone.id, amount, date]);
for (const [id, amount, date] of deposits) await post(`/goals/${id}/deposits`, { amount, date });

const lulus = await goal({ title: "Lulus S1 Informatika", type: "LIFE", deadline: "2027-08-31", color: "purple", icon: "graduation-cap", milestones: ["Seminar proposal", "Penelitian & pengumpulan data", "Sidang skripsi", "Revisi & yudisium", "Wisuda"] });
const marathon = await goal({ title: "Lari Half Marathon", type: "LIFE", deadline: "2027-02-14", color: "orange", icon: "dumbbell", milestones: ["Lari 5K tanpa berhenti", "Lari 10K", "Lari 15K", "Ikut race 21K"] });
const buku = await goal({ title: "Baca 12 buku tahun ini", type: "LIFE", deadline: "2026-12-31", color: "teal", icon: "book-open", milestones: ["Atomic Habits", "Laskar Pelangi", "Clean Code", "Filosofi Teras", "Sapiens", "Deep Work"] });
for (const [g, doneCount] of [[lulus, 2], [marathon, 2], [buku, 5]]) {
  for (const ms of g.milestones.slice(0, doneCount)) await patch(`/goals/${g.id}/milestones/${ms.id}`, { done: true });
}

// ─── Hitung saldo, lalu sesuaikan agar total ±223 juta ─────
const TARGET = 223_000_000 + between(150_000, 900_000, 1_000);
const savings = deposits.reduce((s, [, a]) => s + a, 0);
const net = () => tx.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0) - savings;
const gap = TARGET - net();
// Selisih ditutup dengan bonus akhir tahun lalu (jika kurang) atau satu pengeluaran besar (jika lebih)
if (gap > 0) add("INCOME", "Gaji", gap, "2025-12-20", "Bonus akhir tahun");
else if (gap < 0) add("EXPENSE", "Belanja", -gap, "2026-09-14", "Upgrade PC & monitor");
for (const t of tx) await post("/transactions", t);

// ─── To-Do ─────────────────────────────────────────────────
const tcat = (n) => cat("TASK", n);
const tasks = [
  ["Kirim draft bab 4 ke dosen pembimbing", "Kuliah", "2026-10-21", "16:00", "HIGH", "TODO"],
  ["Bayar tagihan listrik", "Pribadi", "2026-10-20", null, "MEDIUM", "TODO"],
  ["Revisi desain dashboard klien", "Pekerjaan", TODAY, "17:00", "HIGH", "IN_PROGRESS"],
  ["Review pull request tim", "Pekerjaan", TODAY, null, "MEDIUM", "TODO"],
  ["Beli hadiah ulang tahun Ibu", "Pribadi", TODAY, null, "LOW", "TODO"],
  ["Latihan presentasi sidang proposal", "Kuliah", "2026-10-23", "20:00", "HIGH", "TODO"],
  ["Kumpulkan tugas Keamanan Informasi", "Kuliah", "2026-10-24", "23:59", "HIGH", "TODO"],
  ["Meeting sprint planning", "Pekerjaan", "2026-10-26", "10:00", "MEDIUM", "TODO"],
  ["Lari pagi 8K", "Pribadi", "2026-10-25", "06:00", "LOW", "TODO"],
  ["Siapkan slide seminar", "Kuliah", "2026-10-27", null, "MEDIUM", "IN_PROGRESS"],
  ["Perpanjang STNK motor", "Pribadi", "2026-10-30", null, "MEDIUM", "TODO"],
  ["Deploy versi 2.1 aplikasi kasir", "Pekerjaan", "2026-10-29", "15:00", "HIGH", "TODO"],
  ["Daftar race Jakarta Half Marathon", "Pribadi", "2026-11-03", null, "MEDIUM", "TODO"],
  ["Baca paper referensi tentang IDS", "Kuliah", "2026-11-05", null, "LOW", "TODO"],
  ["Rapikan portofolio di GitHub", "Pekerjaan", null, null, "LOW", "TODO"],
  ["Cari tiket pesawat ke Jepang", "Pribadi", null, null, "LOW", "TODO"],
  ["Pelajari Rust dasar", "Pekerjaan", null, null, "LOW", "TODO"],
  ["Kumpulkan laporan praktikum", "Kuliah", "2026-10-19", "23:00", "HIGH", "DONE"],
  ["Bayar sewa kos", "Pribadi", "2026-10-02", null, "HIGH", "DONE"],
  ["Kirim invoice ke klien", "Pekerjaan", "2026-10-15", null, "MEDIUM", "DONE"],
  ["Servis motor", "Pribadi", "2026-10-12", null, "MEDIUM", "DONE"],
  ["Daftar ulang semester ganjil", "Kuliah", "2026-08-10", null, "HIGH", "DONE"],
  ["Setup CI/CD proyek kantor", "Pekerjaan", "2026-10-18", null, "MEDIUM", "DONE"],
  ["Telepon Nenek", "Pribadi", "2026-10-22", null, "LOW", "DONE"],
];
for (const [title, c, date, time, priority, status] of tasks) {
  await post("/tasks", {
    title,
    categoryId: tcat(c),
    priority,
    status,
    dueDate: date ? at(date, time ?? "00:00") : null,
    hasDueTime: Boolean(time),
  });
}

// ─── Kalender ──────────────────────────────────────────────
const events = [
  { title: "Kelas Pembelajaran Mesin", color: "purple", allDay: false, start: at("2026-08-17", "08:00"), end: at("2026-08-17", "10:30"), repeat: "WEEKLY", location: "Gedung C 3.04" },
  { title: "Kelas Keamanan Informasi", color: "red", allDay: false, start: at("2026-08-19", "13:00"), end: at("2026-08-19", "15:30"), repeat: "WEEKLY", location: "Lab Jaringan" },
  { title: "Metodologi Penelitian", color: "teal", allDay: false, start: at("2026-08-20", "10:00"), end: at("2026-08-20", "11:40"), repeat: "WEEKLY", location: "Gedung B 2.01" },
  { title: "Futsal bareng anak kantor", color: "green", allDay: false, start: at("2026-09-05", "19:00"), end: at("2026-09-05", "21:00"), repeat: "WEEKLY", location: "Champion Futsal" },
  { title: "Sync mingguan tim", color: "blue", allDay: false, start: at("2026-09-07", "10:00"), end: at("2026-09-07", "11:00"), repeat: "WEEKLY", location: "Google Meet" },
  { title: "Bayar sewa kos", color: "yellow", allDay: true, start: "2026-01-02", end: "2026-01-02", repeat: "MONTHLY" },
  { title: "Ulang tahun Ibu", color: "pink", allDay: true, start: "2026-11-14", end: "2026-11-14", repeat: "YEARLY" },
  { title: "Review desain dengan klien", color: "blue", allDay: false, start: at(TODAY, "15:00"), end: at(TODAY, "16:00"), location: "Zoom" },
  { title: "Bimbingan skripsi", color: "purple", allDay: false, start: at("2026-10-23", "13:00"), end: at("2026-10-23", "14:00"), location: "Ruang dosen 4.12" },
  { title: "Sidang proposal", color: "red", allDay: false, start: at("2026-10-29", "09:00"), end: at("2026-10-29", "11:00"), location: "Ruang Sidang 1", description: "Bawa 3 eksemplar proposal + laptop." },
  { title: "Deadline paper konferensi", color: "orange", allDay: true, start: "2026-11-05", end: "2026-11-05" },
  { title: "Liburan ke Bali", color: "teal", allDay: true, start: "2026-12-20", end: "2026-12-24", location: "Canggu" },
  { title: "Workshop UI/UX", color: "orange", allDay: false, start: at("2026-10-10", "09:00"), end: at("2026-10-10", "15:00"), location: "Kolaborasi Space" },
  { title: "Konser Hindia", color: "pink", allDay: false, start: at("2026-09-26", "19:30"), end: at("2026-09-26", "22:30"), location: "Istora Senayan" },
  { title: "Medical check-up", color: "green", allDay: false, start: at("2026-11-08", "08:00"), end: at("2026-11-08", "10:00"), location: "Klinik Sehat" },
];
for (const e of events) await post("/events", e);

// ─── Jurnal ────────────────────────────────────────────────
const doc = (...paras) => ({
  type: "doc",
  content: paras.map((p) =>
    Array.isArray(p)
      ? { type: "bulletList", content: p.map((t) => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] })) }
      : { type: "paragraph", content: [{ type: "text", text: p }] },
  ),
});
const journals = [
  [TODAY, "GOOD", "Hari yang produktif", doc("Pagi ini revisi dashboard klien hampir selesai. Siang review PR tim, sore nanti meeting desain.", "Yang disyukuri hari ini:", ["Kopi pagi yang enak", "Klien suka arah desain baru", "Sempat telepon Nenek"])],
  ["2026-10-21", "OKAY", "Bab 4 belum kelar", doc("Seharian di perpustakaan ngerjain bab 4. Analisis datanya ternyata lebih ribet dari perkiraan. Besok harus kirim ke dosen pembimbing.")],
  ["2026-10-20", "GREAT", "Lari 10K pertama!", doc("Akhirnya tembus 10K tanpa berhenti dengan pace 6:12. Kaki pegal, tapi puas banget. Satu milestone half marathon selesai.")],
  ["2026-10-19", "GOOD", "Laporan praktikum beres", doc("Laporan praktikum dikumpulkan sebelum jam 11 malam. Lega.")],
  ["2026-10-18", "GOOD", "CI/CD jalan", doc("Pipeline deploy otomatis di kantor akhirnya jalan. Tiap push ke main langsung ter-deploy. Tim senang.")],
  ["2026-10-17", "BAD", "Capek", doc("Kurang tidur dua hari ini. Harus lebih disiplin jam tidur, maksimal jam 12 sudah di kasur.")],
  ["2026-10-16", "OKAY", null, doc("Hari biasa. Kelas Metodologi Penelitian membahas teknik sampling. Malamnya lanjut freelance.")],
  ["2026-10-15", "GOOD", "Invoice terkirim", doc("Invoice proyek website UMKM sudah dikirim. Semoga cair minggu depan.")],
  ["2026-10-14", "GREAT", "Proposal di-ACC!", doc("Dosen pembimbing ACC proposal skripsi. Tinggal sidang proposal tanggal 29. Semangat!")],
  ["2026-10-13", "OKAY", "Senin", doc("Kelas pagi, lalu kerja sampai sore. Belanja bulanan sepulang kantor.")],
  ["2026-10-12", "GOOD", "Servis motor", doc("Motor diservis, ganti oli dan kampas rem. Sorenya jalan sore keliling taman.")],
  ["2026-10-11", "GREAT", "Workshop seru", doc("Ikut workshop UI/UX kemarin, banyak insight soal design system. Kenalan juga sama beberapa desainer senior.")],
  ["2026-10-10", "GOOD", null, doc("Workshop UI/UX seharian. Materi tentang motion design paling menarik.")],
  ["2026-10-09", "OKAY", "Hujan seharian", doc("Hujan dari pagi, jadi kerja dari kos saja. Lumayan fokus.")],
  ["2026-10-05", "BAD", "Deadline bertumpuk", doc("Tiga deadline jatuh di minggu yang sama. Harus bikin prioritas yang jelas.", ["Tugas Keamanan Informasi", "Revisi klien", "Draft bab 4"])],
  ["2026-10-01", "GOOD", "Awal bulan", doc("Gaji masuk, langsung sisihkan untuk dana darurat, MacBook, dan Jepang. Disiplin menabung itu ternyata menyenangkan.")],
  ["2026-09-26", "GREAT", "Konser Hindia", doc("Konser Hindia luar biasa. Nyanyi bareng ribuan orang di 'Secukupnya' bikin merinding.")],
  ["2026-09-20", "OKAY", null, doc("Weekend santai. Baca Deep Work setengah buku.")],
  ["2026-09-14", "GOOD", "PC baru", doc("Upgrade PC dan monitor. Kerja jadi jauh lebih nyaman.")],
  ["2026-09-07", "AWFUL", "Laptop mati", doc("Laptop tiba-tiba mati pas lagi presentasi ke klien. Untung file ada di cloud. Makin yakin harus ganti laptop.")],
  ["2026-08-31", "GOOD", "Semester baru", doc("Semester 7 dimulai. Target: IP di atas 3,8 dan proposal skripsi selesai bulan Oktober.")],
  ["2026-08-17", "GREAT", "Dirgahayu RI", doc("Ikut lomba 17-an di kos. Juara 2 balap karung, hadiahnya sabun cuci, haha.")],
  ["2026-07-25", "GREAT", "iPhone akhirnya kebeli", doc("Target nabung iPhone tercapai lebih cepat dari deadline. Hasil disiplin enam bulan!")],
];
for (const [date, mood, title, content] of journals) await post("/journals", { date, mood, title, content });

// ─── Nilai kuliah ──────────────────────────────────────────
const semesters = [
  ["Ganjil 2023/2024", [["Kalkulus I", "MAT101", 3, "B"], ["Algoritma & Pemrograman", "IF101", 4, "A"], ["Pengantar Teknologi Informasi", "IF102", 2, "AB"], ["Bahasa Inggris", "UM101", 2, "A"], ["Fisika Dasar", "FIS101", 3, "BC"], ["Pendidikan Agama", "UM102", 2, "A"], ["Logika Informatika", "IF103", 3, "AB"]]],
  ["Genap 2023/2024", [["Kalkulus II", "MAT102", 3, "AB"], ["Struktur Data", "IF201", 4, "A"], ["Matematika Diskrit", "IF202", 3, "B"], ["Pancasila", "UM103", 2, "A"], ["Sistem Digital", "IF203", 3, "AB"], ["Statistika Dasar", "MAT103", 3, "B"]]],
  ["Ganjil 2024/2025", [["Basis Data", "IF301", 4, "A"], ["Sistem Operasi", "IF302", 3, "AB"], ["Aljabar Linear", "MAT201", 3, "B"], ["Pemrograman Berorientasi Objek", "IF303", 4, "A"], ["Organisasi Komputer", "IF304", 3, "AB"], ["Kewarganegaraan", "UM104", 2, "A"]]],
  ["Genap 2024/2025", [["Jaringan Komputer", "IF401", 3, "AB"], ["Rekayasa Perangkat Lunak", "IF402", 3, "A"], ["Pemrograman Web", "IF403", 4, "A"], ["Kecerdasan Buatan", "IF404", 3, "AB"], ["Interaksi Manusia & Komputer", "IF405", 3, "A"], ["Probabilitas", "MAT202", 3, "B"]]],
  ["Ganjil 2025/2026", [["Pemrograman Mobile", "IF501", 4, "A"], ["Data Mining", "IF502", 3, "AB"], ["Komputasi Awan", "IF503", 3, "A"], ["Manajemen Proyek TI", "IF504", 3, "AB"], ["Grafika Komputer", "IF505", 3, "B"], ["Etika Profesi", "UM105", 2, "A"]]],
  ["Genap 2025/2026", [["Pembelajaran Mesin", "IF601", 3, "A"], ["Keamanan Informasi", "IF602", 3, "AB"], ["Metodologi Penelitian", "IF603", 2, "A"], ["Sistem Terdistribusi", "IF604", 3, "AB"], ["Kerja Praktik", "IF605", 2, "A"], ["Kewirausahaan", "UM106", 2, "A"]]],
];
for (const [i, [label, courses]] of semesters.entries()) {
  const { semester } = await post("/grades/semesters", { number: i + 1, label });
  for (const [name, code, credits, grade] of courses) await post(`/grades/semesters/${semester.id}/courses`, { name, code, credits, grade });
}

// ─── Ringkasan ─────────────────────────────────────────────
const all = [];
for (const [y, m] of MONTHS) all.push(...(await get(`/transactions?month=${y}-${pad(m)}&limit=500`)).transactions);
const total = all.reduce((s, t) => s + (t.type === "INCOME" ? Number(t.amount) : -Number(t.amount)), 0);
console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, transactions: tx.length + deposits.length, target: TARGET, totalFromApi: total, txFromApi: all.length, tasks: tasks.length, events: events.length, journals: journals.length, goals: 7, semesters: semesters.length, apiCalls: calls }, null, 1));
