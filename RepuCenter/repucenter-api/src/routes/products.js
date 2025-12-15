// src/routes/products.js
const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

/**
 * GET /products
 * Lista de productos con SKU, nombre, stock por bodega y total.
 * Soporta ?q=texto para buscar por SKU o nombre.
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const { q } = req.query;

    // Consulta base: total por SKU y breakdown por bodega
    const sqlTotal = `
      SELECT
        p.product_id,
        p.sku,
        p.name,
        COALESCE(SUM(
          CASE
            WHEN m.type_code = 'IN'  THEN ABS(m.qty)
            WHEN m.type_code = 'OUT' THEN -ABS(m.qty)
            WHEN m.type_code = 'ADJ' THEN m.qty
            ELSE 0
          END
        ), 0) AS total_stock
      FROM product p
      LEFT JOIN movement m ON m.product_id = p.product_id
      WHERE ($1::text IS NULL OR p.sku ILIKE '%'||$1||'%' OR p.name ILIKE '%'||$1||'%')
      GROUP BY p.product_id, p.sku, p.name
      ORDER BY p.sku;
    `;

    const sqlByWh = `
      SELECT
        p.product_id,
        w.name AS warehouse,
        COALESCE(SUM(
          CASE
            WHEN m.type_code = 'IN'  THEN ABS(m.qty)
            WHEN m.type_code = 'OUT' THEN -ABS(m.qty)
            WHEN m.type_code = 'ADJ' THEN m.qty
            ELSE 0
          END
        ), 0) AS stock
      FROM product p
      JOIN movement m   ON m.product_id = p.product_id
      JOIN warehouse w  ON w.warehouse_id = m.warehouse_id
      WHERE ($1::text IS NULL OR p.sku ILIKE '%'||$1||'%' OR p.name ILIKE '%'||$1||'%')
      GROUP BY p.product_id, w.name
      ORDER BY p.product_id, w.name;
    `;

    const [totals, byWh] = await Promise.all([
      query(sqlTotal, [q || null]),
      query(sqlByWh,   [q || null]),
    ]);

    // Armar respuesta: total + breakdown por bodega
    const mapByWh = new Map();
    byWh.rows.forEach(r => {
      const key = String(r.product_id);
      if (!mapByWh.has(key)) mapByWh.set(key, []);
      mapByWh.get(key).push({
        warehouse: r.warehouse,
        stock: Number(r.stock || 0),
      });
    });

    const data = totals.rows.map(r => ({
      sku: r.sku,
      name: r.name,
      total_stock: Number(r.total_stock || 0),
      by_warehouse: mapByWh.get(String(r.product_id)) || [],
    }));

    res.json(data);
  } catch (err) {
    console.error('[PRODUCTS ERROR]', err);
    res.status(500).json({ error: 'error interno al listar productos' });
  }
});

module.exports = router;