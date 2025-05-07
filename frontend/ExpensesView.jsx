// src/pages/ExpensesView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion'; // Added framer-motion
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, PlusCircle, X as IconX } from 'lucide-react'; // Added PlusCircle, IconX

// --- Helper Functions ---
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format date as YYYY-MM-DD for input type="date"
const formatDateForInput = (date) => {
    if (!date) date = new Date(); // Default to today if no date provided
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString) => {
     if (!dateString) return '';
     try {
          return new Date(dateString).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
          });
     } catch (e) { return dateString; }
};

const getAuthToken = () => localStorage.getItem("token");
// --- End Helper Functions ---


const ExpensesView = () => {
  // State for data, loading, errors
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]); // Use accounts state for both filter and modal
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
    accountId: 'All',
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    limit: 10,
  });

  // State for Manual Transaction Modal
  const [isManualTxModalOpen, setIsManualTxModalOpen] = useState(false);
  const [manualTxData, setManualTxData] = useState({
      accountId: '',
      type: 'debit', // Default to debit
      amount: '',
      category: '',
      date: formatDateForInput(new Date()), // Default to today
      description: '',
  });
  const [modalError, setModalError] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Fetch accounts (needed for filters AND manual transaction modal)
  const fetchAccounts = useCallback(async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
          const response = await axios.get("http://localhost:5000/api/accounts", {
              headers: { Authorization: `Bearer ${token}` }
          });
          setAccounts(response.data || []);
      } catch (err) {
          console.error("Error fetching accounts:", err);
          setError("Could not load accounts for filtering/selection."); // Inform user
      }
  }, []);


  // Fetch transactions when filters or page change
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous general errors
    const token = getAuthToken();
    if (!token) {
      setError("Authentication token not found.");
      setIsLoading(false);
      return;
    }

    const params = {
      page: pagination.currentPage,
      limit: pagination.limit,
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.category !== 'All' && { category: filters.category }),
      ...(filters.accountId !== 'All' && { accountId: filters.accountId }),
       type: 'debit' // Fetch only expenses for this view
    };

    try {
      const response = await axios.get("http://localhost:5000/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });
      setTransactions(response.data.transactions || []);
      setPagination(prev => ({
          ...prev,
          totalPages: response.data.pagination.totalPages,
          totalTransactions: response.data.pagination.totalTransactions,
          currentPage: response.data.pagination.currentPage,
      }));
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err.response?.data?.message || "Failed to load transactions.");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]); // Dependencies


  // Initial fetch for accounts and transactions
  useEffect(() => {
    fetchAccounts(); // Fetch accounts first
  }, [fetchAccounts]);

  useEffect(() => {
      // Fetch transactions only after accounts potentially loaded (or if accounts fetch failed)
      // This avoids potential issues if filter depends on accounts
      if (accounts.length > 0 || error) { // Proceed if accounts loaded or if there was an error loading them
        fetchTransactions();
      }
  }, [fetchTransactions, accounts, error]); // Add accounts and error as dependencies


  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle pagination changes
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  // --- Calculate data for charts ---
  const { areaChartData, pieChartData, categories } = useMemo(() => {
     const currentCategories = ['All', ...new Set(transactions.map(tx => tx.category))];

     const expenseByDate = transactions.reduce((acc, tx) => {
       const dateStr = formatDateForDisplay(tx.date);
       acc[dateStr] = (acc[dateStr] || 0) + tx.amount;
       return acc;
     }, {});
     const areaData = Object.entries(expenseByDate)
                           .map(([date, amount]) => ({ date, amount }))
                           .sort((a, b) => new Date(a.date) - new Date(b.date));


     const expenseByCategory = transactions.reduce((acc, tx) => {
       acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
       return acc;
     }, {});
     const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

     return { areaChartData: areaData, pieChartData: pieData, categories: currentCategories };

  }, [transactions]);

  // --- Manual Transaction Modal Handlers ---
  const handleManualFormChange = (e) => {
      const { name, value } = e.target;
      setManualTxData(prev => ({ ...prev, [name]: value }));
      setModalError(''); // Clear error on change
  };

  const handleManualSubmit = async (e) => {
      e.preventDefault();
      setModalError('');
      setIsSubmittingManual(true);

      // Basic Validation
      const { accountId, type, amount, category, date } = manualTxData;
      if (!accountId || !type || !amount || !category || !date || parseFloat(amount) <= 0) {
          setModalError('Please fill all required fields (Account, Type, Amount, Category, Date) with a valid positive amount.');
          setIsSubmittingManual(false);
          return;
      }

      const token = getAuthToken();
      if (!token) {
          setModalError('Authentication error. Please log in again.');
          setIsSubmittingManual(false);
          return;
      }
      console.log("Selected Account ID:", manualTxData.accountId);
    console.log("Available accounts for user:", accounts);
      try {
          await axios.post(
              "http://localhost:5000/api/transactions",
              { ...manualTxData, source: 'manual' }, // Send form data + source: manual
              { headers: { Authorization: `Bearer ${token}` } }
          );

          // Success
          setIsManualTxModalOpen(false);
          setManualTxData({ // Reset form
              accountId: '', type: 'debit', amount: '', category: '',
              date: formatDateForInput(new Date()), description: '',
          });
          fetchTransactions(); // Refresh the transaction list

      } catch (err) {
          console.error("Error adding manual transaction:", err);
          setModalError(err.response?.data?.message || "Failed to record transaction.");
      } finally {
          setIsSubmittingManual(false);
      }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#F97316'];

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Filter Expenses</h3>
            {/* Add Manual Transaction Button */}
            <button
                onClick={() => setIsManualTxModalOpen(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center text-sm"
            >
                <PlusCircle size={18} className="mr-1" /> Add Manual Tx
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Filter Inputs */}
          <div>
            <label htmlFor="startDate" className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-gray-600 mb-1">End Date</label>
            <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"/>
          </div>
          <div>
             <label htmlFor="accountIdFilter" className="block text-sm text-gray-600 mb-1">Account</label> {/* Changed id */}
             <select id="accountIdFilter" name="accountId" value={filters.accountId} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="All">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.bankName} (...{acc.accountNumber?.slice(-4)})
                </option>
              ))}
            </select>
          </div>
           <div>
            <label htmlFor="category" className="block text-sm text-gray-600 mb-1">Category</label>
            <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

       {/* Loading and Error States */}
       {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            <p className="ml-3 text-gray-600">Loading expenses...</p>
          </div>
       )}
        {error && !isLoading && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
            <strong className="font-bold mr-2"><AlertTriangle className="inline w-5 h-5 mr-1"/> Error!</strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}


      {/* Graphs (only render if not loading and no error and transactions exist) */}
      {!isLoading && !error && transactions.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses Over Time</h3>
                    <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                         <XAxis dataKey="date" fontSize={10} />
                         <YAxis fontSize={10} tickFormatter={(value) => `₹${value/1000}k`} />
                         <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="amount" stroke="#DC2626" fill="#FECACA" fillOpacity={0.6} /> {/* Red color for expenses */}
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                </div>

                 <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Category</h3>
                    <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${formatCurrency(value)}`, name]}/>
                         <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>
          </>
      )}

      {/* Transaction List */}
      {!isLoading && !error && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense History</h3>
            {transactions.length > 0 ? (
                <>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Added max-height and scroll */}
                        {transactions.map(tx => (
                            <div key={tx._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b last:border-b-0 hover:bg-gray-50 rounded-lg">
                            <div className="flex-1 mb-2 sm:mb-0 sm:mr-3">
                                <p className="font-medium text-gray-800 capitalize">{tx.category}</p>
                                <p className="text-sm text-gray-600 truncate">{tx.description || '-'}</p>
                                {tx.account && (
                                    <p className="text-xs text-gray-400">{tx.account.bankName} (...{tx.account.accountNumber?.slice(-4)})</p>
                                )}
                                <p className="text-xs text-gray-400">{formatDateForDisplay(tx.date)}</p>
                                {tx.source === 'manual' && <span className="text-xs text-blue-500 italic">(Manual)</span>} {/* Indicate manual entry */}
                            </div>
                            <div className="font-semibold text-red-600 text-right w-full sm:w-auto">
                                -{formatCurrency(tx.amount)}
                            </div>
                            </div>
                        ))}
                    </div>

                     {/* Pagination Controls */}
                     <div className="flex justify-between items-center mt-6 text-sm">
                        <span className="text-gray-600">
                            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTransactions} items)
                        </span>
                        <div className="space-x-2">
                            <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1 || isLoading} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ChevronLeft size={18} />
                            </button>
                            <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages || isLoading} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                     </div>
                </>
            ) : (
                <p className="text-gray-500 text-center py-10">No expenses found matching your filters.</p>
            )}
          </div>
       )}

       {/* Manual Transaction Modal */}
        <AnimatePresence>
           {isManualTxModalOpen && (
               <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                   onClick={() => setIsManualTxModalOpen(false)} // Close on backdrop click
               >
                   <motion.div
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                       className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" // Increased max-width
                       onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                   >
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="text-lg font-semibold text-gray-800">Add Manual Transaction</h3>
                           <button onClick={() => setIsManualTxModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                               <IconX size={24} />
                           </button>
                       </div>
                       <p className="text-xs text-gray-500 mb-4">Record a past transaction (e.g., cash payment) that wasn't automatically tracked. This will not affect your current account balance.</p>
                       {modalError && <p className='text-red-500 text-sm mb-3 bg-red-50 p-2 rounded'>{modalError}</p>}

                       <form onSubmit={handleManualSubmit} className="space-y-4">
                           {/* Account Selection */}
                           <div>
                               <label htmlFor="accountIdModal" className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                               <select
                                   id="accountIdModal" name="accountId"
                                   value={manualTxData.accountId}
                                   onChange={handleManualFormChange}
                                   required
                                   className="w-full p-2 border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                               >
                                   <option value="" disabled>-- Select Account --</option>
                                   {accounts.map(acc => (
                                       <option key={acc._id} value={acc._id}>
                                           {acc.bankName} (...{acc.accountNumber?.slice(-4)})
                                       </option>
                                   ))}
                               </select>
                           </div>

                            {/* Type (Debit/Credit) */}
                            <div className="flex items-center space-x-4">
                               <span className="text-sm font-medium text-gray-700">Type *:</span>
                                <label className="flex items-center">
                                    <input type="radio" name="type" value="debit" checked={manualTxData.type === 'debit'} onChange={handleManualFormChange} required className="mr-1"/> Debit
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="type" value="credit" checked={manualTxData.type === 'credit'} onChange={handleManualFormChange} className="mr-1"/> Credit
                                </label>
                           </div>

                           {/* Amount */}
                           <div>
                               <label htmlFor="amountModal" className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                               <input
                                   id="amountModal" name="amount" type="number" step="0.01" min="0.01"
                                   value={manualTxData.amount} onChange={handleManualFormChange} required
                                   placeholder="Enter amount"
                                   className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                               />
                           </div>

                           {/* Category */}
                           <div>
                               <label htmlFor="categoryModal" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                               <input
                                   id="categoryModal" name="category" type="text"
                                   value={manualTxData.category} onChange={handleManualFormChange} required
                                   placeholder="e.g., Groceries, Salary, Cash Withdrawl"
                                   className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                               />
                               {/* Optional: Add datalist for categories here */}
                           </div>

                           {/* Date */}
                           <div>
                               <label htmlFor="dateModal" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                               <input
                                   id="dateModal" name="date" type="date"
                                   value={manualTxData.date} onChange={handleManualFormChange} required
                                   className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                               />
                           </div>

                           {/* Description */}
                           <div>
                               <label htmlFor="descriptionModal" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                               <textarea
                                   id="descriptionModal" name="description" rows="2"
                                   value={manualTxData.description} onChange={handleManualFormChange}
                                   placeholder="Add a note about the transaction"
                                   className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                               ></textarea>
                           </div>

                           {/* Submit Button */}
                           <button
                               type="submit"
                               disabled={isSubmittingManual}
                               className={`w-full ${isSubmittingManual ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center`}
                           >
                               {isSubmittingManual ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                               {isSubmittingManual ? 'Recording...' : 'Record Transaction'}
                           </button>
                       </form>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>

    </div>
  );
};

export default ExpensesView;