/**
 * schemes-admin.js — Yield Matrix Government Schemes Admin Portal
 * Auth: superadmin JWT (same as market-admin superadmin)
 * Handles: login, list schemes, add scheme, delete scheme, live search
 */

const API = 'https://rabbieshashank.pythonanywhere.com';

// ── Auth helpers ─────────────────────────────────────────────────────────────

function saToken() { return sessionStorage.getItem('sa_schemes_token'); }

function saHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${saToken()}`,
  };
}

function isLoginPage() {
  return document.getElementById('loginForm') !== null;
}

// ── Route guard ──────────────────────────────────────────────────────────────

function routeGuard() {
  const onLogin  = isLoginPage();
  const hasToken = !!saToken();
  if (onLogin  && hasToken)  window.location.href = 'dashboard.html';
  if (!onLogin && !hasToken) window.location.href = 'index.html';
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────

function initLogin() {
  // Password toggle
  document.getElementById('togglePwd').addEventListener('click', () => {
    const inp = document.getElementById('password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl   = document.getElementById('loginError');
    const btn     = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    errEl.hidden   = true;
    btn.disabled   = true;
    btnText.hidden = true;
    spinner.hidden = false;

    try {
      const res  = await fetch(`${API}/admin/superadmin/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Login failed');

      sessionStorage.setItem('sa_schemes_token', data.token);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled   = false;
      btnText.hidden = false;
      spinner.hidden = true;
    }
  });
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────────

let allSchemes       = [];    // full list from backend
let pendingDeleteId  = null;

async function initDashboard() {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('sa_schemes_token');
    window.location.href = 'index.html';
  });

  await loadSchemes();

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const icon = document.getElementById('refreshBtn');
    icon.textContent = '↻';
    await loadSchemes();
    icon.textContent = '↺ Refresh';
  });

  // Live search filter
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTable(e.target.value.trim().toLowerCase());
  });

  // Add scheme form
  document.getElementById('schemeForm').addEventListener('submit', handleAddScheme);

  // Delete modal buttons
  document.getElementById('cancelDelete').addEventListener('click',  closeDeleteModal);
  document.getElementById('confirmDelete').addEventListener('click', doDelete);
  document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
}

// ── Load & render schemes ────────────────────────────────────────────────────

async function loadSchemes() {
  const loading  = document.getElementById('tableLoading');
  const empty    = document.getElementById('emptyState');
  const tableWrap = document.getElementById('schemesTableWrap');

  loading.hidden  = false;
  empty.hidden    = true;
  tableWrap.hidden = true;

  try {
    const res  = await fetch(`${API}/api/schemes`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    allSchemes = data.schemes || [];
    updateStats(allSchemes);

    loading.hidden = true;
    if (allSchemes.length === 0) {
      empty.hidden = false;
    } else {
      tableWrap.hidden = false;
      renderTable(document.getElementById('searchInput')?.value.trim().toLowerCase() || '');
    }
  } catch (err) {
    loading.hidden = true;
    empty.hidden   = false;
    document.querySelector('.empty-sub').textContent = err.message;
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      sessionStorage.removeItem('sa_schemes_token');
      window.location.href = 'index.html';
    }
  }
}

function updateStats(schemes) {
  document.getElementById('statTotal').textContent      = schemes.length;
  const cats = new Set(schemes.map(s => s.category));
  document.getElementById('statCategories').textContent = cats.size;
  document.getElementById('statLinks').textContent      = schemes.filter(s => s.link).length;
}

function renderTable(query = '') {
  const tbody = document.getElementById('schemesTableBody');
  const filtered = query
    ? allSchemes.filter(s =>
        s.name.toLowerCase().includes(query)     ||
        s.category.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      )
    : allSchemes;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-3);">No schemes match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="scheme-name">${escHtml(s.name)}</div>
        <div class="scheme-desc">${escHtml(s.description)}</div>
      </td>
      <td><span class="category-badge">${escHtml(s.category)}</span></td>
      <td>
        ${s.link
          ? `<a class="scheme-link" href="${escHtml(s.link)}" target="_blank" rel="noopener">🔗 Open</a>`
          : `<span class="no-link">—</span>`
        }
      </td>
      <td>
        <button class="btn-row-delete" data-id="${s.id}" data-name="${escHtml(s.name)}">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-row-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(+btn.dataset.id, btn.dataset.name));
  });
}

// ── Add scheme ───────────────────────────────────────────────────────────────

async function handleAddScheme(e) {
  e.preventDefault();
  const errEl   = document.getElementById('schemeError');
  const sucEl   = document.getElementById('schemeSuccess');
  const btn     = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitBtnText');
  const spinner = document.getElementById('submitSpinner');

  errEl.hidden = true;
  sucEl.hidden = true;

  const name        = document.getElementById('schemeName').value.trim();
  const catSelect   = document.getElementById('schemeCategory').value;
  const catCustom   = document.getElementById('schemeCategoryCustom').value.trim();
  const category    = catCustom || catSelect;   // custom wins over dropdown
  const description = document.getElementById('schemeDesc').value.trim();
  const link        = document.getElementById('schemeLink').value.trim() || null;

  if (!name) {
    showError(errEl, 'Scheme name is required.'); return;
  }
  if (!category) {
    showError(errEl, 'Please select or type a category.'); return;
  }
  if (!description) {
    showError(errEl, 'Description is required.'); return;
  }
  if (link && !isValidUrl(link)) {
    showError(errEl, 'Please enter a valid URL (must start with http:// or https://).'); return;
  }

  btn.disabled   = true;
  btnText.hidden = true;
  spinner.hidden = false;

  try {
    const res  = await fetch(`${API}/admin/schemes`, {
      method:  'POST',
      headers: saHeaders(),
      body:    JSON.stringify({ name, category, description, link }),
    });
    const data = await res.json();

    if (res.status === 401) { handleUnauth(); return; }
    if (!data.success) throw new Error(data.error || 'Failed to add scheme');

    sucEl.textContent = `✓ "${name}" added successfully.`;
    sucEl.hidden = false;

    // Reset form
    document.getElementById('schemeForm').reset();

    await loadSchemes();
    setTimeout(() => { sucEl.hidden = true; }, 3500);
  } catch (err) {
    showError(errEl, err.message);
  } finally {
    btn.disabled   = false;
    btnText.hidden = false;
    spinner.hidden = true;
  }
}

// ── Delete modal ─────────────────────────────────────────────────────────────

function openDeleteModal(id, name) {
  pendingDeleteId = id;
  document.getElementById('deleteSchemeName').textContent = name;
  document.getElementById('deleteModal').classList.add('is-open');
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.remove('is-open');
}

async function doDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();

  try {
    const res = await fetch(`${API}/admin/schemes/${id}`, {
      method:  'DELETE',
      headers: saHeaders(),
    });
    if (res.status === 401) { handleUnauth(); return; }
    await loadSchemes();
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function handleUnauth() {
  sessionStorage.removeItem('sa_schemes_token');
  window.location.href = 'index.html';
}

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidUrl(str) {
  try { return ['http:', 'https:'].includes(new URL(str).protocol); }
  catch { return false; }
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
