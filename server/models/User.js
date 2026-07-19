const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  picture: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  cart: {
    type: Array,
    default: []
  },
  wishlist: {
    type: Array,
    default: []
  },
  orders: {
    type: Array,
    default: []
  }
});

module.exports = mongoose.model('User', userSchema);
