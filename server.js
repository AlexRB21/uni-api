// ============================================================
// API UniMarket — Backend (Express + MySQL)
// Tambien sirve el panel web desde /public (mismo origen, sin CORS)
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// 🔹 CORS (para el caso de que la pagina se sirva desde Firebase Hosting)
const ALLOWED = [
  'https://albergue-943ee.web.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin)) cb(null, true);
    else cb(null, false);
  }
}));

// 🔐 API KEY (la misma que lleva la app Android)
const API_KEY = process.env.API_KEY || 'UNIMARKET-2026-CAMBIA-ESTA-CLAVE';
app.use('/api', (req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
});

// 🔹 Conexion MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});

const PHOTO_BASE = 'https://virtual.autonoma.edu.pe/Fotos/Mediana/';

function toStudent(row) {
  return {
    codigo: row.codigo_universitario,
    dni: row.dni,
    nombres: row.nombres,
    apellidos: row.apellidos,
    nombreCompleto: row.nombre_completo,
    fechaNacimiento: row.fecha_nacimiento,
    edad: row.edad,
    direccion: row.direccion,
    telefono: row.telefono,
    celular: row.celular,
    email: row.email,
    carrera: row.carrera,
    modalidad: row.modalidad,
    anioIngreso: row.anio_ingreso,
    apoderado: row.apoderado,
    fotoUrl: PHOTO_BASE + row.codigo_universitario + '.jpg'
  };
}

// ---------------- ENDPOINTS API ----------------

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'down', error: e.message });
  }
});

app.get('/api/validate-email', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  try {
    const [rows] = await pool.query(
      'SELECT 1 FROM estudiantes WHERE email = ? AND activo = 1', [email]);
    res.json({ valid: rows.length > 0 });
  } catch (e) {
    res.json({ valid: true }); // fail-open
  }
});

app.get('/api/student', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM estudiantes WHERE email = ? AND activo = 1 LIMIT 1', [email]);
    res.json(rows.length ? { found: true, student: toStudent(rows[0]) } : { found: false });
  } catch (e) {
    res.status(500).json({ found: false, error: e.message });
  }
});

app.get('/api/student-by-code', async (req, res) => {
  const codigo = (req.query.codigo || '').trim();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM estudiantes WHERE codigo_universitario = ? AND activo = 1 LIMIT 1', [codigo]);
    res.json(rows.length ? { found: true, student: toStudent(rows[0]) } : { found: false });
  } catch (e) {
    res.status(500).json({ found: false, error: e.message });
  }
});

// ---------------- PANEL WEB ----------------
// Sirve public/index.html en la raiz (mismo origen que la API: cero CORS)
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✅ API UniMarket corriendo en puerto ' + PORT));