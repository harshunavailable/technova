// js/pcbuilder.js
// Drives the "Build Your Own PC" wizard: renders one slot per component type,
// opens a compatibility-filtered picker for each, and re-validates the whole
// build against /api/pcbuilder/validate every time a selection changes.

const SLOTS = [
  { key: 'cpu', label: 'Processor', short: 'CPU' },
  { key: 'motherboard', label: 'Motherboard', short: 'MB' },
  { key: 'ram', label: 'Memory (RAM)', short: 'RAM' },
  { key: 'gpu', label: 'Graphics Card', short: 'GPU' },
  { key: 'storage', label: 'Storage', short: 'SSD' },
  { key: 'psu', label: 'Power Supply', short: 'PSU' },
  { key: 'cabinet', label: 'Cabinet', short: 'CASE' },
  { key: 'monitor', label: 'Monitor', short: 'MON' }
];

let build = {};       // { cpu: {productId, name, price}, motherboard: {...}, ... }
let lastValidation = null;

function initBuilder() {
  const wrap = document.getElementById('builder-steps');
  wrap.innerHTML = SLOTS.map(slot => `
    <div class="build-slot" id="slot-${slot.key}">
      <div class="slot-icon">${slot.short}</div>
      <div>
        <div class="slot-label">${slot.label}</div>
        <div class="slot-value empty" id="value-${slot.key}">Not selected</div>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span class="slot-price" id="price-${slot.key}"></span>
        <button class="btn btn-sm" onclick="openPicker('${slot.key}')">Choose</button>
      </div>
    </div>`).join('');

  document.getElementById('picker-close').addEventListener('click', closePicker);
  document.getElementById('picker-backdrop').addEventListener('click', e => {
    if (e.target.id === 'picker-backdrop') closePicker();
  });
  document.getElementById('add-build-btn').addEventListener('click', addBuildToCart);
  document.getElementById('save-build-btn').addEventListener('click', saveBuild);

  renderSummary();
}

