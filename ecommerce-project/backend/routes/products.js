// routes/products.js
const express = require('express');
const { sql, getPool } = require('../config/db');

const router = express.Router();

/**
 * GET /api/products
 * Query params (all optional):
 *   section   = PC | CCTV
 *   category  = CategoryID
 *   slot      = SlotType (cpu, motherboard, ram, gpu, storage, psu, cabinet, monitor)
 *   search    = free-text match on product name/brand
 *   minPrice, maxPrice
 *   sort      = price_asc | price_desc | newest | rating
 *   page, pageSize
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      section, category, slot, search,
      minPrice, maxPrice, sort,
      page = 1, pageSize = 24
    } = req.query;

    const conditions = ['p.IsActive = 1'];
    const request = pool.request();

    if (section) { conditions.push('c.SectionType = @section'); request.input('section', section); }
    if (category) { conditions.push('p.CategoryID = @category'); request.input('category', category); }
    if (slot) { conditions.push('c.SlotType = @slot'); request.input('slot', slot); }
    if (search) { conditions.push('(p.Name LIKE @search OR p.Brand LIKE @search)'); request.input('search', `%${search}%`); }
    if (minPrice) { conditions.push('p.Price >= @minPrice'); request.input('minPrice', minPrice); }
    if (maxPrice) { conditions.push('p.Price <= @maxPrice'); request.input('maxPrice', maxPrice); }

    let orderBy = 'p.CreatedAt DESC';
    if (sort === 'price_asc') orderBy = 'p.Price ASC';
    if (sort === 'price_desc') orderBy = 'p.Price DESC';
    if (sort === 'rating') orderBy = 'p.Rating DESC';

    const offset = (Number(page) - 1) * Number(pageSize);
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, Number(pageSize));

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT p.ProductID, p.Name, p.Brand, p.Price, p.DiscountPrice, p.Stock, p.ImageURL,
             p.Rating, p.SpecsJSON, p.Socket, p.RamType, p.FormFactor,
             p.WattageNeeded, p.WattageSupplied,
             c.CategoryID, c.Name AS CategoryName, c.SectionType, c.SlotType,
             COUNT(*) OVER() AS TotalCount
      FROM Products p
      JOIN Categories c ON c.CategoryID = p.CategoryID
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;`;

    const result = await request.query(query);
    const total = result.recordset[0]?.TotalCount || 0;

    res.json({
      items: result.recordset.map(stripTotal),
      page: Number(page),
      pageSize: Number(pageSize),
      total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load products.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT p.*, c.Name AS CategoryName, c.SectionType, c.SlotType
              FROM Products p JOIN Categories c ON c.CategoryID = p.CategoryID
              WHERE p.ProductID = @id AND p.IsActive = 1`);

    const product = result.recordset[0];
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load product.' });
  }
});

function stripTotal(row) {
  const { TotalCount, ...rest } = row;
  return rest;
}

module.exports = router;
