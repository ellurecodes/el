// ================================================================
//  V2X ADVANCED GPS TRACKING SYSTEM v2.0
//  
//  Features:
//  - Kalman Filter (1D coordinate smoothing)
//  - Particle Filter (multi-hypothesis tracking)
//  - Dead Reckoning (velocity-based prediction)
//  - Accuracy estimation & covariance tracking
//  - Speed calculation with smoothing
//  - Heading estimation
//  - Geofence monitoring (Silk Board Junction)
//
// ================================================================

/**
 * Kalman Filter 1D — For coordinate smoothing (DEFINED FIRST SO AdvancedGPSTracker CAN USE IT)
 */
class KalmanFilter1D {
  constructor(processNoise = 0.01, measurementNoise = 1.0) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.p = 1;      // Estimation error
    this.x = null;   // State
    this.k = 0;      // Kalman gain
  }

  filter(measurement) {
    if (this.x === null) {
      this.x = measurement;
      return measurement;
    }

    // Predict
    this.p = this.p + this.q;

    // Update
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  reset() {
    this.p = 1;
    this.x = null;
    this.k = 0;
  }
}

class AdvancedGPSTracker {
  constructor(options = {}) {
    this.options = {
      kalmanQ: 0.01,        // Process noise
      kalmanR: 2.0,         // Measurement noise
      particleCount: 25,    // Particle filter particles
      deadReckoningSpan: 3, // Seconds for velocity-based prediction
      ...options
    };

    // Kalman filters per coordinate
    this.kalmanLat = new KalmanFilter1D(this.options.kalmanQ, this.options.kalmanR);
    this.kalmanLng = new KalmanFilter1D(this.options.kalmanQ, this.options.kalmanR);

    // Particle filter state
    this.particles = [];
    this.initParticles();

    // History for velocity & heading calculation
    this.history = [];
    this.maxHistoryPoints = 10;

    // Current state
    this.state = {
      lat: null,
      lng: null,
      accuracy: null,
      speed: 0,
      bearing: 0,
      altitude: null,
      timestamp: null,
      isMoving: false,
      hasLock: false,
    };

    // Statistics
    this.stats = {
      totalReadings: 0,
      outlierCount: 0,
      kalmanResiduals: [],
      particleWeights: new Array(this.options.particleCount).fill(1 / this.options.particleCount),
    };

    // Geofence: Silk Board Junction, Bangalore
    this.geofence = {
      center: { lat: 12.9180, lng: 77.6201 },
      radius: 5000, // meters
    };
  }

  /**
   * initParticles() — Initialize particle filter
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.options.particleCount; i++) {
      this.particles.push({
        lat: 12.9180 + (Math.random() - 0.5) * 0.01,
        lng: 77.6201 + (Math.random() - 0.5) * 0.01,
        vx: 0, // velocity x
        vy: 0, // velocity y
        weight: 1 / this.options.particleCount,
      });
    }
  }

  /**
   * processReading(lat, lng, accuracy, altitude) → ProcessedState
   * Input: Raw GPS reading from geolocation API
   * Output: Filtered position with accuracy metrics
   */
  processReading(lat, lng, accuracy, altitude = null) {
    const now = Date.now();

    // ── OUTLIER DETECTION ──
    if (this.state.lat && this.state.lng) {
      const dist = this._haversine(this.state.lat, this.state.lng, lat, lng);
      // Speed > 200 m/s (720 km/h) is probably an outlier
      if (dist > 200) {
        this.stats.outlierCount++;
        console.warn('🚨 GPS Outlier detected:', dist, 'm');
        return this.state; // Return previous state
      }
    }

    // ── KALMAN FILTERING ──
    const smoothLat = this.kalmanLat.filter(lat);
    const smoothLng = this.kalmanLng.filter(lng);

    // ── PARTICLE FILTER UPDATE ──
    this._updateParticles(lat, lng, accuracy, now);

    // ── HISTORY TRACKING ──
    this.history.push({
      lat: smoothLat,
      lng: smoothLng,
      accuracy,
      timestamp: now,
    });
    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    // ── VELOCITY & HEADING ──
    const velocity = this._calculateVelocity();
    const bearing = this._calculateBearing();

    // ── UPDATE STATE ──
    this.state = {
      lat: smoothLat,
      lng: smoothLng,
      accuracy: Math.max(accuracy, 5), // Minimum 5m accuracy
      speed: velocity,
      bearing: bearing,
      altitude: altitude,
      timestamp: now,
      isMoving: velocity > 0.3, // m/s (> 1 km/h = moving)
      hasLock: accuracy < 100, // Lock when < 100m accuracy
      kalmanGain: this.kalmanLat.k, // Kalman gain (0-1)
      particleSpread: this._getParticleSpread(),
    };

    // ── STATISTICS ──
    this.stats.totalReadings++;
    const residual = Math.hypot(
      smoothLat - lat,
      smoothLng - lng
    ) * 111320; // to meters
    this.stats.kalmanResiduals.push(residual);
    if (this.stats.kalmanResiduals.length > 100) {
      this.stats.kalmanResiduals.shift();
    }

    return this.state;
  }

