// ================================================================
//  SYNTRIX V2X — ROUTE UTILITIES
//  Shared routing engine for all dashboards
//  Features:
//  - Animated "marching ants" route lines
//  - EV Corridor zone (50m buffer)
//  - ETA Countdown timer
//  - India-optimized tile layers with proper maxNativeZoom
//  - OSRM routing (India-compatible)
//  - Major Indian NH highways GeoJSON overlay
// ================================================================

// ── TILE LAYER DEFINITIONS (India-optimized, no zoom gaps) ──────
const SyntrixTiles = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 22,
      maxNativeZoom: 19,
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> | © <a href="https://carto.com/">CartoDB</a>',
      crossOrigin: true
    }
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opts: {
      maxZoom: 22,
      maxNativeZoom: 19,
      tileSize: 256,
      attribution: '© Esri, DigitalGlobe, Earthstar Geographics',
      crossOrigin: true
    }
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: {
      subdomains: 'abc',
      maxZoom: 22,
      maxNativeZoom: 19,
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: true
    }
  },
  hybrid: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 22,
      maxNativeZoom: 19,
      tileSize: 256,
      attribution: '© OSM | © CartoDB',
      crossOrigin: true
    }
  }
};

// ── INDIA NATIONAL HIGHWAYS (Simplified dataset — major NH routes) ──
const INDIA_NH_DATA = {
  "type": "FeatureCollection",
  "features": [
    // NH-44 (Srinagar to Kanyakumari — India's longest)
    { "type": "Feature", "properties": { "name": "NH-44", "from": "Srinagar", "to": "Kanyakumari" },
      "geometry": { "type": "LineString", "coordinates": [
        [74.7973,34.0837],[76.9366,32.2396],[77.1734,28.6139],[77.2090,28.6139],
        [77.5946,12.9716],[80.2707,13.0827],[77.5946,8.0883]
      ]}},
    // NH-48 (Delhi to Chennai)
    { "type": "Feature", "properties": { "name": "NH-48", "from": "Delhi", "to": "Chennai" },
      "geometry": { "type": "LineString", "coordinates": [
        [77.2090,28.6139],[76.0856,27.0238],[73.7125,22.3072],[72.5714,23.0225],
        [73.1812,22.3072],[74.6208,19.9975],[73.8567,18.5204],[76.9558,11.0168],[80.2707,13.0827]
      ]}},
    // NH-19 (Delhi to Kolkata via Varanasi)
    { "type": "Feature", "properties": { "name": "NH-19", "from": "Delhi", "to": "Kolkata" },
      "geometry": { "type": "LineString", "coordinates": [
        [77.2090,28.6139],[80.9462,26.8467],[82.9739,25.3176],[83.9687,25.2132],[87.2770,25.0358],[88.3639,22.5726]
      ]}},
    // NH-27 (Porbandar to Silchar — East-West corridor)
    { "type": "Feature", "properties": { "name": "NH-27", "from": "Porbandar", "to": "Silchar" },
      "geometry": { "type": "LineString", "coordinates": [
        [69.6093,21.6424],[71.6612,22.3030],[72.5714,23.0225],[77.2090,28.6139],
        [79.0882,21.1458],[82.1337,21.5135],[85.8420,20.4625],[91.7362,24.8333]
      ]}},
    // NH-16 (Kolkata to Chennai via coastal)
    { "type": "Feature", "properties": { "name": "NH-16", "from": "Kolkata", "to": "Chennai" },
      "geometry": { "type": "LineString", "coordinates": [
        [88.3639,22.5726],[86.4203,20.4625],[84.7941,17.6868],[80.6480,16.3067],[80.4518,15.8281],[80.2707,13.0827]
      ]}},
    // NH-58 (Delhi to Badrinath)
    { "type": "Feature", "properties": { "name": "NH-58", "from": "Delhi", "to": "Badrinath" },
      "geometry": { "type": "LineString", "coordinates": [
        [77.2090,28.6139],[77.5946,28.9845],[78.7767,29.3829],[79.4304,29.9458],[79.9350,30.7433],[79.4936,30.7433]
      ]}},
    // Bengaluru Ring Road area
    { "type": "Feature", "properties": { "name": "NH-75", "from": "Mangaluru", "to": "Bengaluru" },
      "geometry": { "type": "LineString", "coordinates": [
        [74.8559,12.9141],[75.7100,12.3375],[76.6552,12.2958],[77.5946,12.9716]
      ]}},
    // Mumbai-Pune Expressway
    { "type": "Feature", "properties": { "name": "NH-4 (Mumbai-Pune)", "from": "Mumbai", "to": "Pune" },
      "geometry": { "type": "LineString", "coordinates": [
        [72.8777,19.0760],[73.1303,18.9120],[73.3120,18.7487],[73.8567,18.5204]
      ]}}
  ]
};

