const express = require('express');
const router = express.Router();
const {
  getAllRoutes,
  searchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  seedRoutes,
  getStats,
  getStops,
} = require('../controllers/routeController');

// Public routes
router.get('/search', searchRoutes);
router.get('/stats', getStats);
router.get('/stops', getStops);
router.get('/', getAllRoutes);

// Seed route (admin only in production — open for dev)
router.post('/seed', seedRoutes);

// CRUD routes
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

module.exports = router;
