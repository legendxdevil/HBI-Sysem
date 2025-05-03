// HBI Bank Management System - script.js

// ====== Data Storage & Initialization ======
const ACCOUNTS_KEY = 'hbi_accounts';
const LOANS_KEY = 'hbi_loans';
const HISTORY_KEY = 'hbi_history';
const GST_RATE = 0.18; // 18% GST

function getAccounts() {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
}
function setAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}
function getLoans() {
    return JSON.parse(localStorage.getItem(LOANS_KEY) || '[]');
}
function setLoans(loans) {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}
function getHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}
function setHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Demo data initialization
if (!localStorage.getItem(ACCOUNTS_KEY)) {
    setAccounts([
        { id: 1, name: 'Nand Kishore Soni', type: 'Savings', balance: 5000, contact: 'nandkishoresoni@email.com' },
        { id: 2, name: 'Harsh Soni', type: 'Current', balance: 12000, contact: 'harshsoni@email.com' }
    ]);
}
if (!localStorage.getItem(LOANS_KEY)) {
    setLoans([]);
}
if (!localStorage.getItem(HISTORY_KEY)) {
    setHistory([]);
}

// ====== DOM Elements ======
const accountsList = document.getElementById('accountsList');
const loansList = document.getElementById('loansList');
const adminDashboard = document.getElementById('adminDashboard');
const transactionHistory = document.getElementById('transactionHistory');
const transactionsContainer = document.getElementById('transactionsContainer');
const barGraph = document.getElementById('barGraph');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

// ====== Utility Functions ======
function closeModal() {
    if (modal) {
        modal.classList.add('hidden');
        if (modalContent) modalContent.innerHTML = '';
    }
}
function showModal(html) {
    if (modalContent && modal) {
        modalContent.innerHTML = html;
        modal.classList.remove('hidden');
    }
}
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// ====== Account Management ======
function renderAccounts() {
    if (!accountsList) return;
    const accounts = getAccounts();
    let rows = '';
    if (!accounts.length) {
        rows = '<tr><td colspan="5" style="text-align:center;">No accounts found.</td></tr>';
    } else {
        rows = accounts.map(acc => `<tr>
            <td>${acc.name}</td>
            <td>${acc.type}</td>
            <td>₹${acc.balance.toFixed(2)}</td>
            <td>${acc.contact}</td>
            <td>
                <button onclick="editAccount(${acc.id})">Edit</button>
                <button onclick="deleteAccount(${acc.id})">Delete</button>
            </td>
        </tr>`).join('');
    }
    accountsList.innerHTML = '<table><thead><tr><th>Name</th><th>Type</th><th>Balance</th><th>Contact</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function openAccountModal(editId) {
    let acc = { name: '', type: 'Savings', balance: 0, contact: '' };
    let editing = false;
    if (editId) {
        acc = getAccounts().find(a => a.id === editId);
        editing = true;
    }
    showModal(`
        <h3>${editing ? 'Edit' : 'Open New'} Account</h3>
        <form id="accountForm">
            <label>Name: <input required name="name" value="${acc.name}"></label><br>
            <label>Type: <select name="type">
                <option${acc.type==='Savings'?' selected':''}>Savings</option>
                <option${acc.type==='Current'?' selected':''}>Current</option>
                <option${acc.type==='Fixed Deposit'?' selected':''}>Fixed Deposit</option>
            </select></label><br>
            <label>Contact: <input required name="contact" value="${acc.contact}"></label><br>
            ${editing ? '' : '<label>Initial Deposit: <input required type="number" min="0" name="balance" value="0"></label><br>'}
            <button type="submit">${editing ? 'Save' : 'Create'}</button>
            <button type="button" onclick="closeModal()">Cancel</button>
        </form>
    `);
    document.getElementById('accountForm').onsubmit = function(e) {
        e.preventDefault();
        const form = e.target;
        const accounts = getAccounts();
        if (editing) {
            acc.name = form.name.value;
            acc.type = form.type.value;
            acc.contact = form.contact.value;
            setAccounts(accounts.map(a => a.id === editId ? acc : a));
        } else {
            const newAcc = {
                id: Date.now(),
                name: form.name.value,
                type: form.type.value,
                balance: parseFloat(form.balance.value),
                contact: form.contact.value
            };
            accounts.push(newAcc);
            setAccounts(accounts);
            addHistory('Account Created', newAcc.id, newAcc.balance);
        }
        closeModal();
        renderAccounts();
        if (adminDashboard) renderAdmin();
    };
}
window.openAccountModal = openAccountModal;
function editAccount(id) { openAccountModal(id); }
window.editAccount = editAccount;
function deleteAccount(id) {
    if (!confirm('Are you sure you want to delete this account?')) return;
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.id !== id);
    setAccounts(accounts);
    addHistory('Account Deleted', id, 0);
    renderAccounts();
    if (adminDashboard) renderAdmin();
}
window.deleteAccount = deleteAccount;

