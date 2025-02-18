// index.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const nameInput = document.getElementById('name');
    const amountInput = document.getElementById('amount');
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const addButton = document.getElementById('add-btn');
    const transactionsTable = document.getElementById('transactions-tbody');
    const totalIncomeElement = document.getElementById('total-income');
    const totalExpensesElement = document.getElementById('total-expenses');
    const balanceElement = document.getElementById('balance');
    const allButton = document.getElementById('all-btn');
    const incomeButton = document.getElementById('income-btn');
    const expenseButton = document.getElementById('expense-btn');
    const filterCategorySelect = document.getElementById('filter-category');
    const cashAccountBtn = document.getElementById('cash-account-btn');
    const bankAccountBtn = document.getElementById('bank-account-btn');
    
    // Set default date to today
    dateInput.valueAsDate = new Date();
    
    // Current account type (default: cash)
    let currentAccount = 'cash';
    
    // Categories
    const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'];
    const expenseCategories = ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Clothing', 'Education', 'Personal Care', 'Other Expenses'];
    const transferTypes = ['Transfer to Bank', 'Transfer to Cash'];
    
    // Initialize category selects
    function updateCategoryOptions() {
        categorySelect.innerHTML = '';
        let categories;
        
        if (typeSelect.value === 'income') {
            categories = incomeCategories;
        } else if (typeSelect.value === 'expense') {
            categories = expenseCategories;
        } else if (typeSelect.value === 'transfer') {
            // Show appropriate transfer option based on current account
            categories = currentAccount === 'cash' ? ['Transfer to Bank'] : ['Transfer to Cash'];
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
    
    // Initialize filter category select
    function initFilterCategories() {
        filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
        
        const allCategories = [...incomeCategories, ...expenseCategories, ...transferTypes];
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategorySelect.appendChild(option);
        });
    }
    
    // Update type options to include transfer
    function updateTypeOptions() {
        // Clear existing options
        while (typeSelect.options.length > 0) {
            typeSelect.remove(0);
        }
        
        // Add options
        const types = ['expense', 'income', 'transfer'];
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            typeSelect.appendChild(option);
        });
    }
    
    // Switch active account
    function switchAccount(accountType) {
        currentAccount = accountType;
        
        // Update UI
        cashAccountBtn.classList.toggle('active', accountType === 'cash');
        bankAccountBtn.classList.toggle('active', accountType === 'bank');
        
        // Update type options (ensure transfer is available)
        updateTypeOptions();
        
        // If transfer is selected, update category options
        if (typeSelect.value === 'transfer') {
            updateCategoryOptions();
        }
        
        // Reload transactions for the selected account
        DB.renderTransactions();
        DB.calculateSummary();
    }
    
    // Initialization
    updateTypeOptions();
    updateCategoryOptions();
    initFilterCategories();
    typeSelect.addEventListener('change', updateCategoryOptions);
    
    // Event listeners for account buttons
    cashAccountBtn.addEventListener('click', () => switchAccount('cash'));
    bankAccountBtn.addEventListener('click', () => switchAccount('bank'));
    
    // Database operations with Firebase
    const DB = {
        transactions: [],
        
        firebaseConfig: {
            apiKey: "AIzaSyDP_A477cu_IDUwthm2oM7_NBOuDDJJ4ME",
            authDomain: "expense-app-95265.firebaseapp.com",
            databaseURL: "https://expense-app-95265-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "expense-app-95265",
            storageBucket: "expense-app-95265.firebasestorage.app",
            messagingSenderId: "269273944121",
            appId: "1:269273944121:web:64e560fa508fe40c5afde8",
            measurementId: "G-MSH6H75HT3"
        },
        
        init: function() {
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            this.database = firebase.database();
            
            // Show loading indicator
            const loadingMessage = document.createElement('div');
            loadingMessage.id = 'loading-message';
            loadingMessage.textContent = 'Loading your transactions...';
            loadingMessage.style.textAlign = 'center';
            loadingMessage.style.padding = '20px';
            document.body.appendChild(loadingMessage);
            
            // Load transactions from Firebase
            this.database.ref('transactions').on('value', (snapshot) => {
                const data = snapshot.val() || {};
                this.transactions = Object.values(data);
                this.updateUI();
                
                // Remove loading message
                const loadingElement = document.getElementById('loading-message');
                if (loadingElement) loadingElement.remove();
            }, (error) => {
                console.error("Database error:", error);
                alert("Error loading transactions. Please check your internet connection.");
                
                // Remove loading message
                const loadingElement = document.getElementById('loading-message');
                if (loadingElement) loadingElement.remove();
            });
        },
        
        addTransaction: function(transaction) {
            // Generate a unique ID
            transaction.id = this.database.ref().child('transactions').push().key;
            
            // Handle transfer transactions
            if (transaction.type === 'transfer') {
                // Create a corresponding transaction for the other account
                const otherAccountTransaction = {...transaction};
                
                if (transaction.account === 'cash' && transaction.category === 'Transfer to Bank') {
                    // Cash -> Bank: Create a Bank Income transaction
                    otherAccountTransaction.account = 'bank';
                    otherAccountTransaction.type = 'income';
                    otherAccountTransaction.category = 'Transfer from Cash';
                    
                    // Original transaction remains an expense for cash
                    transaction.type = 'expense';
                } else if (transaction.account === 'bank' && transaction.category === 'Transfer to Cash') {
                    // Bank -> Cash: Create a Cash Income transaction
                    otherAccountTransaction.account = 'cash';
                    otherAccountTransaction.type = 'income';
                    otherAccountTransaction.category = 'Transfer from Bank';
                    
                    // Original transaction remains an expense for bank
                    transaction.type = 'expense';
                }
                
                // Generate a new ID for the corresponding transaction
                otherAccountTransaction.id = this.database.ref().child('transactions').push().key;
                
                // Save both transactions
                const updates = {};
                updates['/transactions/' + transaction.id] = transaction;
                updates['/transactions/' + otherAccountTransaction.id] = otherAccountTransaction;
                
                this.database.ref().update(updates)
                    .catch(error => {
                        console.error("Error adding transfer transactions:", error);
                        alert("Failed to add transfer. Please check your internet connection.");
                    });
            } else {
                // Save regular transaction
                this.database.ref('transactions/' + transaction.id).set(transaction)
                    .catch(error => {
                        console.error("Error adding transaction:", error);
                        alert("Failed to add transaction. Please check your internet connection.");
                    });
            }
        },
        
        updateTransaction: function(id, updatedTransaction) {
            updatedTransaction.id = id; // Preserve the ID
            this.database.ref('transactions/' + id).set(updatedTransaction)
                .catch(error => {
                    console.error("Error updating transaction:", error);
                    alert("Failed to update transaction. Please check your internet connection.");
                });
        },
        
        deleteTransaction: function(id) {
            this.database.ref('transactions/' + id).remove()
                .catch(error => {
                    console.error("Error deleting transaction:", error);
                    alert("Failed to delete transaction. Please check your internet connection.");
                });
        },
        
        updateUI: function() {
            this.renderTransactions();
            this.calculateSummary();
        },
        
        renderTransactions: function() {
            const currentFilter = document.querySelector('.toggle-btn.active')?.id || 'all-btn';
            const categoryFilter = filterCategorySelect.value;
            
            // Filter transactions
            let filteredTransactions = [...this.transactions];
            
            // Filter by account type first
            filteredTransactions = filteredTransactions.filter(t => t.account === currentAccount);
            
            if (currentFilter === 'income-btn') {
                filteredTransactions = filteredTransactions.filter(t => t.type === 'income');
            } else if (currentFilter === 'expense-btn') {
                filteredTransactions = filteredTransactions.filter(t => t.type === 'expense');
            }
            
            if (categoryFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
            }
            
            // Sort by date (newest first)
            filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Render to table
            transactionsTable.innerHTML = '';
            filteredTransactions.forEach(transaction => {
                const row = document.createElement('tr');
                
                // Format amount with ₹ and correct color
                const amountFormatted = `₹${parseFloat(transaction.amount).toFixed(2)}`;
                let amountClass;
                if (transaction.type === 'income') {
                    amountClass = 'income';
                } else if (transaction.type === 'expense') {
                    amountClass = 'expense';
                } else if (transaction.type === 'transfer') {
                    // For transfers, we set color based on whether money is coming in or going out
                    amountClass = transaction.category.includes('from') ? 'income' : 'expense';
                }
                
                row.innerHTML = `
                    <td>${transaction.name}</td>
                    <td class="${amountClass}">${transaction.type === 'income' || transaction.category.includes('from') ? amountFormatted : `-${amountFormatted}`}</td>
                    <td>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
                    <td>${transaction.category}</td>
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" data-id="${transaction.id}">Edit</button>
                        <button class="delete-btn" data-id="${transaction.id}">Delete</button>
                    </td>
                `;
                
                transactionsTable.appendChild(row);
            });
            
            // Add event listeners to the new buttons
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', handleEdit);
            });
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', handleDelete);
            });
        },
        
        calculateSummary: function() {
            let totalIncome = 0;
            let totalExpenses = 0;
            
            // Filter by current account
            const accountTransactions = this.transactions.filter(t => t.account === currentAccount);
            
            accountTransactions.forEach(transaction => {
                if (transaction.type === 'income') {
                    totalIncome += parseFloat(transaction.amount);
                } else if (transaction.type === 'expense') {
                    totalExpenses += parseFloat(transaction.amount);
                }
            });
            
            const balance = totalIncome - totalExpenses;
            
            totalIncomeElement.textContent = `₹${totalIncome.toFixed(2)}`;
            totalExpensesElement.textContent = `₹${totalExpenses.toFixed(2)}`;
            balanceElement.textContent = `₹${balance.toFixed(2)}`;
            
            // Apply color to balance based on value
            if (balance > 0) {
                balanceElement.className = 'summary-value balance positive';
            } else if (balance < 0) {
                balanceElement.className = 'summary-value balance negative';
            } else {
                balanceElement.className = 'summary-value balance';
            }
        }
    };
    
    // Event Handlers
    function handleAddTransaction() {
        const name = nameInput.value.trim();
        const amount = amountInput.value;
        const type = typeSelect.value;
        const category = categorySelect.value;
        const date = dateInput.value;
        
        // Validation
        if (!name || !amount || amount <= 0 || !date) {
            alert('Please fill in all fields with valid values');
            return;
        }
        
        // Create transaction object with account type
        const transaction = {
            name,
            amount,
            type,
            category,
            date,
            account: currentAccount
        };
        
        // Add to database
        DB.addTransaction(transaction);
        
        // Clear form
        nameInput.value = '';
        amountInput.value = '';
        dateInput.valueAsDate = new Date();
        
        // Focus on first field for next entry
        nameInput.focus();
    }
    
    function handleEdit(e) {
        const id = e.target.dataset.id;
        const transaction = DB.transactions.find(t => t.id === id);
        
        if (transaction) {
            // Switch to the appropriate account before editing
            if (transaction.account !== currentAccount) {
                switchAccount(transaction.account);
            }
            
            // Fill form with transaction data
            nameInput.value = transaction.name;
            amountInput.value = transaction.amount;
            typeSelect.value = transaction.type;
            updateCategoryOptions(); // Update categories based on type
            categorySelect.value = transaction.category;
            dateInput.value = transaction.date;
            
            // Remove the existing add transaction handler
            addButton.removeEventListener('click', handleAddTransaction);
            
            // Change button text
            addButton.textContent = 'Update Transaction';
            
            // Add update handler
            const handleUpdate = function() {
                const updatedTransaction = {
                    name: nameInput.value.trim(),
                    amount: amountInput.value,
                    type: typeSelect.value,
                    category: categorySelect.value,
                    date: dateInput.value,
                    account: currentAccount
                };
                
                // Validation
                if (!updatedTransaction.name || !updatedTransaction.amount || updatedTransaction.amount <= 0 || !updatedTransaction.date) {
                    alert('Please fill in all fields with valid values');
                    return;
                }
                
                // Update in database
                DB.updateTransaction(id, updatedTransaction);
                
                // Clear form and reset button
                nameInput.value = '';
                amountInput.value = '';
                dateInput.valueAsDate = new Date();
                addButton.textContent = 'Add Transaction';
                
                // Restore original add handler
                addButton.removeEventListener('click', handleUpdate);
                addButton.addEventListener('click', handleAddTransaction);
            };
            
            // Attach one-time update handler
            addButton.addEventListener('click', handleUpdate);
        }
    }
    
    function handleDelete(e) {
        const id = e.target.dataset.id;
        const transaction = DB.transactions.find(t => t.id === id);
        
        if (transaction && transaction.type === 'transfer') {
            alert('Transfer transactions cannot be deleted individually.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this transaction?')) {
            DB.deleteTransaction(id);
        }
    }
    
    function handleFilterChange() {
        // Update active class
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        // Re-render transactions with the new filter
        DB.renderTransactions();
    }
    
    // Attach Event Listeners
    addButton.addEventListener('click', handleAddTransaction);
    allButton.addEventListener('click', handleFilterChange);
    incomeButton.addEventListener('click', handleFilterChange);
    expenseButton.addEventListener('click', handleFilterChange);
    filterCategorySelect.addEventListener('change', () => DB.renderTransactions());
    
    // Initialize the database and render transactions
    DB.init();
});

