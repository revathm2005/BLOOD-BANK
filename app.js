// ========================================================
// LifePulse Blood Bank Management System (Project 14)
// Frontend Application Logic
// ========================================================

const API_BASE = '/api';

// State Store
const state = {
  currentTab: 'dashboard',
  donors: [],
  stock: [],
  requests: [],
  requestFilter: 'ALL',
  dashboardStats: null
};

// --------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setDefaultRequestDate();
  loadDashboard();
  loadSqlSchema();
});

function setDefaultRequestDate() {
  const reqDateInput = document.getElementById('reqDate');
  if (reqDateInput) {
    reqDateInput.value = new Date().toISOString().split('T')[0];
  }
}

// --------------------------------------------------------
// TAB NAVIGATION
// --------------------------------------------------------
function setupNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;

  // Update nav buttons
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
      btn.classList.remove('text-slate-600');
    } else {
      btn.classList.remove('active');
      btn.classList.add('text-slate-600');
    }
  });

  // Update tab content sections
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === `tab-${tabName}`) {
      section.classList.remove('hidden');
      section.classList.add('active');
    } else {
      section.classList.add('hidden');
      section.classList.remove('active');
    }
  });

  // Fetch fresh data for the active tab
  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'donors') loadDonors();
  if (tabName === 'stock') loadStockTable();
  if (tabName === 'requests') loadRequests();
  if (tabName === 'schema') loadSqlSchema();
}

// --------------------------------------------------------
// DASHBOARD LOGIC
// --------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const stats = json.data;
    state.dashboardStats = stats;

    // Update KPI metrics
    document.getElementById('metric-donors').textContent = stats.totalDonors;
    document.getElementById('metric-units').textContent = stats.totalUnits;
    document.getElementById('metric-pending').textContent = stats.pendingRequests;
    document.getElementById('metric-fulfilled').textContent = stats.fulfilledRequests;

    // Render Blood Stock Cards
    renderStockCards(stats.stockList);

    // Render Recent Requests
    renderRecentRequests(stats.recentRequests);

    // Render Recent Donors
    renderRecentDonors(stats.recentDonors);
  } catch (err) {
    showToast('Failed to load dashboard data: ' + err.message, 'error');
  }
}

