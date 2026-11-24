// routes/pcbuilder.js
// Powers the "Build Your Own PC" wizard: fetches compatible parts for each slot
// and validates a finished build before it's added to the cart.
const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SLOT_ORDER = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'cabinet', 'monitor'];

/**
 * GET /api/pcbuilder/options/:slot
 * Returns parts for a slot, automatically filtered to stay compatible with
 * whatever has already been picked (sent as query params).
 * e.g. /api/pcbuilder/options/motherboard?socket=AM5
 *      /api/pcbuilder/options/ram?ramType=DDR5
 *      /api/pcbuilder/options/psu?minWattage=550
 *      /api/pcbuilder/options/cabinet?formFactor=ATX
 */
router.get('/options/:slot', async (req, res) => {
  try {
    const slot = req.params.slot;
    if (!SLOT_ORDER.includes(slot)) {
      return res.status(400).json({ message: 'Unknown component slot.' });
    }

    const pool = await getPool();
    const request = pool.request();
    const conditions = ['c.SlotType = @slot', 'p.IsActive = 1'];
    request.input('slot', slot);

    const { socket, ramType, formFactor, minWattage } = req.query;

    if (socket && ['motherboard', 'cpu'].includes(slot)) {
      conditions.push('p.Socket = @socket');
      request.input('socket', socket);
    }
    if (ramType && ['ram', 'motherboard'].includes(slot)) {
      conditions.push('p.RamType = @ramType');
      request.input('ramType', ramType);
    }
    if (formFactor && slot === 'cabinet') {
      // A case advertised as ATX also fits mATX/ITX boards; ITX cases only fit ITX boards.
      if (formFactor === 'ITX') {
        conditions.push("p.FormFactor = 'ITX'");
      } else {
        conditions.push("p.FormFactor IN ('ATX','mATX')");
      }
    }
    if (minWattage && slot === 'psu') {
      conditions.push('p.WattageSupplied >= @minWattage');
      request.input('minWattage', Number(minWattage));
    }

    const query = `
      SELECT p.ProductID, p.Name, p.Brand, p.Price, p.Stock, p.ImageURL, p.SpecsJSON,
             p.Socket, p.RamType, p.FormFactor, p.WattageNeeded, p.WattageSupplied
      FROM Products p JOIN Categories c ON c.CategoryID = p.CategoryID
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.Price ASC;`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load compatible components.' });
  }
});

/**
 * POST /api/pcbuilder/validate
 * body: { cpu, motherboard, ram, gpu, storage, psu, cabinet, monitor } (ProductIDs, any optional)
 * Returns { valid, issues[], totalPrice, components{} }
 */
router.post('/validate', async (req, res) => {
  try {
    const ids = Object.values(req.body).filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ message: 'Select at least one component.' });
    }

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.ProductID, p.Name, p.Price, p.Stock, c.SlotType,
             p.Socket, p.RamType, p.FormFactor, p.WattageNeeded, p.WattageSupplied
      FROM Products p JOIN Categories c ON c.CategoryID = p.CategoryID
      WHERE p.ProductID IN (${ids.map(id => Number(id)).join(',')})`);

    const bySlot = {};
    result.recordset.forEach(row => { bySlot[row.SlotType] = row; });

    const issues = [];
    const cpu = bySlot.cpu, mobo = bySlot.motherboard, ram = bySlot.ram,
          gpu = bySlot.gpu, psu = bySlot.psu, cabinet = bySlot.cabinet;

    if (cpu && mobo && cpu.Socket !== mobo.Socket) {
      issues.push(`${cpu.Name} (socket ${cpu.Socket}) does not fit ${mobo.Name} (socket ${mobo.Socket}).`);
    }
    if (ram && mobo && ram.RamType !== mobo.RamType) {
      issues.push(`${ram.Name} is ${ram.RamType}, but ${mobo.Name} only supports ${mobo.RamType}.`);
    }
    if (mobo && cabinet) {
      const fits = cabinet.FormFactor === 'ITX'
        ? mobo.FormFactor === 'ITX'
        : ['ATX', 'mATX', 'ITX'].includes(mobo.FormFactor);
      if (!fits) issues.push(`${mobo.Name} (${mobo.FormFactor}) will not fit inside ${cabinet.Name}.`);
    }
    if (gpu && psu && psu.WattageSupplied < gpu.WattageNeeded) {
      issues.push(`${gpu.Name} recommends a ${gpu.WattageNeeded}W+ PSU, but ${psu.Name} only supplies ${psu.WattageSupplied}W.`);
    }
    Object.values(bySlot).forEach(item => {
      if (item.Stock <= 0) issues.push(`${item.Name} is currently out of stock.`);
    });

    const totalPrice = Object.values(bySlot).reduce((sum, item) => sum + Number(item.Price), 0);

    res.json({
      valid: issues.length === 0,
      issues,
      totalPrice,
      components: bySlot
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not validate build.' });
  }
});

// POST /api/pcbuilder/save (requires login)
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { buildName, components, totalPrice } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .input('buildName', sql.NVarChar, buildName || 'My Custom Build')
      .input('componentsJSON', sql.NVarChar, JSON.stringify(components))
      .input('totalPrice', sql.Decimal(10, 2), totalPrice)
      .query(`INSERT INTO PCBuilds (UserID, BuildName, ComponentsJSON, TotalPrice)
              OUTPUT INSERTED.BuildID
              VALUES (@userId, @buildName, @componentsJSON, @totalPrice)`);

    res.status(201).json({ buildId: result.recordset[0].BuildID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not save build.' });
  }
});

// GET /api/pcbuilder/my-builds (requires login)
router.get('/my-builds', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT * FROM PCBuilds WHERE UserID = @userId ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load saved builds.' });
  }
});

module.exports = router;
