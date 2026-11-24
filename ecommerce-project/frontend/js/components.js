// js/components.js
// Injects the shared navbar + footer into any page that has
// <div id="navbar"></div> and <div id="footer"></div> placeholders.

function renderNavbar(activePage = '') {
  const el = document.getElementById('navbar');
  if (!el) return;
  el.outerHTML = `
  <header class="navbar">
    <div class="container">
      <a href="index.html" class="brand">
        <span class="brand-mark">
          <svg viewBox="0 0 40 40" fill="none">
            <rect x="2" y="2" width="36" height="36" rx="10" fill="#B6FF3B" stroke="#10131C" stroke-width="2.5"/>
            <path d="M12 26V14l8 6 8-6v12" stroke="#10131C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        Technova
      </a>
      <nav class="nav-links">
        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
        <a href="pc-builder.html" class="${activePage === 'builder' ? 'active' : ''}">Build a PC</a>
        <a href="products.html?section=PC" class="${activePage === 'pc' ? 'active' : ''}">PC Parts</a>
        <a href="products.html?section=CCTV" class="${activePage === 'cctv' ? 'active' : ''}">CCTV</a>
        <a href="orders.html" class="${activePage === 'orders' ? 'active' : ''}">My Orders</a>
      </nav>
      <div class="nav-actions">
        <div id="nav-auth-slot"></div>
        <a href="cart.html" class="icon-btn" title="Cart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/></svg>
          <span class="cart-count" id="cart-count" style="display:none">0</span>
        </a>
      </div>
    </div>
  </header>`;
  initNavbar(); // from api.js — fills in the login/cart state now that the nodes exist
}

function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;
  el.outerHTML = `
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand" style="margin-bottom:12px;">
            <span class="brand-mark">
              <svg viewBox="0 0 40 40" fill="none"><rect x="2" y="2" width="36" height="36" rx="10" fill="#B6FF3B" stroke="#10131C" stroke-width="2.5"/><path d="M12 26V14l8 6 8-6v12" stroke="#10131C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            Technova
          </div>
          <p style="max-width:32ch;">Custom PC builds and CCTV security gear, picked, matched and shipped without the guesswork.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="pc-builder.html">Build a PC</a>
          <a href="products.html?section=PC">PC Components</a>
          <a href="products.html?section=CCTV">CCTV & Security</a>
        </div>
        <div>
          <h4>Account</h4>
          <a href="orders.html">My Orders</a>
          <a href="cart.html">My Cart</a>
          <a href="login.html">Log in</a>
        </div>
        <div>
          <h4>Support</h4>
          <a href="#">Shipping & Returns</a>
          <a href="#">Warranty</a>
          <a href="#">Contact Us</a>
        </div>
      </div>
      <div class="footer-bottom">© 2026 Technova. Built for people who like knowing exactly what's inside their machine.</div>
    </div>
  </footer>`;
}
