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

//--------------------------------------------------------------------------------------------------------------
//ledger.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const categoryFilter = document.getElementById('category-filter');
    const ledgerBody = document.getElementById('ledger-body');
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
        return new Date(dateString).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: '2-digit'});
    }
    
    function formatCurrency(amount) {
        return parseFloat(amount).toFixed(2);
    }
    
    // Initialize date range (current month)
    function initializeDateRange() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDateInput.valueAsDate = firstDay;
        endDateInput.valueAsDate = today;
    }
    
    // Initialize category filter
    function initializeCategoryFilter() {
        const incomeCategories = ['Family','Salary', 'Investments', 'Gifts', 'Freelance', 'Other Income'];
        const expenseCategories = ['Food', 'Transportation', 'Entertainment', 'Utilities', 
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
        const balanceClass = parseFloat(balance) >= 0 ? 'positive' : 'negative';
        
        row.innerHTML = `
            <td colspan="4">
                <button class="toggle-month-btn" data-month="${month}">
                    <span class="toggle-icon">${isExpanded ? '−' : '+'}</span>
                    ${month} (${transactionCount} transaction${transactionCount !== 1 ? 's' : ''})
                </button>
            </td>
            <td class="debit">₹${formatCurrency(debit)}</td>
            <td class="credit">₹${formatCurrency(credit)}</td>
            <td class="running-balance ${balanceClass}">₹${formatCurrency(balance)}</td>
        `;
        
        // Add event listener to the toggle button
        row.querySelector('.toggle-month-btn').addEventListener('click', function() {
            const month = this.dataset.month;
            const isExpanded = expandedMonths.has(month);
            
            if (isExpanded) {
                expandedMonths.delete(month);
                this.querySelector('.toggle-icon').textContent = '+';
            } else {
                expandedMonths.add(month);
                this.querySelector('.toggle-icon').textContent = '−';
            }
            
            // Toggle visibility of transaction rows for this month
            document.querySelectorAll(`.transaction-row[data-month="${month}"]`).forEach(tr => {
                tr.style.display = expandedMonths.has(month) ? 'table-row' : 'none';
            });
        });
    
        return row;
    }
    
    
    // Create transaction row
    function createTransactionRow(transaction, runningBalance) {
        const row = document.createElement('tr');
        row.className = 'transaction-row';
        row.dataset.month = new Date(transaction.date)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // Set initial visibility based on expandedMonths
        row.style.display = expandedMonths.has(row.dataset.month) ? 'table-row' : 'none';
        
        // Determine balance class
        const balanceClass = parseFloat(runningBalance) >= 0 ? 'positive' : 'negative';
        
        // Create row content
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.name}</td>
            <td>${transaction.category}</td>
            <td>${transaction.account || 'Cash'}</td>
            <td class="debit">${transaction.type === 'expense' ? '₹' + formatCurrency(transaction.amount) : ''}</td>
            <td class="credit">${transaction.type === 'income' ? '₹' + formatCurrency(transaction.amount) : ''}</td>
            <td class="running-balance ${balanceClass}">₹${formatCurrency(runningBalance)}</td>
        `;
        return row;
    }
    
    
    // Update ledger with filtered data
    function updateLedger() {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const selectedCategory = categoryFilter.value;
        
        database.ref('transactions').once('value', (snapshot) => {
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
            
            // Add totals at the bottom if needed
            if (document.getElementById('ledger-income') && document.getElementById('ledger-expenses') && document.getElementById('ledger-balance')) {
                document.getElementById('ledger-income').textContent = `₹${formatCurrency(totalIncome)}`;
                document.getElementById('ledger-expenses').textContent = `₹${formatCurrency(totalExpenses)}`;
                document.getElementById('ledger-balance').textContent = `₹${formatCurrency(totalIncome - totalExpenses)}`;
            }
        });
    }
        
    // Export to CSV
    function exportToCSV() {
        const rows = [
            ['Date', 'Description', 'Category', 'Account', 'Debit', 'Credit', 'Balance']
        ];
        
        document.querySelectorAll('.transaction-row').forEach(row => {
            const cells = row.querySelectorAll('td');
            rows.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent.replace('₹', ''),
                cells[5].textContent.replace('₹', ''),
                cells[6].textContent.replace('₹', '')
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


//--------------------------------------------------------------------------------------------------------------
// analytics.html