async function openPicker(slotKey) {
  const slot = SLOTS.find(s => s.key === slotKey);
  document.getElementById('picker-title').textContent = `Choose a ${slot.label.toLowerCase()}`;
  document.getElementById('picker-backdrop').classList.add('open');
  const list = document.getElementById('picker-list');
  list.innerHTML = `<div class="loading-row">Loading compatible options…</div>`;

  try {
    const qs = new URLSearchParams();
    if (build.motherboard && ['cpu'].includes(slotKey)) qs.set('socket', build.motherboard.Socket);
    if (build.cpu && slotKey === 'motherboard') qs.set('socket', build.cpu.Socket);
    if (build.motherboard && slotKey === 'ram') qs.set('ramType', build.motherboard.RamType);
    if (build.ram && slotKey === 'motherboard') qs.set('ramType', build.ram.RamType);
    if (build.motherboard && slotKey === 'cabinet') qs.set('formFactor', build.motherboard.FormFactor);
    if (build.gpu && slotKey === 'psu') qs.set('minWattage', build.gpu.WattageNeeded);

    const options = await api.get(`/pcbuilder/options/${slotKey}?${qs.toString()}`);
    if (options.length === 0) {
      list.innerHTML = `<div class="empty-state"><h3>No compatible parts found</h3><p>Try changing an earlier selection, or check back once more stock arrives.</p></div>`;
      return;
    }
    list.innerHTML = options.map(o => `
      <div class="picker-item" onclick='selectComponent("${slotKey}", ${JSON.stringify(o).replace(/'/g, "&#39;")})'>
        <img src="${placeholderImg(o.Name)}" alt="">
        <div>
          <div class="pi-name">${o.Name}</div>
          <div class="pi-meta">${o.Brand || ''} ${o.Stock <= 5 ? `· only ${o.Stock} left` : ''}</div>
        </div>
        <div class="pi-price">${formatINR(o.Price)}</div>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><h3>Couldn't load options</h3><p>${err.message}</p></div>`;
  }
}

function closePicker() { document.getElementById('picker-backdrop').classList.remove('open'); }

function selectComponent(slotKey, product) {
  build[slotKey] = product;
  const slotEl = document.getElementById(`slot-${slotKey}`);
  slotEl.classList.add('filled');
  document.getElementById(`value-${slotKey}`).textContent = product.Name;
  document.getElementById(`value-${slotKey}`).classList.remove('empty');
  document.getElementById(`price-${slotKey}`).textContent = formatINR(product.Price);
  closePicker();
  validateBuild();
}

async function validateBuild() {
  const payload = {};
  SLOTS.forEach(s => { if (build[s.key]) payload[s.key] = build[s.key].ProductID; });

  if (Object.keys(payload).length === 0) { renderSummary(); return; }

  try {
    lastValidation = await api.post('/pcbuilder/validate', payload);
  } catch (err) {
    lastValidation = { valid: false, issues: [err.message], totalPrice: 0 };
  }
  renderSummary();
}

function renderSummary() {
  const issuesEl = document.getElementById('summary-issues');
  const linesEl = document.getElementById('summary-lines');
  const totalEl = document.getElementById('summary-total');
  const addBtn = document.getElementById('add-build-btn');
  const saveBtn = document.getElementById('save-build-btn');

  const selected = SLOTS.filter(s => build[s.key]);
  linesEl.innerHTML = selected.length
    ? selected.map(s => `<div class="summary-line"><span>${s.short} · ${build[s.key].Name}</span><span>${formatINR(build[s.key].Price)}</span></div>`).join('')
    : `<p style="font-size:.88rem;">Nothing selected yet — start with a processor.</p>`;

  const total = selected.reduce((sum, s) => sum + Number(build[s.key].Price), 0);
  totalEl.textContent = formatINR(total);

  const requiredPicked = build.cpu && build.motherboard && build.ram;
  const noIssues = !lastValidation || lastValidation.valid;

  if (lastValidation && lastValidation.issues && lastValidation.issues.length) {
    issuesEl.innerHTML = `<ul class="build-issues">${lastValidation.issues.map(i => `<li>⚠ ${i}</li>`).join('')}</ul>`;
  } else if (selected.length > 1) {
    issuesEl.innerHTML = `<div class="build-ok">✓ Everything selected so far fits together.</div>`;
  } else {
    issuesEl.innerHTML = '';
  }

  addBtn.disabled = !(requiredPicked && noIssues);
  saveBtn.disabled = selected.length === 0;
}

async function addBuildToCart() {
  if (!isLoggedIn()) { toast('Please log in to add your build to the cart.', 'error'); setTimeout(() => location.href = 'login.html', 800); return; }
  const addBtn = document.getElementById('add-build-btn');
  addBtn.disabled = true; addBtn.textContent = 'Adding…';
  try {
    const selected = SLOTS.filter(s => build[s.key]);
    for (const s of selected) {
      await api.post('/cart', { productId: build[s.key].ProductID, quantity: 1 }, true);
    }
    toast('Your full build was added to the cart!', 'success');
    updateCartBadge();
    setTimeout(() => location.href = 'cart.html', 700);
  } catch (err) {
    toast(err.message, 'error');
    addBtn.disabled = false; addBtn.textContent = 'Add full build to cart';
  }
}

async function saveBuild() {
  if (!isLoggedIn()) { toast('Please log in to save this build.', 'error'); setTimeout(() => location.href = 'login.html', 800); return; }
  try {
    const components = {};
    SLOTS.forEach(s => { if (build[s.key]) components[s.key] = build[s.key].ProductID; });
    const total = SLOTS.reduce((sum, s) => sum + (build[s.key] ? Number(build[s.key].Price) : 0), 0);
    await api.post('/pcbuilder/save', { buildName: 'My Custom Build', components, totalPrice: total }, true);
    toast('Build saved to your account.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}
