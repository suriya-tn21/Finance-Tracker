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
    
    // Set default date to today
    dateInput.valueAsDate = new Date();
    
    // Categories
    const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'];
    const expenseCategories = ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Clothing', 'Education', 'Personal Care', 'Other Expenses'];
    
    // Initialize category selects
    function updateCategoryOptions() {
        categorySelect.innerHTML = '';
        const categories = typeSelect.value === 'income' ? incomeCategories : expenseCategories;
        
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
        
        const allCategories = [...incomeCategories, ...expenseCategories];
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategorySelect.appendChild(option);
        });
    }
    
    // Initialization
    updateCategoryOptions();
    initFilterCategories();
    typeSelect.addEventListener('change', updateCategoryOptions);
    
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
            firebase.initializeApp(this.firebaseConfig);
            this.database = firebase.database();
            
            // Show loading indicator (optional)
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
            
            // Save to Firebase
            this.database.ref('transactions/' + transaction.id).set(transaction)
                .catch(error => {
                    console.error("Error adding transaction:", error);
                    alert("Failed to add transaction. Please check your internet connection.");
                });
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
                
                // Format amount with $ and correct color
                const amountFormatted = `$${parseFloat(transaction.amount).toFixed(2)}`;
                const amountClass = transaction.type === 'income' ? 'income' : 'expense';
                
                row.innerHTML = `
                    <td>${transaction.name}</td>
                    <td class="${amountClass}">${transaction.type === 'income' ? amountFormatted : `-${amountFormatted}`}</td>
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
            
            this.transactions.forEach(transaction => {
                if (transaction.type === 'income') {
                    totalIncome += parseFloat(transaction.amount);
                } else {
                    totalExpenses += parseFloat(transaction.amount);
                }
            });
            
            const balance = totalIncome - totalExpenses;
            
            totalIncomeElement.textContent = `$${totalIncome.toFixed(2)}`;
            totalExpensesElement.textContent = `$${totalExpenses.toFixed(2)}`;
            balanceElement.textContent = `$${balance.toFixed(2)}`;
            
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
        
        // Create transaction object
        const transaction = {
            name,
            amount,
            type,
            category,
            date
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
                    date: dateInput.value
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