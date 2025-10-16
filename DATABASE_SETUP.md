# Database Setup Instructions

## MongoDB Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vrindavan-expenses?retryWrites=true&w=majority
```

### Option 2: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/vrindavan-expenses
```

## Installation

1. Install the new dependencies:
```bash
npm install
```

2. Create `.env.local` file with your MongoDB connection string

3. Start the development server:
```bash
npm run dev
```

## Database Schema

The expense collection will be created automatically with the following structure:

```javascript
{
  _id: ObjectId,
  expenseType: String, // fuel, Toll charges, food, etc.
  splitBetween: [String], // Array of people
  note: String,
  amount: Number,
  splitAmount: Number, // Calculated automatically
  createdBy: String,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

- `POST /api/create-expense` - Create a new expense
- The API now saves data to MongoDB instead of just logging to console

## Features Added

- ✅ MongoDB connection with Mongoose
- ✅ Expense schema with validation
- ✅ Automatic split amount calculation
- ✅ Database indexes for performance
- ✅ Error handling for database operations
- ✅ Environment variable configuration
