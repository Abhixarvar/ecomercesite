const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
      if (dbUser && dbUser.email === 'abhisarvarshney141204@gmail.com') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Not authorized as admin' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error during admin verification' });
    }
  });
}

module.exports = {
  authenticateToken,
  authenticateAdmin
};
