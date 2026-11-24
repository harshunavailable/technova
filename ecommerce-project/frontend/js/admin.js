// js/admin.js
async function initAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    document.querySelector('.admin-shell').style.display = 'none';
    document.getElementById('admin-gate').innerHTML = '';
    document.body.insertAdjacentHTML('beforeend', `
      <div class="container" style="padding:80px 0;">
        <div class="empty-state">
          <h3>Admin access only</h3>
          <p>Log in with an administrator account to view this page.</p>
          <a href="login.html" class="btn btn-primary" style="margin-top:14px;">Log in</a>
        </div>
      </div>`);
    return;
  }

  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById(`panel-${link.dataset.panel}`);
      panel.style.display = 'block';
      loadPanel(link.dataset.panel);
    });
  });

  loadPanel('dashboard');

  document.getElementById('new-product-btn').addEventListener('click', openProductModal);
  document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
  document.getElementById('product-modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'product-modal-backdrop') closeProductModal();
  });
  document.getElementById('product-form').addEventListener('submit', saveProduct);

  await populateCategoryDropdown();
}

function loadPanel(name) {
  if (name === 'dashboard') loadDashboard();
  if (name === 'products') loadProducts();
  if (name === 'orders') loadOrders();
  if (name === 'customers') loadCustomers();
  if (name === 'inventory') loadInventory();
}

async function loadDashboard() {
  try {
    const s = await api.get('/admin/summary', true);
    document.getElementById('stat-grid').innerHTML = `
      <div class="stat-card"><b>${s.totalProducts}</b><span>Active products</span></div>
      <div class="stat-card"><b>${s.totalOrders}</b><span>Total orders</span></div>
      <div class="stat-card"><b>${s.totalCustomers}</b><span>Customers</span></div>
      <div class="stat-card"><b>${formatINR(s.totalRevenue)}</b><span>Revenue</span></div>
      <div class="stat-card"><b>${s.lowStockCount}</b><span>Low-stock items</span></div>`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadProducts() {
  const tbody = document.querySelector('#products-table tbody');
  try {
    const products = await api.get('/admin/products', true);
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.Name}</td>
        <td>${p.CategoryName}</td>
        <td>${formatINR(p.Price)}</td>
        <td>${p.Stock}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="deleteProduct(${p.ProductID})">Remove</button></td>
      </tr>`).join('') || `<tr><td colspan="5">No products yet.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

async function deleteProduct(id) {
  if (!confirm('Remove this product from the store?')) return;
  try {
    await api.del(`/admin/products/${id}`, true);
    toast('Product removed.', 'success');
    loadProducts();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  try {
    const orders = await api.get('/admin/orders', true);
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.OrderID}</td>
        <td>${o.CustomerName}<br><span style="color:var(--ink-soft); font-size:.8rem;">${o.CustomerEmail}</span></td>
        <td>${new Date(o.OrderDate).toLocaleDateString()}</td>
        <td>${formatINR(o.TotalAmount)}</td>
        <td>
          <select onchange="updateOrderStatus(${o.OrderID}, this.value)">
            ${['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'].map(s => `<option ${s === o.Status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('') || `<tr><td colspan="5">No orders yet.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await api.patch(`/admin/orders/${orderId}/status`, { status }, true);
    toast('Order status updated.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadCustomers() {
  const tbody = document.querySelector('#customers-table tbody');
  try {
    const customers = await api.get('/admin/customers', true);
    tbody.innerHTML = customers.map(c => `
      <tr><td>${c.FullName}</td><td>${c.Email}</td><td>${c.Phone || '—'}</td><td>${new Date(c.CreatedAt).toLocaleDateString()}</td></tr>`
    ).join('') || `<tr><td colspan="4">No customers yet.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`;
  }
}

async function loadInventory() {
  const tbody = document.querySelector('#inventory-table tbody');
  try {
    const products = await api.get('/admin/products', true);
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.Name}</td>
        <td>${p.CategoryName}</td>
        <td><input type="number" min="0" value="${p.Stock}" style="width:90px; padding:6px 8px; border:1.5px solid var(--line); border-radius:6px;"
             onchange="updateStock(${p.ProductID}, this.value)"></td>
      </tr>`).join('') || `<tr><td colspan="3">No products yet.</td></tr>`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">${err.message}</td></tr>`;
  }
}

async function updateStock(productId, stock) {
  try {
    await api.patch(`/admin/inventory/${productId}`, { stock: Number(stock) }, true);
    toast('Stock updated.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ---------------- Add product modal ---------------- */
async function populateCategoryDropdown() {
  try {
    const cats = await api.get('/categories');
    document.getElementById('pf-category').innerHTML = cats.map(c => `<option value="${c.CategoryID}">${c.Name} (${c.SectionType})</option>`).join('');
  } catch (_) { /* ignore */ }
}

function openProductModal() { document.getElementById('product-modal-backdrop').classList.add('open'); }
function closeProductModal() { document.getElementById('product-modal-backdrop').classList.remove('open'); }

async function saveProduct(e) {
  e.preventDefault();
  const payload = {
    categoryId: Number(document.getElementById('pf-category').value),
    name: document.getElementById('pf-name').value.trim(),
    brand: document.getElementById('pf-brand').value.trim(),
    description: document.getElementById('pf-description').value.trim(),
    price: Number(document.getElementById('pf-price').value),
    stock: Number(document.getElementById('pf-stock').value)
  };
  try {
    await api.post('/admin/products', payload, true);
    toast('Product added.', 'success');
    closeProductModal();
    e.target.reset();
    loadProducts();
  } catch (err) {
    toast(err.message, 'error');
  }
}
