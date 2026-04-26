const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routeRoutes = require('./routes/routeRoutes');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────
app.use('/api/routes', routeRoutes);

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🚌 BusYatra API is running', timestamp: new Date() });
});

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Centralized Error Handler ─────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BusYatra Server running on http://localhost:${PORT}`);
});

module.exports = app;
