// ================================================================
//  MAP CONFIGURATION & SATELLITE LAYER MANAGER
//  
//  Supports:
//  - Mapbox satellite (color)
//  - Mapbox street
//  - OpenStreetMap
//  - Layer switching
//  - Marker clustering
//  - Performance optimization
//
// ================================================================

const MapConfig = {
  // Mapbox tile layers (FREE tier available)
  MAPBOX_SATELLITE: {
    url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{lng},{lat},{z}/{width},{height}@2x?access_token={accessToken}',
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
    type: 'raster',
    tileSize: 512,
  },

  // Alternative: Google Satellite
  GOOGLE_SATELLITE: {
    url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google Maps',
    tileSize: 256,
  },

  // OpenStreetMap (free, no key needed)
  OSM_SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe, Earthstar Geographics',
    tileSize: 256,
  },

  // Street maps
  OSM_STREET: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    tileSize: 256,
  },

  MAPBOX_STREET: {
    url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/{lng},{lat},{z}/{width}/{height}@2x?access_token={accessToken}',
    attribution: '© Mapbox',
    type: 'raster',
    tileSize: 512,
  },

  // Silk Board Junction, Bangalore (demo geofence)
  DEFAULT_CENTER: {
    lat: 12.9180,
    lng: 77.6201,
    zoom: 17,
    name: 'Silk Board Junction, Bangalore'
  },
};

/**
 * MapManager — Handles map initialization, layer switching, clustering
 */
class MapManager {
  constructor(mapContainer = 'map') {
    this.mapContainer = mapContainer;
    this.map = null;
    this.baseLayers = {
      street: null,
      satellite: null,
    };
    this.markerClusters = null;
    this.markers = new Map(); // id → marker
    this.currentLayer = 'satellite';
    this.layerControl = null;
  }

  /**
   * initMap() — Initialize Leaflet map with satellite layer
   */
  initMap() {
    // Create map at Silk Board Junction
    this.map = L.map(this.mapContainer, {
      attributionControl: true,
      zoomControl: true,
      preferCanvas: true, // Better performance
    }).setView(
      [MapConfig.DEFAULT_CENTER.lat, MapConfig.DEFAULT_CENTER.lng],
      MapConfig.DEFAULT_CENTER.zoom
    );

    // Add satellite layer
    this.baseLayers.satellite = L.tileLayer(
      MapConfig.OSM_SATELLITE.url,
      {
        attribution: MapConfig.OSM_SATELLITE.attribution,
        maxZoom: 19,
        minZoom: 1,
        tileSize: 256,
      }
    ).addTo(this.map);

    // Add street layer (not shown by default)
    this.baseLayers.street = L.tileLayer(
      MapConfig.OSM_STREET.url,
      {
        attribution: MapConfig.OSM_STREET.attribution,
        maxZoom: 19,
        minZoom: 1,
      }
    );

    // Layer control
    this.layerControl = L.control.layers(this.baseLayers, {}, {
      position: 'topright',
      collapsed: true,
    }).addTo(this.map);

    // ── MARKER CLUSTERING ──
    this.markerClusters = L.markerClusterGroup({
      maxClusterRadius: 80,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster) => {
        return L.divIcon({
          html: `<div class="cluster-marker">${cluster.getChildCount()}</div>`,
          className: 'cluster-icon',
          iconSize: [40, 40],
        });
      },
    });
    this.map.addLayer(this.markerClusters);

    // ── ZOOM INDICATOR ──
    const zoomIndicator = L.control({ position: 'bottomright' });
    zoomIndicator.onAdd = () => {
      const div = L.DomUtil.create('div', 'zoom-indicator');
      this.map.on('zoomend', () => {
        div.innerHTML = `Zoom: ${this.map.getZoom()}`;
      });
      div.innerHTML = `Zoom: ${this.map.getZoom()}`;
      return div;
    };
    zoomIndicator.addTo(this.map);

