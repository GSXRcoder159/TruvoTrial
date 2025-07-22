const API_KEY = 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4';
const DATA_URL = 'https://api.nationalflooddata.com/v3/data';
const TILE_URL = 'https://api.nationalflooddata.com/v3/tiles/flood-vector/{z}/{x}/{y}.mvt';

const ZONE_COLORS = {
    'A': '#ffcccc',
    'AE': '#ff9999',
    'AH': '#ff6666',
    'AO': '#ff3333',
    'AR': '#ff0000',
    'V': '#ccffff',
    'VE': '#99ffff',
    'X': '#cccccc',
    'D': '#999999',
};

let map = null;
let marker = null;
let floodLayer = null;

/**
 * Given an address, return the object containing flood zone information.
 * @param {string} address
 * @returns {Promise<Object|null>}
 */
async function checkFloodZoneByAddress(address) {
    const url = new URL(DATA_URL);
    url.searchParams.set('searchtype', 'addressparcel');
    url.searchParams.set('address', address.replace(/[.,]/g, ''));

    const res = await fetch(url, {
        headers: { 'X-API-KEY': API_KEY },
    });
    if (!res.ok) {
        throw new Error(`Flood API error ${res.status}`);
    }

    return res.json();
}

function addFloodVectorTiles() {
    floodLayer = L.vectorGrid.protobuf(TILE_URL, {
        vectorTileLayerStyles: {
            flood: f => ({
                fill: true,
                fillColor: ZONE_COLORS[f.properties.fld_zone] || '#888',
                fillOpacity: 0.3,
                stroke: true,
                color: '#333',
                weight: 0.3,
            })
        },
        interactive: true,
        getFeatureId: f => f.properties.fld_ar_id,
        maxNativeZoom: 14,
        maxZoom: 22,
        fetchOptions: { headers: { 'X-API-KEY': API_KEY } },
    }).addTo(map);
}

/**
 * Display the flood zone for a given address in the result box.
 * @param {string} content
 * @returns {void}
 */
function showResult(content) {
    const box = document.getElementById('result');
    box.style.display = 'block';
    box.innerHTML = content;
}

async function initFloodMap() {
    // create the map
    map = L.map('map').setView([38.89399, -77.03659], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // overlay the flood‑zone vector tiles
    addFloodVectorTiles();

    // add legend
    const legend = document.getElementById('legend');
    legend.innerHTML = Object.entries(ZONE_COLORS).map(([z,c])=>`<div><span class="color-box" style="background:${c}"></span>${z}</div>`).join('');

    // show flood zone on click
    floodLayer.on('click', e => {
    const z = e.layer.properties.fld_zone;
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`Flood Zone: ${z}`)
        .openOn(map);
    });

    // search by address
    const searchButton = document.getElementById('checkBtn');
    searchButton.onclick = async () => {
        const address = document.getElementById('addr').value.trim();
        if (!address) {
            alert('Please enter an address.');
            return;
        }
        try {
            const data = await checkFloodZoneByAddress(address);
            const zone = data?.result?.['flood.s_fld_haz_ar']?.[0]?.fld_zone || "UNKNOWN";
            const sfha = data?.result?.['flood.s_fld_haz_ar']?.[0]?.sfha_tf === 'T';
            const coords = data?.coords || data?.geocode;
            if (coords) {
                if (marker) {
                    marker.setLatLng([coords.lat, coords.lng]);
                } else {
                    marker = L.marker([coords.lat, coords.lng]).addTo(map);
                }
                map.setView([coords.lat, coords.lng], 16);
            }
            showResult(`<strong>Zone:</strong> ${zone} ${sfha ? '(SFHA)' : ''}`);
            if (zone in ZONE_COLORS) {
                marker.getElement().style.backgroundColor = ZONE_COLORS[zone];
            }
        } catch (err) {
            console.error(err);
            showResult('Error: ' + err.message);
        }
    };
}

initFloodMap();