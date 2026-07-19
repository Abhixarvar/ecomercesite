require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 5000;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Verify Google Token Helper
async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

// Generate JWT Helper
function generateJWT(user) {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
}

// ---------------------------
// API ROUTES
// ---------------------------

// 1. Google Auth Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const payload = await verifyGoogleToken(token);
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user already exists in DB
    let user = await User.findOne({ googleId });
    
    if (user) {
      // User exists, login and return JWT
      const authToken = generateJWT(user);
      return res.json({
        success: true,
        isNewUser: false,
        token: authToken,
        user: { username: user.username, email: user.email, picture: user.picture }
      });
    } else {
      // New user! We need them to pick a username first.
      // We will return the google info so the frontend can prompt for a username.
      return res.json({
        success: true,
        isNewUser: true,
        googleData: { googleId, email, picture, name }
      });
    }
    
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
});

// 2. Register New User (Complete Profile)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { googleId, email, picture, username } = req.body;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ success: false, message: 'Username is mandatory' });
    }
    
    // Create new user in DB
    const newUser = new User({
      googleId,
      email,
      username,
      picture
    });
    
    await newUser.save();
    
    // Generate JWT
    const authToken = generateJWT(newUser);
    
    res.json({
      success: true,
      token: authToken,
      user: { username: newUser.username, email: newUser.email, picture: newUser.picture }
    });
    
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Username might be taken.' });
  }
});

app.get('/api/auth/verify-admin', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Admin verified' });
});

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, async () => {
    try {
      const dbUser = await User.findById(req.user.id);
      if (dbUser && dbUser.email === process.env.ADMIN_EMAIL) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Not authorized as admin' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error during admin verification' });
    }
  });
}

// 3. Cart Routes
app.get('/api/user/cart', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/user/cart', authenticateToken, async (req, res) => {
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

app.delete('/api/user/cart/:id', authenticateToken, async (req, res) => {
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

// 4. Wishlist Routes
app.get('/api/user/wishlist', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/user/wishlist', authenticateToken, async (req, res) => {
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

app.delete('/api/user/wishlist/:id', authenticateToken, async (req, res) => {
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

// 6. Admin / Product Routes
app.get('/api/products', async (req, res) => {
  try {
    let products = await Product.find({});
    // Shuffle array randomly
    products = products.sort(() => 0.5 - Math.random());
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/products', authenticateAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

app.put('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/products/:id', authenticateAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 5. Orders Routes
app.get('/api/user/orders', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, orders: user.orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/user/checkout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    
    // Create a new order object
    const newOrder = {
      orderId: 'ORD-' + Math.floor(Math.random() * 1000000),
      date: new Date(),
      items: user.cart,
      total: user.cart.reduce((sum, item) => sum + (parseFloat(item.price.toString().replace(/[^0-9.-]+/g,"")) || 0), 0)
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