// ====== Transactions ======
function openTransactionModal(type) {
    const accounts = getAccounts();
    if (!accounts.length) {
        alert('No accounts available.');
        return;
    }
    showModal(`
        <h3>${type} Funds</h3>
        <form id="txnForm">
            <label>Account:
                <select name="accountId">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
                </select>
            </label><br>
            <label>Amount: <input required type="number" min="1" name="amount"></label><br>
            ${type==='Deposit' ? '' : '<label>Apply AST: <input type="checkbox" name="gst" checked></label><br>'}
            <button type="submit">${type}</button>
            <button type="button" onclick="closeModal()">Cancel</button>
        </form>
    `);
    document.getElementById('txnForm').onsubmit = function(e) {
        e.preventDefault();
        const form = e.target;
        const accId = parseInt(form.accountId.value);
        const amount = parseFloat(form.amount.value);
        let accounts = getAccounts();
        let acc = accounts.find(a => a.id === accId);
        if (type === 'Deposit') {
            acc.balance += amount;
            addHistory('Deposit', acc.id, amount);
        } else {
            let total = amount;
            if (form.gst && form.gst.checked) {
                total += amount * GST_RATE;
            }
            if (acc.balance < total) {
                alert('Insufficient balance (including GST).');
                return;
            }
            acc.balance -= total;
            addHistory('Withdraw', acc.id, amount, form.gst && form.gst.checked ? amount*GST_RATE : 0);
        }
        setAccounts(accounts);
        closeModal();
        if (accountsList) renderAccounts();
        if (adminDashboard) renderAdmin();
    };
}
window.openTransactionModal = openTransactionModal;

// ====== Loan Management ======
function renderLoans() {
    if (!loansList) return;
    const loans = getLoans();
    let rows = '';
    if (!loans.length) {
        rows = '<tr><td colspan="4" style="text-align:center;">No loans found.</td></tr>';
    } else {
        rows = loans.map(loan => `<tr>
            <td>${getAccounts().find(a => a.id === loan.accountId)?.name || 'Unknown'}</td>
            <td>₹${loan.amount.toFixed(2)}</td>
            <td>${loan.status}</td>
            <td>
                ${loan.status==='Pending'?`<button onclick="approveLoan(${loan.id})">Approve</button>`:''}
            </td>
        </tr>`).join('');
    }
    loansList.innerHTML = '<table><thead><tr><th>Account</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';
}
function openLoanModal() {
    const accounts = getAccounts();
    if (!accounts.length) {
        alert('No accounts available.');
        return;
    }
    showModal(`
        <h3>Apply for Loan</h3>
        <form id="loanForm">
            <label>Account:
                <select name="accountId">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('')}
                </select>
            </label><br>
            <label>Amount: <input required type="number" min="1000" name="amount"></label><br>
            <button type="submit">Apply</button>
            <button type="button" onclick="closeModal()">Cancel</button>
        </form>
    `);
    document.getElementById('loanForm').onsubmit = function(e) {
        e.preventDefault();
        const form = e.target;
        const loans = getLoans();
        loans.push({
            id: Date.now(),
            accountId: parseInt(form.accountId.value),
            amount: parseFloat(form.amount.value),
            status: 'Pending'
        });
        setLoans(loans);
        closeModal();
        renderLoans();
        if (adminDashboard) renderAdmin();
    };
}
window.openLoanModal = openLoanModal;
function approveLoan(id) {
    const loans = getLoans();
    const loan = loans.find(l => l.id === id);
    if (loan) loan.status = 'Approved';
    setLoans(loans);
    addHistory('Loan Approved', loan.accountId, loan.amount);
    if (loansList) renderLoans();
    if (adminDashboard) renderAdmin();
}
window.approveLoan = approveLoan;

