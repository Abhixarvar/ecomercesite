require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

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
    user.cart = user.cart.filter(item => item.id !== productId);
    await user.save();
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
