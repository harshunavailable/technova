// js/checkout.js
async function initCheckout() {
  if (!isLoggedIn()) { toast('Please log in to check out.', 'error'); setTimeout(() => location.href = 'login.html', 800); return; }

  let items = [];
  try {
    items = await api.get('/cart', true);
  } catch (err) {
    toast(err.message, 'error');
    return;
  }

  if (items.length === 0) {
    toast('Your cart is empty.', 'error');
    setTimeout(() => location.href = 'cart.html', 800);
    return;
  }

  renderCheckoutSummary(items);

  document.querySelectorAll('input[name="payment"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.payment-option').forEach(label => label.classList.remove('active'));
      input.closest('.payment-option').classList.add('active');
    });
  });

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true; btn.textContent = 'Placing order…';

    const shipping = {
      line1: document.getElementById('line1').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      postal: document.getElementById('postal').value.trim(),
      country: document.getElementById('country').value.trim()
    };
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    try {
      const result = await api.post('/orders', { shipping, paymentMethod }, true);
      updateCartBadge();
      toast('Order placed successfully!', 'success');
      setTimeout(() => location.href = `order-success.html?id=${result.orderId}`, 500);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Place order';
    }
  });
}

function renderCheckoutSummary(items) {
  const linesEl = document.getElementById('checkout-lines');
  linesEl.innerHTML = items.map(i => {
    const price = i.DiscountPrice || i.Price;
    return `<div class="summary-line"><span>${i.Name} × ${i.Quantity}</span><span>${formatINR(price * i.Quantity)}</span></div>`;
  }).join('');

  const subtotal = items.reduce((s, i) => s + Number(i.DiscountPrice || i.Price) * i.Quantity, 0);
  const tax = Math.round(subtotal * 0.18);
  const shipping = subtotal > 5000 ? 0 : 199;
  const total = subtotal + tax + shipping;

  document.getElementById('co-subtotal').textContent = formatINR(subtotal);
  document.getElementById('co-tax').textContent = formatINR(tax);
  document.getElementById('co-shipping').textContent = shipping === 0 ? 'Free' : formatINR(shipping);
  document.getElementById('co-total').textContent = formatINR(total);
}