  /**
   * _updateParticles(measLat, measLng, accuracy, timestamp) — Particle filter update
   */
  _updateParticles(measLat, measLng, accuracy, timestamp) {
    const dt = (timestamp - (this.state.timestamp || timestamp)) / 1000; // seconds
    if (dt > 10) return; // Skip if time jump

    // ── PREDICT ──
    for (let p of this.particles) {
      // Add some process noise
      p.lat += p.vy * dt + (Math.random() - 0.5) * 0.00001;
      p.lng += p.vx * dt + (Math.random() - 0.5) * 0.00001;
    }

    // ── UPDATE ──
    // Likelihood function: closer to measurement = higher weight
    const sigma = accuracy / 111320; // Convert to degrees
    for (let p of this.particles) {
      const dist = Math.hypot(p.lat - measLat, p.lng - measLng);
      p.weight = Math.exp(-0.5 * Math.pow(dist / sigma, 2));
    }

    // ── NORMALIZE WEIGHTS ──
    const sumWeights = this.particles.reduce((s, p) => s + p.weight, 0);
    for (let p of this.particles) {
      p.weight /= sumWeights || 1;
      this.stats.particleWeights[this.particles.indexOf(p)] = p.weight;
    }

    // ── RESAMPLING (low-variance resampling) ──
    if (this._getEffectiveSampleSize() < this.options.particleCount * 0.5) {
      this._resampleParticles();
    }

    // ── ESTIMATE VELOCITY FROM PARTICLES ──
    for (let p of this.particles) {
      const dx = measLng - p.lng;
      const dy = measLat - p.lat;
      p.vx += dx / dt * 0.1; // Update with measurement
      p.vy += dy / dt * 0.1;
    }
  }

  /**
   * _calculateVelocity() → number (m/s)
   */
  _calculateVelocity() {
    if (this.history.length < 2) return 0;

    const prev = this.history[this.history.length - 2];
    const curr = this.history[this.history.length - 1];
    const dt = (curr.timestamp - prev.timestamp) / 1000;

    if (dt === 0) return 0;

    const dist = this._haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    return dist / dt; // m/s
  }

