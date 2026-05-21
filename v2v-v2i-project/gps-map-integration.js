// ================================================================
//  INTEGRATION SCRIPT FOR ADVANCED GPS & MAP FEATURES
//  
//  This script enhances control.html with:
//  - Advanced GPS tracking (particle filter + Kalman)
//  - Satellite map layer switching
//  - Real-time accuracy dashboard
//
// ================================================================

console.log('🔄 Loading GPS & Map Integration Layer...');

// Create namespace for tracking
window.V2XEnhanced = {
  trackers: {},
  mapManager: null,
  dashboard: null,
  gpsUpdaters: {},
};

/**
 * initializeAdvancedGPS() — Set up GPS trackers for all units
 */
function initializeAdvancedGPS() {
  console.log('📡 Initializing Advanced GPS Tracking');

  // Create tracker for each unit
  V2XEnhanced.trackers.emergency = new AdvancedGPSTracker({
    kalmanQ: 0.008,      // Smoother for emergency vehicle
    kalmanR: 1.5,
    particleCount: 30,
  });

  V2XEnhanced.trackers.signal = new AdvancedGPSTracker({
    kalmanQ: 0.01,       // Stationary signal
    kalmanR: 2.0,
    particleCount: 15,
  });

  V2XEnhanced.trackers.vehicle1 = new AdvancedGPSTracker({
    kalmanQ: 0.012,      // Mobile vehicle
    kalmanR: 1.8,
    particleCount: 25,
  });

  V2XEnhanced.trackers.vehicle2 = new AdvancedGPSTracker({
    kalmanQ: 0.012,
    kalmanR: 1.8,
    particleCount: 25,
  });

  console.log('✅ GPS Trackers initialized');
}

/**
 * enhanceMapWithSatellite() — Upgrade map with satellite layer
 */
function enhanceMapWithSatellite() {
  if (!window.map) {
    console.warn('⚠️  Map not found, will retry...');
    setTimeout(enhanceMapWithSatellite, 1000);
    return;
  }

  console.log('🛰️ Enhancing map with satellite layer switching');

  // Add satellite layer control
  const mapControlsDiv = document.querySelector('.mc');
  if (mapControlsDiv) {
    const satBtn = document.createElement('div');
    satBtn.className = 'mc-btn on';
    satBtn.id = 'satBtn';
    satBtn.innerHTML = '🛰️ Satellite';
    satBtn.onclick = () => toggleSatelliteLayer();
    mapControlsDiv.appendChild(satBtn);
  }

  // Store original tile layer
  window.originalTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    attribution:'© <a href="https://osm.org">OSM</a> | <a href="https://carto.com">CartoDB</a>',
    subdomains:'abcd',maxZoom:20
  });

  // Create satellite layer
  window.satelliteTileLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: '© Esri, DigitalGlobe, Earthstar',
      maxZoom: 19,
      minZoom: 1,
    }
  );

  window.currentMapLayer = 'dark';
  console.log('✅ Satellite layer added');
}

/**
 * toggleSatelliteLayer() — Switch between dark and satellite
 */
function toggleSatelliteLayer() {
  const btn = document.getElementById('satBtn');
  if (!btn || !window.map) return;

  if (window.currentMapLayer === 'dark') {
    // Switch to satellite
    window.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer && layer !== window.satelliteTileLayer) {
        window.map.removeLayer(layer);
      }
    });
    window.satelliteTileLayer.addTo(window.map);
    window.currentMapLayer = 'satellite';
    btn.innerHTML = '🗺️ Street Map';
    btn.style.background = 'rgba(255,170,0,.2)';
    btn.style.borderColor = 'rgba(255,170,0,.4)';

    console.log('📡 Switched to satellite map');
  } else {
    // Switch to dark
    window.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer && layer !== window.originalTileLayer) {
        window.map.removeLayer(layer);
      }
    });
    window.originalTileLayer.addTo(window.map);
    window.currentMapLayer = 'dark';
    btn.innerHTML = '🛰️ Satellite';
    btn.style.background = '';
    btn.style.borderColor = '';

    console.log('⛰️ Switched to dark map');
  }
}

