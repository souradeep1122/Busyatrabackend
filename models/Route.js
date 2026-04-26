const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      trim: true,
    },
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    stops: {
      type: [String],
      required: [true, 'Stops array is required'],
      validate: {
        validator: (v) => v.length >= 2,
        message: 'Route must have at least 2 stops',
      },
    },
  },
  { timestamps: true }
);

// Index for faster stop-based searching
routeSchema.index({ stops: 1 });
routeSchema.index({ busNumber: 1 });

module.exports = mongoose.model('Route', routeSchema);
