// src/server.js (CommonJS)
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const { pingDb } = require('./db');

// Routers
const authRoutes     = require('./routes/auth');
const traceRoutes    = require('./routes/trace');
const productsRoutes = require('./routes/products');
const movementsRoutes= require('./routes/movements');
const stockRoutes    = require('./routes/stock');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== Middlewares ANTES de las rutas ===== */
app.use(cors());
app.use(express.json()); // <-- parsea application/json

/* ===== Rutas ===== */
app.get('/', (_req, res) => res.send('API RepuCenter activa 🚀'));

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

app.get('/health/db', async (_req, res) => {
  try {
    const ok = await pingDb();
    res.json({ db: ok ? 'connected' : 'disconnected' });
  } catch (err) {
    res.status(500).json({ db: 'error', message: err.message });
  }
});

// negocio
app.use('/auth', authRoutes);
app.use('/products', productsRoutes);
app.use('/movements', movementsRoutes);
app.use('/trace', traceRoutes);
app.use('/', stockRoutes); // mantiene tus endpoints de stock en raíz si así los definiste

// (opcional) Ruta de eco para depurar body
app.post('/_debug/echo', (req, res) => {
  res.json({ contentType: req.headers['content-type'], body: req.body });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});