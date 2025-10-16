import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: true,
    enum: [
      'fuel',
      'Toll charges',
      'food',
      'local transport',
      'personal',
      'accomodation',
      'entertainment',
      'other'
    ]
  },
  splitBetween: {
    type: [String],
    required: true,
    validate: {
      validator: function(people) {
        const allowedPeople = ['Dattu', 'Ganesh', 'Ramkrushna', 'Shubham', 'Jalindar'];
        return people.length > 0 && people.every(person => allowedPeople.includes(person));
      },
      message: 'Split between must contain at least one valid person'
    }
  },
  note: {
    type: String,
    default: '',
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Amount must be greater than 0'
    }
  },
  splitAmount: {
    type: Number,
    required: true
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate split amount
ExpenseSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('splitBetween')) {
    this.splitAmount = this.amount / this.splitBetween.length;
  }
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
ExpenseSchema.index({ createdAt: -1 });
ExpenseSchema.index({ expenseType: 1 });
ExpenseSchema.index({ splitBetween: 1 });
ExpenseSchema.index({ isDeleted: 1 });

// Virtual for formatted date
ExpenseSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Ensure virtual fields are serialized
ExpenseSchema.set('toJSON', { virtuals: true });

const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

export default Expense;
