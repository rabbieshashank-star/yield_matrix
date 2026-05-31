/**
 * admin.js — Yield Matrix Market Admin Portal
 * Handles: login, token management, price CRUD, UI rendering
 */

const API = 'https://roger95.pythonanywhere.com';

// ── Default crop list (always shown, can be extended) ────────────────────────
const DEFAULT_CROPS = [
  'ಟೊಮೆಟೋ', 'ಈರುಳ್ಳಿ', 'ರಾಗಿ', 'ಭತ್ತ', 'ಹತ್ತಿ',
  'ಕಬ್ಬು', 'ಅರಿಶಿನ', 'ಬದನೆ', 'ಕೋಸು', 'ಆಲೂಗಡ್ಡೆ',
  'ಗೋಧಿ', 'ಜೋಳ', 'ಸೋಯಾಬೀನ್', 'ಶೇಂಗಾ', 'ಸೂರ್ಯಕಾಂತಿ',
  'ಜೋವರ್', 'ಬಜ್ರಾ', 'ಮೆಣಸಿನಕಾಯಿ', 'ಬೆಳ್ಳುಳ್ಳಿ', 'ಶುಂಠಿ'
];

// Extra crops saved locally by this operator
function getCustomCrops() {
  try { return JSON.parse(localStorage.getItem('ym_custom_crops') || '[]'); }
  catch { return []; }
}
function saveCustomCrop(name) {
  const list = getCustomCrops();
  if (!list.includes(name)) {
    list.push(name);
    localStorage.setItem('ym_custom_crops', JSON.stringify(list));
  }
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function token() { return sessionStorage.getItem('ym_token'); }
function district() { return sessionStorage.getItem('ym_district'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token()}`,
  };
}

function isLoginPage() {
  return document.getElementById('loginForm') !== null;
}

function fmtTime(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return raw; }
}

// ── Router guard ─────────────────────────────────────────────────────────────

function routeGuard() {
  const onLogin = isLoginPage();
  const hasToken = !!token();
  if (onLogin && hasToken) window.location.href = 'dashboard.html';
  if (!onLogin && !hasToken) window.location.href = 'index.html';
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────

async function initLogin() {
  const districtSelect = document.getElementById('district');

  // Load districts from backend DB
  try {
    const res = await fetch(`${API}/admin/districts`);
    const data = await res.json();
    const list = data.districts || [];
    if (list.length === 0) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = t('admin_no_districts') || 'No districts configured yet';
      districtSelect.appendChild(opt);
    } else {
      list.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        districtSelect.appendChild(opt);
      });
    }
  } catch {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = t('could_not_load_districts') || '(Could not load districts)';
    districtSelect.appendChild(opt);
  }

  // Password toggle
  document.getElementById('togglePwd').addEventListener('click', () => {
    const inp = document.getElementById('password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Login form submit
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');

    const districtVal = districtSelect.value;
    const passwordVal = document.getElementById('password').value;

    errorEl.hidden = true;
    btn.disabled = true;
    btnText.hidden = true;
    spinner.hidden = false;

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district: districtVal, password: passwordVal }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || t('admin_login_failed') || 'Login failed');

      sessionStorage.setItem('ym_token', data.token);
      sessionStorage.setItem('ym_district', data.district);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
      btnText.hidden = false;
      spinner.hidden = true;
    }
  });
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────────

let pendingDeleteCrop = null;

let currentDbCrops = [];

/**
 * Build (or rebuild) the crop <select> from a merged list of
 * DEFAULT_CROPS + custom crops saved locally + crops already in the DB.
 */
function buildCropSelect(dbCrops = null) {
  if (dbCrops !== null) {
    currentDbCrops = dbCrops;
  } else {
    dbCrops = currentDbCrops;
  }

  const sel = document.getElementById('cropSelect');
  const prev = sel.value; // remember selection across refreshes

  // Merge all sources, de-duplicate, sort
  const customCrops = getCustomCrops();
  const all = [...new Set([...DEFAULT_CROPS, ...customCrops, ...dbCrops])]
    .map(c => c.trim())
    .filter(Boolean)
    .sort();

  sel.innerHTML = `<option value="" disabled>${t('select_a_crop_admin') || 'Select a crop…'}</option>`;
  all.forEach(crop => {
    const opt = document.createElement('option');
    opt.value = crop;
    opt.textContent = crop;
    sel.appendChild(opt);
  });

  // Sentinel option at the bottom
  const addOpt = document.createElement('option');
  addOpt.value = '__new__';
  addOpt.textContent = t('add_new_crop') || '+ Add new crop…';
  sel.appendChild(addOpt);

  // Restore prior selection if it still exists
  if (prev && prev !== '__new__') sel.value = prev;

  // Keep hidden input in sync
  document.getElementById('cropName').value =
    (sel.value && sel.value !== '__new__') ? sel.value : '';
}

async function initDashboard() {
  document.getElementById('districtLabel').textContent = district();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  await loadPrices();
  initCropSelect();

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const icon = document.getElementById('refreshIcon');
    icon.style.animation = 'spin 0.8s linear infinite';
    await loadPrices();
    icon.style.animation = '';
  });

  // Price form submit
  document.getElementById('priceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('priceError');
    const sucEl = document.getElementById('priceSuccess');
    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const spinner = document.getElementById('submitSpinner');

    errEl.hidden = true;
    sucEl.hidden = true;

    // Auto-confirm new crop if user forgot to click 'Add'
    const sel = document.getElementById('cropSelect');
    if (sel.value === '__new__') {
      const raw = document.getElementById('newCropInput').value.trim();
      if (raw) {
        document.getElementById('addCropBtn').click();
      }
    }

    // Crop name comes from the hidden input (set by buildCropSelect / initCropSelect)
    const crop = document.getElementById('cropName').value.trim();
    if (!crop) {
      errEl.textContent = t('select_add_crop') || 'Please select or add a crop name.';
      errEl.hidden = false;
      return;
    }

    const price = parseInt(document.getElementById('cropPrice').value, 10);
    const volume = parseInt(document.getElementById('cropVolume').value, 10) || 0;
    const changePct = parseFloat(document.getElementById('cropChange').value) || 0.0;

    if (!price || price <= 0) {
      errEl.textContent = t('valid_price') || 'Please enter a valid price (₹ > 0).';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btnText.hidden = true;
    spinner.hidden = false;

    try {
      const res = await fetch(`${API}/admin/prices`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ crop, price, volume, change_pct: changePct }),
      });
      const data = await res.json();
      if (res.status === 401) { handleUnauth(); return; }
      if (!data.success) throw new Error(data.error || t('failed_to_save') || 'Failed to save');

      sucEl.textContent = `✓ ${crop} ${t('price_saved_success') || 'price saved successfully.'}`;
      sucEl.hidden = false;

      // Reset form — return select to placeholder, hide new-crop row
      document.getElementById('cropSelect').value = '';
      document.getElementById('cropName').value = '';
      document.getElementById('cropPrice').value = '';
      document.getElementById('cropVolume').value = '';
      document.getElementById('cropChange').value = '';
      document.getElementById('newCropRow').hidden = true;
      document.getElementById('newCropInput').value = '';

      await loadPrices();
      setTimeout(() => { sucEl.hidden = true; }, 3500);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btnText.hidden = false;
      spinner.hidden = true;
    }
  });

  // Delete modal
  document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDelete').addEventListener('click', doDelete);
  document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
}

async function loadPrices() {
  const loading = document.getElementById('tableLoading');
  const emptyState = document.getElementById('emptyState');
  const tableWrap = document.getElementById('pricesTableWrap');
  const tbody = document.getElementById('pricesTableBody');
  const statCount = document.getElementById('statCropCount');
  const statUpdate = document.getElementById('statLastUpdate');

  loading.hidden = false;
  emptyState.hidden = true;
  tableWrap.hidden = true;

  try {
    const res = await fetch(`${API}/admin/prices?_t=${Date.now()}`, { headers: authHeaders() });
    if (res.status === 401) { handleUnauth(); return; }
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const prices = data.prices || [];

    // Update stats
    statCount.textContent = prices.length;
    statUpdate.textContent = prices.length
      ? fmtTime(prices.reduce((a, b) =>
        new Date(a.updated_at) > new Date(b.updated_at) ? a : b
      ).updated_at)
      : '—';

    // Rebuild crop dropdown with DB crops included
    const enteredCrops = prices.map(p => p.crop);
    buildCropSelect(enteredCrops);

    if (prices.length === 0) {
      loading.hidden = true;
      emptyState.hidden = false;
      return;
    }

    // Build table rows
    tbody.innerHTML = '';
    prices.forEach(row => {
      const changeClass = row.change_pct > 0 ? 'change-positive'
        : row.change_pct < 0 ? 'change-negative'
          : 'change-neutral';
      const changeStr = row.change_pct > 0 ? `▲ ${row.change_pct}%`
        : row.change_pct < 0 ? `▼ ${Math.abs(row.change_pct)}%`
          : '— 0%';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="crop-name">${row.crop}</span></td>
        <td><span class="price-val">₹${row.price.toLocaleString('en-IN')}</span></td>
        <td><span class="${changeClass}">${changeStr}</span></td>
        <td>${row.volume ? row.volume + ' q' : '—'}</td>
        <td><span class="updated-time">${fmtTime(row.updated_at)}</span></td>
        <td>
          <button class="btn-row-delete" data-crop="${row.crop}">${t('remove') || 'Remove'}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-row-delete').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.crop));
    });

    loading.hidden = true;
    tableWrap.hidden = false;

  } catch (err) {
    loading.hidden = true;
    emptyState.hidden = false;
    document.querySelector('.empty-sub').textContent = err.message;
  }
}

/**
 * Wire up the crop <select> → new-crop inline flow.
 * Called once after initDashboard() builds the DOM.
 */
function initCropSelect() {
  const sel = document.getElementById('cropSelect');
  const newCropRow = document.getElementById('newCropRow');
  const newCropInput = document.getElementById('newCropInput');
  const addCropBtn = document.getElementById('addCropBtn');
  const cancelBtn = document.getElementById('cancelNewCrop');
  const cropNameHidden = document.getElementById('cropName');
  const hintEl = document.getElementById('newCropHint');

  // When user picks a crop from the dropdown
  sel.addEventListener('change', () => {
    if (sel.value === '__new__') {
      // Show the inline text field
      newCropRow.hidden = false;
      newCropInput.focus();
      cropNameHidden.value = ''; // clear until confirmed
      hintEl.textContent = t('type_new_crop_confirm') || 'Type the new crop name and click Add to confirm.';
    } else {
      // Normal selection — set the hidden input and hide the text field
      newCropRow.hidden = true;
      newCropInput.value = '';
      cropNameHidden.value = sel.value;
      hintEl.textContent = `${t('select') || 'Selected'}: ${sel.value}`;
    }
  });

  // "Add" button — confirm the new crop name
  addCropBtn.addEventListener('click', () => {
    const raw = newCropInput.value.trim();
    if (!raw) {
      newCropInput.focus();
      return;
    }
    const name = raw.charAt(0).toUpperCase() + raw.slice(1); // Capitalize first letter

    // ── Duplicate check (case-insensitive) ───────────────────────────────────
    const existing = Array.from(sel.options)
      .map(o => o.value.toLowerCase())
      .filter(v => v && v !== '__new__');

    if (existing.includes(name.toLowerCase())) {
      // Flash the input red and show an error hint
      newCropInput.style.borderColor = 'var(--danger)';
      newCropInput.style.boxShadow = '0 0 0 3px rgba(248,113,113,0.2)';
      hintEl.textContent = `"${name}" ${t('already_exists') || 'already exists in the list. Pick it from the dropdown.'}`;
      hintEl.style.color = 'var(--danger)';
      newCropInput.focus();
      // Reset the red border after 2 s
      setTimeout(() => {
        newCropInput.style.borderColor = '';
        newCropInput.style.boxShadow = '';
        hintEl.style.color = '';
        hintEl.textContent = t('type_new_crop_confirm') || 'Type the new crop name and click Add to confirm.';
      }, 2500);
      return; // ← stop here, don't save
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Save to localStorage so it persists across page loads
    saveCustomCrop(name);

    // Add it as an option and select it
    buildCropSelect(); // rebuild with the new custom crop included
    sel.value = name;
    cropNameHidden.value = name;

    // Hide the text row and update hint
    newCropRow.hidden = true;
    newCropInput.value = '';
    hintEl.style.color = '';
    hintEl.textContent = `${t('added_selected') || 'Added & selected:'} ${name}`;
  });

  // Allow pressing Enter inside the new-crop input to confirm
  newCropInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCropBtn.click(); }
    if (e.key === 'Escape') cancelBtn.click();
  });

  // "✕" cancel — revert select to placeholder
  cancelBtn.addEventListener('click', () => {
    newCropRow.hidden = true;
    newCropInput.value = '';
    sel.value = '';
    cropNameHidden.value = '';
    hintEl.textContent = t('pick_from_existing') || 'Pick from existing crops or choose "+ Add new crop" to add one.';
  });
}

function openDeleteModal(crop) {
  pendingDeleteCrop = crop;
  document.getElementById('deleteCropName').textContent = crop;
  document.getElementById('deleteModal').classList.add('is-open');
}
function closeDeleteModal() {
  pendingDeleteCrop = null;
  document.getElementById('deleteModal').classList.remove('is-open');
}

async function doDelete() {
  if (!pendingDeleteCrop) return;
  const crop = pendingDeleteCrop;
  closeDeleteModal();
  try {
    const res = await fetch(`${API}/admin/prices/${encodeURIComponent(crop)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.status === 401) { handleUnauth(); return; }
    await loadPrices();
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

function handleUnauth() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── Entry point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  routeGuard();
  if (isLoginPage()) {
    initLogin();
  } else {
    initDashboard();
  }
});
