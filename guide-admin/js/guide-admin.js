// guide-admin.js

const API_BASE = 'https://rabbieshashank.pythonanywhere.com';

// --- Authentication ---
const tokenKey = "ym_superadmin_token";

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

function checkAuthAndRedirect() {
  const isLoginPage = window.location.pathname.includes("index.html") || window.location.pathname.endsWith("guide-admin/");
  const token = getToken();

  if (token && isLoginPage) {
    window.location.href = "dashboard.html";
  } else if (!token && !isLoginPage) {
    window.location.href = "index.html";
  }
}

// --- Login Page Logic ---
if (document.getElementById("loginForm")) {
  checkAuthAndRedirect();

  const togglePwd = document.getElementById("togglePwd");
  const pwdInput = document.getElementById("password");
  if (togglePwd && pwdInput) {
    togglePwd.addEventListener("click", () => {
      const type = pwdInput.getAttribute("type") === "password" ? "text" : "password";
      pwdInput.setAttribute("type", type);
    });
  }

  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnText = document.getElementById("loginBtnText");
    const spinner = document.getElementById("loginSpinner");
    const errorDiv = document.getElementById("loginError");

    const username = document.getElementById("username").value.trim();
    const password = pwdInput.value;

    errorDiv.hidden = true;
    btnText.style.opacity = "0";
    spinner.hidden = false;

    try {
      const res = await fetch(`${API_BASE}/admin/superadmin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        window.location.href = "dashboard.html";
      } else {
        throw new Error(data.error || "Invalid credentials");
      }
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.hidden = false;
    } finally {
      btnText.style.opacity = "1";
      spinner.hidden = true;
    }
  });
}

// --- Dashboard Logic ---
if (document.getElementById("guidesTable")) {
  checkAuthAndRedirect();

  // Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const guidesTbody = document.getElementById("guidesTbody");
  const loadingDiv = document.getElementById("tableLoading");
  const emptyDiv = document.getElementById("tableEmpty");
  const statusAlert = document.getElementById("statusAlert");
  
  const addModal = document.getElementById("addModal");
  const showAddFormBtn = document.getElementById("showAddFormBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const addForm = document.getElementById("addForm");
  
  const deleteModal = document.getElementById("deleteModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteCropName = document.getElementById("deleteCropName");
  
  const sectionsList = document.getElementById("sectionsList");
  const addSectionBtn = document.getElementById("addSectionBtn");

  let cropToDelete = null;

  // Logout
  logoutBtn.addEventListener("click", () => {
    clearToken();
    window.location.href = "index.html";
  });

  // Fetch and render
  async function loadGuides() {
    guidesTbody.innerHTML = "";
    loadingDiv.hidden = false;
    emptyDiv.hidden = true;

    try {
      const res = await fetch(`${API_BASE}/api/crop-guides`);
      const data = await res.json();
      
      loadingDiv.hidden = true;
      if (data.guides && data.guides.length > 0) {
        data.guides.forEach(guide => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="font-size:1.5rem;">${guide.emoji || ''}</td>
            <td style="font-weight:600;">${guide.crop_name}</td>
            <td style="color:var(--text-3);">${guide.crop_id}</td>
            <td style="font-size:0.8rem;color:var(--text-2);">${guide.created_at}</td>
            <td class="actions-col">
              <button class="btn-delete" onclick="openDeleteModal('${guide.crop_id}', '${guide.crop_name}')">Delete</button>
            </td>
          `;
          guidesTbody.appendChild(tr);
        });
      } else {
        emptyDiv.hidden = false;
      }
    } catch (err) {
      loadingDiv.hidden = true;
      showAlert("Failed to load guides: " + err.message, false);
    }
  }

  // Alerts
  function showAlert(msg, isSuccess=true) {
    statusAlert.textContent = msg;
    statusAlert.className = `alert ${isSuccess ? 'success' : ''}`;
    statusAlert.hidden = false;
    setTimeout(() => { statusAlert.hidden = true; }, 4000);
  }

  // Modal logic
  function openAddModal() {
    addForm.reset();
    sectionsList.innerHTML = "";
    appendSection(); // Add one empty section by default
    addModal.hidden = false;
  }
  
  function closeAddModal() {
    addModal.hidden = true;
  }

  showAddFormBtn.addEventListener("click", openAddModal);
  closeModalBtn.addEventListener("click", closeAddModal);
  cancelBtn.addEventListener("click", closeAddModal);

  // Dynamic Sections
  function appendSection() {
    const div = document.createElement("div");
    div.className = "section-item";
    div.innerHTML = `
      <button type="button" class="remove-section-btn" onclick="this.parentElement.remove()">&times;</button>
      <div class="field-group">
        <label class="field-label">Section Title</label>
        <input type="text" class="field-input section-title-input" placeholder="e.g. Planting Season" required />
      </div>
      <div class="field-group">
        <label class="field-label">Section Content</label>
        <textarea class="field-textarea section-content-input" placeholder="Enter guide content here..." required></textarea>
      </div>
    `;
    sectionsList.appendChild(div);
  }

  addSectionBtn.addEventListener("click", appendSection);

  // Add Crop
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtnText = document.getElementById("saveBtnText");
    const saveSpinner = document.getElementById("saveSpinner");

    const crop_id = document.getElementById("crop_id").value.trim().toLowerCase().replace(/\s+/g, '-');
    const crop_name = document.getElementById("crop_name").value.trim();
    const emoji = document.getElementById("emoji").value.trim();

    // Gather sections
    const sections = [];
    const sectionItems = document.querySelectorAll('.section-item');
    sectionItems.forEach(item => {
      const title = item.querySelector('.section-title-input').value.trim();
      const content = item.querySelector('.section-content-input').value.trim();
      if (title && content) {
        sections.push({ title, content });
      }
    });

    saveBtnText.style.opacity = "0";
    saveSpinner.hidden = false;

    try {
      const res = await fetch(`${API_BASE}/admin/crop-guides`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ crop_id, crop_name, emoji, sections })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message, true);
        closeAddModal();
        loadGuides();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      if (err.message.includes("401")) {
        clearToken(); window.location.href = "index.html";
      } else {
        showAlert(err.message, false);
      }
    } finally {
      saveBtnText.style.opacity = "1";
      saveSpinner.hidden = true;
    }
  });

  // Delete Crop
  window.openDeleteModal = function(id, name) {
    cropToDelete = id;
    deleteCropName.textContent = name;
    deleteModal.hidden = false;
  };

  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.hidden = true;
    cropToDelete = null;
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!cropToDelete) return;
    
    const delBtnText = document.getElementById("delBtnText");
    const delSpinner = document.getElementById("delSpinner");
    delBtnText.style.opacity = "0";
    delSpinner.hidden = false;

    try {
      const res = await fetch(`${API_BASE}/admin/crop-guides/${cropToDelete}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message, true);
        deleteModal.hidden = true;
        loadGuides();
      } else {
        throw new Error(data.error || "Failed to delete");
      }
    } catch (err) {
      if (err.message.includes("401")) {
        clearToken(); window.location.href = "index.html";
      } else {
        showAlert(err.message, false);
      }
    } finally {
      delBtnText.style.opacity = "1";
      delSpinner.hidden = true;
      cropToDelete = null;
    }
  });

  // Init
  loadGuides();
}
