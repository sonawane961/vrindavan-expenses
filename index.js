import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    expenseType: '',
    splitBetween: [],
    note: '',
    amount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  const expenseTypes = [
    'fuel',
    'Toll charges',
    'food',
    'local transport',
    'personal',
    'accomodation',
    'entertainment',
    'other'
  ];

  const people = ['Dattu', 'Ganesh', 'Ramkrushna', 'Shubham', 'Jalindar'];
  const allPeople = ['All', ...people];

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true);
      console.log('Fetching expenses...');
      const response = await fetch('/api/expenses?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched expenses data:', data); // Debug log
        console.log('Setting expenses state with:', data.expenses?.length, 'expenses');
        setExpenses(data.expenses || []);
      } else {
        console.error('Failed to fetch expenses:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    
    if (value === 'All') {
      // If "All" is checked, select all people
      if (checked) {
        setFormData(prev => ({
          ...prev,
          splitBetween: [...people]
        }));
      } else {
        // If "All" is unchecked, clear all selections
        setFormData(prev => ({
          ...prev,
          splitBetween: []
        }));
      }
    } else {
      // Handle individual person selection
      setFormData(prev => {
        let newSplitBetween = checked 
          ? [...prev.splitBetween, value]
          : prev.splitBetween.filter(person => person !== value);
        
        return {
          ...prev,
          splitBetween: newSplitBetween
        };
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that at least one person is selected
    if (formData.splitBetween.length === 0) {
      alert('Please select at least one person for split between.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/create-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Expense added successfully!');
        setFormData({
          expenseType: '',
          splitBetween: [],
          note: '',
          amount: ''
        });
        setShowForm(false);
        fetchExpenses(); // Refresh the expenses list
      } else {
        alert('Error adding expense. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error adding expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (expense) => {
    console.log('Delete clicked for expense:', expense);
    setExpenseToDelete(expense);
    setShowPasswordPopup(true);
    setPassword('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      alert('Please enter password');
      return;
    }

    setIsDeleting(true);
    try {
      console.log('Sending delete request for expense ID:', expenseToDelete.id);
      const response = await fetch('/api/delete-expense', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expenseToDelete.id,
          password: password
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Delete successful:', result);
        alert('Expense deleted successfully!');
        setShowPasswordPopup(false);
        setExpenseToDelete(null);
        setPassword('');
        // Small delay to ensure database update is complete
        setTimeout(async () => {
          await fetchExpenses();
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert(errorData.message || 'Error deleting expense. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowPasswordPopup(false);
    setExpenseToDelete(null);
    setPassword('');
  };

  // Calculate spends per person
  const calculateSpendsPerPerson = () => {
    const personTotals = {};
    
    // Initialize all people with 0
    people.forEach(person => {
      personTotals[person] = 0;
    });

    // Calculate total for each person
    expenses.forEach(expense => {
      expense.splitBetween.forEach(person => {
        if (personTotals.hasOwnProperty(person)) {
          personTotals[person] += expense.splitAmount;
        }
      });
    });

    // Convert to array and sort by name
    return people.map(name => ({
      name,
      totalAmount: personTotals[name]
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Prepare expenses data
      const expensesData = expenses.map((expense, index) => ({
        'Sr. No': index + 1,
        'Expense Type': expense.expenseType,
        'Amount': expense.amount,
        'Split Between': expense.splitBetween.join(', '),
        'Split Amount': expense.splitAmount,
        'Note': expense.note,
        'Date': expense.formattedDate
      }));

      // Prepare spends per person data
      const spendsData = calculateSpendsPerPerson().map(person => ({
        'Name': person.name,
        'Total Amount': person.totalAmount
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add expenses sheet
      const expensesWS = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, expensesWS, 'Expenses');
      
      // Add spends per person sheet
      const spendsWS = XLSX.utils.json_to_sheet(spendsData);
      XLSX.utils.book_append_sheet(wb, spendsWS, 'Spends Per Person');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `Vrindavan_Expenses_${dateStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      alert('Expenses exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Vrindavan Expenses Report', 20, 20);
      
      // Date
      doc.setFontSize(12);
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Generated on: ${dateStr}`, 20, 35);

      // Expenses table
      doc.setFontSize(16);
      doc.text('Expenses List', 20, 55);
      
      const expensesTableData = expenses.map((expense, index) => [
        index + 1,
        expense.expenseType,
        `₹${expense.amount}`,
        expense.splitBetween.join(', '),
        `₹${expense.splitAmount.toFixed(2)}`,
        expense.formattedDate
      ]);

      doc.autoTable({
        startY: 65,
        head: [['Sr. No', 'Expense Type', 'Amount', 'Split Between', 'Split Amount', 'Date']],
        body: expensesTableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 20, right: 20 }
      });

      // Spends per person table
      const spendsData = calculateSpendsPerPerson();
      const spendsTableData = spendsData.map(person => [
        person.name,
        `₹${person.totalAmount.toFixed(2)}`
      ]);

      // Add total row
      const totalAmount = spendsData.reduce((sum, person) => sum + person.totalAmount, 0);
      spendsTableData.push(['TOTAL', `₹${totalAmount.toFixed(2)}`]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Name', 'Total Amount']],
        body: spendsTableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 20, right: 20 },
        didParseCell: function(data) {
          if (data.row.index === spendsTableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [243, 244, 246];
          }
        }
      });

      // Generate filename with current date
      const filename = `Vrindavan_Expenses_${now.toISOString().split('T')[0]}.pdf`;

      // Save file
      doc.save(filename);
      
      alert('Expenses exported to PDF successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Vrindavan Expenses</title>
        <meta name="description" content="Manage your Vrindavan trip expenses" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}
      >
        <nav className={styles.navbar}>
          <h1 className={styles.navTitle}>Vrindavan Expenses</h1>
        </nav>
        
        <main className={styles.main}>
          <div className={styles.ctas}>
            <button
              className={styles.primary}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'Add Expense'}
            </button>
            {/* <button
              className={styles.secondary}
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-db');
                  const data = await response.json();
                  console.log('Database test result:', data);
                  alert(`DB Test: ${data.message}\nTotal: ${data.stats?.totalExpenses}\nNon-deleted: ${data.stats?.nonDeletedExpenses}\nFilter test count: ${data.filterTest?.count}\nSample expenses: ${JSON.stringify(data.sampleExpenses, null, 2)}`);
                } catch (error) {
                  console.error('DB test error:', error);
                  alert('Database test failed');
                }
              }}
            >
              Test DB
            </button> */}
            <button
              className={styles.secondary}
              onClick={fetchExpenses}
            >
              Refresh Table
            </button>
          </div>

          {showForm && (
            <form className={styles.expenseForm} onSubmit={handleSubmit}>
              <h2>Add New Expense</h2>
              
              <div className={styles.formGroup}>
                <label htmlFor="expenseType">Expense Type:</label>
                <select
                  id="expenseType"
                  name="expenseType"
                  value={formData.expenseType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select expense type</option>
                  {expenseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Split Between:</label>
                <div className={styles.checkboxGroup}>
                  {allPeople.map(person => (
                    <label 
                      key={person} 
                      className={`${styles.checkboxLabel} ${person === 'All' ? styles.allOption : ''}`}
                    >
                      <input
                        type="checkbox"
                        value={person}
                        checked={
                          person === 'All' 
                            ? formData.splitBetween.length === people.length
                            : formData.splitBetween.includes(person)
                        }
                        onChange={handleCheckboxChange}
                      />
                      <span>{person}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="note">Note:</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Add any remarks..."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="amount">Amount:</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          )}

          {/* Expenses Table */}
          <div className={styles.expensesTable}>
            <h2>Expenses List ({expenses.length} expenses)</h2>
            {isLoadingExpenses ? (
              <p className={styles.noExpenses}>Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className={styles.noExpenses}>No expenses found. Add your first expense above!</p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sr. No</th>
                      <th>Expense Type</th>
                      <th>Amount</th>
                      <th>Split Between</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, index) => (
                      <tr key={expense.id}>
                        <td>{index + 1}</td>
                        <td>{expense.expenseType}</td>
                        <td>₹{expense.amount}</td>
                        <td>{expense.splitBetween.join(', ')}</td>
                        <td>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteClick(expense)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Spends Per Person Table */}
          <div className={styles.spendsPerPerson}>
            <h2>Spends Per Person</h2>
            {isLoadingExpenses ? (
              <p className={styles.noExpenses}>Loading calculations...</p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateSpendsPerPerson().map((personSpend, index) => (
                      <tr key={personSpend.name}>
                        <td>{personSpend.name}</td>
                        <td>₹{personSpend.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td><strong>Total</strong></td>
                      <td><strong>₹{calculateSpendsPerPerson().reduce((sum, person) => sum + person.totalAmount, 0).toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export Buttons */}
          <div className={styles.exportSection}>
            <h2>Export Data</h2>
            <div className={styles.exportButtons}>
              <button
                className={styles.exportBtn}
                onClick={exportToExcel}
                disabled={expenses.length === 0}
              >
                📊 Export to Excel
              </button>
              <button
                className={styles.exportBtn}
                onClick={exportToPDF}
                disabled={expenses.length === 0}
              >
                📄 Export to PDF
              </button>
            </div>
            {expenses.length === 0 && (
              <p className={styles.exportHint}>Add some expenses to enable export functionality</p>
            )}
          </div>
        </main>

        {/* Password Popup */}
        {showPasswordPopup && (
          <div className={styles.popupOverlay}>
            <div className={styles.popup}>
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete this expense?</p>
              <p><strong>Expense:</strong> {expenseToDelete?.expenseType} - ₹{expenseToDelete?.amount}</p>
              <form onSubmit={handlePasswordSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="password">Enter Password:</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className={styles.popupActions}>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.primary}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
      </div>
    </>
  );
}
