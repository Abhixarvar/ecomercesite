const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');

// Cart Routes
router.get('/cart', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/cart', authenticateToken, async (req, res) => {
  try {
    const product = req.body;
    
    // Check and update stock
    const productDb = await Product.findById(product.id);
    if (!productDb) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (productDb.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Out of stock' });
    }
    productDb.stock -= 1;
    await productDb.save();

    await User.findByIdAndUpdate(req.user.id, { $push: { cart: product } });
    const user = await User.findById(req.user.id);
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/cart/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const user = await User.findById(req.user.id);
    
    // Find how many instances of this product we are removing
    const removedCount = user.cart.filter(item => item.id === productId).length;
    
    if (removedCount > 0) {
      user.cart = user.cart.filter(item => item.id !== productId);
      await user.save();
      
      // Increment stock back
      const productDb = await Product.findById(productId);
      if (productDb) {
        productDb.stock += removedCount;
        await productDb.save();
      }
    }
    
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Wishlist Routes
router.get('/wishlist', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/wishlist', authenticateToken, async (req, res) => {
  try {
    const product = req.body;
    const user = await User.findById(req.user.id);
    const exists = user.wishlist.some(item => item.id === product.id);
    if (!exists) {
      user.wishlist.push(product);
      await user.save();
    }
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/wishlist/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(item => item.id !== productId);
    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Orders Routes
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, orders: user.orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { address, phone } = req.body;
    
    if (!address || !phone) {
      return res.status(400).json({ success: false, message: 'Address and Phone number are required' });
    }

    const user = await User.findById(req.user.id);
    if (user.cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Create a new order object
    const newOrder = {
      orderId: 'ORD-' + Math.floor(Math.random() * 1000000),
      date: new Date(),
      items: user.cart,
      total: user.cart.reduce((sum, item) => sum + (parseFloat(item.price.toString().replace(/[^0-9.-]+/g,"")) || 0), 0),
      address: address,
      phone: phone
    };
    
    user.orders.unshift(newOrder);
    user.cart = [];
    await user.save();
    
    res.json({ success: true, orders: user.orders, cart: user.cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during checkout' });
  }
});

module.exports = router;
