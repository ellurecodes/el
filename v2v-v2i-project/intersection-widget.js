/**
 * V2X Intersection Widget v2.0 — L.Layer-based (rotation-stable)
 *
 * Unlike imageOverlay, this extends L.Layer directly so that CSS rotation
 * is NEVER reset by Leaflet's internal transform recalculation on pan/zoom.
 *
 * Features:
 *   - Drag: click the glowing center handle to reposition
 *   - Rotate: exposed setRotation(deg) — driven by sidebar slider
 *   - Resize: exposed setSize(meters) — recomputes pixel bounds
 *   - Firebase sync: onUpdate callback fires on every change
 *   - Rich SVG: 4-lane road, crosswalks, stop lines, directional arrows,
 *     animated traffic light poles, compass rose
 */

const IntersectionWidget = L.Layer.extend({

  initialize: function(options) {
    L.setOptions(this, {
      lat: 12.9176,
      lng: 77.6201,
      sizeMeters: 140,
      rotation: 0,
      opacity: 0.82,
      onUpdate: null,
      ...options
    });
    this._center  = L.latLng(this.options.lat, this.options.lng);
    this._size    = this.options.sizeMeters;
    this._rotation = this.options.rotation;
    this._dragging = false;
  },

  onAdd: function(map) {
    this._map = map;

    // Container div (this is what we rotate, never touched by Leaflet)
    this._container = L.DomUtil.create('div', 'v2x-int-container');
    this._container.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'transform-origin:50% 50%',
      'transition:transform 0.15s ease',
      'z-index:200',
    ].join(';');

    // SVG inside the container
    this._svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    this._svgEl.setAttribute('xmlns','http://www.w3.org/2000/svg');
    this._svgEl.setAttribute('viewBox','0 0 500 500');
    this._svgEl.style.cssText = 'width:100%;height:100%;display:block;';
    this._svgEl.innerHTML = this._buildSVG();
    this._container.appendChild(this._svgEl);

    // Drag handle marker
    this._buildDragHandle();

    // Inject container into Leaflet's overlay pane
    map.getPanes().overlayPane.appendChild(this._container);

    // Bind map events
    map.on('zoom viewreset move zoomend moveend', this._update, this);
    this._update();
    return this;
  },

  onRemove: function(map) {
    map.getPanes().overlayPane.removeChild(this._container);
    if (this._handle) map.removeLayer(this._handle);
    map.off('zoom viewreset move zoomend moveend', this._update, this);
  },

  // ── SVG BUILDER ──────────────────────────────────────────────
  _buildSVG: function() {
    return `
      <defs>
        <linearGradient id="roadH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0d0e1c"/>
          <stop offset="8%" stop-color="#252636"/>
          <stop offset="50%" stop-color="#1a1b2c"/>
          <stop offset="92%" stop-color="#252636"/>
          <stop offset="100%" stop-color="#0d0e1c"/>
        </linearGradient>
        <linearGradient id="roadV" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0d0e1c"/>
          <stop offset="8%" stop-color="#252636"/>
          <stop offset="50%" stop-color="#1a1b2c"/>
          <stop offset="92%" stop-color="#252636"/>
          <stop offset="100%" stop-color="#0d0e1c"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Pavement base -->
      <rect width="500" height="500" fill="#080910"/>

      <!-- Sidewalk tiles (corners) -->
      <rect x="0"   y="0"   width="152" height="152" fill="#0f1020"/>
      <rect x="348" y="0"   width="152" height="152" fill="#0f1020"/>
      <rect x="0"   y="348" width="152" height="152" fill="#0f1020"/>
      <rect x="348" y="348" width="152" height="152" fill="#0f1020"/>

      <!-- Kerb borders on sidewalks -->
      <rect x="148" y="0"   width="4" height="152" fill="#1e2035"/>
      <rect x="348" y="0"   width="4" height="152" fill="#1e2035"/>
      <rect x="148" y="348" width="4" height="152" fill="#1e2035"/>
      <rect x="348" y="348" width="4" height="152" fill="#1e2035"/>
      <rect x="0"   y="148" width="152" height="4" fill="#1e2035"/>
      <rect x="0"   y="348" width="152" height="4" fill="#1e2035"/>
      <rect x="348" y="148" width="152" height="4" fill="#1e2035"/>
      <rect x="348" y="348" width="152" height="4" fill="#1e2035"/>

      <!-- Road surfaces -->
      <rect x="152" y="0"   width="196" height="500" fill="url(#roadH)"/>
      <rect x="0"   y="152" width="500" height="196" fill="url(#roadV)"/>
      <rect x="152" y="152" width="196" height="196" fill="#1a1b2c"/>

      <!-- Lane markings — center dashed N/S -->
      <rect x="248" y="0" width="4" height="136" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="18,12"/>
      <rect x="248" y="364" width="4" height="136" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="18,12"/>

      <!-- Lane markings — center dashed E/W -->
      <rect x="0" y="248" width="136" height="4" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="18,12"/>
      <rect x="364" y="248" width="136" height="4" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="18,12"/>

      <!-- Stop lines -->
      <rect x="152" y="142" width="196" height="5" fill="rgba(255,255,255,0.55)" rx="1"/>
      <rect x="152" y="353" width="196" height="5" fill="rgba(255,255,255,0.55)" rx="1"/>
      <rect x="142" y="152" width="5" height="196" fill="rgba(255,255,255,0.55)" rx="1"/>
      <rect x="353" y="152" width="5" height="196" fill="rgba(255,255,255,0.55)" rx="1"/>

      <!-- Zebra crossings — North -->
      <g fill="rgba(255,255,255,0.18)">
        <rect x="159" y="124" width="10" height="20" rx="1"/>
        <rect x="175" y="124" width="10" height="20" rx="1"/>
        <rect x="191" y="124" width="10" height="20" rx="1"/>
        <rect x="207" y="124" width="10" height="20" rx="1"/>
        <rect x="223" y="124" width="10" height="20" rx="1"/>
        <rect x="239" y="124" width="10" height="20" rx="1"/>
        <rect x="255" y="124" width="10" height="20" rx="1"/>
        <rect x="271" y="124" width="10" height="20" rx="1"/>
        <rect x="287" y="124" width="10" height="20" rx="1"/>
        <rect x="303" y="124" width="10" height="20" rx="1"/>
        <rect x="319" y="124" width="10" height="20" rx="1"/>
        <rect x="335" y="124" width="10" height="20" rx="1"/>
      </g>
      <!-- Zebra crossings — South -->
      <g fill="rgba(255,255,255,0.18)">
        <rect x="159" y="356" width="10" height="20" rx="1"/>
        <rect x="175" y="356" width="10" height="20" rx="1"/>
        <rect x="191" y="356" width="10" height="20" rx="1"/>
        <rect x="207" y="356" width="10" height="20" rx="1"/>
        <rect x="223" y="356" width="10" height="20" rx="1"/>
        <rect x="239" y="356" width="10" height="20" rx="1"/>
        <rect x="255" y="356" width="10" height="20" rx="1"/>
        <rect x="271" y="356" width="10" height="20" rx="1"/>
        <rect x="287" y="356" width="10" height="20" rx="1"/>
        <rect x="303" y="356" width="10" height="20" rx="1"/>
        <rect x="319" y="356" width="10" height="20" rx="1"/>
        <rect x="335" y="356" width="10" height="20" rx="1"/>
      </g>
      <!-- Zebra crossings — West -->
      <g fill="rgba(255,255,255,0.18)">
        <rect x="124" y="159" width="20" height="10" rx="1"/>
        <rect x="124" y="175" width="20" height="10" rx="1"/>
        <rect x="124" y="191" width="20" height="10" rx="1"/>
        <rect x="124" y="207" width="20" height="10" rx="1"/>
        <rect x="124" y="223" width="20" height="10" rx="1"/>
        <rect x="124" y="239" width="20" height="10" rx="1"/>
        <rect x="124" y="255" width="20" height="10" rx="1"/>
        <rect x="124" y="271" width="20" height="10" rx="1"/>
        <rect x="124" y="287" width="20" height="10" rx="1"/>
        <rect x="124" y="303" width="20" height="10" rx="1"/>
        <rect x="124" y="319" width="20" height="10" rx="1"/>
        <rect x="124" y="335" width="20" height="10" rx="1"/>
      </g>
      <!-- Zebra crossings — East -->
      <g fill="rgba(255,255,255,0.18)">
        <rect x="356" y="159" width="20" height="10" rx="1"/>
        <rect x="356" y="175" width="20" height="10" rx="1"/>
        <rect x="356" y="191" width="20" height="10" rx="1"/>
        <rect x="356" y="207" width="20" height="10" rx="1"/>
        <rect x="356" y="223" width="20" height="10" rx="1"/>
        <rect x="356" y="239" width="20" height="10" rx="1"/>
        <rect x="356" y="255" width="20" height="10" rx="1"/>
        <rect x="356" y="271" width="20" height="10" rx="1"/>
        <rect x="356" y="287" width="20" height="10" rx="1"/>
        <rect x="356" y="303" width="20" height="10" rx="1"/>
        <rect x="356" y="319" width="20" height="10" rx="1"/>
        <rect x="356" y="335" width="20" height="10" rx="1"/>
      </g>

      <!-- Traffic light poles (4 corners) -->
      <g fill="#1a1a30" stroke="#2a2a48" stroke-width="1">
        <!-- NW -->
        <rect x="134" y="130" width="4" height="20" rx="2"/>
        <rect x="128" y="128" width="16" height="4" rx="2"/>
        <rect x="128" y="130" width="16" height="14" rx="3"/>
        <circle cx="136" cy="134" r="4" fill="#440000"/><circle cx="136" cy="134" r="4" fill="#ff2200" filter="url(#glow)" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/></circle>
        <circle cx="136" cy="140" r="4" fill="#443300"/>
        <!-- NE -->
        <rect x="362" y="130" width="4" height="20" rx="2"/>
        <rect x="356" y="128" width="16" height="4" rx="2"/>
        <rect x="356" y="130" width="16" height="14" rx="3"/>
        <circle cx="364" cy="134" r="4" fill="#440000"/>
        <circle cx="364" cy="140" r="4" fill="#004400"/><circle cx="364" cy="140" r="4" fill="#00ff44" filter="url(#glow)" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite"/></circle>
        <!-- SW -->
        <rect x="134" y="350" width="4" height="20" rx="2"/>
        <rect x="128" y="366" width="16" height="4" rx="2"/>
        <rect x="128" y="356" width="16" height="14" rx="3"/>
        <circle cx="136" cy="360" r="4" fill="#004400"/><circle cx="136" cy="360" r="4" fill="#00ff44" filter="url(#glow)" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.1s" repeatCount="indefinite"/></circle>
        <circle cx="136" cy="367" r="4" fill="#443300"/>
        <!-- SE -->
        <rect x="362" y="350" width="4" height="20" rx="2"/>
        <rect x="356" y="366" width="16" height="4" rx="2"/>
        <rect x="356" y="356" width="16" height="14" rx="3"/>
        <circle cx="364" cy="360" r="4" fill="#440000"/><circle cx="364" cy="360" r="4" fill="#ff2200" filter="url(#glow)" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite"/></circle>
        <circle cx="364" cy="367" r="4" fill="#443300"/>
      </g>

      <!-- Center V2X seal -->
      <circle cx="250" cy="250" r="38" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.2)" stroke-width="1.5"/>
      <circle cx="250" cy="250" r="28" fill="rgba(0,0,0,0.5)" stroke="rgba(0,229,255,0.12)" stroke-width="1"/>
      <text x="250" y="246" font-family="Orbitron,sans-serif" font-size="11" font-weight="900" fill="rgba(0,229,255,0.7)" text-anchor="middle" letter-spacing="2">V2X</text>
      <text x="250" y="260" font-family="monospace" font-size="7" fill="rgba(0,229,255,0.35)" text-anchor="middle" letter-spacing="1">CONNECT</text>

      <!-- Compass Rose labels -->
      <text x="250" y="22" font-family="Orbitron,sans-serif" font-size="13" font-weight="900" fill="rgba(255,255,255,0.45)" text-anchor="middle">N</text>
      <text x="250" y="494" font-family="Orbitron,sans-serif" font-size="13" font-weight="900" fill="rgba(255,255,255,0.45)" text-anchor="middle">S</text>
      <text x="14" y="253" font-family="Orbitron,sans-serif" font-size="13" font-weight="900" fill="rgba(255,255,255,0.45)" text-anchor="middle">W</text>
      <text x="488" y="253" font-family="Orbitron,sans-serif" font-size="13" font-weight="900" fill="rgba(255,255,255,0.45)" text-anchor="middle">E</text>

      <!-- Directional arrows in lanes -->
      <text x="210" y="100" font-size="18" fill="rgba(255,255,255,0.2)" text-anchor="middle">↑</text>
      <text x="290" y="420" font-size="18" fill="rgba(255,255,255,0.2)" text-anchor="middle">↓</text>
      <text x="420" y="210" font-size="18" fill="rgba(255,255,255,0.2)" text-anchor="middle">→</text>
      <text x="90" y="295" font-size="18" fill="rgba(255,255,255,0.2)" text-anchor="middle">←</text>
    `;
  },

  // ── DRAG HANDLE ──────────────────────────────────────────────
  _buildDragHandle: function() {
    this._handle = L.marker(this._center, {
      draggable: true,
      zIndexOffset: 1500,
      icon: L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;
          background:radial-gradient(circle,rgba(0,229,255,0.9),rgba(0,229,255,0.25));
          border:2px solid #00e5ff;
          border-radius:50%;
          cursor:move;
          box-shadow:0 0 16px #00e5ff,0 0 32px rgba(0,229,255,0.4);
          transform:translate(-14px,-14px);
          pointer-events:all;
        "></div>
        <div style="
          position:absolute;top:30px;left:50%;transform:translateX(-50%);
          font-size:8px;font-family:monospace;color:#00e5ff;
          white-space:nowrap;text-shadow:0 0 6px #00e5ff;
          pointer-events:none;
        ">DRAG</div>`,
        iconSize: [0, 0]
      })
    }).addTo(this._map);

    this._handle.on('drag', e => {
      this._center = e.latlng;
      this._update();
      if (this.options.onUpdate) this.options.onUpdate(this.getState());
    });
    this._handle.on('dragend', e => {
      this._center = e.target.getLatLng();
      if (this.options.onUpdate) this.options.onUpdate(this.getState());
    });
  },

  // ── POSITION UPDATE (called on every map move/zoom) ──────────
  _update: function() {
    if (!this._map || !this._container) return;

    const map  = this._map;
    const size = this._size;
    const lat  = this._center.lat;
    const lng  = this._center.lng;

    // Convert center to pixel coords
    const centerPx = map.latLngToLayerPoint(this._center);

    // Compute pixel dimensions from meters
    // Approx: 1 degree lat = 111111m, adjust lng for latitude
    const latDeg = size / 111111;
    const lngDeg = size / (111111 * Math.cos(lat * Math.PI / 180));

    const sw = map.latLngToLayerPoint([lat - latDeg/2, lng - lngDeg/2]);
    const ne = map.latLngToLayerPoint([lat + latDeg/2, lng + lngDeg/2]);

    const w = Math.abs(ne.x - sw.x);
    const h = Math.abs(sw.y - ne.y);
    const left = centerPx.x - w/2;
    const top  = centerPx.y - h/2;

    this._container.style.left   = left + 'px';
    this._container.style.top    = top + 'px';
    this._container.style.width  = w + 'px';
    this._container.style.height = h + 'px';
    this._container.style.opacity = this.options.opacity;

    // Rotation is CSS-only on the container — never touched by Leaflet
    this._applyRotation();
  },

  _applyRotation: function() {
    if (this._container) {
      this._container.style.transform = `rotate(${this._rotation}deg)`;
    }
  },

  // ── PUBLIC API ───────────────────────────────────────────────
  setRotation: function(degrees) {
    this._rotation = parseFloat(degrees);
    this._applyRotation();
  },

  setSize: function(meters) {
    this._size = parseFloat(meters);
    this._update();
  },

  setCenter: function(latlng) {
    this._center = L.latLng(latlng);
    if (this._handle) this._handle.setLatLng(this._center);
    this._update();
  },

  getState: function() {
    return {
      lat: this._center.lat,
      lng: this._center.lng,
      sizeMeters: this._size,
      rotation: this._rotation
    };
  }
});

// Factory function (use like: new IntersectionWidget(map, opts))
window.IntersectionWidget = function(map, options) {
  const w = new IntersectionWidget(options);
  map.addLayer(w);
  return w;
};
