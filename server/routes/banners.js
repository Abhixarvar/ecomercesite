const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { authenticateAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const sharp = require('sharp');

// Public: Get all active banners (for landing page slideshow)
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (err) {
    console.error('Error fetching active banners:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Get all banners (including inactive)
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (err) {
    console.error('Error fetching admin banners:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Add a banner image
router.post('/', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    let imageBase64 = req.body.imageUrl || '';

    if (req.file) {
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 1920, height: 1080, fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      imageBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Banner image is required.' });
    }

    const count = await Banner.countDocuments();

    const newBanner = new Banner({
      title: req.body.title || '',
      subtitle: req.body.subtitle || '',
      image: imageBase64,
      linkUrl: req.body.linkUrl || '#collection',
      buttonText: req.body.buttonText || 'Shop Collection',
      order: req.body.order !== undefined ? Number(req.body.order) : count,
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' || req.body.isActive === true : true
    });

    await newBanner.save();
    res.json({ success: true, banner: newBanner });
  } catch (err) {
    console.error('Error adding banner:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Admin: Update banner
router.put('/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle;
    if (req.body.linkUrl !== undefined) updateData.linkUrl = req.body.linkUrl;
    if (req.body.buttonText !== undefined) updateData.buttonText = req.body.buttonText;
    if (req.body.order !== undefined) updateData.order = Number(req.body.order);
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    if (req.file) {
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 1920, height: 1080, fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      updateData.image = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    } else if (req.body.imageUrl) {
      updateData.image = req.body.imageUrl;
    }

    const updated = await Banner.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, banner: updated });
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Toggle active state
router.put('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    
    banner.isActive = !banner.isActive;
    await banner.save();
    res.json({ success: true, banner });
  } catch (err) {
    console.error('Error toggling banner state:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Delete banner
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
