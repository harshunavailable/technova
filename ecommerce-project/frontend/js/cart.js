// js/cart.js
let cartItems = [];

async function loadCart() {
  const el = document.getElementById('cart-items');

  if (!isLoggedIn()) {
    el.innerHTML = `<div class="empty-state"><h3>Log in to see your cart</h3><p>Your cart is saved to your account once you sign in.</p><a href="login.html" class="btn btn-primary" style="margin-top:14px;">Log in</a></div>`;
    document.getElementById('checkout-btn').disabled = true;
    return;
  }

  try {
    cartItems = await api.get('/cart', true);
    renderCartItems();
    renderTotals();
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><h3>Couldn't load your cart</h3><p>${err.message}</p></div>`;
  }

  document.getElementById('checkout-btn').addEventListener('click', () => {
    if (cartItems.length === 0) { toast('Your cart is empty.', 'error'); return; }
    location.href = 'checkout.html';
  });
}

function renderCartItems() {
  const el = document.getElementById('cart-items');
  if (cartItems.length === 0) {
    el.innerHTML = `<div class="empty-state"><h3>Your cart is empty</h3><p>Explore PC parts or CCTV gear to get started.</p><a href="products.html" class="btn btn-primary" style="margin-top:14px;">Browse products</a></div>`;
    return;
  }
  el.innerHTML = cartItems.map(item => {
    const price = item.DiscountPrice || item.Price;
    return `
    <div class="cart-row" data-id="${item.CartItemID}">
      <img src="${placeholderImg(item.Name)}" alt="${item.Name}">
      <div>
        <a href="product.html?id=${item.ProductID}"><strong>${item.Name}</strong></a>
        <div style="color:var(--ink-soft); font-size:.85rem; margin-top:4px;">${formatINR(price)} each</div>
        <button class="remove-link" onclick="removeItem(${item.CartItemID})">Remove</button>
      </div>
      <div class="qty-control">
        <button onclick="changeQty(${item.CartItemID}, ${item.Quantity - 1})">−</button>
        <span>${item.Quantity}</span>
        <button onclick="changeQty(${item.CartItemID}, ${item.Quantity + 1})">+</button>
      </div>
      <div style="font-weight:700;">${formatINR(price * item.Quantity)}</div>
    </div>`;
  }).join('');
}

function renderTotals() {
  const subtotal = cartItems.reduce((s, i) => s + Number(i.DiscountPrice || i.Price) * i.Quantity, 0);
  const tax = Math.round(subtotal * 0.18);
  const shipping = subtotal === 0 || subtotal > 5000 ? 0 : 199;
  const total = subtotal + tax + shipping;

  document.getElementById('sum-subtotal').textContent = formatINR(subtotal);
  document.getElementById('sum-tax').textContent = formatINR(tax);
  document.getElementById('sum-shipping').textContent = shipping === 0 ? 'Free' : formatINR(shipping);
  document.getElementById('sum-total').textContent = formatINR(total);
}

async function changeQty(cartItemId, newQty) {
  if (newQty < 1) return removeItem(cartItemId);
  try {
    await api.put(`/cart/${cartItemId}`, { quantity: newQty }, true);
    const item = cartItems.find(i => i.CartItemID === cartItemId);
    item.Quantity = newQty;
    renderCartItems();
    renderTotals();
    updateCartBadge();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function removeItem(cartItemId) {
  try {
    await api.del(`/cart/${cartItemId}`, true);
    cartItems = cartItems.filter(i => i.CartItemID !== cartItemId);
    renderCartItems();
    renderTotals();
    updateCartBadge();
    toast('Item removed.', 'info');
  } catch (err) {
    toast(err.message, 'error');
  }
}
