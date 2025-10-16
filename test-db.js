import dbConnect from '../../lib/mongodb';
import Expense from '../../models/Expense';

export default async function handler(req, res) {
  try {
    // Connect to database
    await dbConnect();
    
    // Test database connection and count
    const totalExpenses = await Expense.countDocuments();
    const nonDeletedExpenses = await Expense.countDocuments({ isDeleted: false });
    const deletedExpenses = await Expense.countDocuments({ isDeleted: true });
    
    // Get a sample of expenses
    const sampleExpenses = await Expense.find().limit(5).lean();
    
    // Test the exact filter used in expenses API
    const filterTest = { isDeleted: false };
    const filteredExpenses = await Expense.find(filterTest).lean();
    
    res.status(200).json({
      message: 'Database connection successful',
      stats: {
        totalExpenses,
        nonDeletedExpenses,
        deletedExpenses
      },
      filterTest: {
        filter: filterTest,
        count: filteredExpenses.length
      },
      sampleExpenses: sampleExpenses.map(expense => ({
        id: expense._id,
        expenseType: expense.expenseType,
        amount: expense.amount,
        isDeleted: expense.isDeleted,
        splitBetween: expense.splitBetween,
        createdAt: expense.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error.message 
    });
  }
}
