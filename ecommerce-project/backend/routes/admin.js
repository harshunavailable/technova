// routes/admin.js
const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin); // every admin route requires an admin JWT

/* ---------------- Dashboard summary ---------------- */
// GET /api/admin/summary
router.get('/summary', async (req, res) => {
  try {
    const pool = await getPool();
    const [products, orders, customers, revenue, lowStock] = await Promise.all([
      pool.request().query('SELECT COUNT(*) AS c FROM Products WHERE IsActive = 1'),
      pool.request().query('SELECT COUNT(*) AS c FROM Orders'),
      pool.request().query("SELECT COUNT(*) AS c FROM Users WHERE Role = 'customer'"),
      pool.request().query('SELECT ISNULL(SUM(TotalAmount),0) AS total FROM Orders'),
      pool.request().query('SELECT COUNT(*) AS c FROM Products WHERE Stock <= 5 AND IsActive = 1')
    ]);
    res.json({
      totalProducts: products.recordset[0].c,
      totalOrders: orders.recordset[0].c,
      totalCustomers: customers.recordset[0].c,
      totalRevenue: revenue.recordset[0].total,
      lowStockCount: lowStock.recordset[0].c
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load dashboard summary.' });
  }
});

/* ---------------- Products (CRUD) ---------------- */
// GET /api/admin/products
router.get('/products', async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT p.*, c.Name AS CategoryName FROM Products p
    JOIN Categories c ON c.CategoryID = p.CategoryID ORDER BY p.ProductID DESC`);
  res.json(result.recordset);
});

// POST /api/admin/products
router.post('/products', async (req, res) => {
  try {
    const b = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, b.categoryId)
      .input('name', sql.NVarChar, b.name)
      .input('brand', sql.NVarChar, b.brand || null)
      .input('description', sql.NVarChar, b.description || null)
      .input('price', sql.Decimal(10, 2), b.price)
      .input('discountPrice', sql.Decimal(10, 2), b.discountPrice || null)
      .input('stock', sql.Int, b.stock || 0)
      .input('imageUrl', sql.NVarChar, b.imageUrl || null)
      .input('specsJson', sql.NVarChar, JSON.stringify(b.specs || {}))
      .input('socket', sql.NVarChar, b.socket || null)
      .input('ramType', sql.NVarChar, b.ramType || null)
      .input('formFactor', sql.NVarChar, b.formFactor || null)
      .input('wattageNeeded', sql.Int, b.wattageNeeded || null)
      .input('wattageSupplied', sql.Int, b.wattageSupplied || null)
      .query(`INSERT INTO Products (CategoryID, Name, Brand, Description, Price, DiscountPrice, Stock,
                                     ImageURL, SpecsJSON, Socket, RamType, FormFactor, WattageNeeded, WattageSupplied)
              OUTPUT INSERTED.ProductID
              VALUES (@categoryId, @name, @brand, @description, @price, @discountPrice, @stock,
                      @imageUrl, @specsJson, @socket, @ramType, @formFactor, @wattageNeeded, @wattageSupplied)`);
    res.status(201).json({ productId: result.recordset[0].ProductID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create product.' });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const b = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, b.name)
      .input('brand', sql.NVarChar, b.brand || null)
      .input('description', sql.NVarChar, b.description || null)
      .input('price', sql.Decimal(10, 2), b.price)
      .input('discountPrice', sql.Decimal(10, 2), b.discountPrice || null)
      .input('stock', sql.Int, b.stock || 0)
      .input('imageUrl', sql.NVarChar, b.imageUrl || null)
      .query(`UPDATE Products SET Name=@name, Brand=@brand, Description=@description, Price=@price,
                     DiscountPrice=@discountPrice, Stock=@stock, ImageURL=@imageUrl
              WHERE ProductID=@id`);
    res.json({ message: 'Product updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update product.' });
  }
});

// DELETE /api/admin/products/:id  (soft delete)
router.delete('/products/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE Products SET IsActive = 0 WHERE ProductID = @id');
    res.json({ message: 'Product removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove product.' });
  }
});

/* ---------------- Inventory (quick stock updates) ---------------- */
// PATCH /api/admin/inventory/:id  { stock }
router.patch('/inventory/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('stock', sql.Int, req.body.stock)
      .query('UPDATE Products SET Stock = @stock WHERE ProductID = @id');
    res.json({ message: 'Stock updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update stock.' });
  }
});

/* ---------------- Categories ---------------- */
router.post('/categories', async (req, res) => {
  try {
    const { name, sectionType, slotType, iconClass } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('sectionType', sql.VarChar, sectionType)
      .input('slotType', sql.VarChar, slotType || null)
      .input('iconClass', sql.NVarChar, iconClass || null)
      .query(`INSERT INTO Categories (Name, SectionType, SlotType, IconClass)
              OUTPUT INSERTED.CategoryID VALUES (@name, @sectionType, @slotType, @iconClass)`);
    res.status(201).json({ categoryId: result.recordset[0].CategoryID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create category.' });
  }
});

/* ---------------- Customers ---------------- */
// GET /api/admin/customers
router.get('/customers', async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT UserID, FullName, Email, Phone, Role, CreatedAt FROM Users
    WHERE Role = 'customer' ORDER BY CreatedAt DESC`);
  res.json(result.recordset);
});

/* ---------------- Orders (management) ---------------- */
// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT o.*, u.FullName AS CustomerName, u.Email AS CustomerEmail
    FROM Orders o JOIN Users u ON u.UserID = o.UserID ORDER BY o.OrderDate DESC`);
  res.json(result.recordset);
});

// PATCH /api/admin/orders/:id/status  { status }
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('status', sql.VarChar, req.body.status)
      .query('UPDATE Orders SET Status = @status WHERE OrderID = @id');
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update order status.' });
  }
});

module.exports = router;
