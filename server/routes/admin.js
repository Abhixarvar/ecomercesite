const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateAdmin } = require('../middleware/auth');

router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    let allOrders = [];
    users.forEach(user => {
      user.orders.forEach(order => {
        allOrders.push({
          ...order,
          customerName: user.username,
          customerEmail: user.email
        });
      });
    });
    
    // Sort by date descending (newest first)
    allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ success: true, orders: allOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