// analytics.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const totalIncomeElement = document.getElementById('total-income');
    const totalExpensesElement = document.getElementById('total-expenses');
    const balanceElement = document.getElementById('balance');
    const weekBtn = document.getElementById('week-btn');
    const monthBtn = document.getElementById('month-btn');
    const yearBtn = document.getElementById('year-btn');
    const allBtn = document.getElementById('all-btn');
    const analyticsChart = document.getElementById('analytics-chart');
    
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDP_A477cu_IDUwthm2oM7_NBOuDDJJ4ME",
        authDomain: "expense-app-95265.firebaseapp.com",
        databaseURL: "https://expense-app-95265-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "expense-app-95265",
        storageBucket: "expense-app-95265.firebasestorage.app",
        messagingSenderId: "269273944121",
        appId: "1:269273944121:web:64e560fa508fe40c5afde8",
        measurementId: "G-MSH6H75HT3"
    };
    
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    // Chart instance
    let myChart = null;
    
    // Current filter (default: month)
    let currentFilter = 'month';
    
    // Load transactions and render chart
    function loadTransactions() {
        database.ref('transactions').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const transactions = Object.values(data);
            
            // Render chart based on current filter
            renderChart(transactions);
            
        }, (error) => {
            console.error("Database error:", error);
            alert("Error loading transactions. Please check your internet connection.");
        });
    }
    
    // Group transactions by date period and calculate totals
    function groupTransactionsByPeriod(transactions, periodType) {
        const grouped = {};
        const now = new Date();
        
        // Filter transactions based on period
        let filteredTransactions = [...transactions];
        
        if (periodType === 'week') {
            // Last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= weekAgo);
        } else if (periodType === 'month') {
            // Last 30 days
            const monthAgo = new Date();
            monthAgo.setDate(now.getDate() - 30);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= monthAgo);
        } else if (periodType === 'year') {
            // Last 365 days
            const yearAgo = new Date();
            yearAgo.setFullYear(now.getFullYear() - 1);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= yearAgo);
        }
        
        // Calculate summary
        let totalIncome = 0;
        let totalExpenses = 0;
        
        filteredTransactions.forEach(transaction => {
            const date = new Date(transaction.date);
            let periodKey;
            
            // Define period key based on type
            if (periodType === 'week') {
                periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            } else if (periodType === 'month') {
                periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            } else if (periodType === 'year') {
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                periodKey = `${year}-${month.toString().padStart(2, '0')}`; // YYYY-MM
            } else {
                // All time - group by month
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                periodKey = `${year}-${month.toString().padStart(2, '0')}`; // YYYY-MM
            }
            
            // Initialize period if not exist
            if (!grouped[periodKey]) {
                grouped[periodKey] = {
                    income: 0,
                    expenses: 0,
                    balance: 0
                };
            }
            
            // Add to totals
            if (transaction.type === 'income') {
                grouped[periodKey].income += parseFloat(transaction.amount);
                totalIncome += parseFloat(transaction.amount);
            } else {
                grouped[periodKey].expenses += parseFloat(transaction.amount);
                totalExpenses += parseFloat(transaction.amount);
            }
            
            // Update balance
            grouped[periodKey].balance = grouped[periodKey].income - grouped[periodKey].expenses;
        });
        
        // Update summary values
        totalIncomeElement.textContent = `₹${totalIncome.toFixed(2)}`;
        totalExpensesElement.textContent = `₹${totalExpenses.toFixed(2)}`;
        
        const balance = totalIncome - totalExpenses;
        balanceElement.textContent = `₹${balance.toFixed(2)}`;
        
        // Apply color to balance based on value
        if (balance > 0) {
            balanceElement.className = 'summary-value balance positive';
        } else if (balance < 0) {
            balanceElement.className = 'summary-value balance negative';
        } else {
            balanceElement.className = 'summary-value balance';
        }
        
        return grouped;
    }
    
    // Format date for display
    function formatPeriodLabel(periodKey, periodType) {
        if (periodType === 'week' || periodType === 'month') {
            const date = new Date(periodKey);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } else {
            // Year or all time
            const [year, month] = periodKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
    }
    
    // Find this function in script.js and replace it with this improved version
    function renderChart(transactions) {
        // Group transactions
        const groupedData = groupTransactionsByPeriod(transactions, currentFilter);
        
        // Sort periods by date
        const periods = Object.keys(groupedData).sort();
        
        // Prepare chart data
        const labels = periods.map(period => formatPeriodLabel(period, currentFilter));
        const incomeData = periods.map(period => groupedData[period].income);
        const expenseData = periods.map(period => groupedData[period].expenses);
        const balanceData = periods.map(period => groupedData[period].balance);
        
        // Destroy existing chart if any
        if (myChart) {
            myChart.destroy();
        }
        
        // Create chart with improved styling
        myChart = new Chart(analyticsChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#2e7d32',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#2e7d32',
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        borderColor: '#c62828',
                        backgroundColor: 'rgba(198, 40, 40, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#c62828',
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Balance',
                        data: balanceData,
                        borderColor: '#1565c0',
                        backgroundColor: 'rgba(21, 101, 192, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#1565c0',
                        pointBorderColor: '#ffffff',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 15,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += '₹' + context.parsed.y.toFixed(2);
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Financial Overview - ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}`,
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            color: '#666',
                            padding: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            color: '#666',
                            padding: 10,
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round'
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 25,
                        top: 20,
                        bottom: 10
                    }
                }
            }
        });
    }
    
    // Handle filter button clicks
    function handleFilterChange() {
        // Update active class
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        // Update current filter
        if (this === weekBtn) {
            currentFilter = 'week';
        } else if (this === monthBtn) {
            currentFilter = 'month';
        } else if (this === yearBtn) {
            currentFilter = 'year';
        } else {
            currentFilter = 'all';
        }
        
        // Reload transactions
        loadTransactions();
    }
    
    // Attach event listeners
    weekBtn.addEventListener('click', handleFilterChange);
    monthBtn.addEventListener('click', handleFilterChange);
    yearBtn.addEventListener('click', handleFilterChange);
    allBtn.addEventListener('click', handleFilterChange);
    
    // Initial load
    loadTransactions();
});

//ledger.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const categoryFilter = document.getElementById('category-filter');
    const ledgerBody = document.getElementById('ledger-body');
    const ledgerIncomeElement = document.getElementById('ledger-income');
    const ledgerExpensesElement = document.getElementById('ledger-expenses');
    const ledgerBalanceElement = document.getElementById('ledger-balance');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const allAccountsBtn = document.getElementById('all-accounts-btn');
    const cashAccountBtn = document.getElementById('cash-account-btn');
    const bankAccountBtn = document.getElementById('bank-account-btn');
    
    // Current account filter
    let currentAccountFilter = 'all';
    
    // Current expanded/collapsed state
    let expandedMonths = new Set();
    
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDP_A477cu_IDUwthm2oM7_NBOuDDJJ4ME",
        authDomain: "expense-app-95265.firebaseapp.com",
        databaseURL: "https://expense-app-95265-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "expense-app-95265",
        storageBucket: "expense-app-95265.firebasestorage.app",
        messagingSenderId: "269273944121",
        appId: "1:269273944121:web:64e560fa508fe40c5afde8",
        measurementId: "G-MSH6H75HT3"
    };
    
    if (!firebase.apps.length) {firebase.initializeApp(firebaseConfig);}
    const database = firebase.database();
    
    // Helper Functions
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: '2-digit'});}
    
    function formatCurrency(amount) {
        return parseFloat(amount).toFixed(2);}
    
    // Initialize date range (current month)
    function initializeDateRange() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDateInput.valueAsDate = firstDay;
        endDateInput.valueAsDate = today;
    }
    
    // Initialize category filter
    function initializeCategoryFilter() {
        const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'];
        const expenseCategories = ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 
                                 'Healthcare', 'Clothing', 'Education', 'Personal Care', 'Other Expenses'];
        
        const allCategories = [...incomeCategories, ...expenseCategories];
        
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
    
    // Create monthly summary row
    function createMonthlySummaryRow(month, debit, credit, balance, transactionCount) {
        const row = document.createElement('tr');
        row.className = 'period-summary';
        row.dataset.month = month;
        
        const isExpanded = expandedMonths.has(month);
        
        row.innerHTML = `
            <td colspan="4">
                <button class="toggle-month-btn" data-month="${month}">
                    <span class="toggle-icon">${isExpanded ? '−' : '+'}</span>
                    ${month} (${transactionCount} transaction${transactionCount !== 1 ? 's' : ''})
                </button>
            </td>
            <td class="debit">₹${formatCurrency(debit)}</td>
            <td class="credit">₹${formatCurrency(credit)}</td>
            <td class="running-balance" colspan="2">₹${formatCurrency(balance)}</td>
        `;

        return row;
    }
    
    // Create transaction row
    function createTransactionRow(transaction, runningBalance) {
        const row = document.createElement('tr');
        row.className = 'transaction-row';
        row.dataset.month = new Date(transaction.date)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!expandedMonths.has(row.dataset.month)) {
            row.style.display = 'none';
        }
        
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.name}</td>
            <td>${transaction.category}</td>
            <td>${transaction.account || 'Cash'}</td>
            <td class="debit">${transaction.type === 'expense' ? '₹' + formatCurrency(transaction.amount) : ''}</td>
            <td class="credit">${transaction.type === 'income' ? '₹' + formatCurrency(transaction.amount) : ''}</td>
            <td class="running-balance">₹${formatCurrency(runningBalance)}</td>
        `;
        return row;
    }
    
    // funtion to toggle transactions
    function toggleTransactions(id) {
        let row = document.getElementById(id);
        row.style.display = row.style.display === "none" ? "table-row" : "none";
    }
    
    // Update ledger with filtered data
    function updateLedger() {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const selectedCategory = categoryFilter.value;
        
        // Reset monthly data
        monthlyData = {};
        
        database.ref('transactions').orderByChild('date').once('value', (snapshot) => {
            const transactions = [];
            let runningBalance = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            
            // Filter and sort transactions
            snapshot.forEach((childSnapshot) => {
                const transaction = childSnapshot.val();
                transaction.id = childSnapshot.key;
                const transactionDate = new Date(transaction.date);
                
                // Apply filters
                const matchesDate = transactionDate >= startDate && transactionDate <= endDate;
                const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
                const matchesAccount = currentAccountFilter === 'all' || 
                                     (currentAccountFilter === 'cash' && (!transaction.account || transaction.account === 'cash')) ||
                                     (currentAccountFilter === 'bank' && transaction.account === 'bank');
                
                if (matchesDate && matchesCategory && matchesAccount) {
                    transactions.push(transaction);
                }
            });
            
            transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Clear ledger body
            ledgerBody.innerHTML = '';
            
            // Track monthly totals
            let currentMonth = '';
            let monthlyDebit = 0;
            let monthlyCredit = 0;
            let monthlyTransactions = 0;
            
            // Process transactions
            transactions.forEach((transaction) => {
                const transactionMonth = new Date(transaction.date)
                    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                // Handle month change
                if (transactionMonth !== currentMonth) {
                    if (currentMonth !== '') {
                        ledgerBody.appendChild(
                            createMonthlySummaryRow(currentMonth, monthlyDebit, monthlyCredit, runningBalance, monthlyTransactions)
                        );
                    }
                    
                    // Reset monthly totals
                    monthlyDebit = 0;
                    monthlyCredit = 0;
                    monthlyTransactions = 0;
                    currentMonth = transactionMonth;
                }
                
                // Update balances
                if (transaction.type === 'income') {
                    runningBalance += parseFloat(transaction.amount);
                    monthlyCredit += parseFloat(transaction.amount);
                    totalIncome += parseFloat(transaction.amount);
                } else {
                    runningBalance -= parseFloat(transaction.amount);
                    monthlyDebit += parseFloat(transaction.amount);
                    totalExpenses += parseFloat(transaction.amount);
                }
                
                monthlyTransactions++;
                
                // Add transaction row
                ledgerBody.appendChild(createTransactionRow(transaction, runningBalance));
            });
            
            // Add final month summary
            if (currentMonth !== '') {
                ledgerBody.appendChild(
                    createMonthlySummaryRow(currentMonth, monthlyDebit, monthlyCredit, runningBalance, monthlyTransactions)
                );
            }
            
            // Update summary
            ledgerIncomeElement.textContent = `₹${formatCurrency(totalIncome)}`;
            ledgerExpensesElement.textContent = `₹${formatCurrency(totalExpenses)}`;
            ledgerBalanceElement.textContent = `₹${formatCurrency(totalIncome - totalExpenses)}`;
        });
    }
        
    // Export to CSV
    function exportToCSV() {
        const rows = [
            ['Date', 'Description', 'Category', 'Account', 'Reference', 'Debit', 'Credit', 'Balance']
        ];
        
        document.querySelectorAll('.transaction-row').forEach(row => {
            const cells = row.querySelectorAll('td');
            rows.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent,
                cells[5].textContent.replace('₹', ''),
                cells[6].textContent.replace('₹', ''),
                cells[7].textContent.replace('₹', '')
            ]);
        });
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + rows.map(e => e.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Export to PDF
    function exportToPDF() {
        window.print();
    }
    
    // Switch account filter
    function switchAccountFilter(account) {
        currentAccountFilter = account;
        
        // Update active button
        allAccountsBtn.classList.toggle('active', account === 'all');
        cashAccountBtn.classList.toggle('active', account === 'cash');
        bankAccountBtn.classList.toggle('active', account === 'bank');
        
        // Update ledger
        updateLedger();
    }
    
    // Event listeners
    startDateInput.addEventListener('change', updateLedger);
    endDateInput.addEventListener('change', updateLedger);
    categoryFilter.addEventListener('change', updateLedger);
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfBtn.addEventListener('click', exportToPDF);
    allAccountsBtn.addEventListener('click', () => switchAccountFilter('all'));
    cashAccountBtn.addEventListener('click', () => switchAccountFilter('cash'));
    bankAccountBtn.addEventListener('click', () => switchAccountFilter('bank'));
    
    // Initialize
    initializeDateRange();
    initializeCategoryFilter();
    updateLedger();
});

