const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'irac_secret_key_2026';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // แก้จาก DB_PASS → DB_PASSWORD
  database: process.env.DB_NAME || 'irac_ref',  // ดึงจาก env
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── Auth Middleware ────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── In-memory users (ใช้แทน DB users table) ──────────────────────────────
const USERS = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin1234', 10), role: 'admin' },
  { id: 2, username: 'user',  password: bcrypt.hashSync('user1234', 10),  role: 'user'  },
];

// In-memory usage history
const usageHistory = [];

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// GET /api/auth/me
app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// ═══════════════════════════════════════════════════════════════════════════
// PEST ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/pests — ดึงแมลงทั้งหมด
app.get('/api/pests', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pest ORDER BY pest_type, pest_name');
  res.json(rows);
});

// GET /api/pests/:id — ดึงข้อมูลแมลงพร้อมสารที่ใช้ได้
app.get('/api/pests/:id', auth, async (req, res) => {
  const [pest] = await pool.query('SELECT * FROM pest WHERE pest_id = ?', [req.params.id]);
  if (!pest.length) return res.status(404).json({ error: 'Not found' });

  const [ingredients] = await pool.query(`
    SELECT ai.c_id, ai.c_name, ai.g_id, ai.notes AS ai_notes,
           ipc.efficacy_level, ipc.recommended_note,
           mg.g_name, mg.resistance_risk
    FROM ingredient_pest_control ipc
    JOIN active_ingredient ai ON ai.c_id = ipc.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ipc.pest_id = ?
    ORDER BY mg.g_id
  `, [req.params.id]);

  res.json({ ...pest[0], ingredients });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE INGREDIENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/ingredients — สารทั้งหมด
app.get('/api/ingredients', auth, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT ai.*, mg.g_name, mg.resistance_risk
    FROM active_ingredient ai
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    ORDER BY ai.g_id, ai.c_name
  `);
  res.json(rows);
});

// GET /api/ingredients/:id — รายละเอียดสาร + สินค้าการค้า
app.get('/api/ingredients/:id', auth, async (req, res) => {
  const [ai] = await pool.query(`
    SELECT ai.*, mg.g_name, mg.moa_summary, mg.resistance_risk, mg.target_site
    FROM active_ingredient ai
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ai.c_id = ?
  `, [req.params.id]);
  if (!ai.length) return res.status(404).json({ error: 'Not found' });

  const [products] = await pool.query('SELECT * FROM product_trade WHERE c_id = ?', [req.params.id]);
  const [pests] = await pool.query(`
    SELECT p.pest_id, p.pest_name, p.pest_type, ipc.efficacy_level, ipc.recommended_note
    FROM ingredient_pest_control ipc
    JOIN pest p ON p.pest_id = ipc.pest_id
    WHERE ipc.c_id = ?
  `, [req.params.id]);

  res.json({ ...ai[0], products, pests });
});

// ═══════════════════════════════════════════════════════════════════════════
// MOA GROUP ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/groups — กลุ่ม IRAC ทั้งหมด
app.get('/api/groups', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM irac_moa_group ORDER BY g_id');
  res.json(rows);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROTATION / RECOMMENDATION ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/rotation/recommend?pest_id=1&current_gid=4A
// แนะนำกลุ่มยาที่ควรใช้ (ต่างกลุ่มจาก current)
app.get('/api/rotation/recommend', auth, async (req, res) => {
  const { pest_id, current_gid } = req.query;
  if (!pest_id) return res.status(400).json({ error: 'pest_id required' });

  const [recommended] = await pool.query(`
    SELECT ai.c_id, ai.c_name, ai.g_id, ai.notes AS ai_notes,
           mg.g_name, mg.resistance_risk,
           ipc.efficacy_level, ipc.recommended_note
    FROM ingredient_pest_control ipc
    JOIN active_ingredient ai ON ai.c_id = ipc.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ipc.pest_id = ?
      AND (? IS NULL OR ai.g_id != ?)
    ORDER BY mg.resistance_risk ASC, ai.g_id
  `, [pest_id, current_gid || null, current_gid || null]);

  // กลุ่มยาที่ห้ามใช้ซ้ำ (same group as current)
  let forbidden = [];
  if (current_gid) {
    const [f] = await pool.query(`
      SELECT ai.c_id, ai.c_name, ai.g_id, mg.g_name
      FROM ingredient_pest_control ipc
      JOIN active_ingredient ai ON ai.c_id = ipc.c_id
      JOIN irac_moa_group mg ON mg.g_id = ai.g_id
      WHERE ipc.pest_id = ? AND ai.g_id = ?
    `, [pest_id, current_gid]);
    forbidden = f;
  }

  res.json({ recommended, forbidden, current_gid });
});

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/history — บันทึกการใช้งาน
app.post('/api/history', auth, (req, res) => {
  const { pest_id, pest_name, ingredient_id, ingredient_name, g_id, note } = req.body;
  const entry = {
    id: usageHistory.length + 1,
    user_id: req.user.id,
    username: req.user.username,
    pest_id, pest_name,
    ingredient_id, ingredient_name, g_id,
    note: note || '',
    used_at: new Date().toISOString(),
  };
  usageHistory.push(entry);
  res.status(201).json(entry);
});

// GET /api/history — ดูประวัติของ user นี้
app.get('/api/history', auth, (req, res) => {
  const mine = usageHistory
    .filter(h => h.user_id === req.user.id)
    .sort((a, b) => new Date(b.used_at) - new Date(a.used_at))
    .slice(0, 50);
  res.json(mine);
});

// PUT /api/history/:id — แก้ไขประวัติการใช้งาน
app.put('/api/history/:id', auth, async (req, res) => {
  const { pest_id, pest_name, ingredient_id, ingredient_name, g_id, note } = req.body;

  // เช็คว่า record นี้มีอยู่และเป็นของ user นี้
  const [existing] = await pool.query(
    'SELECT * FROM usage_history WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!existing.length) return res.status(404).json({ error: 'Not found' });

  // อัปเดตเฉพาะ field ที่ส่งมา ถ้าไม่ส่งก็คงค่าเดิม
  const current = existing[0];
  await pool.query(
    `UPDATE usage_history SET
      pest_id         = ?,
      pest_name       = ?,
      ingredient_id   = ?,
      ingredient_name = ?,
      g_id            = ?,
      note            = ?
     WHERE id = ? AND user_id = ?`,
    [
      pest_id         ?? current.pest_id,
      pest_name       ?? current.pest_name,
      ingredient_id   ?? current.ingredient_id,
      ingredient_name ?? current.ingredient_name,
      g_id            ?? current.g_id,
      note            ?? current.note,
      req.params.id,
      req.user.id,
    ]
  );

  // ดึงข้อมูลที่อัปเดตแล้วกลับมา
  const [updated] = await pool.query(
    'SELECT * FROM usage_history WHERE id = ?',
    [req.params.id]
  );
  res.json(updated[0]);
});

// DELETE /api/history/:id
app.delete('/api/history/:id', auth, async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM usage_history WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/products — สินค้าการค้าทั้งหมด
app.get('/api/products', auth, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT pt.*, ai.c_name, ai.g_id, mg.g_name
    FROM product_trade pt
    JOIN active_ingredient ai ON ai.c_id = pt.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    ORDER BY pt.p_name
  `);
  res.json(rows);
});

// ─── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ IRAC API running on http://localhost:${PORT}`));
