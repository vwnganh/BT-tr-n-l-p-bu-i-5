/**
 * ============================================================================
 * FRONTEND CONTROLLER - FINTRACK SMART WALLET
 * Kết nối trực tiếp Node.js REST API (/api/transactions) + Fallback LocalStorage
 * ============================================================================
 */

const API_URL = '/api';
let isServerOnline = true;

let state = {
    user: {
        fullName: "Vương Thị Anh",
        studentCode: "31241025843",
        monthlyBudgetLimit: 6500000
    },
    transactions: []
};

const CATEGORY_OPTIONS = {
    EXPENSE: [
        "Ăn uống & Cafe",
        "Nhà ở & Điện nước",
        "Di chuyển & Xăng xe",
        "Học tập & Sách vở",
        "Mua sắm & Giải trí",
        "Y tế & Sức khỏe"
    ],
    INCOME: [
        "Lương & Thưởng",
        "Kinh doanh & Bán hàng",
        "Học bổng & Trợ cấp",
        "Đầu tư & Tiết kiệm"
    ]
};

let barChart = null;
let pieChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        const response = await fetch(`${API_URL}/transactions`);
        if (!response.ok) throw new Error('Server offline');
        const result = await response.json();
        state = result.data;
        isServerOnline = true;
        setConnectionBadge(true);
    } catch (err) {
        isServerOnline = false;
        setConnectionBadge(false);
        const cached = localStorage.getItem('fintrack_offline_store');
        if (cached) {
            state = JSON.parse(cached);
        } else {
            state.transactions = getStarterData();
            persistOffline();
        }
    }
    renderUI();
}

function setConnectionBadge(online) {
    const el = document.getElementById('connectionBadge');
    if (online) {
        el.innerHTML = '<span class="dot"></span> Node.js API & DB Connected';
        el.style.background = '#ecfdf5';
        el.style.color = '#065f46';
    } else {
        el.innerHTML = '<span class="dot" style="background:#f59e0b"></span> Offline LocalStorage Mode';
        el.style.background = '#fffbeb';
        el.style.color = '#92400e';
    }
}

function persistOffline() {
    localStorage.setItem('fintrack_offline_store', JSON.stringify(state));
}

function switchView(viewName, btn) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    if (btn) btn.classList.add('active');

    const titles = {
        dashboard: 'Tổng Quan Tài Chính & Thống Kê',
        ledger: 'Sổ Cái Quản Lý Thu / Chi',
        'system-docs': 'Kiến Trúc Cơ Sở Dữ Liệu & API'
    };
    document.getElementById('viewHeading').textContent = titles[viewName];
}

function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function renderStatusBadge(status) {
    const labels = {
        COMPLETED: '<i class="fa-solid fa-circle-check"></i> Hoàn thành',
        PENDING: '<i class="fa-solid fa-clock"></i> Chờ xử lý',
        CANCELLED: '<i class="fa-solid fa-ban"></i> Đã hủy'
    };
    return labels[status] || status;
}

function renderUI() {
    updateStatsAndBudget();
    updateTables();
    updateCharts();
}

function updateStatsAndBudget() {
    const list = state.transactions;

    const doneIncome = list.filter(t => t.type === 'INCOME' && t.status === 'COMPLETED').reduce((a, b) => a + Number(b.amount), 0);
    const waitIncome = list.filter(t => t.type === 'INCOME' && t.status === 'PENDING').reduce((a, b) => a + Number(b.amount), 0);
    const doneExpense = list.filter(t => t.type === 'EXPENSE' && t.status === 'COMPLETED').reduce((a, b) => a + Number(b.amount), 0);
    const waitExpense = list.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((a, b) => a + Number(b.amount), 0);

    const balance = doneIncome - doneExpense;
    const doneCount = list.filter(t => t.status === 'COMPLETED').length;
    const waitCount = list.filter(t => t.status === 'PENDING').length;

    document.getElementById('statBalance').textContent = formatCurrency(balance);
    document.getElementById('statIncome').textContent = formatCurrency(doneIncome);
    document.getElementById('statPendingIncome').textContent = `Chờ nhận: ${formatCurrency(waitIncome)}`;
    document.getElementById('statExpense').textContent = formatCurrency(doneExpense);
    document.getElementById('statPendingExpense').textContent = `Chờ thanh toán: ${formatCurrency(waitExpense)}`;
    document.getElementById('statCount').textContent = `${list.length} giao dịch`;
    document.getElementById('statStatusDetail').textContent = `${doneCount} Hoàn thành • ${waitCount} Chờ xử lý`;

    const limit = Number(state.user.monthlyBudgetLimit) || 6500000;
    const ratio = Math.min(Math.round((doneExpense / limit) * 100), 100);
    document.getElementById('budgetLimitDisplay').textContent = formatCurrency(limit);
    const fill = document.getElementById('budgetProgressBar');
    fill.style.width = `${ratio}%`;
    fill.style.backgroundColor = ratio > 85 ? '#ef4444' : ratio > 65 ? '#f59e0b' : '#14b8a6';
    document.getElementById('budgetPercentLabel').textContent = `Đã chi ${ratio}% (${formatCurrency(doneExpense)})`;
}