// ── INJECT CSS FOR ROUTE ANIMATIONS ─────────────────────────────
(function injectRouteCSS() {
  if (document.getElementById('syntrix-route-css')) return;
  const style = document.createElement('style');
  style.id = 'syntrix-route-css';
  style.textContent = `
/* Marching ants animation for EV route */
@keyframes marchingAnts {
  to { stroke-dashoffset: -30; }
}
.ev-route-animated {
  animation: marchingAnts 0.6s linear infinite;
}

/* ETA Countdown Widget */
.eta-countdown-widget {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(198,3,26,0.08);
  border: 1px solid rgba(198,3,26,0.3);
  border-radius: 0.75rem;
  padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  margin: 6px 0;
  animation: etaPulse 2s ease-in-out infinite;
}
@keyframes etaPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(198,3,26,0.2); }
  50% { box-shadow: 0 0 0 6px rgba(198,3,26,0); }
}
.eta-countdown-label {
  font-size: 0.48rem;
  color: rgba(219,228,232,0.55);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.eta-countdown-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #ff7080;
  letter-spacing: 0.04em;
  line-height: 1;
}
.eta-countdown-sub {
  font-size: 0.5rem;
  color: rgba(219,228,232,0.4);
  margin-top: 3px;
}

/* EV Corridor overlay pulse */
@keyframes corridorPulse {
  0%,100% { opacity: 0.18; }
  50% { opacity: 0.32; }
}
.ev-corridor-layer {
  animation: corridorPulse 2s ease-in-out infinite;
}

/* Route freshness indicator */
.route-stale-warning {
  font-size: 0.5rem;
  color: #ffaa00;
  font-family: 'JetBrains Mono', monospace;
  text-align: center;
  padding: 3px 0;
  animation: blink 1s infinite;
}
@keyframes blink { 50% { opacity: 0.3; } }

/* India NH layer popup */
.nh-popup {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: #dbe4e8;
}
`;
  document.head.appendChild(style);
})();

// ── ROUTE DRAWING ENGINE ─────────────────────────────────────────
class SyntrixRoute {
  constructor(map) {
    this.map = map;
    this._layers = [];
    this._corridorLayer = null;
    this._etaInterval = null;
    this._etaStartTs = null;
    this._etaMinutes = null;
    this._nhLayer = null;
    this._nhVisible = false;
  }

  /**
   * Draw an animated EV route on the map
   * @param {Array} coords - [[lat,lng], ...] array
   * @param {Object} opts - color, weight, animated
   */
  drawRoute(coords, opts = {}) {
    this.clearRoute();
    if (!coords || !coords.length) return;

    const color = opts.color || '#c6031a';
    const weight = opts.weight || 5;
    const animated = opts.animated !== false;

    // Glow / corridor layer (wide semi-transparent)
    const glow = L.polyline(coords, {
      color: color,
      weight: weight + 10,
      opacity: 0.15,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false
    }).addTo(this.map);
    this._layers.push(glow);

    // Main route line
    const main = L.polyline(coords, {
      color: color,
      weight: weight,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: animated ? '14,8' : null,
      className: animated ? 'ev-route-animated' : ''
    }).addTo(this.map);
    this._layers.push(main);

    // Direction arrow overlay (white dashes)
    const arrows = L.polyline(coords, {
      color: '#ffffff',
      weight: 1.5,
      opacity: 0.4,
      lineCap: 'round',
      dashArray: '2,16',
      interactive: false
    }).addTo(this.map);
    this._layers.push(arrows);

    return main;
  }

