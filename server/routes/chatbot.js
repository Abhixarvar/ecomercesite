const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid message' });
    }

    // A very basic keyword extraction: split by space, remove common stop words, build a regex
    const stopWords = ['i', 'want', 'looking', 'for', 'a', 'an', 'the', 'some', 'any', 'find', 'show', 'me', 'can', 'you'];
    const words = message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const keywords = words.filter(w => w.length > 2 && !stopWords.includes(w));

    if (keywords.length === 0) {
      return res.json({ 
        success: true, 
        reply: "Hi there! What kind of clothing are you looking for today? (e.g., Saree, Lehenga, Kurta)",
        products: []
      });
    }

    // Create a regex to match any of the keywords
    const regex = new RegExp(keywords.join('|'), 'i');

    // Search in title and category
    const products = await Product.find({
      $or: [
        { title: { $regex: regex } },
        { category: { $regex: regex } }
      ]
    }).limit(4);

    if (products.length > 0) {
      return res.json({
        success: true,
        reply: "I found some items you might like:",
        products
      });
    } else {
      return res.json({
        success: true,
        reply: "I couldn't find exactly what you're looking for, but you can browse our collections to discover our latest arrivals!",
        products: []
      });
    }

  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
