// js/products.js
// Shared product-card rendering, used by index.html (featured rows)
// and products.html (full filterable catalog).

function placeholderImg(name) {
  // No real image assets ship with this demo — draw a clean initials tile instead.
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#F5F7FA"/>
      <text x="50%" y="54%" font-family="sans-serif" font-size="46" font-weight="700"
            fill="#CBD1E0" text-anchor="middle">${initials}</text>
    </svg>`)}`;
}

function productCard(p) {
  const price = p.DiscountPrice || p.Price;
  const hasDiscount = p.DiscountPrice && p.DiscountPrice < p.Price;
  const lowStock = p.Stock > 0 && p.Stock <= 5;
  return `
  <div class="product-card">
    <a href="product.html?id=${p.ProductID}">
      <div class="product-thumb">
        ${hasDiscount ? `<span class="badge">SALE</span>` : ''}
        <img src="${placeholderImg(p.Name)}" alt="${p.Name}">
      </div>
    </a>
    <div class="product-body">
      <span class="product-cat">${p.CategoryName || ''}</span>
      <a href="product.html?id=${p.ProductID}"><h3 class="product-name">${p.Name}</h3></a>
      <div class="product-rating">★ ${Number(p.Rating || 4).toFixed(1)} · ${p.Brand || ''}</div>
      <div class="product-price-row">
        <span class="price-now">${formatINR(price)}</span>
        ${hasDiscount ? `<span class="price-was">${formatINR(p.Price)}</span>` : ''}
      </div>
      ${p.Stock === 0 ? `<span class="stock-low">Out of stock</span>` : lowStock ? `<span class="stock-low">Only ${p.Stock} left</span>` : ''}
    </div>
    <div class="product-foot">
      <button class="btn btn-primary btn-block btn-sm" ${p.Stock === 0 ? 'disabled' : ''} onclick="quickAddToCart(${p.ProductID}, this)">
        ${p.Stock === 0 ? 'Out of stock' : 'Add to cart'}
      </button>
    </div>
  </div>`;
}

async function quickAddToCart(productId, btn) {
  if (!isLoggedIn()) { toast('Please log in to add items to your cart.', 'error'); setTimeout(() => location.href = 'login.html', 800); return; }
  try {
    btn.disabled = true; btn.textContent = 'Adding…';
    await api.post('/cart', { productId, quantity: 1 }, true);
    toast('Added to cart.', 'success');
    updateCartBadge();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Add to cart';
  }
}

async function loadFeatured(containerId, section, limit) {
  const el = document.getElementById(containerId);
  try {
    const data = await api.get(`/products?section=${section}&pageSize=${limit}&sort=newest`);
    el.innerHTML = data.items.length
      ? data.items.map(productCard).join('')
      : `<div class="empty-state"><h3>Nothing here yet</h3><p>Add products from the admin panel to see them here.</p></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><h3>Couldn't load products</h3><p>${err.message}</p></div>`;
  }
}
