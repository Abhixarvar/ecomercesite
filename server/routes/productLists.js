const express = require('express');
const router = express.Router();
const ProductList = require('../models/ProductList');
const { authenticateAdmin } = require('../middleware/auth');

// Public: Get active product lists with populated product data
router.get('/', async (req, res) => {
  try {
    const lists = await ProductList.find({ isActive: true })
      .populate('products')
      .sort({ order: 1, createdAt: -1 });

    // Filter out lists that have no products or null populated products
    const validLists = lists.map(list => {
      const obj = list.toObject();
      obj.products = (obj.products || []).filter(p => p !== null);
      return obj;
    }).filter(list => list.products.length > 0);

    res.json({ success: true, lists: validLists });
  } catch (err) {
    console.error('Error fetching active product lists:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Get all product lists (including inactive)
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const lists = await ProductList.find({})
      .populate('products')
      .sort({ order: 1, createdAt: -1 });
      
    res.json({ success: true, lists });
  } catch (err) {
    console.error('Error fetching admin product lists:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Create a new product list
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, badgeText, products, order, isActive } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'List title is required.' });
    }

    const count = await ProductList.countDocuments();

    const newList = new ProductList({
      title: title.trim(),
      description: description ? description.trim() : '',
      badgeText: badgeText ? badgeText.trim() : '',
      products: Array.isArray(products) ? products : [],
      order: order !== undefined ? Number(order) : count,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await newList.save();
    const populated = await ProductList.findById(newList._id).populate('products');

    res.json({ success: true, list: populated });
  } catch (err) {
    console.error('Error creating product list:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Admin: Update product list
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, badgeText, products, order, isActive } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (badgeText !== undefined) updateData.badgeText = badgeText.trim();
    if (products !== undefined && Array.isArray(products)) updateData.products = products;
    if (order !== undefined) updateData.order = Number(order);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await ProductList.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('products');

    res.json({ success: true, list: updated });
  } catch (err) {
    console.error('Error updating product list:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Toggle list active state
router.put('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const list = await ProductList.findById(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    
    list.isActive = !list.isActive;
    await list.save();
    const populated = await ProductList.findById(list._id).populate('products');
    res.json({ success: true, list: populated });
  } catch (err) {
    console.error('Error toggling product list:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Delete product list
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await ProductList.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'List deleted' });
  } catch (err) {
    console.error('Error deleting product list:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
