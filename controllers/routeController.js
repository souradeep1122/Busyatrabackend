const Route = require('../models/Route');
const busData = require('../data/Busdata.json');

// ─────────────────────────────────────────────
// Helper: Transform raw JSON entry → DB doc
// ─────────────────────────────────────────────
const transformBusEntry = (entry) => {
  const routeName = (entry.Bustype || '').trim();
  const stops = (entry.Routes || []).map((s) => s.trim()).filter(Boolean);

  // Split on " to " (case-insensitive)
  const toIndex = routeName.toLowerCase().indexOf(' to ');
  let source = toIndex !== -1 ? routeName.slice(0, toIndex).trim() : '';
  let destination = toIndex !== -1 ? routeName.slice(toIndex + 4).trim() : '';

  // Fallback: use first and last stop if source/destination missing
  if (!source && stops.length > 0) source = stops[0];
  if (!destination && stops.length > 1) destination = stops[stops.length - 1];

  return {
    busNumber: (entry.Busname || '').trim(),
    routeName: routeName || `${source} to ${destination}`,
    source,
    destination,
    stops,
  };
};

// ─────────────────────────────────────────────
// GET /api/routes  — Fetch all routes
// ─────────────────────────────────────────────
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({ busNumber: 1 });
    res.status(200).json({ success: true, count: routes.length, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/routes/search?from=X&to=Y
// Stops-based matching with index check
// ─────────────────────────────────────────────
exports.searchRoutes = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both "from" and "to" query parameters',
      });
    }

    const fromLower = from.trim().toLowerCase();
    const toLower = to.trim().toLowerCase();

    // Fetch all routes and filter in JS (for index-order checking)
    const allRoutes = await Route.find();

    const results = allRoutes.filter((route) => {
      const stopsLower = route.stops.map((s) => s.toLowerCase());
      const srcIdx = stopsLower.findIndex((s) => s.includes(fromLower) || fromLower.includes(s));
      const dstIdx = stopsLower.findIndex((s) => s.includes(toLower) || toLower.includes(s));
      return srcIdx !== -1 && dstIdx !== -1 && srcIdx < dstIdx;
    });

    res.status(200).json({
      success: true,
      count: results.length,
      from,
      to,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/routes  — Create a route
// ─────────────────────────────────────────────
exports.createRoute = async (req, res) => {
  try {
    const { busNumber, routeName, source, destination, stops } = req.body;
    const route = await Route.create({ busNumber, routeName, source, destination, stops });
    res.status(201).json({ success: true, data: route });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/routes/:id  — Update a route
// ─────────────────────────────────────────────
exports.updateRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.status(200).json({ success: true, data: route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/routes/:id  — Delete a route
// ─────────────────────────────────────────────
exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.status(200).json({ success: true, message: 'Route deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/routes/seed  — Seed DB from JSON
// ─────────────────────────────────────────────
exports.seedRoutes = async (req, res) => {
  try {
    // Clear existing
    await Route.deleteMany({});

    const transformed = busData.map(transformBusEntry).filter(
      (r) => r.busNumber && r.routeName && r.stops.length >= 2
    );

    const inserted = await Route.insertMany(transformed);
    res.status(201).json({
      success: true,
      message: `✅ Seeded ${inserted.length} routes successfully`,
      count: inserted.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/routes/stops  — Unique stop names for autosuggestion
// ─────────────────────────────────────────────
exports.getStops = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const allRoutes = await Route.find({}, 'stops');
    const stopSet = new Set();
    allRoutes.forEach((r) => r.stops.forEach((s) => stopSet.add(s.trim())));

    let stops = Array.from(stopSet).sort();
    if (q) {
      const qLower = q.toLowerCase();
      stops = stops.filter((s) => s.toLowerCase().includes(qLower));
    }
    // Return at most 10 suggestions
    res.status(200).json({ success: true, data: stops.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/routes/stats  — Stats for admin
// ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const totalRoutes = await Route.countDocuments();
    const uniqueBuses = await Route.distinct('busNumber');
    const uniqueSources = await Route.distinct('source');

    res.status(200).json({
      success: true,
      data: {
        totalRoutes,
        totalBuses: uniqueBuses.length,
        totalSources: uniqueSources.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
