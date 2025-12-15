// src/routes/auth.js (CommonJS)
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../db');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const { rows } = await query(
      `SELECT user_id, username, password_hash, role
         FROM app_user
        WHERE username = $1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: user.user_id, role: user.user_role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res
      .status(500)
      .json({ error: 'Error interno en login', detail: err.message });
  }
});

module.exports = router;