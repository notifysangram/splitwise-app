// Data
let friends = [];
let expenses = [];
let nextId = 1;
const CURRENCY = '₹';

// Load from localStorage
function loadData() {
    try {
        const savedFriends = localStorage.getItem('splitFriends');
        const savedExpenses = localStorage.getItem('splitExpenses');
        const savedId = localStorage.getItem('splitNextId');
        
        if (savedFriends) friends = JSON.parse(savedFriends);
        if (savedExpenses) expenses = JSON.parse(savedExpenses);
        if (savedId) nextId = parseInt(savedId);
    } catch (e) {
        console.error('Error loading data:', e);
    }
    renderAll();
}

// Save to localStorage
function saveData() {
    try {
        localStorage.setItem('splitFriends', JSON.stringify(friends));
        localStorage.setItem('splitExpenses', JSON.stringify(expenses));
        localStorage.setItem('splitNextId', String(nextId));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Format currency in INR
function formatCurrency(amount) {
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    return amount < 0 ? `-${CURRENCY}${formatted}` : `${CURRENCY}${formatted}`;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Add Friend
function addFriend() {
    const input = document.getElementById('friendName');
    const name = input.value.trim();
    
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }
    
    if (friends.includes(name)) {
        showToast(`${name} already exists!`, 'error');
        return;
    }
    
    friends.push(name);
    input.value = '';
    saveData();
    renderAll();
    showToast(`🎉 ${name} added!`);
}

// Remove Friend
function removeFriend(name) {
    if (!confirm(`Remove ${name}?`)) return;
    friends = friends.filter(f => f !== name);
    expenses = expenses.filter(e => e.payer !== name && !e.splitters.includes(name));
    saveData();
    renderAll();
    showToast(`Removed ${name}`, 'error');
}

// Add Expense
function addExpense() {
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const payer = document.getElementById('expensePayer').value;
    const checkboxes = document.querySelectorAll('#splitCheckboxes input:checked');
    const splitters = Array.from(checkboxes).map(cb => cb.value);
    
    if (!desc) {
        showToast('Please enter a description', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!payer) {
        showToast('Please select who paid', 'error');
        return;
    }
    
    if (splitters.length === 0) {
        showToast('Please select at least one person to split with', 'error');
        return;
    }
    
    expenses.push({
        id: nextId++,
        description: desc,
        amount: amount,
        payer: payer,
        splitters: splitters,
        date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    });
    
    // Clear form
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expensePayer').value = '';
    document.querySelectorAll('#splitCheckboxes input:checked').forEach(cb => cb.checked = false);
    
    saveData();
    renderAll();
    showToast(`💰 ${desc} added for ${formatCurrency(amount)}`);
}

// Delete Expense
function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    renderAll();
    showToast('Expense deleted', 'error');
}

// Clear All
function clearAll() {
    if (expenses.length === 0) {
        showToast('No expenses to clear', 'error');
        return;
    }
    if (!confirm('Delete all expenses?')) return;
    expenses = [];
    saveData();
    renderAll();
    showToast('All expenses cleared', 'error');
}

// Settle All
function settleAll() {
    if (expenses.length === 0) {
        showToast('No expenses to settle', 'error');
        return;
    }
    if (!confirm('Settle all expenses? This will clear all expenses.')) return;
    expenses = [];
    saveData();
    renderAll();
    showToast('✅ All settled up!');
}

// Calculate Balances
function calculateBalances() {
    const balances = {};
    friends.forEach(f => balances[f] = 0);
    
    expenses.forEach(expense => {
        const share = expense.amount / expense.splitters.length;
        expense.splitters.forEach(person => {
            if (person !== expense.payer) {
                balances[person] -= share;
                balances[expense.payer] += share;
            }
        });
    });
    
    return balances;
}

// Export Data
function exportData() {
    const data = { 
        friends, 
        expenses, 
        nextId,
        currency: 'INR',
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitwise-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Data exported!');
}

// Import Data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.friends && data.expenses) {
                    friends = data.friends;
                    expenses = data.expenses;
                    nextId = data.nextId || 1;
                    saveData();
                    renderAll();
                    showToast(`📥 Data imported successfully! (${data.currency || 'INR'})`);
                } else {
                    showToast('Invalid data file', 'error');
                }
            } catch (err) {
                showToast('Error reading file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Render Functions
function renderStats() {
    document.getElementById('friendCount').textContent = friends.length;
    document.getElementById('expenseCount').textContent = expenses.length;
    
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('totalSpent').textContent = formatCurrency(total);
    
    const balances = calculateBalances();
    const netBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);
    const netBalanceEl = document.getElementById('netBalance');
    netBalanceEl.textContent = formatCurrency(netBalance);
    netBalanceEl.className = 'stat-value ' + (netBalance >= 0 ? 'positive' : 'negative');
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    const badge = document.getElementById('friendBadge');
    badge.textContent = friends.length;
    
    if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state">No friends added yet</div>';
        return;
    }
    
    container.innerHTML = friends.map(name => `
        <span class="friend-tag">
            ${name}
            <span class="remove" onclick="removeFriend('${name}')">×</span>
        </span>
    `).join('');
}

function renderPayerDropdown() {
    const select = document.getElementById('expensePayer');
    select.innerHTML = '<option value="">Select who paid</option>' + 
        friends.map(f => `<option value="${f}">${f}</option>`).join('');
}

function renderSplitCheckboxes() {
    const container = document.getElementById('splitCheckboxes');
    if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state">Add friends first</div>';
        return;
    }
    container.innerHTML = friends.map(f => `
        <label class="checkbox-item">
            <input type="checkbox" value="${f}" checked />
            ${f}
        </label>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.checkbox-item').forEach(label => {
        label.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('input');
                checkbox.checked = !checkbox.checked;
                this.classList.toggle('active');
            }
        });
        const checkbox = label.querySelector('input');
        if (checkbox.checked) label.classList.add('active');
    });
}

function renderExpenses() {
    const container = document.getElementById('expensesList');
    if (expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">No expenses yet</div>';
        return;
    }
    
    container.innerHTML = expenses.slice().reverse().map(e => `
        <div class="expense-item">
            <div class="expense-left">
                <div class="expense-description">${e.description}</div>
                <div class="expense-meta">
                    Paid by ${e.payer} • ${e.date || 'Today'}
                </div>
                <div class="expense-splitters">
                    Split: ${e.splitters.join(', ')}
                </div>
            </div>
            <div class="expense-right">
                <div class="expense-amount">${formatCurrency(e.amount)}</div>
                <button class="expense-delete" onclick="deleteExpense(${e.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderBalances() {
    const container = document.getElementById('balancesList');
    const balances = calculateBalances();
    
    if (friends.length === 0) {
        container.innerHTML = '<div class="empty-state">Add friends to see balances</div>';
        return;
    }
    
    let html = '';
    let hasTransactions = false;
    
    friends.forEach(person => {
        const balance = balances[person] || 0;
        if (Math.abs(balance) > 0.01) hasTransactions = true;
        
        let statusClass = 'balance-zero';
        let statusText = '₹0.00';
        
        if (balance > 0.01) {
            statusClass = 'balance-positive';
            statusText = `${formatCurrency(balance)} (owed to you)`;
        } else if (balance < -0.01) {
            statusClass = 'balance-negative';
            statusText = `${formatCurrency(balance)} (you owe)`;
        }
        
        html += `
            <div class="balance-item">
                <span class="balance-name">${person}</span>
                <span class="balance-amount ${statusClass}">${statusText}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    if (!hasTransactions && expenses.length > 0) {
        container.innerHTML += '<div style="text-align:center;padding:12px;color:var(--success);font-weight:600;">✅ All settled up!</div>';
    }
}

function renderAll() {
    renderStats();
    renderFriends();
    renderPayerDropdown();
    renderSplitCheckboxes();
    renderExpenses();
    renderBalances();
}

// Initialize
loadData();