/**
 * setupGPSAccuracyDashboard() — Create accuracy monitoring panel
 */
function setupGPSAccuracyDashboard() {
  console.log('📊 Setting up GPS Accuracy Dashboard');

  // Find existing GPS panel (created in control.html)
  const gpsDashboardPanel = document.getElementById('p-gps');
  
  if (gpsDashboardPanel) {
    console.log('✅ Found existing GPS dashboard panel');
    
    // Clear any existing content and prepare panel
    gpsDashboardPanel.innerHTML = '';
    gpsDashboardPanel.className = 'panel';
    
    // Initialize dashboard with existing panel
    V2XEnhanced.dashboard = new GPSAccuracyDashboard('p-gps');
    
    // Register trackers with dashboard
    Object.entries(V2XEnhanced.trackers).forEach(([id, tracker]) => {
      V2XEnhanced.dashboard.registerTracker(id, tracker);
    });

    // Setup GPS tab click handler
    const gpsTabs = document.querySelectorAll('.tab');
    const gpsTab = Array.from(gpsTabs).find(tab => tab.textContent.includes('GPS'));
    
    if (gpsTab) {
      gpsTab.onclick = function() {
        // Hide all panels
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
        // Deactivate all tabs
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
        // Show GPS panel and activate tab
        gpsDashboardPanel.classList.add('show');
        this.classList.add('on');
      };
      console.log('✅ GPS tab handler registered');
    }

    console.log('✅ GPS Accuracy Dashboard ready with live updates');
  } else {
    console.warn('⚠️ GPS dashboard panel (p-gps) not found in DOM');
    console.warn('Make sure control.html has a div with id="p-gps"');
  }
}

/**
 * setupGPSUpdaters() — Hook GPS data processing
 */
function setupGPSUpdaters() {
  console.log('🔄 Setting up GPS data updaters');

  // Enhanced EV listener with advanced GPS
  const originalEVListener = DB.emergency.on;
  DB.emergency.on('value', s => {
    const d = s.val();
    if (d && d.active && d.lat && d.lng && V2XEnhanced.trackers.emergency) {
      // Process through advanced GPS tracker
      const filtered = V2XEnhanced.trackers.emergency.processReading(
        d.lat, 
        d.lng, 
        d.accuracy || 5, 
        d.altitude || null
      );

      // Update display with filtered data
      if (filtered) {
        d.lat_filtered = filtered.lat;
        d.lng_filtered = filtered.lng;
        d.accuracy_filtered = filtered.accuracy;
        d.speed_filtered = filtered.speed;
        d.bearing_filtered = filtered.bearing;
        d.confidence = filtered.confidence;
      }
    }
  });

  // Similar for other units
  ['signal', 'vehicle1', 'vehicle2'].forEach(unitName => {
    const dbRef = DB[unitName === 'vehicle1' ? 'vehicle1' : unitName === 'vehicle2' ? 'vehicle2' : 'signal'];
    dbRef.on('value', s => {
      const d = s.val();
      if (d && d.lat && d.lng && V2XEnhanced.trackers[unitName]) {
        const filtered = V2XEnhanced.trackers[unitName].processReading(
          d.lat, 
          d.lng, 
          d.accuracy || 5,
          null
        );
        if (filtered) {
          d.lat_filtered = filtered.lat;
          d.lng_filtered = filtered.lng;
          d.accuracy_filtered = filtered.accuracy;
          d.confidence = filtered.confidence;
        }
      }
    });
  });

  console.log('✅ GPS updaters configured');
}

/**
 * startAccuracyMonitoring() — Update dashboard in real-time
 */
function startAccuracyMonitoring() {
  console.log('📈 Starting accuracy monitoring');

  const updateInterval = setInterval(() => {
    if (V2XEnhanced.dashboard) {
      V2XEnhanced.dashboard.update();
    }
  }, 500); // Update every 500ms

  // Store reference for cleanup
  window.accuracyMonitoringInterval = updateInterval;
  console.log('✅ Accuracy monitoring started');
}

