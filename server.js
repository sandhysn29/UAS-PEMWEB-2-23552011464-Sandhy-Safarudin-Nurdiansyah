require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Koneksi database (connection pool) ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dompetku',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE dikembalikan sebagai string 'YYYY-MM-DD'
});

// Helper agar error async tertangkap rapi
const wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.', detail: err.message });
});

const VALID_TYPES = ['income', 'expense'];


// READ semua kategori (+ jumlah transaksi terkait — relasi LEFT JOIN)
app.get('/api/categories', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.type, c.description, c.created_at, c.updated_at,
            COUNT(t.id) AS transaction_count
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.type, c.name`
  );
  res.json(rows);
}));

// CREATE kategori
app.post('/api/categories', wrap(async (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipe harus income atau expense.' });

  const [dup] = await pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
  if (dup.length) return res.status(409).json({ error: 'Kategori dengan nama ini sudah ada.' });

  const [result] = await pool.query(
    'INSERT INTO categories (name, type, description) VALUES (?, ?, ?)',
    [name.trim(), type, description || null]
  );
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}));

// UPDATE kategori
app.put('/api/categories/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const { name, type, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipe harus income atau expense.' });

  const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });

  const [dup] = await pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), id]);
  if (dup.length) return res.status(409).json({ error: 'Kategori dengan nama ini sudah ada.' });

  // Tipe tidak boleh diubah jika kategori sudah memiliki transaksi
  if (existing[0].type !== type) {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM transactions WHERE category_id = ?', [id]);
    if (cnt > 0) return res.status(409).json({ error: 'Tipe tidak dapat diubah karena kategori sudah memiliki transaksi.' });
  }

  await pool.query(
    'UPDATE categories SET name = ?, type = ?, description = ? WHERE id = ?',
    [name.trim(), type, description || null, id]
  );
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  res.json(rows[0]);
}));

// DELETE kategori (ditolak jika masih dipakai transaksi — relasi RESTRICT)
app.delete('/api/categories/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM transactions WHERE category_id = ?', [id]);
  if (cnt > 0) {
    return res.status(409).json({
      error: `Kategori tidak dapat dihapus karena masih memiliki ${cnt} transaksi terkait. Hapus atau pindahkan transaksinya terlebih dahulu.`,
    });
  }
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
  res.json({ success: true });
}));


// READ semua transaksi (JOIN ke categories agar nama kategori ikut terkirim)
app.get('/api/transactions', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.category_id, t.title, t.amount, t.transaction_type,
            t.transaction_date, t.note, t.created_at, t.updated_at,
            c.name AS category_name, c.type AS category_type
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      ORDER BY t.transaction_date DESC, t.id DESC`
  );
  res.json(rows);
}));

// Validasi bersama untuk create/update transaksi
async function validateTx(body) {
  const { category_id, title, amount, transaction_type, transaction_date } = body;
  if (!title || !title.trim()) return 'Judul transaksi wajib diisi.';
  if (!amount || Number(amount) <= 0) return 'Jumlah harus lebih dari 0.';
  if (!VALID_TYPES.includes(transaction_type)) return 'Tipe transaksi harus income atau expense.';
  if (!transaction_date) return 'Tanggal wajib diisi.';
  if (!category_id) return 'Silakan pilih kategori.';
  const [cat] = await pool.query('SELECT * FROM categories WHERE id = ?', [category_id]);
  if (!cat.length) return 'Kategori tidak ditemukan.';
  if (cat[0].type !== transaction_type) return 'Tipe transaksi harus sesuai dengan tipe kategorinya.';
  return null;
}

// CREATE transaksi
app.post('/api/transactions', wrap(async (req, res) => {
  const err = await validateTx(req.body);
  if (err) return res.status(400).json({ error: err });
  const { category_id, title, amount, transaction_type, transaction_date, note } = req.body;
  const [result] = await pool.query(
    `INSERT INTO transactions (category_id, title, amount, transaction_type, transaction_date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [category_id, title.trim(), amount, transaction_type, transaction_date, note || null]
  );
  const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}));

// UPDATE transaksi
app.put('/api/transactions/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT id FROM transactions WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });

  const err = await validateTx(req.body);
  if (err) return res.status(400).json({ error: err });

  const { category_id, title, amount, transaction_type, transaction_date, note } = req.body;
  await pool.query(
    `UPDATE transactions
        SET category_id = ?, title = ?, amount = ?, transaction_type = ?, transaction_date = ?, note = ?
      WHERE id = ?`,
    [category_id, title.trim(), amount, transaction_type, transaction_date, note || null, id]
  );
  const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
  res.json(rows[0]);
}));

// DELETE transaksi
app.delete('/api/transactions/:id', wrap(async (req, res) => {
  const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  res.json({ success: true });
}));


// RINGKASAN KEUANGAN 
app.get('/api/summary', wrap(async (req, res) => {
  const now = new Date();
  const year = Number(req.query.year || now.getFullYear());
  const month = Number(req.query.month || now.getMonth() + 1);

  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount END), 0) AS total_expense
     FROM transactions`
  );

  const [[monthTotals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount END), 0) AS month_income,
       COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount END), 0) AS month_expense
     FROM transactions
     WHERE YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`,
    [year, month]
  );

  const [byCategory] = await pool.query(
    `SELECT c.id, c.name, c.type, COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE YEAR(t.transaction_date) = ? AND MONTH(t.transaction_date) = ?
      GROUP BY c.id
      ORDER BY total DESC`,
    [year, month]
  );

  const [trend] = await pool.query(
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS ym,
       COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount END), 0) AS income,
       COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount END), 0) AS expense
     FROM transactions
     WHERE transaction_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
     GROUP BY ym
     ORDER BY ym`
  );

  res.json({
    balance: Number(totals.total_income) - Number(totals.total_expense),
    total_income: Number(totals.total_income),
    total_expense: Number(totals.total_expense),
    month: { year, month, income: Number(monthTotals.month_income), expense: Number(monthTotals.month_expense) },
    by_category: byCategory,
    trend,
  });
}));

// ---------- Start ----------
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`DompetKu berjalan di http://localhost:${PORT}`);
});
