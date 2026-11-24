// js/api.js
// Shared across every page: the fetch wrapper, auth-token helpers,
// toast notifications, and the navbar cart-count badge.

const API_BASE = 'http://localhost:5000/api';

/* ---------------- low-level request helper ---------------- */
async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* empty body */ }

  if (!res.ok) {
    const message = data?.message || 'Something went wrong. Please try again.';
    if (res.status === 401 && auth) {
      clearSession();
    }
    throw new Error(message);
  }
  return data;
}

const api = {
  get: (path, auth = false) => apiRequest(path, { method: 'GET', auth }),
  post: (path, body, auth = false) => apiRequest(path, { method: 'POST', body, auth }),
  put: (path, body, auth = false) => apiRequest(path, { method: 'PUT', body, auth }),
  patch: (path, body, auth = false) => apiRequest(path, { method: 'PATCH', body, auth }),
  del: (path, auth = false) => apiRequest(path, { method: 'DELETE', auth })
};

/* ---------------- auth/session helpers ---------------- */
function getToken() { return localStorage.getItem('technova_token'); }
function getUser() {
  const raw = localStorage.getItem('technova_user');
  return raw ? JSON.parse(raw) : null;
}
function saveSession(token, user) {
  localStorage.setItem('technova_token', token);
  localStorage.setItem('technova_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('technova_token');
  localStorage.removeItem('technova_user');
}
function isLoggedIn() { return !!getToken(); }
function isAdmin() { return getUser()?.role === 'admin'; }

/* ---------------- toast notifications ---------------- */
function toast(message, type = 'info') {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------------- currency formatting ---------------- */
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/* ---------------- navbar wiring (runs on every page) ---------------- */
function initNavbar() {
  const authSlot = document.getElementById('nav-auth-slot');
  if (authSlot) {
    if (isLoggedIn()) {
      const user = getUser();
      authSlot.innerHTML = `
        <a href="${isAdmin() ? 'admin.html' : 'orders.html'}" class="icon-btn" title="${isAdmin() ? 'Admin panel' : 'My orders'}">
          ${isAdmin() ? iconShield() : iconUser()}
        </a>
        <button class="btn btn-sm btn-ghost" id="logout-btn">Log out</button>`;
      document.getElementById('logout-btn').addEventListener('click', () => {
        clearSession();
        toast('You have been logged out.', 'info');
        setTimeout(() => location.href = 'index.html', 500);
      });
    } else {
      authSlot.innerHTML = `<a href="login.html" class="btn btn-sm">Log in</a>`;
    }
  }
  updateCartBadge();
}

async function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  if (!isLoggedIn()) { badge.textContent = '0'; badge.style.display = 'none'; return; }
  try {
    const items = await api.get('/cart', true);
    const count = items.reduce((s, i) => s + i.Quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch (_) { /* silent */ }
}

function iconUser() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`;
}
function iconShield() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z"/></svg>`;
}

// NOTE: initNavbar() is called explicitly by renderNavbar() in components.js,
// right after the navbar markup (and its #nav-auth-slot / #cart-count nodes) exists in the DOM.
