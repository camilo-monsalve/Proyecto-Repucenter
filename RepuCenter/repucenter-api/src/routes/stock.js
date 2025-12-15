// src/routes/stock.js
const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middlewares/auth');
const router = express.Router();

// GET /products/:sku/stock
router.get('/products/:sku/stock', authRequired, async (req,res)=>{
  const { sku } = req.params;
  const sqlPerWh = `
    SELECT w.name AS warehouse,
           SUM(CASE
                 WHEN m.type_code='IN'  THEN ABS(m.qty)
                 WHEN m.type_code='OUT' THEN -ABS(m.qty)
                 WHEN m.type_code='ADJ' THEN m.qty
               END) AS stock
    FROM product p
    JOIN movement m   ON m.product_id = p.product_id
    JOIN warehouse w  ON w.warehouse_id = m.warehouse_id
    WHERE p.sku = $1
    GROUP BY w.name
    ORDER BY w.name;
  `;
  const sqlTotal = `
    SELECT SUM(CASE
                 WHEN m.type_code='IN'  THEN ABS(m.qty)
                 WHEN m.type_code='OUT' THEN -ABS(m.qty)
                 WHEN m.type_code='ADJ' THEN m.qty
               END) AS total_stock
    FROM product p
    JOIN movement m ON m.product_id = p.product_id
    WHERE p.sku = $1;
  `;
  try {
    const [perWh, total] = await Promise.all([
      query(sqlPerWh, [sku]),
      query(sqlTotal, [sku]),
    ]);
    res.json({ sku, by_warehouse: perWh.rows, total: Number(total.rows[0]?.total_stock || 0) });
  } catch (e) {
    console.error('[STOCK ERROR]', e);
    res.status(500).json({ error: 'error consultando stock' });
  }
});

module.exports = router;