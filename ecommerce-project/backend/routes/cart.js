// routes/cart.js
const express = require('express');
const { sql, getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every cart route needs a logged-in user

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`SELECT ci.CartItemID, ci.Quantity, p.ProductID, p.Name, p.Price,
                     p.DiscountPrice, p.ImageURL, p.Stock
              FROM CartItems ci JOIN Products p ON p.ProductID = ci.ProductID
              WHERE ci.UserID = @userId ORDER BY ci.AddedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load your cart.' });
  }
});

// POST /api/cart  { productId, quantity }
router.post('/', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const pool = await getPool();

    const existing = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .input('productId', sql.Int, productId)
      .query('SELECT CartItemID, Quantity FROM CartItems WHERE UserID = @userId AND ProductID = @productId');

    if (existing.recordset.length > 0) {
      const newQty = existing.recordset[0].Quantity + Number(quantity);
      await pool.request()
        .input('id', sql.Int, existing.recordset[0].CartItemID)
        .input('qty', sql.Int, newQty)
        .query('UPDATE CartItems SET Quantity = @qty WHERE CartItemID = @id');
    } else {
      await pool.request()
        .input('userId', sql.Int, req.user.userId)
        .input('productId', sql.Int, productId)
        .input('qty', sql.Int, quantity)
        .query('INSERT INTO CartItems (UserID, ProductID, Quantity) VALUES (@userId, @productId, @qty)');
    }

    res.status(201).json({ message: 'Added to cart.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add item to cart.' });
  }
});

// PUT /api/cart/:cartItemId  { quantity }
router.put('/:cartItemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.cartItemId)
      .input('userId', sql.Int, req.user.userId)
      .input('qty', sql.Int, quantity)
      .query('UPDATE CartItems SET Quantity = @qty WHERE CartItemID = @id AND UserID = @userId');
    res.json({ message: 'Cart updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update cart.' });
  }
});

// DELETE /api/cart/:cartItemId
router.delete('/:cartItemId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.cartItemId)
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM CartItems WHERE CartItemID = @id AND UserID = @userId');
    res.json({ message: 'Item removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove item.' });
  }
});

// DELETE /api/cart  (empty the whole cart, used after checkout)
router.delete('/', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM CartItems WHERE UserID = @userId');
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not clear cart.' });
  }
});

module.exports = router;