function updateTables() {
    const list = state.transactions;

    // 1. Recent Table (Top 5)
    document.getElementById('recentTxTable').innerHTML = list.slice(0, 5).map(item => `
        <tr>
            <td><span class="code-id">${item.id}</span></td>
            <td>
                <strong>${safeText(item.title)}</strong>
                ${item.note ? `<div style="font-size:0.76rem;color:#64748b">${safeText(item.note)}</div>` : ''}
            </td>
            <td><span class="cat-tag">${safeText(item.category)}</span></td>
            <td>${formatDate(item.date)}</td>
            <td class="${item.type === 'INCOME' ? 'text-green' : 'text-red'}" style="font-weight:700">
                ${item.type === 'INCOME' ? '+' : '-'}${formatCurrency(item.amount)}
            </td>
            <td>
                <button class="status-pill st-${item.status}" onclick="toggleTransactionStatus('${item.id}')" title="Bấm để đổi trạng thái">
                    ${renderStatusBadge(item.status)}
                </button>
            </td>
            <td>
                <div class="row-actions">
                    <button class="act-btn edit" onclick="openTxModal('${item.id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="act-btn del" onclick="removeTransaction('${item.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');

    // 2. Full Filtered Table
    const q = (document.getElementById('searchQuery')?.value || '').toLowerCase();
    const fType = document.getElementById('typeFilter')?.value || 'ALL';
    const fStatus = document.getElementById('statusFilter')?.value || 'ALL';
    const fCat = document.getElementById('categoryFilter')?.value || 'ALL';

    const filtered = list.filter(item => {
        const hitText = item.title.toLowerCase().includes(q) ||
                        item.id.toLowerCase().includes(q) ||
                        (item.note && item.note.toLowerCase().includes(q));
        const hitType = fType === 'ALL' || item.type === fType;
        const hitStatus = fStatus === 'ALL' || item.status === fStatus;
        const hitCat = fCat === 'ALL' || item.category === fCat;
        return hitText && hitType && hitStatus && hitCat;
    });

    document.getElementById('filteredTotal').textContent = filtered.length;
    const sumInc = filtered.filter(t => t.type === 'INCOME' && t.status !== 'CANCELLED').reduce((s, t) => s + Number(t.amount), 0);
    const sumExp = filtered.filter(t => t.type === 'EXPENSE' && t.status !== 'CANCELLED').reduce((s, t) => s + Number(t.amount), 0);
    document.getElementById('filteredIncSum').textContent = formatCurrency(sumInc);
    document.getElementById('filteredExpSum').textContent = formatCurrency(sumExp);

    const tbody = document.getElementById('fullTxTable');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:#64748b">Không có giao dịch nào khớp với điều kiện lọc.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td><span class="code-id">${item.id}</span></td>
            <td>
                <strong>${safeText(item.title)}</strong>
                ${item.note ? `<div style="font-size:0.76rem;color:#64748b">${safeText(item.note)}</div>` : ''}
            </td>
            <td><span class="cat-tag">${safeText(item.category)}</span></td>
            <td>${item.type === 'INCOME' ? '<span class="text-green" style="font-weight:700">Khoản Thu</span>' : '<span class="text-red" style="font-weight:700">Khoản Chi</span>'}</td>
            <td>${safeText(item.paymentMethod || 'Chuyển khoản')}</td>
            <td>${formatDate(item.date)}</td>
            <td class="${item.type === 'INCOME' ? 'text-green' : 'text-red'}" style="font-weight:700">
                ${item.type === 'INCOME' ? '+' : '-'}${formatCurrency(item.amount)}
            </td>
            <td>
                <button class="status-pill st-${item.status}" onclick="toggleTransactionStatus('${item.id}')" title="Bấm để đổi trạng thái">
                    ${renderStatusBadge(item.status)}
                </button>
            </td>
            <td>
                <div class="row-actions">
                    <button class="act-btn edit" onclick="openTxModal('${item.id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="act-btn del" onclick="removeTransaction('${item.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateCharts() {
    const activeTxs = state.transactions.filter(t => t.status !== 'CANCELLED');
    const grouped = {};
    activeTxs.forEach(t => {
        if (!grouped[t.category]) grouped[t.category] = { inc: 0, exp: 0 };
        if (t.type === 'INCOME') grouped[t.category].inc += Number(t.amount);
        else grouped[t.category].exp += Number(t.amount);
    });

    const labels = Object.keys(grouped);
    const ctx1 = document.getElementById('categoryBarChart').getContext('2d');
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Khoản Thu', data: labels.map(k => grouped[k].inc), backgroundColor: '#10b981', borderRadius: 6 },
                { label: 'Khoản Chi', data: labels.map(k => grouped[k].exp), backgroundColor: '#ef4444', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => (v / 1000000) + ' Tr' } }
            }
        }
    });

    const expByCat = {};
    state.transactions.filter(t => t.type === 'EXPENSE' && t.status === 'COMPLETED').forEach(t => {
        expByCat[t.category] = (expByCat[t.category] || 0) + Number(t.amount);
    });

    const ctx2 = document.getElementById('expensePieChart').getContext('2d');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expByCat),
            datasets: [{
                data: Object.values(expByCat),
                backgroundColor: ['#0f766e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '64%',
            plugins: { legend: { position: 'right' } }
        }
    });
}

function syncCategoryDropdown(preselect = null) {
    const flow = document.querySelector('input[name="flowType"]:checked').value;
    const sel = document.getElementById('fieldCategory');
    sel.innerHTML = CATEGORY_OPTIONS[flow].map(c => `<option value="${c}">${c}</option>`).join('');
    if (preselect && CATEGORY_OPTIONS[flow].includes(preselect)) {
        sel.value = preselect;
    }
}

function openTxModal(editId = null) {
    const modal = document.getElementById('txModal');
    const heading = document.getElementById('txModalTitle');
    document.getElementById('txForm').reset();

    if (editId) {
        const tx = state.transactions.find(t => t.id === editId);
        if (!tx) return;
        heading.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Chỉnh Sửa Giao Dịch (${tx.id})`;
        document.getElementById('editTxId').value = tx.id;
        document.querySelector(`input[name="flowType"][value="${tx.type}"]`).checked = true;
        syncCategoryDropdown(tx.category);
        document.getElementById('fieldTitle').value = tx.title;
        document.getElementById('fieldAmount').value = tx.amount;
        document.getElementById('fieldDate').value = tx.date;
        document.getElementById('fieldStatus').value = tx.status;
        document.getElementById('fieldMethod').value = tx.paymentMethod || 'Chuyển khoản';
        document.getElementById('fieldNote').value = tx.note || '';
    } else {
        heading.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Thêm Giao Dịch Mới`;
        document.getElementById('editTxId').value = '';
        document.querySelector('input[name="flowType"][value="EXPENSE"]').checked = true;
        syncCategoryDropdown();
        document.getElementById('fieldDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('fieldStatus').value = 'COMPLETED';
    }
    modal.classList.add('open');
}

function closeTxModal() {
    document.getElementById('txModal').classList.remove('open');
}

async function submitTransactionForm(e) {
    e.preventDefault();
    const editId = document.getElementById('editTxId').value;
    const payload = {
        type: document.querySelector('input[name="flowType"]:checked').value,
        title: document.getElementById('fieldTitle').value.trim(),
        amount: Number(document.getElementById('fieldAmount').value),
        date: document.getElementById('fieldDate').value,
        category: document.getElementById('fieldCategory').value,
        status: document.getElementById('fieldStatus').value,
        paymentMethod: document.getElementById('fieldMethod').value,
        note: document.getElementById('fieldNote').value.trim()
    };

    if (editId) {
        if (isServerOnline) {
            const res = await fetch(`${API_URL}/transactions/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                const i = state.transactions.findIndex(t => t.id === editId);
                state.transactions[i] = json.data;
            }
        } else {
            const i = state.transactions.findIndex(t => t.id === editId);
            state.transactions[i] = { ...state.transactions[i], ...payload };
            persistOffline();
        }
        notify('Đã cập nhật thông tin giao dịch!');
    } else {
        if (isServerOnline) {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                state.transactions.unshift(json.data);
            }
        } else {
            state.transactions.unshift({ id: 'GD-' + Math.floor(100000 + Math.random() * 900000), ...payload });
            persistOffline();
        }
        notify('Đã thêm giao dịch mới vào sổ cái!');
    }

    closeTxModal();
    renderUI();
}