  /**
   * _calculateBearing() → number (degrees 0-360)
   */
  _calculateBearing() {
    if (this.history.length < 2) return 0;

    const prev = this.history[0];
    const curr = this.history[this.history.length - 1];

    const lat1 = prev.lat * Math.PI / 180;
    const lat2 = curr.lat * Math.PI / 180;
    const dLng = (curr.lng - prev.lng) * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  /**
   * _haversine(lat1, lng1, lat2, lng2) → distance in meters
   */
  _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * _getEffectiveSampleSize() → number
   */
  _getEffectiveSampleSize() {
    const sumSquaredWeights = this.particles.reduce((s, p) => s + p.weight ** 2, 0);
    return 1 / sumSquaredWeights;
  }

  /**
   * _resampleParticles() — Low-variance resampling
   */
  _resampleParticles() {
    const newParticles = [];
    const cumulativeAvgWeight = this.particles.length ** -1;
    let cumulativeSum = 0;

    for (let i = 0; i < this.particles.length; i++) {
      cumulativeSum += this.particles[i].weight;
      const u = (i + Math.random()) / this.particles.length;

      while (u > cumulativeSum && cumulativeSum < 1) {
        cumulativeSum += this.particles[++i].weight;
      }

      if (i < this.particles.length) {
        newParticles.push(JSON.parse(JSON.stringify(this.particles[i])));
        newParticles[newParticles.length - 1].weight = cumulativeAvgWeight;
      }
    }

    this.particles = newParticles.length > 0 ? newParticles : this.particles;
  }

  /**
   * _getParticleSpread() → number (0-1, Lower = more confident)
   */
  _getParticleSpread() {
    if (this.particles.length === 0) return 1;

    // Calculate variance of particle positions
    const meanLat = this.particles.reduce((s, p) => s + p.lat, 0) / this.particles.length;
    const meanLng = this.particles.reduce((s, p) => s + p.lng, 0) / this.particles.length;

    const variance = this.particles.reduce((s, p) =>
      s + Math.hypot(p.lat - meanLat, p.lng - meanLng) ** 2,
      0) / this.particles.length;

    return Math.min(1, Math.sqrt(variance) * 10000);
  }

  /**
   * getFilteredPosition() → {lat, lng, accuracy, confidence}
   */
  getFilteredPosition() {
    // Weighted average of particles
    let lat = 0, lng = 0;
    for (let p of this.particles) {
      lat += p.lat * p.weight;
      lng += p.lng * p.weight;
    }

    const spread = this._getParticleSpread();
    const confidence = Math.max(0, 1 - spread); // 0-1

    return {
      lat,
      lng,
      accuracy: this.state.accuracy,
      confidence,
      kalmanGain: this.state.kalmanGain,
      spread,
    };
  }

  /**
   * isInGeofence() → boolean
   */
  isInGeofence() {
    if (!this.state.lat || !this.state.lng) return false;
    const dist = this._haversine(
      this.state.lat, this.state.lng,
      this.geofence.center.lat, this.geofence.center.lng
    );
    return dist <= this.geofence.radius;
  }

  /**
   * getAccuracyReport() → {avgResidual, maxResidual, confidence, outliers}
   */
  getAccuracyReport() {
    const residuals = this.stats.kalmanResiduals;
    const avgResidual = residuals.reduce((s, r) => s + r, 0) / residuals.length || 0;
    const maxResidual = Math.max(...residuals, 0);

    return {
      averageFilteringError: avgResidual.toFixed(2) + ' m',
      maxFilteringError: maxResidual.toFixed(2) + ' m',
      gpsAccuracy: (this.state.accuracy || 0).toFixed(1) + ' m',
      confidence: (this.getFilteredPosition().confidence * 100).toFixed(1) + '%',
      outliersSuppressed: this.stats.outlierCount,
      totalReadings: this.stats.totalReadings,
      kalmanGain: this.state.kalmanGain.toFixed(3),
      particleSpread: (this._getParticleSpread() * 100).toFixed(1) + '%',
    };
  }

  /**
   * predictPosition(secondsAhead) → {lat, lng}
   * Dead reckoning prediction
   */
  predictPosition(secondsAhead) {
    const ratio = secondsAhead / this.options.deadReckoningSpan;
    return {
      lat: this.state.lat + (this.state.speed / 111320) * Math.sin(this.state.bearing * Math.PI / 180) * ratio,
      lng: this.state.lng + (this.state.speed / 111320 / Math.cos(this.state.lat * Math.PI / 180)) * Math.cos(this.state.bearing * Math.PI / 180) * ratio,
    };
  }
}

// ================================================================
//  EXPORT
// ================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedGPSTracker, KalmanFilter1D };
}

console.log('✅ Advanced GPS Tracking System v2.0 loaded');