/**
 * injectMapStyles() — Add map enhancement styles
 */
function injectMapStyles() {
  if (!document.getElementById('map-enhancement-styles')) {
    const style = document.createElement('style');
    style.id = 'map-enhancement-styles';
    style.textContent = `
      /* Map enhancement styles */
      .map-layer-toggle {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1001;
        background: rgba(8, 8, 30, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 9px;
        padding: 6px 11px;
        color: #bbb;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Rajdhani', sans-serif;
        backdrop-filter: blur(8px);
        transition: 0.2s;
        white-space: nowrap;
      }
      
      .map-layer-toggle:hover {
        background: rgba(68, 102, 255, 0.25);
        color: #fff;
        border-color: rgba(68, 102, 255, 0.4);
      }
      
      .map-layer-toggle.active {
        background: rgba(255, 170, 0, 0.2);
        color: #fe8;
        border-color: rgba(255, 170, 0, 0.4);
      }
      
      /* Ensure good visibility on satellite */
      #map.satellite-mode .leaflet-control-layers-toggle {
        background-color: rgba(0, 0, 0, 0.7);
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * INITIALIZATION SEQUENCE
 */
(function init() {
  console.log('🚀 V2X Enhancement Layer Loading...');
  console.log('Checking for dependencies:', {
    DB: typeof window.DB,
    AdvancedGPSTracker: typeof window.AdvancedGPSTracker,
    GPSAccuracyDashboard: typeof window.GPSAccuracyDashboard,
  });

  let attempts = 0;
  const maxAttempts = 100; // 10 seconds at 100ms intervals

  // Wait for essential components
  const checkReady = setInterval(() => {
    attempts++;
    const hasDB = typeof window.DB !== 'undefined';
    const hasTracker = typeof window.AdvancedGPSTracker !== 'undefined';
    const hasDashboard = typeof window.GPSAccuracyDashboard !== 'undefined';
    
    if (attempts % 10 === 0) {
      console.log(`[GPS Init Attempt ${attempts}/100] DB: ${hasDB ? '✅' : '❌'}, Tracker: ${hasTracker ? '✅' : '❌'}, Dashboard: ${hasDashboard ? '✅' : '❌'}`);
    }

    if (hasDB && hasTracker && hasDashboard) {
      clearInterval(checkReady);
      console.log('✅ All dependencies ready!');

      try {
        injectMapStyles();
        console.log('✅ Map styles injected');
        
        initializeAdvancedGPS();
        console.log('✅ GPS trackers initialized');
        
        setupGPSUpdaters();
        console.log('✅ GPS updaters setup');
        
        enhanceMapWithSatellite();
        console.log('✅ Satellite map enhanced');
        
        setupGPSAccuracyDashboard();
        console.log('✅ Dashboard setup');
        
        startAccuracyMonitoring();
        console.log('✅ Monitoring started');

        console.log('✅✅✅ V2X Enhancement Layer Loaded Successfully');
        console.log('📊 Advanced GPS tracking active');
        console.log('🛰️ Satellite map switching available');
        console.log('📈 Accuracy dashboard monitoring enabled');
      } catch (err) {
        console.error('❌ Error during initialization:', err);
        console.error(err.stack);
      }
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(checkReady);
      console.warn('⚠️ Enhancement initialization timeout after 10 seconds');
      console.warn('This might mean one or more modules failed to load');
      console.warn('Check browser Network tab to see if files failed to load');
    }
  }, 100);

  // Timeout safety net
  setTimeout(() => {
    clearInterval(checkReady);
    if (attempts < maxAttempts) {
      console.warn('⚠️ Enhancement initialization stopped');
    }
  }, 11000);
})();

// ================================================================
//  CLEANUP
// ================================================================
window.addEventListener('beforeunload', () => {
  if (window.accuracyMonitoringInterval) {
    clearInterval(window.accuracyMonitoringInterval);
  }
  if (V2XEnhanced.dashboard && V2XEnhanced.dashboard.container) {
    V2XEnhanced.dashboard.hide();
  }
});

console.log('✅ GPS & Map Integration Script loaded');