// Initialize Firebase for settings
const settingsFirebaseConfig = {
    apiKey: "AIzaSyDP_A477cu_IDUwthm2oM7_NBOuDDJJ4ME",
    authDomain: "expense-app-95265.firebaseapp.com",
    databaseURL: "https://expense-app-95265-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "expense-app-95265",
    storageBucket: "expense-app-95265.firebasestorage.app",
    messagingSenderId: "269273944121",
    appId: "1:269273944121:web:64e560fa508fe40c5afde8",
    measurementId: "G-MSH6H75HT3"
};

// Initialize Firebase if not already initialized
let database;
try {
    database = firebase.database();
} catch (e) {
    firebase.initializeApp(settingsFirebaseConfig);
    database = firebase.database();
}

function initializeSettings() {
    // Load saved preferences
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('dark-mode').checked = darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    
    // Load categories
    loadCategories();
}

function loadCategories() {
    const incomeCategoriesDiv = document.getElementById('income-categories');
    const expenseCategoriesDiv = document.getElementById('expense-categories');
    
    database.ref('settings/categories').once('value', (snapshot) => {
        const categories = snapshot.val() || {
            income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'],
            expense: ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 
                     'Healthcare', 'Clothing', 'Education', 'Personal Care', 'Other Expenses']
        };
        
        renderCategories(incomeCategoriesDiv, categories.income, 'income');
        renderCategories(expenseCategoriesDiv, categories.expense, 'expense');
    });
}

