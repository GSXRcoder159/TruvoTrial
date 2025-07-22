/**
 * Flood Zone Checker Application
 * A comprehensive tool for checking flood zones in the US using National Flood Data API
 */

// Configuration constants
const CONFIG = {
    API_KEY: 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4',
    DATA_URL: 'https://api.nationalflooddata.com/v3/data',
    TILE_URL: 'https://api.nationalflooddata.com/v3/tiles/flood-vector/{z}/{x}/{y}.mvt',
    DEFAULT_VIEW: {
        lat: 38.89399,
        lng: -77.03659,
        zoom: 5
    },
    SEARCH_ZOOM: 16,
    MAX_ZOOM: 22,
    TILE_MAX_NATIVE_ZOOM: 14
};

// Flood zone color mappings with descriptions
const FLOOD_ZONES = {
    'A': { color: '#ffcccc', name: 'High Risk (A)', description: '1% annual chance flood hazard' },
    'AE': { color: '#ff9999', name: 'High Risk (AE)', description: '1% annual chance flood hazard with BFE' },
    'AH': { color: '#ff6666', name: 'High Risk (AH)', description: '1% annual chance flood hazard, 1-3 feet deep' },
    'AO': { color: '#ff3333', name: 'High Risk (AO)', description: '1% annual chance flood hazard, sheet flow' },
    'AR': { color: '#ff0000', name: 'High Risk (AR)', description: '1% annual chance flood hazard, temporarily flooded' },
    'V': { color: '#ccffff', name: 'High Risk (V)', description: '1% annual chance flood hazard with wave action' },
    'VE': { color: '#99ffff', name: 'High Risk (VE)', description: '1% annual chance flood hazard with wave action and BFE' },
    'X': { color: '#cccccc', name: 'Moderate/Low Risk (X)', description: '0.2% annual chance flood hazard' },
    'D': { color: '#999999', name: 'Undetermined Risk (D)', description: 'Undetermined flood hazard' }
};

// Application state
const AppState = {
    map: null,
    marker: null,
    floodLayer: null,
    isLoading: false
};

/**
 * API service for flood zone data
 */
