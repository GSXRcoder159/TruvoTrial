/**
 * Given a free‑form address (no punctuation), return the top flood‑zone code (e.g. "AE","X") or null.
 * @param {string} address — e.g. "500 S State St Ann Arbor MI 48109 USA"
 * @returns {Promise<string|null>}
 */
async function checkFloodZone(address) {
  const url = new URL('https://api.nationalflooddata.com/v3/data');                             // :contentReference[oaicite:15]{index=15}
  url.searchParams.set('searchtype', 'addressparcel');                                          // :contentReference[oaicite:16]{index=16}
  url.searchParams.set('address', address.replace(/[.,]/g, ''));

  const res = await fetch(url, {
    headers: { 'X-API-KEY': 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4' }
  });
  if (!res.ok) throw new Error(`Flood API error ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.result) return null;                                       // :contentReference[oaicite:17]{index=17}

  const zones = data.result['flood.s_fld_haz_ar'];                                             // :contentReference[oaicite:18]{index=18}
  if (!Array.isArray(zones) || zones.length === 0) return null;
  const top = zones[0];
  return typeof top.fld_zone === 'string' ? top.fld_zone : null;
}

async function initFloodMap() {
    // 1. Create base map centered on the contiguous US
    const map = L.map('map').setView([29.9511, -90.0715], 4);                                   // :contentReference[oaicite:22]{index=22}
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 2. Overlay FEMA flood‑zone vector tiles
    const floodLayer = L.vectorGrid.protobuf(
    'https://api.nationalflooddata.com/v3/tiles/flood-vector/{z}/{x}/{y}.mvt', {
        vectorTileLayerStyles: {
        // style by zone code: fillOpacity varies by risk
        flood: (properties, zoom) => ({
            fill: true,
            fillOpacity: properties.fld_zone.startsWith('A') ? 0.5 : 0.2,
            color: '#003366', weight: 1
        })
        },
        interactive: true,
        getFeatureId: feat => feat.properties.fld_ar_id,
        // include API key header on tile requests
        // fetchOptions: { headers: { 'X-API-KEY': 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4' } }, // :contentReference[oaicite:9]{index=9}
        updateWhenIdle: true,       // only load after pan ends :contentReference[oaicite:10]{index=10}
        updateInterval: 200,        // 200 ms debounce on move :contentReference[oaicite:11]{index=11}
        minZoom: 5,                 // lower‐res workaround :contentReference[oaicite:12]{index=12}
        maxNativeZoom: 5,
        maxConcurrentRequests: 1    // limit to one tile at a time for testing
    }
    ).addTo(map);

    // 3. Popup on click shows zone code
    floodLayer.on('click', e => {
    const z = e.layer.properties.fld_zone;
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`Flood Zone: ${z}`)
        .openOn(map);
    });

    // 4. Expose a global helper for ad‑hoc lookups
//   window.checkFloodZone = async addr => {
//     try {
//       const zone = await checkFloodZone(addr);
//       if (!zone) return alert('No flood zone found.');
//       // pan & annotate
//       const { latitude: lat, longitude: lng } = (await fetch(
//         `https://api.nationalflooddata.com/v3/data?searchtype=addresscoord&address=${encodeURIComponent(addr.replace(/[.,]/g,''))}`,
//         { headers: { 'X-API-KEY': 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4' }}
//       ).then(r => r.json())).geocode;                                                         // :contentReference[oaicite:23]{index=23}
//       map.setView([lat, lng], 14);
//       L.marker([lat, lng]).addTo(map)
//         .bindPopup(`Flood Zone: ${zone}`)
//         .openPopup();
//     } catch (err) {
//       alert(`Lookup failed: ${err.message}`);
//     }
//   };
}

    // initFloodMap();