function renderCategories(container, categories, type) {
    container.innerHTML = '';
    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `
            <span>${category}</span>
            <button onclick="deleteCategory('${type}', '${category}')" 
                    class="delete-btn"
                    ${['Other Income', 'Other Expenses'].includes(category) ? 'disabled' : ''}>
                Delete
            </button>
        `;
        container.appendChild(div);
    });
}

function addCategory(type) {
    const input = document.getElementById(`new-${type}-category`);
    const category = input.value.trim();
    
    if (!category) {
        alert('Please enter a category name');
        return;
    }
    
    database.ref(`settings/categories/${type}`).once('value', (snapshot) => {
        const categories = snapshot.val() || [];
        if (!categories.includes(category)) {
            categories.push(category);
            database.ref(`settings/categories/${type}`).set(categories)
                .then(() => {
                    loadCategories();
                    input.value = '';
                })
                .catch(error => {
                    console.error('Error adding category:', error);
                    alert('Failed to add category');
                });
        } else {
            alert('Category already exists');
        }
    });
}

function deleteCategory(type, category) {
    if (['Other Income', 'Other Expenses'].includes(category)) {
        alert('Default categories cannot be deleted');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the "${category}" category?`)) {
        database.ref(`settings/categories/${type}`).once('value', (snapshot) => {
            const categories = snapshot.val() || [];
            const index = categories.indexOf(category);
            if (index > -1) {
                categories.splice(index, 1);
                database.ref(`settings/categories/${type}`).set(categories)
                    .then(() => {
                        loadCategories();
                    })
                    .catch(error => {
                        console.error('Error deleting category:', error);
                        alert('Failed to delete category');
                    });
            }
        });
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    // Optionally save preference to localStorage
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Load saved preference on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        // Update checkbox in settings if on settings page
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = true;
        }
    }
});

function exportData() {
    database.ref('transactions').once('value', (snapshot) => {
        const transactions = snapshot.val() || {};
        const csvData = convertToCSV(Object.values(transactions));
        downloadCSV(csvData, `finance_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    });
}

function convertToCSV(data) {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category'];
    const rows = data.map(item => [
        item.date,
        item.name.replace(/,/g, ';'), // Replace commas with semicolons to avoid CSV issues
        item.amount,
        item.type,
        item.category
    ]);
    
    return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
}

function downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
        if (confirm('Please confirm again. All your financial data will be permanently deleted.')) {
            database.ref('transactions').remove()
                .then(() => {
                    alert('All data has been cleared successfully');
                })
                .catch(error => {
                    console.error('Error clearing data:', error);
                    alert('Failed to clear data');
                });
        }
    }
}

// Initialize settings when the page loads
document.addEventListener('DOMContentLoaded', initializeSettings);