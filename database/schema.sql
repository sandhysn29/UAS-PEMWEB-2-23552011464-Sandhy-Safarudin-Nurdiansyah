CREATE DATABASE IF NOT EXISTS dompetku
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dompetku;

-- ---------- Tabel 1: categories ----------
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('income', 'expense') NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Tabel 2: transactions (berelasi ke categories) ----------
CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  transaction_type ENUM('income', 'expense') NOT NULL,
  transaction_date DATE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,          -- kategori tidak bisa dihapus jika masih dipakai transaksi
  INDEX idx_transactions_date (transaction_date),
  INDEX idx_transactions_category (category_id)
) ENGINE=InnoDB;

INSERT INTO categories (name, type, description) VALUES
  ('Gaji',               'income',  'Gaji bulanan dari kantor'),
  ('Freelance',          'income',  'Proyek sampingan & jasa desain'),
  ('Makanan & Minuman',  'expense', 'Makan harian, jajan, kopi'),
  ('Transportasi',       'expense', 'Bensin, ojek online, parkir'),
  ('Belanja',            'expense', 'Kebutuhan rumah & pribadi'),
  ('Tagihan & Utilitas', 'expense', 'Listrik, air, internet, pulsa'),
  ('Hiburan',            'expense', 'Nonton, langganan streaming');

INSERT INTO transactions (category_id, title, amount, transaction_type, transaction_date, note) VALUES
  (1, 'Gaji Juli',            6500000, 'income',  '2026-07-01', NULL),
  (6, 'Internet IndiHome',     350000, 'expense', '2026-07-02', 'Paket 50 Mbps'),
  (3, 'Belanja mingguan',      425000, 'expense', '2026-07-02', NULL),
  (4, 'Isi bensin',            100000, 'expense', '2026-07-03', NULL),
  (2, 'Desain logo klien',    1200000, 'income',  '2026-07-03', 'DP 50%'),
  (3, 'Kopi & sarapan',         48000, 'expense', '2026-07-04', NULL),
  (1, 'Gaji Juni',            6500000, 'income',  '2026-06-01', NULL),
  (5, 'Sepatu lari',           780000, 'expense', '2026-06-08', NULL),
  (3, 'Makan di luar',         640000, 'expense', '2026-06-14', NULL),
  (7, 'Nonton bioskop',        120000, 'expense', '2026-06-20', NULL),
  (6, 'Listrik PLN',           410000, 'expense', '2026-06-05', NULL),
  (1, 'Gaji Mei',             6300000, 'income',  '2026-05-01', NULL),
  (2, 'Ilustrasi buku',        900000, 'income',  '2026-05-18', NULL),
  (4, 'Servis motor',          350000, 'expense', '2026-05-10', NULL),
  (3, 'Groceries',            1150000, 'expense', '2026-05-15', NULL),
  (1, 'Gaji April',           6300000, 'income',  '2026-04-01', NULL),
  (5, 'Kado ulang tahun ibu',  500000, 'expense', '2026-04-12', NULL),
  (6, 'Pulsa & paket data',    150000, 'expense', '2026-04-03', NULL),
  (1, 'Gaji Maret',           6300000, 'income',  '2026-03-01', NULL),
  (3, 'Makan & jajan Maret',  1380000, 'expense', '2026-03-20', NULL),
  (7, 'Langganan streaming',   186000, 'expense', '2026-03-06', 'Netflix + Spotify'),
  (1, 'Gaji Februari',        6300000, 'income',  '2026-02-01', NULL),
  (4, 'Transport Februari',    420000, 'expense', '2026-02-25', NULL),
  (3, 'Makan Februari',       1210000, 'expense', '2026-02-26', NULL);