async function toggleTransactionStatus(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    const cycle = ['COMPLETED', 'PENDING', 'CANCELLED'];
    const next = cycle[(cycle.indexOf(tx.status) + 1) % cycle.length];

    if (isServerOnline) {
        await fetch(`${API_URL}/transactions/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next })
        });
    }
    tx.status = next;
    if (!isServerOnline) persistOffline();
    renderUI();
    notify(`Đã đổi trạng thái ${id} sang ${next === 'COMPLETED' ? 'Hoàn thành' : next === 'PENDING' ? 'Chờ xử lý' : 'Đã hủy'}`);
}

async function removeTransaction(id) {
    if (!confirm(`Xác nhận xóa giao dịch ${id}?`)) return;
    if (isServerOnline) {
        await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    }
    state.transactions = state.transactions.filter(t => t.id !== id);
    if (!isServerOnline) persistOffline();
    renderUI();
    notify(`Đã xóa giao dịch ${id}`);
}

function openBudgetModal() {
    document.getElementById('budgetAmountInput').value = state.user.monthlyBudgetLimit;
    document.getElementById('budgetModal').classList.add('open');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('open');
}

async function submitBudgetForm(e) {
    e.preventDefault();
    const val = Number(document.getElementById('budgetAmountInput').value);
    if (isServerOnline) {
        await fetch(`${API_URL}/budget`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthlyBudgetLimit: val })
        });
    }
    state.user.monthlyBudgetLimit = val;
    if (!isServerOnline) persistOffline();
    closeBudgetModal();
    renderUI();
    notify('Đã cập nhật ngân sách chi tiêu tháng!');
}

function exportToCSV() {
    const cols = ['Ma_GD', 'Noi_Dung', 'Danh_Muc', 'Phan_Loai', 'Hinh_Thuc', 'So_Tien_VND', 'Trang_Thai', 'Ngay_GD', 'Ghi_Chu'];
    const rows = state.transactions.map(t => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        t.type,
        `"${t.paymentMethod || ''}"`,
        t.amount,
        t.status,
        t.date,
        `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    const csv = '\uFEFF' + [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `BaoCao_ThuChi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    notify('Đã xuất báo cáo CSV thành công!');
}

function notify(text) {
    const stack = document.getElementById('toastStack');
    const item = document.createElement('div');
    item.className = 'toast-msg';
    item.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#2dd4bf"></i> <span>${text}</span>`;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3000);
}

function safeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getStarterData() {
    return [
        { id: "GD-202601", title: "Trợ cấp sinh hoạt phí tháng 11", category: "Học bổng & Trợ cấp", type: "INCOME", amount: 3500000, status: "COMPLETED", date: "2026-11-01", paymentMethod: "Chuyển khoản", note: "Gia đình gửi đầu tháng" },
        { id: "GD-202602", title: "Doanh thu bán hàng online đợt 1", category: "Kinh doanh & Bán hàng", type: "INCOME", amount: 2950000, status: "COMPLETED", date: "2026-11-04", paymentMethod: "Chuyển khoản", note: "Đã đối soát đủ doanh thu" },
        { id: "GD-202603", title: "Thanh toán tiền thuê nhà & điện nước", category: "Nhà ở & Điện nước", type: "EXPENSE", amount: 2600000, status: "COMPLETED", date: "2026-11-05", paymentMethod: "Chuyển khoản", note: "Hóa đơn cố định hàng tháng" },
        { id: "GD-202604", title: "Ăn trưa & cafe thảo luận nhóm", category: "Ăn uống & Cafe", type: "EXPENSE", amount: 215000, status: "COMPLETED", date: "2026-11-09", paymentMethod: "Tiền mặt", note: "Chi tiêu ăn uống cuối tuần" },
        { id: "GD-202605", title: "Mua sách chuyên ngành & in tài liệu", category: "Học tập & Sách vở", type: "EXPENSE", amount: 165000, status: "COMPLETED", date: "2026-11-12", paymentMethod: "Ví điện tử", note: "Phục vụ học kỳ mới" },
        { id: "GD-202607", title: "Đặt vé xe khách cuối tuần", category: "Di chuyển & Xăng xe", type: "EXPENSE", amount: 320000, status: "PENDING", date: "2026-11-27", paymentMethod: "Ví điện tử", note: "Chờ xác nhận giữ chỗ" },
        { id: "GD-202608", title: "Thù lao dự án Freelance thiết kế", category: "Lương & Thưởng", type: "INCOME", amount: 1500000, status: "PENDING", date: "2026-11-29", paymentMethod: "Chuyển khoản", note: "Đang chờ khách hàng tất toán" }
    ];
}