class FloodZoneAPI {
    /**
     * Validates an address string
     * @param {string} address - The address to validate
     * @returns {boolean} - Whether the address is valid
     */
    static validateAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }
        const trimmed = address.trim();
        return trimmed.length >= 5 && /\d/.test(trimmed);
    }

    /**
     * Sanitizes address for API call
     * @param {string} address - Raw address input
     * @returns {string} - Cleaned address
     */
    static sanitizeAddress(address) {
        return address.replace(/[.,]/g, '').trim();
    }

    /**
     * Fetches flood zone information for a given address
     * @param {string} address - The address to check
     * @returns {Promise<Object>} - Flood zone data
     * @throws {Error} - API or validation errors
     */
    static async checkFloodZoneByAddress(address) {
        if (!this.validateAddress(address)) {
            throw new Error('Please enter a valid address with at least a street number and name.');
        }

        const url = new URL(CONFIG.DATA_URL);
        url.searchParams.set('searchtype', 'addressparcel');
        url.searchParams.set('address', this.sanitizeAddress(address));

        try {
            const response = await fetch(url, {
                headers: { 'X-API-KEY': CONFIG.API_KEY },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API authentication failed. Please check the API key.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (response.status >= 500) {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                } else {
                    throw new Error(`API request failed with status ${response.status}`);
                }
            }

            const data = await response.json();
            
            if (!data || !data.result) {
                throw new Error('No flood zone data found for this address.');
            }

            return data;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }
}

/**
 * Map management class
 */
class FloodZoneMap {
    /**
     * Initializes the flood zone vector tiles layer
     */
    static addFloodVectorTiles() {
        if (AppState.floodLayer) {
            AppState.map.removeLayer(AppState.floodLayer);
        }

        AppState.floodLayer = L.vectorGrid.protobuf(CONFIG.TILE_URL, {
            vectorTileLayerStyles: {
                flood: (feature) => ({
                    fill: true,
                    fillColor: FLOOD_ZONES[feature.properties.fld_zone]?.color || '#888888',
                    fillOpacity: 0.4,
                    stroke: true,
                    color: '#333333',
                    weight: 0.5,
                })
            },
            interactive: true,
            getFeatureId: (feature) => feature.properties.fld_ar_id,
            maxNativeZoom: CONFIG.TILE_MAX_NATIVE_ZOOM,
            maxZoom: CONFIG.MAX_ZOOM,
            fetchOptions: { 
                headers: { 'X-API-KEY': CONFIG.API_KEY }
            },
        }).addTo(AppState.map);

        // Add click handler for flood zones
        AppState.floodLayer.on('click', this.handleFloodZoneClick);
    }

    /**
     * Handles click events on flood zone areas
     * @param {Object} event - Leaflet event object
     */
    static handleFloodZoneClick(event) {
        const zoneCode = event.layer.properties.fld_zone;
        const zoneInfo = FLOOD_ZONES[zoneCode];
        
        const content = zoneInfo 
            ? `<strong>Flood Zone: ${zoneInfo.name}</strong><br/><small>${zoneInfo.description}</small>`
            : `<strong>Flood Zone: ${zoneCode}</strong><br/><small>Unknown zone type</small>`;

        L.popup()
            .setLatLng(event.latlng)
            .setContent(content)
            .openOn(AppState.map);
    }

    /**
     * Updates or creates a marker for the searched location
     * @param {Object} coords - Coordinates object with lat and lng
     * @param {string} zoneCode - Flood zone code for styling
     */
    static updateLocationMarker(coords, zoneCode) {
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
            return;
        }

        const position = [coords.lat, coords.lng];
        
        if (AppState.marker) {
            AppState.marker.setLatLng(position);
        } else {
            AppState.marker = L.marker(position).addTo(AppState.map);
        }

        // Style marker based on flood zone
        const zoneInfo = FLOOD_ZONES[zoneCode];
        if (zoneInfo && AppState.marker.getElement) {
            const element = AppState.marker.getElement();
            if (element) {
                element.style.filter = `hue-rotate(${this.getHueRotation(zoneInfo.color)}deg)`;
            }
        }

        AppState.map.setView(position, CONFIG.SEARCH_ZOOM);
    }

    /**
     * Calculates hue rotation for marker styling
     * @param {string} color - Hex color code
     * @returns {number} - Hue rotation in degrees
     */
    static getHueRotation(color) {
        // Simple hue rotation calculation based on color
        const colorMap = {
            '#ffcccc': 0,   // A - red
            '#ff9999': 10,  // AE - red
            '#ff6666': 20,  // AH - red
            '#ff3333': 30,  // AO - red
            '#ff0000': 40,  // AR - red
            '#ccffff': 180, // V - cyan
            '#99ffff': 190, // VE - cyan
            '#cccccc': 0,   // X - gray
            '#999999': 0    // D - gray
        };
        return colorMap[color] || 0;
    }

    /**
     * Creates and populates the legend
     */
    static createLegend() {
        const legend = document.getElementById('legend');
        if (!legend) return;

        const legendHTML = `
            <h4>Flood Zones</h4>
            ${Object.entries(FLOOD_ZONES).map(([code, info]) => `
                <div title="${info.description}">
                    <span class="color-box" style="background-color: ${info.color}"></span>
                    ${info.name}
                </div>
            `).join('')}
        `;
        
        legend.innerHTML = legendHTML;
    }
}

/**
 * UI management class
 */
class FloodZoneUI {
    /**
     * Shows result information to the user
     * @param {string} content - HTML content to display
     * @param {boolean} isError - Whether this is an error message
     */
    static showResult(content, isError = false) {
        const resultBox = document.getElementById('result');
        if (!resultBox) return;

        resultBox.innerHTML = `
            ${content}
            <button class="close-btn" onclick="FloodZoneUI.hideResult()" aria-label="Close result">×</button>
        `;
        
        resultBox.className = isError ? 'error' : '';
        resultBox.style.display = 'block';
    }

    /**
     * Hides the result display
     */
    static hideResult() {
        const resultBox = document.getElementById('result');
        if (resultBox) {
            resultBox.style.display = 'none';
        }
    }

    /**
     * Updates the loading state of the search button
     * @param {boolean} loading - Whether to show loading state
     */
    static setLoadingState(loading) {
        const button = document.getElementById('checkBtn');
        const input = document.getElementById('addr');
        
        if (button && input) {
            button.disabled = loading;
            input.disabled = loading;
            
            if (loading) {
                button.textContent = 'Checking...';
                button.classList.add('loading');
            } else {
                button.textContent = 'Check Flood Zone';
                button.classList.remove('loading');
            }
        }
        
        AppState.isLoading = loading;
    }

