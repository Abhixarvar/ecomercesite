const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const sharp = require('sharp');
const nodemailer = require('nodemailer');

// Fisher-Yates shuffle for unbiased randomization
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Get all products
router.get('/', async (req, res) => {
  try {
    let products = await Product.find({});
    products = shuffleArray(products);
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
    const oldProduct = await Product.findById(req.params.id);
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Check if stock was 0 and now is > 0
    if (oldProduct && oldProduct.stock <= 0 && updated.stock > 0) {
      // Find users who have this product in their wishlist
      const users = await User.find({ "wishlist.id": req.params.id });
      
      if (users.length > 0) {
        // Setup Ethereal Email transport
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const emails = users.map(u => u.email).join(', ');
        const info = await transporter.sendMail({
          from: '"Archi Fashion" <noreply@archifashion.com>',
          to: emails,
          subject: `Restock Alert: ${updated.title} is back!`,
          text: `Good news! ${updated.title} is back in stock. Visit our store to purchase it now.`,
          html: `<b>Good news!</b> <p>${updated.title} is back in stock. Visit our store to purchase it now.</p>`
        });
        
        console.log("Restock email sent. Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    }

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error('Error updating product:', err);
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
