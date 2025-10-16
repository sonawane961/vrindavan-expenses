import dbConnect from '../../lib/mongodb';
import Expense from '../../models/Expense';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    await dbConnect();

    const { expenseType, splitBetween, note, amount } = req.body;

    // Validate required fields
    if (!expenseType || !amount || !splitBetween || splitBetween.length === 0) {
      return res.status(400).json({ 
        message: 'Missing required fields: expenseType, amount, and at least one person for splitBetween' 
      });
    }

    // Validate amount is a positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    // Validate expense type is from allowed list
    const allowedTypes = [
      'fuel',
      'Toll charges',
      'food',
      'local transport',
      'personal',
      'accomodation',
      'entertainment',
      'other'
    ];
    
    if (!allowedTypes.includes(expenseType)) {
      return res.status(400).json({ message: 'Invalid expense type' });
    }

    // Filter out "All" option and validate split between people
    const filteredSplitBetween = splitBetween.filter(person => person !== 'All');
    const allowedPeople = ['Dattu', 'Ganesh', 'Ramkrushna', 'Shubham', 'Jalindar'];
    const invalidPeople = filteredSplitBetween.filter(person => !allowedPeople.includes(person));
    
    if (invalidPeople.length > 0) {
      return res.status(400).json({ 
        message: `Invalid people in split: ${invalidPeople.join(', ')}` 
      });
    }

    if (filteredSplitBetween.length === 0) {
      return res.status(400).json({ 
        message: 'At least one person must be selected for split between' 
      });
    }

    // Create expense object
    const expenseData = {
      expenseType,
      splitBetween: filteredSplitBetween,
      note: note || '',
      amount: amountNum,
      splitAmount: amountNum / filteredSplitBetween.length // Calculate per person amount
    };

    // Save to database
    const expense = new Expense(expenseData);
    const savedExpense = await expense.save();

    console.log('New expense created and saved to database:', savedExpense);
    console.log('Expense data being saved:', expenseData);

    res.status(201).json({
      message: 'Expense created successfully',
      expense: {
        id: savedExpense._id,
        expenseType: savedExpense.expenseType,
        splitBetween: savedExpense.splitBetween,
        note: savedExpense.note,
        amount: savedExpense.amount,
        splitAmount: savedExpense.splitAmount,
        createdAt: savedExpense.createdAt,
        formattedDate: savedExpense.formattedDate
      }
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Expense already exists' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}
