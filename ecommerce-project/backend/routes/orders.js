// routes/orders.js
const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/orders  -> creates the order from the current cart, then clears the cart
// body: { shipping: { line1, city, state, postal, country }, paymentMethod }
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { shipping, paymentMethod = 'COD' } = req.body;
    if (!shipping?.line1 || !shipping?.city || !shipping?.state || !shipping?.postal) {
      return res.status(400).json({ message: 'A complete shipping address is required.' });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    const cartResult = await request
      .input('userId', sql.Int, req.user.userId)
      .query(`SELECT p.ProductID, p.Name, p.Price, p.DiscountPrice, p.Stock, ci.Quantity
              FROM CartItems ci JOIN Products p ON p.ProductID = ci.ProductID
              WHERE ci.UserID = @userId`);

    const items = cartResult.recordset;
    if (items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    for (const item of items) {
      if (item.Quantity > item.Stock) {
        await transaction.rollback();
        return res.status(409).json({ message: `Only ${item.Stock} unit(s) of "${item.Name}" left in stock.` });
      }
    }

    const subtotal = items.reduce((s, i) => s + Number(i.DiscountPrice || i.Price) * i.Quantity, 0);
    const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
    const shippingFee = subtotal > 5000 ? 0 : 199;
    const totalAmount = subtotal + tax + shippingFee;

    const orderInsert = await new sql.Request(transaction)
      .input('userId', sql.Int, req.user.userId)
      .input('subtotal', sql.Decimal(10, 2), subtotal)
      .input('tax', sql.Decimal(10, 2), tax)
      .input('shippingFee', sql.Decimal(10, 2), shippingFee)
      .input('totalAmount', sql.Decimal(10, 2), totalAmount)
      .input('paymentMethod', sql.VarChar, paymentMethod)
      .input('line1', sql.NVarChar, shipping.line1)
      .input('city', sql.NVarChar, shipping.city)
      .input('state', sql.NVarChar, shipping.state)
      .input('postal', sql.NVarChar, shipping.postal)
      .input('country', sql.NVarChar, shipping.country || 'India')
      .query(`INSERT INTO Orders (UserID, Subtotal, Tax, ShippingFee, TotalAmount, Status, PaymentMethod,
                                   ShippingLine1, ShippingCity, ShippingState, ShippingPostal, ShippingCountry)
              OUTPUT INSERTED.OrderID
              VALUES (@userId, @subtotal, @tax, @shippingFee, @totalAmount, 'Paid', @paymentMethod,
                      @line1, @city, @state, @postal, @country)`);

    const orderId = orderInsert.recordset[0].OrderID;

    for (const item of items) {
      const unitPrice = Number(item.DiscountPrice || item.Price);
      await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('productId', sql.Int, item.ProductID)
        .input('name', sql.NVarChar, item.Name)
        .input('unitPrice', sql.Decimal(10, 2), unitPrice)
        .input('qty', sql.Int, item.Quantity)
        .query(`INSERT INTO OrderItems (OrderID, ProductID, ProductName, UnitPrice, Quantity)
                VALUES (@orderId, @productId, @name, @unitPrice, @qty)`);

      await new sql.Request(transaction)
        .input('productId', sql.Int, item.ProductID)
        .input('qty', sql.Int, item.Quantity)
        .query('UPDATE Products SET Stock = Stock - @qty WHERE ProductID = @productId');
    }

    await new sql.Request(transaction)
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM CartItems WHERE UserID = @userId');

    await transaction.commit();
    res.status(201).json({ orderId, totalAmount });
  } catch (err) {
    console.error(err);
    try { await transaction.rollback(); } catch (_) {}
    res.status(500).json({ message: 'Could not place order. Please try again.' });
  }
});

// GET /api/orders  -> all orders for the logged-in user
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT * FROM Orders WHERE UserID = @userId ORDER BY OrderDate DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load your orders.' });
  }
});

// GET /api/orders/:id  -> full invoice data (order + line items) for PDF generation
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const orderResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT * FROM Orders WHERE OrderID = @id AND UserID = @userId');

    const order = orderResult.recordset[0];
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const itemsResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM OrderItems WHERE OrderID = @id');

    res.json({ order, items: itemsResult.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load order.' });
  }
});

module.exports = router;
