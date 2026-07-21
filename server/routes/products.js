const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateAdmin } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const upload = multer({ storage: multer.memoryStorage() });

// Get all products
router.get('/', async (req, res) => {
  try {
    let products = await Product.find({});
    // Shuffle array randomly
    products = products.sort(() => 0.5 - Math.random());
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a product
router.post('/', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    let imageBase64 = '';
    if (req.file) {
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      imageBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    }

    const newProduct = new Product({
      title: req.body.title,
      category: req.body.category,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      image: imageBase64
    });

    await newProduct.save();
    res.json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Update a product
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a product
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