    /**
     * Formats flood zone data for display
     * @param {Object} data - Raw API response data
     * @returns {Object} - Formatted zone information
     */
    static formatFloodZoneData(data) {
        const floodData = data?.result?.['flood.s_fld_haz_ar']?.[0];
        
        if (!floodData) {
            return {
                zone: 'UNKNOWN',
                sfha: false,
                description: 'No flood zone data available for this location.'
            };
        }

        const zoneCode = floodData.fld_zone || 'UNKNOWN';
        const sfha = floodData.sfha_tf === 'T';
        const zoneInfo = FLOOD_ZONES[zoneCode];

        return {
            zone: zoneCode,
            sfha,
            name: zoneInfo?.name || zoneCode,
            description: zoneInfo?.description || 'Unknown flood zone type',
            coords: data?.coords || data?.geocode
        };
    }

    /**
     * Creates the result HTML content
     * @param {Object} zoneData - Formatted zone data
     * @returns {string} - HTML content
     */
    static createResultContent(zoneData) {
        return `
            <div>
                <strong>Flood Zone:</strong> ${zoneData.name}
                ${zoneData.sfha ? '<span style="color: #dc3545; font-weight: bold;"> (SFHA)</span>' : ''}
            </div>
            <div style="margin-top: 0.5rem; color: #6c757d; font-size: 0.85rem;">
                ${zoneData.description}
            </div>
            ${zoneData.sfha ? 
                '<div style="margin-top: 0.5rem; color: #dc3545; font-size: 0.85rem;"><strong>Note:</strong> This property is in a Special Flood Hazard Area and flood insurance may be required.</div>' 
                : ''
            }
        `;
    }

    /**
     * Initializes keyboard event handlers
     */
    static initializeKeyboardHandlers() {
        const addressInput = document.getElementById('addr');
        if (addressInput) {
            addressInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && !AppState.isLoading) {
                    FloodZoneApp.handleAddressSearch();
                }
            });
        }

        // ESC key to close result
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideResult();
            }
        });
    }
}

/**
 * Main application class
 */
class FloodZoneApp {
    /**
     * Initializes the entire application
     */
    static async initialize() {
        try {
            await this.initializeMap();
            this.initializeUI();
            this.bindEventHandlers();
            console.log('Flood Zone App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            FloodZoneUI.showResult('Failed to initialize the application. Please refresh the page.', true);
        }
    }

    /**
     * Initializes the Leaflet map
     */
    static async initializeMap() {
        // Create the main map
        AppState.map = L.map('map').setView(
            [CONFIG.DEFAULT_VIEW.lat, CONFIG.DEFAULT_VIEW.lng], 
            CONFIG.DEFAULT_VIEW.zoom
        );

        // Add base tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(AppState.map);

        // Add flood zone vector tiles
        FloodZoneMap.addFloodVectorTiles();
    }

    /**
     * Initializes UI components
     */
    static initializeUI() {
        // Create legend
        FloodZoneMap.createLegend();
        
        // Initialize keyboard handlers
        FloodZoneUI.initializeKeyboardHandlers();
    }

    /**
     * Binds event handlers
     */
    static bindEventHandlers() {
        const searchButton = document.getElementById('checkBtn');
        if (searchButton) {
            searchButton.addEventListener('click', this.handleAddressSearch.bind(this));
        }
    }

    /**
     * Handles address search requests
     */
    static async handleAddressSearch() {
        if (AppState.isLoading) return;

        const addressInput = document.getElementById('addr');
        if (!addressInput) return;

        const address = addressInput.value.trim();
        
        if (!address) {
            FloodZoneUI.showResult('Please enter an address to search.', true);
            return;
        }

        FloodZoneUI.setLoadingState(true);
        FloodZoneUI.hideResult();

        try {
            const data = await FloodZoneAPI.checkFloodZoneByAddress(address);
            const zoneData = FloodZoneUI.formatFloodZoneData(data);
            
            // Update map marker if coordinates are available
            if (zoneData.coords) {
                FloodZoneMap.updateLocationMarker(zoneData.coords, zoneData.zone);
            }
            
            // Show formatted result
            const resultContent = FloodZoneUI.createResultContent(zoneData);
            FloodZoneUI.showResult(resultContent, false);

        } catch (error) {
            console.error('Address search failed:', error);
            FloodZoneUI.showResult(`<strong>Error:</strong> ${error.message}`, true);
        } finally {
            FloodZoneUI.setLoadingState(false);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    FloodZoneApp.initialize();
});