function renderStockCards(stockList) {
  const container = document.getElementById('stockCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  stockList.forEach(item => {
    const units = item.units_available;
    let statusClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let statusLabel = 'Adequate';
    let meterColor = 'bg-emerald-500';

    if (units < 5) {
      statusClass = 'text-red-700 bg-red-50 border-red-200';
      statusLabel = 'Critical';
      meterColor = 'bg-red-500';
    } else if (units < 10) {
      statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
      statusLabel = 'Low Stock';
      meterColor = 'bg-amber-500';
    }

    const pct = Math.min(100, Math.round((units / 30) * 100));

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl p-3.5 border border-slate-200 hover:border-red-300 shadow-xs hover:shadow transition flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between">
          <span class="text-lg font-extrabold text-red-600 font-outfit tracking-tight">${item.blood_group}</span>
          <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${statusClass}">${statusLabel}</span>
        </div>
        <div class="mt-3">
          <span class="text-2xl font-black text-slate-900 font-outfit">${units}</span>
          <span class="text-xs text-slate-400 font-medium">units</span>
        </div>
        <div class="stock-meter-bg mt-2">
          <div class="stock-meter-fill ${meterColor}" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Updated:</span>
        <span class="font-medium text-slate-600">${item.last_updated}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderRecentRequests(requests) {
  const tbody = document.getElementById('recentRequestsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!requests || requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400 text-xs">No blood requests yet.</td></tr>`;
    return;
  }

  requests.forEach(req => {
    let statusBadge = getStatusBadge(req.status);
    let actionBtn = '';

    if (req.status === 'Pending') {
      actionBtn = `<button onclick="fulfillBloodRequest(${req.request_id})" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-xs">Fulfill</button>`;
    } else if (req.status === 'Approved') {
      actionBtn = `<button onclick="fulfillBloodRequest(${req.request_id})" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs">Issue</button>`;
    } else {
      actionBtn = `<span class="text-slate-400 text-[11px]">Done</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2.5 font-semibold text-slate-800">${escapeHtml(req.hospital_name)}</td>
      <td class="py-2.5"><span class="font-extrabold text-red-600 font-outfit text-xs">${req.blood_group}</span></td>
      <td class="py-2.5 font-bold text-slate-700">${req.units_required}</td>
      <td class="py-2.5">${statusBadge}</td>
      <td class="py-2.5 text-right">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRecentDonors(donors) {
  const tbody = document.getElementById('recentDonorsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!donors || donors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400 text-xs">No registered donors yet.</td></tr>`;
    return;
  }

  donors.forEach(d => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2.5 font-semibold text-slate-800">${escapeHtml(d.name)}</td>
      <td class="py-2.5 text-slate-600">${d.age} / ${d.gender}</td>
      <td class="py-2.5"><span class="font-extrabold text-red-600 font-outfit text-xs">${d.blood_group}</span></td>
      <td class="py-2.5 text-slate-600 font-mono text-[11px]">${escapeHtml(d.phone)}</td>
      <td class="py-2.5 text-right">
        <button onclick="promptDonation(${d.donor_id}, '${escapeHtml(d.name)}', '${d.blood_group}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold border border-rose-200">
          <i class="fa-solid fa-droplet text-red-600 mr-0.5"></i> Donate
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --------------------------------------------------------
// DONORS MANAGEMENT
// --------------------------------------------------------
async function loadDonors() {
  try {
    const res = await fetch(`${API_BASE}/donors`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    state.donors = json.data;
    renderDonorsTable(state.donors);
  } catch (err) {
    showToast('Failed to load donors: ' + err.message, 'error');
  }
}

function filterDonors() {
  const search = document.getElementById('donorSearchInput').value.trim().toLowerCase();
  const group = document.getElementById('donorGroupFilter').value;

  const filtered = state.donors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search) || d.phone.toLowerCase().includes(search);
    const matchGroup = group === 'ALL' || d.blood_group === group;
    return matchSearch && matchGroup;
  });

  renderDonorsTable(filtered);
}

function resetDonorFilters() {
  document.getElementById('donorSearchInput').value = '';
  document.getElementById('donorGroupFilter').value = 'ALL';
  renderDonorsTable(state.donors);
}

function renderDonorsTable(donors) {
  const tbody = document.getElementById('donorsTableBody');
  const emptyState = document.getElementById('donorsEmptyState');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!donors || donors.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  donors.forEach(d => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-xs text-slate-500 font-semibold">#${d.donor_id}</td>
      <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(d.name)}</td>
      <td class="py-3 px-4 text-slate-600">${d.age} yrs</td>
      <td class="py-3 px-4 text-slate-600">${d.gender}</td>
      <td class="py-3 px-4">
        <span class="inline-block bg-red-100 text-red-700 font-black px-2.5 py-0.5 rounded-full text-xs font-outfit">
          ${d.blood_group}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-xs text-slate-700">${escapeHtml(d.phone)}</td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="promptDonation(${d.donor_id}, '${escapeHtml(d.name)}', '${d.blood_group}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition flex items-center gap-1" title="Record Donation">
            <i class="fa-solid fa-droplet text-red-600"></i> Donate
          </button>
          <button onclick="openEditDonor(${d.donor_id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Donor">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteDonor(${d.donor_id})" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete Donor">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleDonorSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('donorId').value;
  const name = document.getElementById('donorName').value.trim();
  const age = document.getElementById('donorAge').value;
  const gender = document.getElementById('donorGender').value;
  const blood_group = document.getElementById('donorBloodGroup').value;
  const phone = document.getElementById('donorPhone').value.trim();

  try {
    const isEdit = !!id;
    const url = isEdit ? `${API_BASE}/donors/${id}` : `${API_BASE}/donors`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, gender, blood_group, phone })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message || 'Donor saved successfully!', 'success');
    closeModal('newDonorModal');
    loadDonors();
    loadDashboard();
  } catch (err) {
    showToast('Failed to save donor: ' + err.message, 'error');
  }
}

function openEditDonor(id) {
  const donor = state.donors.find(d => d.donor_id === id);
  if (!donor) return;

  document.getElementById('donorModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Donor Details';
  document.getElementById('donorId').value = donor.donor_id;
  document.getElementById('donorName').value = donor.name;
  document.getElementById('donorAge').value = donor.age;
  document.getElementById('donorGender').value = donor.gender;
  document.getElementById('donorBloodGroup').value = donor.blood_group;
  document.getElementById('donorPhone').value = donor.phone;

  openModal('newDonorModal');
}

async function deleteDonor(id) {
  if (!confirm(`Are you sure you want to remove donor #${id}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/donors/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    loadDonors();
    loadDashboard();
  } catch (err) {
    showToast('Failed to delete donor: ' + err.message, 'error');
  }
}

// --------------------------------------------------------
// DONATION TRANSACTION WORKFLOW
// --------------------------------------------------------
function promptDonation(donorId, donorName, bloodGroup) {
  document.getElementById('donationDonorId').value = donorId;
  document.getElementById('donationDonorName').textContent = donorName;
  document.getElementById('donationBloodGroup').textContent = bloodGroup;
  document.getElementById('donationUnits').value = 1;
  openModal('recordDonationModal');
}

async function handleDonationSubmit(e) {
  e.preventDefault();
  const donorId = document.getElementById('donationDonorId').value;
  const units = document.getElementById('donationUnits').value;

  try {
    const res = await fetch(`${API_BASE}/donors/${donorId}/donate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    closeModal('recordDonationModal');
    loadDashboard();
    if (state.currentTab === 'stock') loadStockTable();
  } catch (err) {
    showToast('Failed to record donation: ' + err.message, 'error');
  }
}

// --------------------------------------------------------
// BLOOD STOCK INVENTORY
// --------------------------------------------------------
async function loadStockTable() {
  try {
    const res = await fetch(`${API_BASE}/stock`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    state.stock = json.data;
    renderStockTable(state.stock);
  } catch (err) {
    showToast('Failed to load blood stock: ' + err.message, 'error');
  }
}

function renderStockTable(stockList) {
  const tbody = document.getElementById('stockTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  stockList.forEach(item => {
    const units = item.units_available;
    let statusClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let statusLabel = 'Adequate Stock';

    if (units < 5) {
      statusClass = 'text-red-700 bg-red-50 border-red-200';
      statusLabel = 'Critical Shortage';
    } else if (units < 10) {
      statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
      statusLabel = 'Low Inventory';
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-xs text-slate-500 font-semibold">#${item.stock_id}</td>
      <td class="py-3 px-4 font-extrabold text-red-600 font-outfit text-base">${item.blood_group}</td>
      <td class="py-3 px-4 font-black text-slate-900 text-lg font-outfit">${units} <span class="text-xs font-normal text-slate-400">units</span></td>
      <td class="py-3 px-4">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusClass}">
          ${statusLabel}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-xs text-slate-600">${item.last_updated}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="promptStockAdjust('${item.blood_group}', ${units})" class="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 mx-auto">
          <i class="fa-solid fa-sliders"></i> Adjust Units
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function promptStockAdjust(bloodGroup, currentUnits) {
  document.getElementById('adjustBloodGroup').value = bloodGroup;
  document.getElementById('adjustGroupDisplay').textContent = bloodGroup;
  document.getElementById('adjustCurrentUnits').textContent = currentUnits;
  document.getElementById('adjustNewUnits').value = currentUnits;
  openModal('adjustStockModal');
}

async function handleStockAdjustSubmit(e) {
  e.preventDefault();
  const bloodGroup = document.getElementById('adjustBloodGroup').value;
  const newUnits = document.getElementById('adjustNewUnits').value;

  try {
    const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(bloodGroup)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units: newUnits, isAbsolute: true })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    closeModal('adjustStockModal');
    loadStockTable();
    loadDashboard();
  } catch (err) {
    showToast('Failed to update stock: ' + err.message, 'error');
  }
}

// --------------------------------------------------------
// HOSPITAL REQUESTS MANAGEMENT
// --------------------------------------------------------
async function loadRequests() {
  try {
    const url = state.requestFilter === 'ALL' ? `${API_BASE}/requests` : `${API_BASE}/requests?status=${state.requestFilter}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    state.requests = json.data;
    renderRequestsTable(state.requests);
  } catch (err) {
    showToast('Failed to load blood requests: ' + err.message, 'error');
  }
}

function filterRequests(status) {
  state.requestFilter = status;
  document.querySelectorAll('.req-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  loadRequests();
}

function renderRequestsTable(requests) {
  const tbody = document.getElementById('requestsTableBody');
  const emptyState = document.getElementById('requestsEmptyState');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!requests || requests.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  requests.forEach(req => {
    const statusBadge = getStatusBadge(req.status);
    let actionsHtml = '';

    if (req.status === 'Pending') {
      actionsHtml = `
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="updateRequestStatus(${req.request_id}, 'Approved')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition" title="Approve Request">
            <i class="fa-solid fa-check mr-1"></i> Approve
          </button>
          <button onclick="fulfillBloodRequest(${req.request_id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition" title="Fulfill and Deduct Stock">
            <i class="fa-solid fa-truck-fast mr-1"></i> Fulfill
          </button>
          <button onclick="updateRequestStatus(${req.request_id}, 'Rejected')" class="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs rounded-lg transition" title="Reject Request">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <button onclick="deleteRequest(${req.request_id})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    } else if (req.status === 'Approved') {
      actionsHtml = `
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="fulfillBloodRequest(${req.request_id})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition" title="Fulfill and Issue Stock">
            <i class="fa-solid fa-truck-fast mr-1"></i> Fulfill & Issue
          </button>
          <button onclick="updateRequestStatus(${req.request_id}, 'Rejected')" class="px-2 py-1 text-slate-400 hover:text-rose-600 text-xs rounded-lg transition">
            Reject
          </button>
          <button onclick="deleteRequest(${req.request_id})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    } else {
      actionsHtml = `
        <div class="flex items-center justify-center gap-2">
          <span class="text-xs font-semibold text-slate-400 italic">No further actions</span>
          <button onclick="deleteRequest(${req.request_id})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-xs text-slate-500 font-semibold">#${req.request_id}</td>
      <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(req.hospital_name)}</td>
      <td class="py-3 px-4 font-extrabold text-red-600 font-outfit text-sm">${req.blood_group}</td>
      <td class="py-3 px-4 font-black text-slate-800">${req.units_required} <span class="text-xs font-normal text-slate-400">units</span></td>
      <td class="py-3 px-4 font-mono text-xs text-slate-600">${req.request_date}</td>
      <td class="py-3 px-4">${statusBadge}</td>
      <td class="py-3 px-4 text-center">${actionsHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const hospital_name = document.getElementById('reqHospitalName').value.trim();
  const blood_group = document.getElementById('reqBloodGroup').value;
  const units_required = document.getElementById('reqUnits').value;
  const request_date = document.getElementById('reqDate').value;

  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospital_name, blood_group, units_required, request_date })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message || 'Hospital request submitted!', 'success');
    closeModal('newRequestModal');
    loadRequests();
    loadDashboard();
  } catch (err) {
    showToast('Failed to submit request: ' + err.message, 'error');
  }
}

async function updateRequestStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    loadRequests();
    loadDashboard();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

async function fulfillBloodRequest(id) {
  if (!confirm(`Confirm blood issue transaction for Request #${id}? This will automatically verify and deduct blood units from stock.`)) return;

  try {
    const res = await fetch(`${API_BASE}/requests/${id}/fulfill`, {
      method: 'POST'
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    loadRequests();
    loadDashboard();
    if (state.currentTab === 'stock') loadStockTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteRequest(id) {
  if (!confirm(`Delete blood request #${id}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/requests/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    loadRequests();
    loadDashboard();
  } catch (err) {
    showToast('Failed to delete request: ' + err.message, 'error');
  }
}

// --------------------------------------------------------
// SQL SCHEMA VIEWER & UTILITIES
// --------------------------------------------------------
async function loadSqlSchema() {
  const viewer = document.getElementById('sqlViewer');
  if (!viewer) return;
  try {
    const res = await fetch(`${API_BASE}/schema`);
    const sql = await res.text();
    viewer.textContent = sql;
  } catch (err) {
    viewer.textContent = 'Error loading schema: ' + err.message;
  }
}

function copySchemaSql() {
  const viewer = document.getElementById('sqlViewer');
  if (!viewer) return;
  navigator.clipboard.writeText(viewer.textContent).then(() => {
    showToast('SQL Schema copied to clipboard!', 'info');
  }).catch(() => {
    showToast('Failed to copy text', 'error');
  });
}

async function resetDemoData() {
  if (!confirm('Are you sure you want to reset all tables to initial demo data?')) return;

  try {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message, 'success');
    loadDashboard();
    loadDonors();
    loadStockTable();
    loadRequests();
  } catch (err) {
    showToast('Failed to reset data: ' + err.message, 'error');
  }
}

// --------------------------------------------------------
// MODALS & TOAST NOTIFICATIONS
// --------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // If opening new donor modal afresh, clear fields
    if (modalId === 'newDonorModal' && !document.getElementById('donorId').value) {
      document.getElementById('donorModalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Register New Donor';
      document.getElementById('donorForm').reset();
      document.getElementById('donorId').value = '';
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    if (modalId === 'newDonorModal') {
      document.getElementById('donorForm').reset();
      document.getElementById('donorId').value = '';
    }
    if (modalId === 'newRequestModal') {
      document.getElementById('requestForm').reset();
      setDefaultRequestDate();
    }
  }
}

// Close modals when clicking backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.add('hidden');
  }
});

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  let bg = 'bg-slate-900 text-white';
  let icon = '<i class="fa-solid fa-circle-info text-blue-400"></i>';

  if (type === 'success') {
    bg = 'bg-slate-900 text-white border-l-4 border-emerald-500';
    icon = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
  } else if (type === 'error') {
    bg = 'bg-slate-900 text-white border-l-4 border-rose-500';
    icon = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i>';
  } else if (type === 'info') {
    bg = 'bg-slate-900 text-white border-l-4 border-blue-500';
    icon = '<i class="fa-solid fa-circle-info text-blue-400"></i>';
  }

  toast.className = `toast p-4 rounded-xl shadow-xl flex items-start gap-3 text-xs sm:text-sm font-medium ${bg}`;
  toast.innerHTML = `
    <span class="text-base mt-0.5">${icon}</span>
    <span class="flex-1 leading-snug">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --------------------------------------------------------
// HELPERS
// --------------------------------------------------------
function getStatusBadge(status) {
  switch (status) {
    case 'Pending':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><i class="fa-solid fa-clock text-[10px]"></i> Pending</span>`;
    case 'Approved':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><i class="fa-solid fa-circle-check text-[10px]"></i> Approved</span>`;
    case 'Fulfilled':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-check-double text-[10px]"></i> Fulfilled</span>`;
    case 'Rejected':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><i class="fa-solid fa-circle-xmark text-[10px]"></i> Rejected</span>`;
    default:
      return `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">${status}</span>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