// ====== Admin Dashboard ======
function renderAdmin() {
    if (!adminDashboard) return;
    const accounts = getAccounts();
    const loans = getLoans();
    const totalDeposits = getHistory().filter(h => h.type==='Deposit').reduce((sum, h) => sum + h.amount, 0);
    const totalWithdraws = getHistory().filter(h => h.type==='Withdraw').reduce((sum, h) => sum + h.amount, 0);
    const totalGST = getHistory().reduce((sum, h) => sum + (h.gst||0), 0);
    adminDashboard.innerHTML = `
        <div class="admin-cards">
            <div class="card"><strong>Total Accounts:</strong> ${accounts.length}</div>
            <div class="card"><strong>Total Loans:</strong> ${loans.length}</div>
            <div class="card"><strong>Total Deposits:</strong> ₹${totalDeposits.toFixed(2)}</div>
            <div class="card"><strong>Total Withdrawals:</strong> ₹${totalWithdraws.toFixed(2)}</div>
            <div class="card"><strong>GST Collected:</strong> ₹${totalGST.toFixed(2)}</div>
        </div>
    `;
}

// ====== Transaction History ======
function addHistory(type, accountId, amount, gst=0) {
    const history = getHistory();
    history.unshift({
        time: new Date().toLocaleString(),
        type,
        accountId,
        amount,
        gst
    });
    setHistory(history.slice(0, 100)); // keep last 100
    if (transactionHistory) renderHistory();
}
function renderHistory() {
    if (!transactionHistory) return;
    const history = getHistory();
    let rows = '';
    if (!history.length) {
        rows = '<tr><td colspan="5" style="text-align:center;">No transactions yet.</td></tr>';
    } else {
        rows = history.map(h => `<tr>
            <td>${h.time}</td>
            <td>${h.type}</td>
            <td>${getAccounts().find(a => a.id === h.accountId)?.name || 'N/A'}</td>
            <td>₹${h.amount.toFixed(2)}</td>
            <td>${h.gst ? '₹'+h.gst.toFixed(2) : '-'}</td>
        </tr>`).join('');
    }
    transactionHistory.innerHTML = '<table><thead><tr><th>Time</th><th>Type</th><th>Account</th><th>Amount</th><th>GST</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

// ====== Clear History for Deleted Accounts ======
function clearDeletedAccountsHistory() {
    const accounts = getAccounts();
    const accountIds = accounts.map(a => a.id);
    let history = getHistory();
    const newHistory = history.filter(h => !h.accountId || accountIds.includes(h.accountId));
    setHistory(newHistory);
    renderHistory();
}

// Attach to button if present
if (document.getElementById('clearDeletedHistoryBtn')) {
    document.getElementById('clearDeletedHistoryBtn').onclick = clearDeletedAccountsHistory;
}

// ====== Bar-Graph for Admin Dashboard ======
function renderBarGraph() {
    if (!barGraph) return;
    const canvas = barGraph;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Prepare monthly data
    const history = getHistory();
    const months = Array.from({length: 12}, (_, i) => i); // 0=Jan, 11=Dec
    const deposits = Array(12).fill(0);
    const withdrawals = Array(12).fill(0);
    history.forEach(h => {
        const d = new Date(h.time);
        if (d.toString() === 'Invalid Date') return;
        const m = d.getMonth();
        if (h.type === 'Deposit') deposits[m] += h.amount;
        if (h.type === 'Withdraw') withdrawals[m] += h.amount;
    });
    // Bar chart settings
    const w = canvas.width, h = canvas.height;
    const barWidth = 20, gap = 15, groupGap = 30;
    const xStart = 60, yBase = h - 40;
    const maxY = Math.max(...deposits, ...withdrawals, 1000);
    // Draw axes
    ctx.strokeStyle = '#888';
    ctx.beginPath(); ctx.moveTo(xStart, 20); ctx.lineTo(xStart, yBase); ctx.lineTo(w-20, yBase); ctx.stroke();
    // Draw bars
    for (let i = 0; i < 12; i++) {
        const x = xStart + i * (2*barWidth + gap + groupGap);
        // Deposits
        const dh = Math.round((deposits[i] / maxY) * (yBase-30));
        ctx.fillStyle = '#0057b7';
        ctx.fillRect(x, yBase - dh, barWidth, dh);
        // Withdrawals
        const wh = Math.round((withdrawals[i] / maxY) * (yBase-30));
        ctx.fillStyle = '#00b386';
        ctx.fillRect(x + barWidth + gap, yBase - wh, barWidth, wh);
        // Month label
        ctx.fillStyle = '#444';
        ctx.font = '12px Segoe UI, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], x + barWidth + gap/2, yBase + 18);
    }
    // Y-axis labels
    ctx.fillStyle = '#444';
    ctx.textAlign = 'right';
    ctx.font = '12px Segoe UI, Arial';
    for(let i=0;i<=5;i++){
        const val = Math.round(maxY * i/5);
        const y = yBase - (yBase-30)*i/5;
        ctx.fillText('₹'+val, xStart-5, y+5);
        ctx.strokeStyle = '#eee';
        ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(w-20, y); ctx.stroke();
    }
    // Legend - top-right corner
    const legendX = w - 160;
    const legendY = 24;
    const legendSpacing = 24;
    ctx.font = '14px Segoe UI, Arial';
    // Deposits
    ctx.fillStyle = '#0057b7';
    ctx.fillRect(legendX, legendY, 16, 16);
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('Deposits', legendX + 22, legendY + 13);
    // Withdrawals
    ctx.fillStyle = '#00b386';
    ctx.fillRect(legendX, legendY + legendSpacing, 16, 16);
    ctx.fillStyle = '#444';
    ctx.fillText('Withdrawals', legendX + 22, legendY + legendSpacing + 13);
}

// ====== Dark Mode ======
const darkModeToggle = document.getElementById('darkModeToggle');
function setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    if (darkModeToggle) darkModeToggle.textContent = on ? '☀️' : '🌙';
    localStorage.setItem('hbi_dark', on ? '1' : '0');
}
if (darkModeToggle) {
    darkModeToggle.onclick = () => setDarkMode(!document.body.classList.contains('dark'));
}

// ====== Page Initialization ======
window.onload = function() {
    setDarkMode(localStorage.getItem('hbi_dark') === '1');
    // Accounts Page
    if (accountsList) {
        renderAccounts();
        const openAccountBtn = document.getElementById('openAccountModalBtn');
        if (openAccountBtn) openAccountBtn.onclick = () => openAccountModal();
    }
    // Loans Page
    if (loansList) {
        renderLoans();
        const applyLoanBtn = document.getElementById('applyLoanBtn');
        if (applyLoanBtn) applyLoanBtn.onclick = () => openLoanModal();
    }
    // Transactions Page
    if (transactionsContainer) {
        transactionsContainer.innerHTML = '';
        const depositBtn = document.getElementById('depositBtn');
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (depositBtn) depositBtn.onclick = () => openTransactionModal('Deposit');
        if (withdrawBtn) withdrawBtn.onclick = () => openTransactionModal('Withdraw');
    }
    // Admin Page
    if (adminDashboard) {
        renderAdmin();
    }
    if (barGraph) {
        renderBarGraph();
    }
    // History Page
    if (transactionHistory) {
        renderHistory();
    }
};