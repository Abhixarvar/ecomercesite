const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticateAdmin } = require('../middleware/auth');

// Get active announcement (Public)
router.get('/active', async (req, res) => {
  try {
    const activeAnnouncement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, announcement: activeAnnouncement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all announcements (Admin)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create announcement (Admin)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    // If this one is active, deactivate all others
    if (req.body.isActive) {
      await Announcement.updateMany({}, { isActive: false });
    }
    
    const newAnnouncement = new Announcement({
      message: req.body.message,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    await newAnnouncement.save();
    res.json({ success: true, announcement: newAnnouncement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle active status (Admin)
router.put('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const target = await Announcement.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    // If we are activating this one, deactivate all others
    if (!target.isActive) {
      await Announcement.updateMany({}, { isActive: false });
    }
    
    target.isActive = !target.isActive;
    await target.save();
    
    res.json({ success: true, announcement: target });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete announcement (Admin)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
