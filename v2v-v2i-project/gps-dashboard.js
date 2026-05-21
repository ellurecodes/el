// ================================================================
//  GPS ACCURACY DASHBOARD
//
//  Real-time metrics:
//  - Current accuracy (meters)
//  - Accuracy trend (60s rolling)
//  - Kalman filter effectiveness
//  - Outlier detection rate
//  - Particle filter spread
//  - Geofence status
//
// ================================================================

class GPSAccuracyDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container not found:', containerId);
      return;
    }
    
    this.trackers = new Map(); // id → AdvancedGPSTracker
    this.history = new Map(); // id → array of readings
    this.maxHistory = 60; // 60 seconds worth
    this.canvas = null;
    this.chart = null;
    
    this.init();
  }

  init() {
    const html = `
      <div class="gps-dashboard">
        <div class="gps-header">📍 GPS Accuracy Monitor</div>
        
        <div class="gps-units">
          <!-- EV Stats -->
          <div class="gps-unit-card" id="gps-card-ev">
            <div class="gpu-title">🚨 Emergency Vehicle</div>
            <div class="gpu-stats">
              <div class="gpu-stat">
                <span class="gpu-label">Accuracy</span>
                <span class="gpu-value" id="gpu-ev-accuracy">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Confidence</span>
                <span class="gpu-value" id="gpu-ev-confidence">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Speed</span>
                <span class="gpu-value" id="gpu-ev-speed">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Bearing</span>
                <span class="gpu-value" id="gpu-ev-bearing">—</span>
              </div>
            </div>
            <div class="gpu-trend" id="gpu-ev-trend"></div>
            <div class="gpu-mini-stats">
              <div class="gpu-mini">Filter Error: <span id="gpu-ev-error">—</span></div>
              <div class="gpu-mini">Outliers: <span id="gpu-ev-outliers">0</span></div>
            </div>
          </div>
          
          <!-- Signal Stats -->
          <div class="gps-unit-card" id="gps-card-sig">
            <div class="gpu-title">🚦 Signal</div>
            <div class="gpu-stats">
              <div class="gpu-stat">
                <span class="gpu-label">Accuracy</span>
                <span class="gpu-value" id="gpu-sig-accuracy">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Confidence</span>
                <span class="gpu-value" id="gpu-sig-confidence">—</span>
              </div>
            </div>
            <div class="gpu-trend" id="gpu-sig-trend"></div>
          </div>
          
          <!-- V1 Stats -->
          <div class="gps-unit-card" id="gps-card-v1">
            <div class="gpu-title">🚗 Vehicle 1</div>
            <div class="gpu-stats">
              <div class="gpu-stat">
                <span class="gpu-label">Accuracy</span>
                <span class="gpu-value" id="gpu-v1-accuracy">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Confidence</span>
                <span class="gpu-value" id="gpu-v1-confidence">—</span>
              </div>
            </div>
            <div class="gpu-trend" id="gpu-v1-trend"></div>
          </div>
          
          <!-- V2 Stats -->
          <div class="gps-unit-card" id="gps-card-v2">
            <div class="gpu-title">🚙 Vehicle 2</div>
            <div class="gpu-stats">
              <div class="gpu-stat">
                <span class="gpu-label">Accuracy</span>
                <span class="gpu-value" id="gpu-v2-accuracy">—</span>
              </div>
              <div class="gpu-stat">
                <span class="gpu-label">Confidence</span>
                <span class="gpu-value" id="gpu-v2-confidence">—</span>
              </div>
            </div>
            <div class="gpu-trend" id="gpu-v2-trend"></div>
          </div>
        </div>
        
        <!-- Accuracy Chart -->
        <div class="gps-chart-container">
          <canvas id="gps-accuracy-chart" width="600" height="200"></canvas>
        </div>
        
        <!-- System Report -->
        <div class="gps-report">
          <div class="gps-report-row">
            <span class="gps-report-label">Geofence Status:</span>
            <span class="gps-report-value" id="gps-geofence">✅ In Geofence</span>
          </div>
          <div class="gps-report-row">
            <span class="gps-report-label">Avg Filter Error:</span>
            <span class="gps-report-value" id="gps-avg-error">—</span>
          </div>
          <div class="gps-report-row">
            <span class="gps-report-label">Total Readings:</span>
            <span class="gps-report-value" id="gps-total-readings">0</span>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    this.setupChart();
  }

  /**
   * registerTracker(id, tracker) — Register GPS tracker instance
   */
  registerTracker(id, tracker) {
    this.trackers.set(id, tracker);
    this.history.set(id, []);
    
    // Show/hide card based on current trackers
    const card = document.getElementById(`gps-card-${id}`);
    if (card) card.style.display = 'block';
  }

  /**
   * update() — Poll trackers and update display
   */
  update() {
    if (!this.container) return;

    for (let [id, tracker] of this.trackers) {
      const state = tracker.state;
      if (!state || !state.lat) continue;

      // Record history
      const hist = this.history.get(id) || [];
      hist.push({
        timestamp: Date.now(),
        accuracy: state.accuracy,
        confidence: (tracker.getFilteredPosition().confidence * 100).toFixed(1),
      });
      
      if (hist.length > this.maxHistory) hist.shift();
      this.history.set(id, hist);

      // Update UI
      this._updateUnitCard(id, tracker);
    }

    // Update chart
    this._updateChart();
  }

  /**
   * _updateUnitCard(id, tracker) — Update individual unit card
   */
  _updateUnitCard(id, tracker) {
    const state = tracker.state;
    const filtered = tracker.getFilteredPosition();
    const report = tracker.getAccuracyReport();

    document.getElementById(`gpu-${id}-accuracy`).textContent = report.gpsAccuracy;
    document.getElementById(`gpu-${id}-confidence`).textContent = report.confidence;
    
    if (id === 'ev') {
      document.getElementById(`gpu-${id}-speed`).textContent = state.speed.toFixed(1) + ' m/s';
      document.getElementById(`gpu-${id}-bearing`).textContent = state.bearing.toFixed(0) + '°';
      document.getElementById(`gpu-${id}-error`).textContent = report.averageFilteringError;
      document.getElementById(`gpu-${id}-outliers`).textContent = report.outliersSuppressed;
    }

    // Render trend sparkline
    this._renderTrend(id);
  }

  /**
   * _renderTrend(id) — Render tiny accuracy trend
   */
  _renderTrend(id) {
    const container = document.getElementById(`gpu-${id}-trend`);
    if (!container) return;

    const hist = this.history.get(id) || [];
    if (hist.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Create mini SVG sparkline
    const maxAcc = 50; // max accuracy for scale
    const points = hist.map((h, i) => {
      const x = (i / hist.length) * 100;
      const y = 100 - (Math.min(h.accuracy, maxAcc) / maxAcc) * 100;
      return `${x},${y}`;
    }).join(' ');

    const svg = `
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="#4466ff" stroke-width="1" />
      </svg>
    `;

    container.innerHTML = svg;
  }

  /**
   * setupChart() — Initialize accuracy trend chart
   */
  setupChart() {
    this.canvas = document.getElementById('gps-accuracy-chart');
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * _updateChart() — Draw main accuracy chart
   */
  _updateChart() {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 20;

    // Clear
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = 'rgba(100,100,200,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(136,136,224,0.6)';
    ctx.font = '10px Share Tech Mono';
    ctx.textAlign = 'left';
    ctx.fillText('50m', padding - 15, padding + 5);
    ctx.fillText('0m', padding - 15, h - padding + 5);

    // Grid lines
    ctx.strokeStyle = 'rgba(100,100,200,0.1)';
    for (let i = 1; i < 5; i++) {
      const y = padding + (i * (h - 2 * padding) / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }

    // Plot data for each tracker
    const colors = { ev: '#ff2233', sig: '#ffaa00', v1: '#4466ff', v2: '#aa44ff' };
    
    for (let [id, hist] of this.history) {
      if (hist.length < 2) continue;

      ctx.strokeStyle = colors[id] || '#4466ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      for (let i = 0; i < hist.length; i++) {
        const x = padding + (i / hist.length) * (w - 2 * padding);
        const y = h - padding - (Math.min(hist[i].accuracy, 50) / 50) * (h - 2 * padding);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * show() — Make dashboard visible
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * hide() — Hide dashboard
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}

// ================================================================
//  CSS FOR GPS DASHBOARD
// ================================================================
const gpsDashboardStyles = `
<style>
.gps-dashboard {
  background: #0d0d20;
  border: 1px solid rgba(100,100,200,0.1);
  border-radius: 12px;
  padding: 14px;
  margin: 10px 0;
  color: #c8c8e0;
  font-family: 'Rajdhani', sans-serif;
}

.gps-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4466ff;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(68,102,255,0.2);
}

