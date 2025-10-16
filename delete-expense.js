import dbConnect from '../../lib/mongodb';
import Expense from '../../models/Expense';

const DELETE_PASSWORD = 'Vaishu1290';

export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    await dbConnect();

    const { expenseId, password } = req.body;

    // Validate required fields
    if (!expenseId || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: expenseId and password' 
      });
    }

    // Validate password
    if (password !== DELETE_PASSWORD) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if expense exists and is not already deleted
    // Handle both new records (with isDeleted field) and old records (without isDeleted field)
    const expense = await Expense.findOne({ 
      _id: expenseId,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } } // Include records where isDeleted field doesn't exist
      ]
    });

    console.log('Delete API - Looking for expense ID:', expenseId);
    console.log('Delete API - Found expense:', expense);

    if (!expense) {
      // Let's also check if the expense exists at all (even if deleted)
      const anyExpense = await Expense.findById(expenseId);
      console.log('Delete API - Any expense with this ID:', anyExpense);
      return res.status(404).json({ message: 'Expense not found or already deleted' });
    }

    // Soft delete the expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      { 
        isDeleted: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('Expense soft deleted:', updatedExpense);

    res.status(200).json({
      message: 'Expense deleted successfully',
      expense: {
        id: updatedExpense._id,
        expenseType: updatedExpense.expenseType,
        amount: updatedExpense.amount,
        isDeleted: updatedExpense.isDeleted,
        splitBetween: updatedExpense.splitBetween
      }
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}
