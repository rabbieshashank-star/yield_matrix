/**
 * superadmin.js — Yield Matrix Super Admin Portal
 * Handles: login, district CRUD (add / reset password / delete)
 */

const API = 'https://rabbieshashank.pythonanywhere.com';

function saToken()  { return sessionStorage.getItem('sa_token'); }

function saHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${saToken()}`,
  };
}

function fmtDate(raw) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return raw; }
}

function isSALoginPage() {
  return document.getElementById('saLoginForm') !== null;
}

// ── Router guard ─────────────────────────────────────────────

function saRouteGuard() {
  const onLogin = isSALoginPage();
  const hasToken = !!saToken();
  if (onLogin && hasToken) window.location.href = 'superadmin.html';
  if (!onLogin && !hasToken) window.location.href = 'superadmin-login.html';
}

// ── LOGIN ─────────────────────────────────────────────────────

function initSALogin() {
  // Toggle password visibility
  document.getElementById('toggleSaPwd').addEventListener('click', () => {
    const inp = document.getElementById('saPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('saLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl  = document.getElementById('saError');
    const btn      = document.getElementById('saLoginBtn');
    const btnText  = document.getElementById('saLoginText');
    const spinner  = document.getElementById('saSpinner');

    const username = document.getElementById('saUsername').value.trim();
    const password = document.getElementById('saPassword').value.trim();

    errorEl.hidden = true;
    btn.disabled   = true;
    btnText.hidden = true;
    spinner.hidden = false;

    try {
      const res  = await fetch(`${API}/admin/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('sa_token', data.token);
      window.location.href = 'superadmin.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled   = false;
      btnText.hidden = false;
      spinner.hidden = true;
    }
  });
}

// ── DASHBOARD ─────────────────────────────────────────────────

let pendingDeleteDistrict = null;

function initSADashboard() {
  document.getElementById('saLogoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('sa_token');
    window.location.href = 'superadmin-login.html';
  });

  loadDistricts();

  document.getElementById('refreshDistricts').addEventListener('click', loadDistricts);

  document.getElementById('addDistrictForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl   = document.getElementById('addError');
    const sucEl   = document.getElementById('addSuccess');
    const btn     = document.getElementById('addBtn');
    const btnText = document.getElementById('addBtnText');
    const spinner = document.getElementById('addSpinner');

    errEl.hidden = true;
    sucEl.hidden = true;

    const name     = document.getElementById('distName').value.trim();
    const password = document.getElementById('distPassword').value.trim();

    if (!name || !password) {
      errEl.textContent = 'Both name and password are required.';
      errEl.hidden = false;
      return;
    }

    btn.disabled   = true;
    btnText.hidden = true;
    spinner.hidden = false;

    try {
      const res  = await fetch(`${API}/admin/superadmin/districts`, {
        method:  'POST',
        headers: saHeaders(),
        body:    JSON.stringify({ name, password }),
      });
      if (res.status === 401) { handleSAUnauth(); return; }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      sucEl.textContent = `✓ District "${name}" added successfully.`;
      sucEl.hidden = false;
      document.getElementById('distName').value     = '';
      document.getElementById('distPassword').value = '';
      await loadDistricts();
      setTimeout(() => { sucEl.hidden = true; }, 3500);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled   = false;
      btnText.hidden = false;
      spinner.hidden = true;
    }
  });

  // Delete modal
  document.getElementById('cancelDelDist').addEventListener('click',  closeDelDistModal);
  document.getElementById('confirmDelDist').addEventListener('click', doDeleteDistrict);
  document.getElementById('delDistModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDelDistModal();
  });
}

async function loadDistricts() {
  const loadEl  = document.getElementById('distLoading');
  const emptyEl = document.getElementById('distEmpty');
  const listEl  = document.getElementById('distList');

  loadEl.hidden  = false;
  emptyEl.hidden = true;
  listEl.hidden  = true;

  try {
    const res  = await fetch(`${API}/admin/superadmin/districts`, { headers: saHeaders() });
    if (res.status === 401) { handleSAUnauth(); return; }
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const districts = data.districts || [];
    document.getElementById('statDistrictCount').textContent  = districts.length;
    document.getElementById('districtCountBadge').textContent = districts.length;

    if (districts.length === 0) {
      loadEl.hidden  = true;
      emptyEl.hidden = false;
      return;
    }

    listEl.innerHTML = districts.map(d => `
      <div class="district-row" id="drow-${CSS.escape(d.name)}">
        <div class="district-name">${d.name}</div>
        <div class="district-date">Added: ${fmtDate(d.created_at)}</div>
        <button class="btn-reset-pwd" onclick="toggleResetForm('${d.name}')">Reset Password</button>
        <button class="btn-del-district" onclick="openDelDistModal('${d.name}')">Remove</button>
      </div>
      <div class="reset-form" id="resetForm-${CSS.escape(d.name)}">
        <input type="text" class="field-input" id="resetPwd-${CSS.escape(d.name)}" placeholder="New password…" style="flex:1;padding:8px 12px;font-size:0.875rem;" />
        <button class="btn-primary" style="width:auto;padding:8px 14px;font-size:0.85rem;" onclick="submitReset('${d.name}')">Save</button>
        <button class="btn-ghost btn-sm" onclick="toggleResetForm('${d.name}')">Cancel</button>
      </div>
    `).join('');

    loadEl.hidden = true;
    listEl.hidden = false;

  } catch (err) {
    loadEl.hidden  = true;
    emptyEl.hidden = false;
    emptyEl.querySelector('p').textContent = err.message;
  }
}

function toggleResetForm(name) {
  const form = document.getElementById(`resetForm-${CSS.escape(name)}`);
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    form.querySelector('input').focus();
  }
}

async function submitReset(name) {
  const inp = document.getElementById(`resetPwd-${CSS.escape(name)}`);
  const pwd = inp.value.trim();
  if (!pwd) { inp.focus(); return; }

  try {
    const res  = await fetch(`${API}/admin/superadmin/districts/${encodeURIComponent(name)}`, {
      method:  'PATCH',
      headers: saHeaders(),
      body:    JSON.stringify({ password: pwd }),
    });
    if (res.status === 401) { handleSAUnauth(); return; }
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    toggleResetForm(name);
    inp.value = '';
    alert(`✓ Password updated for "${name}"`);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function openDelDistModal(name) {
  pendingDeleteDistrict = name;
  document.getElementById('delDistName').textContent = name;
  document.getElementById('delDistModal').classList.add('is-open');
}
function closeDelDistModal() {
  pendingDeleteDistrict = null;
  document.getElementById('delDistModal').classList.remove('is-open');
}

async function doDeleteDistrict() {
  if (!pendingDeleteDistrict) return;
  const name = pendingDeleteDistrict;
  closeDelDistModal();

  try {
    const res = await fetch(`${API}/admin/superadmin/districts/${encodeURIComponent(name)}`, {
      method:  'DELETE',
      headers: saHeaders(),
    });
    if (res.status === 401) { handleSAUnauth(); return; }
    await loadDistricts();
  } catch (err) {
    console.error('Delete district failed:', err);
  }
}

function handleSAUnauth() {
  sessionStorage.removeItem('sa_token');
  window.location.href = 'superadmin-login.html';
}

// ── Entry point ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  saRouteGuard();
  if (isSALoginPage()) {
    initSALogin();
  } else {
    initSADashboard();
  }
});
