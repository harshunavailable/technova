// routes/categories.js
const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

// GET /api/categories?section=PC|CCTV
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { section } = req.query;

    let query = 'SELECT CategoryID, Name, SectionType, SlotType, IconClass FROM Categories';
    const request = pool.request();

    if (section) {
      query += ' WHERE SectionType = @section';
      request.input('section', section);
    }
    query += ' ORDER BY CategoryID';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load categories.' });
  }
});

module.exports = router;