  /**
   * Draw EV corridor — a buffer zone around the route
   * Vehicles within this zone get YIELD warnings
   * @param {Array} coords
   * @param {number} radiusMeters
   */
  drawCorridor(coords, radiusMeters = 50) {
    this.clearCorridor();
    if (!coords || !coords.length) return;

    // Draw circle markers at key points along the route (approximates buffer)
    const step = Math.max(1, Math.floor(coords.length / 20));
    const corridorGroup = L.layerGroup();

    coords.filter((_, i) => i % step === 0).forEach(c => {
      L.circle([c[0], c[1]], {
        radius: radiusMeters,
        color: '#c6031a',
        fillColor: '#c6031a',
        fillOpacity: 0.06,
        weight: 0,
        interactive: false,
        className: 'ev-corridor-layer'
      }).addTo(corridorGroup);
    });

    corridorGroup.addTo(this.map);
    this._corridorLayer = corridorGroup;
    return corridorGroup;
  }

  /**
   * Add start and end markers with animated icons
   */
  addEndpointMarkers(origin, destination) {
    if (origin) {
      const startM = L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative;text-align:center">
            <div style="width:18px;height:18px;border-radius:50%;background:#00e383;border:3px solid #fff;box-shadow:0 0 20px #00e383,0 0 40px rgba(0,227,131,0.4);margin:0 auto"></div>
            <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#00e383;color:#000;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;font-family:'JetBrains Mono',monospace">START</div>
          </div>`,
          iconSize: [18, 18], iconAnchor: [9, 9]
        }),
        zIndexOffset: 2000
      }).addTo(this.map).bindPopup('<div class="nh-popup">📍 EV Start Point</div>');
      this._layers.push(startM);
    }
    if (destination) {
      const endM = L.marker([destination.lat, destination.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative;text-align:center">
            <div style="width:18px;height:18px;border-radius:50%;background:#c6031a;border:3px solid #fff;box-shadow:0 0 20px #c6031a,0 0 40px rgba(198,3,26,0.4);margin:0 auto"></div>
            <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#c6031a;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;font-family:'JetBrains Mono',monospace">DEST</div>
          </div>`,
          iconSize: [18, 18], iconAnchor: [9, 9]
        }),
        zIndexOffset: 2000
      }).addTo(this.map).bindPopup('<div class="nh-popup">🏁 EV Destination</div>');
      this._layers.push(endM);
    }
  }

  /**
   * Clear all route layers
   */
  clearRoute() {
    this._layers.forEach(l => { try { this.map.removeLayer(l); } catch(e) {} });
    this._layers = [];
    this.clearCorridor();
    this.stopEtaCountdown();
  }

  clearCorridor() {
    if (this._corridorLayer) {
      try { this.map.removeLayer(this._corridorLayer); } catch(e) {}
      this._corridorLayer = null;
    }
  }

  /**
   * Start ETA countdown
   * @param {number} etaMinutes - ETA in minutes from now
   * @param {string|HTMLElement} targetEl - element ID or DOM element to update
   */
  startEtaCountdown(etaMinutes, targetEl) {
    this.stopEtaCountdown();
    if (!etaMinutes || etaMinutes <= 0) return;

    this._etaMinutes = etaMinutes;
    this._etaStartTs = Date.now();

    const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : targetEl;
    if (!el) return;

    const update = () => {
      const elapsed = (Date.now() - this._etaStartTs) / 60000; // minutes
      const remaining = Math.max(0, this._etaMinutes - elapsed);
      const mins = Math.floor(remaining);
      const secs = Math.floor((remaining - mins) * 60);
      if (el) {
        el.textContent = remaining < 1
          ? `${secs}s`
          : `${mins}m ${secs.toString().padStart(2,'0')}s`;
      }
      if (remaining <= 0) this.stopEtaCountdown();
    };

    update();
    this._etaInterval = setInterval(update, 1000);
  }

  stopEtaCountdown() {
    if (this._etaInterval) {
      clearInterval(this._etaInterval);
      this._etaInterval = null;
    }
  }

  /**
   * Show India National Highways overlay
   */
  showNHLayer() {
    if (this._nhLayer) { this._nhVisible = true; return; }
    this._nhLayer = L.geoJSON(INDIA_NH_DATA, {
      style: {
        color: '#ffaa00',
        weight: 2,
        opacity: 0.55,
        dashArray: '6,4'
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`<div class="nh-popup">
          🛣️ <strong>${feature.properties.name}</strong><br>
          ${feature.properties.from} → ${feature.properties.to}
        </div>`);
      }
    }).addTo(this.map);
    this._nhVisible = true;
  }

  hideNHLayer() {
    if (this._nhLayer) {
      try { this.map.removeLayer(this._nhLayer); } catch(e) {}
      this._nhLayer = null;
    }
    this._nhVisible = false;
  }

  toggleNHLayer() {
    this._nhVisible ? this.hideNHLayer() : this.showNHLayer();
    return this._nhVisible;
  }

  /**
   * Check if a position is near the route (within thresholdM meters)
   * @returns {number} - minimum distance to route in meters
   */
  static proximityCheck(lat, lng, coords, thresholdM = 200) {
    if (!coords || !coords.length) return Infinity;
    let minDist = Infinity;
    coords.forEach(c => {
      const d = SyntrixRoute.haversine(lat, lng, c[0], c[1]);
      if (d < minDist) minDist = d;
    });
    return minDist;
  }

  /**
   * Haversine distance in meters
   */
  static haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /**
   * Format ETA minutes into human string
   */
  static formatEta(minutes) {
    if (!minutes) return '—';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }

  /**
   * Calculate route via OSRM (India-compatible)
   * @returns {Object} { coords, distKm, etaMin, steps }
   */
  static async calcRoute(origin, destination) {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson&steps=true`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
    return {
      coords,
      distKm: parseFloat((route.distance / 1000).toFixed(1)),
      etaMin: Math.round(route.duration / 60),
      steps: route.legs?.[0]?.steps || []
    };
  }

  /**
   * Reduce coords array for Firebase (max 150 points)
   */
  static reduceCoords(coords, maxPoints = 150) {
    if (coords.length <= maxPoints) return coords;
    const step = Math.ceil(coords.length / maxPoints);
    const reduced = coords.filter((_, i) => i % step === 0);
    if (reduced[reduced.length - 1] !== coords[coords.length - 1]) {
      reduced.push(coords[coords.length - 1]);
    }
    return reduced;
  }
}

// ── GLOBAL TILE LAYER FACTORY ─────────────────────────────────────
function createSyntrixTileLayer(type = 'dark') {
  const def = SyntrixTiles[type] || SyntrixTiles.dark;
  return L.tileLayer(def.url, def.opts);
}

/**
 * Initialize map with proper India-optimized tiles
 * (replaces bare L.map() calls — fixes "No data available" at high zoom)
 */
function initSyntrixMap(containerId, opts = {}) {
  const mapOpts = {
    zoomControl: opts.zoomControl !== false,
    attributionControl: opts.attributionControl !== false,
    maxZoom: 22,
    ...opts
  };
  const map = L.map(containerId, mapOpts)
    .setView(opts.center || [20.5937, 78.9629], opts.zoom || 5);

  const tileType = opts.tileType || 'dark';
  createSyntrixTileLayer(tileType).addTo(map);

  return map;
}

console.log('✅ Syntrix Route Utilities loaded — India-optimized tiles + animated routing');
