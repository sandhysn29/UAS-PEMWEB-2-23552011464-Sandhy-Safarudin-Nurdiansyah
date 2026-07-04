# DompetKu — Aplikasi Pengelola Keuangan Pribadi (Full-Stack)

Aplikasi web full-stack untuk mencatat pemasukan & pengeluaran berdasarkan kategori,
dengan ringkasan keuangan bulanan.

**Stack:** Node.js + Express (backend) · MySQL (database) · HTML/CSS/JS (frontend, responsif mobile & desktop).

**Memenuhi spesifikasi tugas:**
- ✅ Integrasi database (MySQL)
- ✅ 2 rumpun CRUD lengkap yang saling berelasi: **Kategori** dan **Transaksi** (`transactions.category_id` → `categories.id`, FOREIGN KEY dengan ON DELETE RESTRICT)
- ✅ Frontend menarik: dashboard, grafik tren 6 bulan, laporan per kategori, mode mobile (bottom nav) & mode website (sidebar)

---

## Struktur folder

```
dompetku-fullstack/
├── server.js                      # Backend API (Express + mysql2)
├── package.json
├── .env.example                   # Contoh konfigurasi — salin jadi .env
├── database/
│   ├── schema.sql                 # Skema + seed data (MySQL)
└── public/
    └── index.html                 # Frontend
```

---

## A. Persiapan

### 1. Install kebutuhan
- **Node.js**
- **MySQL** — lewat **XAMPP**, Nyalakan modul **MySQL**.

### 2. Buat database & import skema
1. Buka `http://localhost/phpmyadmin`
2. Tab **Import** → pilih file `database/schema.sql` → **Go**
   (database `dompetku_db`, kedua tabel, dan data contoh langsung terbuat)


### 3. Konfigurasi koneksi database
Di file `.env` dan sesuaikan:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=dompetku_db
PORT=3000
```

### 4. Install dependency backend
```bash
npm install
```
<img width="1919" height="1027" alt="image" src="https://github.com/user-attachments/assets/e0338401-3f7c-468d-ac9f-d33f945f81ef" />
<img width="1919" height="1026" alt="image" src="https://github.com/user-attachments/assets/0e934941-187c-40c9-8cd8-9ab9646abee6" />
<img width="1919" height="1027" alt="image" src="https://github.com/user-attachments/assets/fc650775-3ad7-4db5-ab90-c782e41cf42b" />
<img width="1919" height="1028" alt="image" src="https://github.com/user-attachments/assets/75160283-ce6a-46b9-ad34-17513df2087b" />
<img width="1919" height="1025" alt="image" src="https://github.com/user-attachments/assets/c9e29d0f-6cf1-488b-944e-4cc965339578" />
<img width="1919" height="1027" alt="image" src="https://github.com/user-attachments/assets/80f37f68-7ccd-4f93-923e-045ab261402c" />

---

## B. Menjalankan aplikasi
```bash
npm start          # atau: npm run dev (auto-restart saat file berubah)
```
Buka **http://localhost:3000** — login dengan email & kata sandi apa saja (demo).

---

## C. Skema database

### Tabel `categories`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT UNSIGNED, PK, AUTO_INCREMENT | |
| name | VARCHAR(100), UNIQUE | Nama kategori |
| type | ENUM('income','expense') | Pemasukan / pengeluaran |
| description | TEXT, NULL | |
| created_at, updated_at | TIMESTAMP | Otomatis |

### Tabel `transactions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT UNSIGNED, PK, AUTO_INCREMENT | |
| category_id | INT UNSIGNED, **FK → categories.id** | ON DELETE RESTRICT |
| title | VARCHAR(150) | Judul transaksi |
| amount | DECIMAL(15,2), CHECK > 0 | Jumlah (Rp) |
| transaction_type | ENUM('income','expense') | Harus sesuai tipe kategori |
| transaction_date | DATE | |
| note | TEXT, NULL | |
| created_at, updated_at | TIMESTAMP | Otomatis |

**Relasi:** satu kategori memiliki banyak transaksi (1‑N). Kategori yang masih
memiliki transaksi **tidak bisa dihapus** (ditolak di API dan di level database
lewat `ON DELETE RESTRICT`).

<img width="1916" height="1021" alt="image" src="https://github.com/user-attachments/assets/a7beb263-8671-47ea-9071-ae6fc0b136ff" />
<img width="1919" height="1027" alt="image" src="https://github.com/user-attachments/assets/908d5b23-1b91-4dc6-9cd7-fcb3d4c4adaf" />
<img width="1903" height="1007" alt="image" src="https://github.com/user-attachments/assets/3e278982-bfe2-49ba-90e9-74886baafff6" />

---

## D. Endpoint API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/categories | Daftar kategori + jumlah transaksi (LEFT JOIN) |
| POST | /api/categories | Tambah kategori |
| PUT | /api/categories/:id | Edit kategori |
| DELETE | /api/categories/:id | Hapus kategori (409 jika masih dipakai) |
| GET | /api/transactions | Daftar transaksi + nama kategori (JOIN) |
| POST | /api/transactions | Tambah transaksi (validasi kategori & tipe) |
| PUT | /api/transactions/:id | Edit transaksi |
| DELETE | /api/transactions/:id | Hapus transaksi |
| GET | /api/summary?year=&month= | Ringkasan: saldo, total per bulan, per kategori (SUM + GROUP BY), tren 6 bulan |

---

## F. Masalah umum (troubleshooting)

| Gejala | Solusi |
|---|---|
| `ECONNREFUSED` saat buka aplikasi | MySQL belum berjalan — nyalakan lewat XAMPP/Laragon |
| `ER_ACCESS_DENIED_ERROR` | User/password di `.env` salah |
| `ER_BAD_DB_ERROR: Unknown database` | `schema.sql` belum diimport |
| Port 3000 terpakai | Ubah `PORT` di `.env` |
| Data tidak muncul | Cek terminal server untuk pesan error SQL |

---

## G. Pengembangan lanjutan
- Autentikasi sungguhan (tabel `users` + bcrypt + session/JWT) — login saat ini demo di sisi client
- PWA: tambahkan `manifest.json` + service worker agar bisa di-install ke homescreen
- Deploy: Railway / Render (backend + MySQL managed), atau VPS + Nginx
