const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');

router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/filter', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { userId: req.user.id };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/category-breakdown', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = { userId: req.user.id };
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const breakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(breakdown);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/insights', auth, async (req, res) => {
  try {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(currentMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(currentMonthStart);
    lastMonthEnd.setMilliseconds(-1);

    const currentMonthExpenses = await Expense.aggregate([
      {
        $match: {
          userId: req.user.id,
          date: { $gte: currentMonthStart }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const lastMonthExpenses = await Expense.aggregate([
      {
        $match: {
          userId: req.user.id,
          date: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const insights = [];
    
    currentMonthExpenses.forEach(current => {
      const last = lastMonthExpenses.find(l => l._id === current._id);
      if (last) {
        const percentChange = ((current.total - last.total) / last.total) * 100;
        if (Math.abs(percentChange) > 10) {
          insights.push({
            category: current._id,
            message: `You spent ${Math.abs(percentChange).toFixed(0)}% ${percentChange > 0 ? 'more' : 'less'} on ${current._id} this month`,
            percentChange: percentChange.toFixed(2),
            currentAmount: current.total,
            lastAmount: last.total
          });
        }
      }
    });

    res.json(insights);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { amount, category, paymentMethod, date, description } = req.body;

    const expense = new Expense({
      userId: req.user.id,
      amount,
      category,
      paymentMethod,
      date,
      description
    });

    await expense.save();
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/bulk', auth, async (req, res) => {
  try {
    const { expenses } = req.body;
    
    const expensesToAdd = expenses.map(exp => ({
      userId: req.user.id,
      amount: exp.amount,
      category: exp.category,
      paymentMethod: exp.paymentMethod,
      date: exp.date,
      description: exp.description
    }));

    const result = await Expense.insertMany(expensesToAdd);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, category, paymentMethod, date, description } = req.body;

    let expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { amount, category, paymentMethod, date, description },
      { new: true }
    );

    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


