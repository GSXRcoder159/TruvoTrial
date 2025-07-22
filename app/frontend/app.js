class FloodZoneApp {
  constructor() {
    this.map = null;
    this.marker = null;
    this.floodLayer = null;
    this.lastClickedLocation = null;
    this.isLoading = false;
    
    this.init();
  }

  init() {
    this.initMap();
    this.initEventListeners();
    this.loadLegend();
    this.setupFloodLayer();
  }

  initMap() {
    // Initialize map centered on the US
    this.map = L.map('map').setView([39.8283, -98.5795], 4);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Handle map clicks
    this.map.on('click', (e) => {
      this.handleMapClick(e);
    });
  }

  initEventListeners() {
    // Search button
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.searchByAddress();
    });

    // Enter key in address input
    document.getElementById('addressInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchByAddress();
      }
    });

    // Use location button
    document.getElementById('useLocationBtn').addEventListener('click', () => {
      this.useMapLocation();
    });

    // Close result panel
    document.getElementById('closeResult').addEventListener('click', () => {
      this.hideResult();
    });

    // Toast close button
    document.getElementById('toastClose').addEventListener('click', () => {
      this.hideToast();
    });
  }

  async loadLegend() {
    try {
      const response = await fetch('/api/flood-zone/colors');
      const result = await response.json();
      
      if (result.success) {
        this.renderLegend(result.data);
      }
    } catch (error) {
      console.error('Failed to load legend:', error);
    }
  }

  renderLegend(colors) {
    const legendContent = document.getElementById('legendContent');
    legendContent.innerHTML = Object.entries(colors)
      .map(([zone, color]) => `
        <div class="legend-item">
          <div class="color-box" style="background-color: ${color}"></div>
          <span>${zone}</span>
        </div>
      `).join('');
  }

  setupFloodLayer() {
    // Vector tile overlay from NationalFloodData
    const NFD_API_KEY = "bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4";
    const NFD_VECTOR_TILE_URL = `https://api.nationalflooddata.com/v3/tiles/flood-vector/{z}/{x}/{y}.mvt`;
    
    const ZONE_COLORS = {
      "AE": "#d7191c", "A": "#fdae61", "AH": "#f46d43", "AO": "#fee08b",
      "VE": "#2c7bb6", "V": "#abd9e9", "X": "#1a9641", "X500": "#66bd63",
      "D": "#cccccc", "AR": "#f1b6da", "A99": "#fddbc7"
    };

    if (NFD_API_KEY) {
      this.floodLayer = L.vectorGrid.protobuf(NFD_VECTOR_TILE_URL, {
        vectorTileLayerStyles: {
          flood: (properties) => ({
            fill: true,
            fillColor: ZONE_COLORS[properties.fld_zone] || '#888',
            fillOpacity: 0.35,
            stroke: true,
            color: '#333',
            weight: 0.3
          })
        },
        getFeatureId: (f) => f.properties.fld_ar_id,
        maxNativeZoom: 14,
        maxZoom: 22,
        fetchOptions: { 
          headers: { 'X-API-KEY': NFD_API_KEY } 
        },
      }).addTo(this.map);
    }
  }

  handleMapClick(e) {
    const { lat, lng } = e.latlng;
    
    // Update or create marker
    if (this.marker) {
      this.marker.setLatLng(e.latlng);
    } else {
      this.marker = L.marker(e.latlng).addTo(this.map);
    }
    
    // Store location for "Use Map Point" functionality
    this.lastClickedLocation = { lat, lng };
    
    // Add popup with coordinates
    this.marker.bindPopup(`
      <div style="text-align: center;">
        <strong>📍 Selected Location</strong><br>
        <small>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</small><br>
        <button onclick="app.useMapLocation()" style="margin-top: 8px; padding: 4px 8px; cursor: pointer;">
          Check Flood Zone
        </button>
      </div>
    `).openPopup();
  }

  async searchByAddress() {
    const address = document.getElementById('addressInput').value.trim();
    
    if (!address) {
      this.showToast('Please enter an address', 'warning');
      return;
    }

    this.setLoading(true);

    try {
      const response = await fetch('/api/flood-zone/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
      });

      const result = await response.json();

      if (result.success) {
        this.displayResult(result.data);
        
        // Update map if coordinates are available
        if (result.data.coordinates) {
          const { lat, lng } = result.data.coordinates;
          this.updateMapLocation(lat, lng);
        }
      } else {
        this.showToast(result.error || 'Failed to lookup address', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showToast('Network error occurred', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async useMapLocation() {
    if (!this.lastClickedLocation) {
      this.showToast('Please click on the map first', 'warning');
      return;
    }

    this.setLoading(true);

    try {
      const { lat, lng } = this.lastClickedLocation;
      
      const response = await fetch('/api/flood-zone/coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat, lng })
      });

      const result = await response.json();

      if (result.success) {
        this.displayResult(result.data);
      } else {
        this.showToast(result.error || 'Failed to lookup coordinates', 'error');
      }
    } catch (error) {
      console.error('Coordinate lookup error:', error);
      this.showToast('Network error occurred', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  updateMapLocation(lat, lng) {
    // Update or create marker
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }
    
    // Center map on location
    this.map.setView([lat, lng], 16);
    
    // Update last clicked location
    this.lastClickedLocation = { lat, lng };
  }

  displayResult(data) {
    const resultPanel = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');
    
    const zoneClass = this.getZoneClass(data.zone);
    const riskLevel = this.getRiskLevel(data.zone);
    
    resultContent.innerHTML = `
      <div class="result-item">
        <span class="result-label">Flood Zone:</span>
        <span class="zone-badge ${zoneClass}">${data.zone}</span>
      </div>
      <div class="result-item">
        <span class="result-label">Risk Level:</span>
        <span class="result-value">${riskLevel}</span>
      </div>
      <div class="result-item">
        <span class="result-label">SFHA:</span>
        <span class="result-value">${data.sfha ? 'Yes' : 'No'}</span>
      </div>
      ${data.coordinates ? `
        <div class="result-item">
          <span class="result-label">Coordinates:</span>
          <span class="result-value">${data.coordinates.lat.toFixed(6)}, ${data.coordinates.lng.toFixed(6)}</span>
        </div>
      ` : ''}
      <div class="result-item">
        <span class="result-label">Data Source:</span>
        <span class="result-value">${data.source}</span>
      </div>
      ${data.message ? `
        <div class="result-item">
          <span class="result-label">Note:</span>
          <span class="result-value">${data.message}</span>
        </div>
      ` : ''}
    `;
    
    resultPanel.style.display = 'block';
  }

  getZoneClass(zone) {
    const highRiskZones = ['AE', 'A', 'AH', 'AO', 'VE', 'V'];
    const moderateRiskZones = ['X500', 'AR', 'A99'];
    const lowRiskZones = ['X'];
    
    if (highRiskZones.includes(zone)) return 'zone-high-risk';
    if (moderateRiskZones.includes(zone)) return 'zone-moderate-risk';
    if (lowRiskZones.includes(zone)) return 'zone-low-risk';
    return 'zone-unknown';
  }

  getRiskLevel(zone) {
    const riskLevels = {
      'AE': 'High Risk',
      'A': 'High Risk', 
      'AH': 'High Risk',
      'AO': 'High Risk',
      'VE': 'High Risk (Coastal)',
      'V': 'High Risk (Coastal)',
      'X': 'Low Risk',
      'X500': 'Moderate Risk',
      'AR': 'High Risk (Restoration)',
      'A99': 'High Risk (Protection)',
      'D': 'Undetermined Risk'
    };
    
    return riskLevels[zone] || 'Unknown Risk';
  }

  hideResult() {
    document.getElementById('result').style.display = 'none';
  }

  setLoading(loading) {
    this.isLoading = loading;
    const btn = document.getElementById('searchBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    if (loading) {
      btn.disabled = true;
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast() {
    document.getElementById('toast').style.display = 'none';
  }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new FloodZoneApp();
});

// Make app globally available for popup buttons
window.app = app;