.gps-units {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.gps-unit-card {
  background: rgba(8,8,24,0.6);
  border: 1px solid rgba(100,100,200,0.15);
  border-radius: 10px;
  padding: 10px;
  display: none;
}

.gps-unit-card.active {
  display: block;
}

.gpu-title {
  font-size: 0.68rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: #aab;
}

.gpu-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.gpu-stat {
  background: rgba(68,102,255,0.05);
  border: 1px solid rgba(68,102,255,0.15);
  border-radius: 6px;
  padding: 6px;
  text-align: center;
}

.gpu-label {
  display: block;
  font-size: 0.55rem;
  color: #667;
  margin-bottom: 3px;
  font-family: 'Share Tech Mono', monospace;
}

.gpu-value {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #00dd66;
  font-family: 'Share Tech Mono', monospace;
}

.gpu-trend {
  height: 24px;
  margin-bottom: 6px;
  background: rgba(68,102,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}

.gpu-trend svg {
  width: 100%;
  height: 100%;
}

.gpu-mini-stats {
  font-size: 0.56rem;
  color: #667;
}

.gpu-mini {
  margin-bottom: 2px;
  font-family: 'Share Tech Mono', monospace;
}

.gpu-mini span {
  color: #ff9;
}

.gps-chart-container {
  background: rgba(8,8,24,0.4);
  border: 1px solid rgba(100,100,200,0.15);
  border-radius: 10px;
  padding: 8px;
  margin-bottom: 10px;
}

.gps-chart-container canvas {
  width: 100%;
  height: 200px;
  display: block;
}

.gps-report {
  background: rgba(0,220,100,0.05);
  border: 1px solid rgba(0,220,100,0.2);
  border-radius: 8px;
  padding: 8px;
  font-size: 0.62rem;
}

.gps-report-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(0,220,100,0.1);
}

.gps-report-row:last-child {
  border-bottom: none;
}

.gps-report-label {
  color: #667;
  font-family: 'Share Tech Mono', monospace;
}

.gps-report-value {
  color: #0f9;
  font-weight: 700;
  font-family: 'Share Tech Mono', monospace;
}
</style>
`;

// ================================================================
//  EXPORT
// ================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GPSAccuracyDashboard, gpsDashboardStyles };
}

console.log('✅ GPS Accuracy Dashboard loaded');
