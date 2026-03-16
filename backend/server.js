const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'irac_secret_key_2026';


// ─────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'irac_ref',
  waitForConnections: true,
  connectionLimit: 10
});


// ─────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────

function auth(req, res, next) {

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }

}


// ─────────────────────────────────────────
// DEMO USERS
// ─────────────────────────────────────────

const USERS = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin1234', 10), role: 'admin' },
  { id: 2, username: 'user',  password: bcrypt.hashSync('user1234', 10),  role: 'user' }
];


// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {

  const { username, password } = req.body;

  const user = USERS.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({
      error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });

});


// ─────────────────────────────────────────
// CHECK LOGIN
// ─────────────────────────────────────────

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: req.user });
});


// ─────────────────────────────────────────
// PEST
// ─────────────────────────────────────────

app.get('/api/pests', auth, async (req, res) => {

  const [rows] = await pool.query(
    'SELECT * FROM pest ORDER BY pest_type, pest_name'
  );

  res.json(rows);

});


app.get('/api/pests/:id', auth, async (req, res) => {

  const [pest] = await pool.query(
    'SELECT * FROM pest WHERE pest_id = ?',
    [req.params.id]
  );

  if (!pest.length) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [ingredients] = await pool.query(`
    SELECT ai.c_id, ai.c_name, ai.g_id,
           mg.g_name, mg.resistance_risk,
           ipc.efficacy_level
    FROM ingredient_pest_control ipc
    JOIN active_ingredient ai ON ai.c_id = ipc.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ipc.pest_id = ?
  `, [req.params.id]);

  res.json({
    ...pest[0],
    ingredients
  });

});


// ─────────────────────────────────────────
// INGREDIENT
// ─────────────────────────────────────────

app.get('/api/ingredients', auth, async (req, res) => {

  const [rows] = await pool.query(`
    SELECT ai.*, mg.g_name, mg.resistance_risk
    FROM active_ingredient ai
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    ORDER BY ai.g_id
  `);

  res.json(rows);

});


app.get('/api/ingredients/:id', auth, async (req, res) => {

  const [ai] = await pool.query(`
    SELECT ai.*, mg.g_name, mg.resistance_risk
    FROM active_ingredient ai
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ai.c_id = ?
  `, [req.params.id]);

  if (!ai.length) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [products] = await pool.query(
    'SELECT * FROM product_trade WHERE c_id = ?',
    [req.params.id]
  );

  res.json({
    ...ai[0],
    products
  });

});


// ─────────────────────────────────────────
// IRAC GROUP
// ─────────────────────────────────────────

app.get('/api/groups', auth, async (req, res) => {

  const [rows] = await pool.query(
    'SELECT * FROM irac_moa_group ORDER BY g_id'
  );

  res.json(rows);

});


// ─────────────────────────────────────────
// ROTATION RECOMMEND
// ─────────────────────────────────────────

app.get('/api/rotation/recommend', auth, async (req, res) => {

  const { pest_id, current_gid } = req.query;

  if (!pest_id) {
    return res.status(400).json({ error: 'pest_id required' });
  }

  const [rows] = await pool.query(`
    SELECT ai.c_id, ai.c_name, ai.g_id,
           mg.g_name, mg.resistance_risk
    FROM ingredient_pest_control ipc
    JOIN active_ingredient ai ON ai.c_id = ipc.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
    WHERE ipc.pest_id = ?
    AND (? IS NULL OR ai.g_id != ?)
    ORDER BY mg.resistance_risk ASC
  `, [pest_id, current_gid || null, current_gid || null]);

  res.json(rows);

});


// ─────────────────────────────────────────
// PRODUCT
// ─────────────────────────────────────────

app.get('/api/products', auth, async (req, res) => {

  const [rows] = await pool.query(`
    SELECT pt.*, ai.c_name, ai.g_id, mg.g_name
    FROM product_trade pt
    JOIN active_ingredient ai ON ai.c_id = pt.c_id
    JOIN irac_moa_group mg ON mg.g_id = ai.g_id
  `);

  res.json(rows);

});


// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 IRAC API running at http://localhost:${PORT}`);
});