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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
