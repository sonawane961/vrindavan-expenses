import dbConnect from '../../lib/mongodb';
import Expense from '../../models/Expense';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    await dbConnect();

    // Get query parameters
    const { page = 1, limit = 10, expenseType, person } = req.query;
    
    // Build filter object - handle cases where isDeleted might be undefined (old records)
    const baseFilter = { 
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } } // Include records where isDeleted field doesn't exist
      ]
    };
    
    const filter = { ...baseFilter };
    
    if (expenseType) {
      filter.expenseType = expenseType;
    }
    
    if (person) {
      filter.splitBetween = { $in: [person] };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch expenses with pagination
    const expenses = await Expense.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('Filter used:', filter);
    console.log('Expenses found:', expenses.length);
    console.log('Expenses data:', expenses);

    // Get total count for pagination
    const total = await Expense.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalExpenses: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    const stats = summary.length > 0 ? summary[0] : {
      totalAmount: 0,
      totalExpenses: 0,
      averageAmount: 0
    };

    res.status(200).json({
      expenses: expenses.map(expense => ({
        id: expense._id,
        expenseType: expense.expenseType,
        splitBetween: expense.splitBetween,
        note: expense.note,
        amount: expense.amount,
        splitAmount: expense.splitAmount,
        createdAt: expense.createdAt,
        formattedDate: new Date(expense.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalExpenses: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      summary: {
        totalAmount: stats.totalAmount,
        totalExpenses: stats.totalExpenses,
        averageAmount: Math.round(stats.averageAmount * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