    // ── GEOLOCATION CONTROL ──
    const geoControl = L.control({ position: 'topleft' });
    geoControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'geo-control');
      div.innerHTML = '<button id="geolocate-btn" title="Center on my location">📍</button>';
      div.onclick = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            this.map.setView([pos.coords.latitude, pos.coords.longitude], 17);
          });
        }
      };
      return div;
    };
    geoControl.addTo(this.map);

    console.log('✅ Map initialized with satellite layer');
    return this.map;
  }

  /**
   * addMarker(id, lat, lng, options) → marker
   */
  addMarker(id, lat, lng, options = {}) {
    const {
      icon = '📍',
      color = '#FF0000',
      title = '',
      onClick = null,
      popupText = '',
    } = options;

    // Create custom icon
    const marker = L.marker([lat, lng], {
      title: title,
      icon: L.divIcon({
        html: `<div class="marker" style="background-color: ${color}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${icon}</div>`,
        iconSize: [30, 30],
        className: 'custom-marker',
      }),
    });

    if (popupText) {
      marker.bindPopup(popupText);
    }

    if (onClick) {
      marker.on('click', onClick);
    }

    this.markerClusters.addLayer(marker);
    this.markers.set(id, marker);

    return marker;
  }

  /**
   * updateMarker(id, lat, lng, options) — Update marker position
   */
  updateMarker(id, lat, lng, options = {}) {
    if (this.markers.has(id)) {
      const marker = this.markers.get(id);
      marker.setLatLng([lat, lng]);

      if (options.popupText) {
        marker.setPopupContent(options.popupText);
      }

      if (options.color) {
        marker.setIcon(L.divIcon({
          html: `<div class="marker" style="background-color: ${options.color}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${options.icon || '📍'}</div>`,
          iconSize: [30, 30],
          className: 'custom-marker',
        }));
      }
    }
  }

  /**
   * removeMarker(id) — Remove marker
   */
  removeMarker(id) {
    if (this.markers.has(id)) {
      this.markerClusters.removeLayer(this.markers.get(id));
      this.markers.delete(id);
    }
  }

  /**
   * switchLayer(layerName) — Switch between satellite and street
   */
  switchLayer(layerName) {
    if (layerName === 'satellite' && this.baseLayers.street) {
      this.map.removeLayer(this.baseLayers.street);
      if (!this.map.hasLayer(this.baseLayers.satellite)) {
        this.map.addLayer(this.baseLayers.satellite);
      }
      this.currentLayer = 'satellite';
    } else if (layerName === 'street' && this.baseLayers.satellite) {
      this.map.removeLayer(this.baseLayers.satellite);
      if (!this.map.hasLayer(this.baseLayers.street)) {
        this.map.addLayer(this.baseLayers.street);
      }
      this.currentLayer = 'street';
    }
  }

  /**
   * fitBounds(lat1, lng1, lat2, lng2) — Fit map to bounding box
   */
  fitBounds(lat1, lng1, lat2, lng2) {
    this.map.fitBounds([[lat1, lng1], [lat2, lng2]], { padding: [50, 50] });
  }

  /**
   * drawCircle(lat, lng, radiusMeters, color = '#FF0000') — Geofence visualization
   */
  drawCircle(lat, lng, radiusMeters, color = '#FF0000') {
    return L.circle([lat, lng], {
      radius: radiusMeters,
      color: color,
      fillColor: color,
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(this.map);
  }

  /**
   * drawPolyline(coords, color = '#FF0000') — Route visualization
   */
  drawPolyline(coords, color = '#FF0000') {
    return L.polyline(coords, {
      color: color,
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 5',
    }).addTo(this.map);
  }

  /**
   * getCenter() → {lat, lng}
   */
  getCenter() {
    const center = this.map.getCenter();
    return { lat: center.lat, lng: center.lng };
  }

  /**
   * getBounds() → {north, south, east, west}
   */
  getBounds() {
    const bounds = this.map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }

  /**
   * destroy() — Cleanup
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

// ================================================================
//  CSS STYLES FOR MAP COMPONENTS
// ================================================================
const mapStyles = `
<style>
.cluster-icon {
  background-color: #FF6B35;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.cluster-marker {
  color: white;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.zoom-indicator {
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  font-size: 12px;
  font-weight: bold;
}

.geo-control {
  background: white;
  padding: 6px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.geo-control button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.geo-control button:hover {
  background: #f0f0f0;
  border-radius: 3px;
}

.marker {
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
`;

// ================================================================
//  EXPORT
// ================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MapConfig, MapManager, mapStyles };
}

console.log('✅ Map Configuration & Satellite Layer Manager loaded');
