/**
 * Safely extract the flood‐zone array from the API response.
 * @param {object} data  – The full JSON response from National Flood Data v3.
 * @returns {Array}      – The array of flood‐zone polygons.
 * @throws {Error}      – If the response is malformed or missing the field.
 */
function getFloodZones(data) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Response is not an object');
  }
  if (data.status !== 'OK') {
    throw new Error(`API status not OK: ${data.status}`);
  }
  const result = data.result;
  if (typeof result !== 'object' || result === null) {
    throw new Error('Missing or invalid `result` field in API response');
  }
  const zones = result['flood.s_fld_haz_ar'];
  if (!Array.isArray(zones)) {
    throw new Error('Expected `flood.s_fld_haz_ar` to be an array');
  }
  return zones;
}

/**
 * Get the top‐priority flood zone code from the zones array.
 * @param {object} data  – The full JSON response from National Flood Data v3.
 * @returns {string|null}– The `fld_zone` code (e.g. "AE", "X"), or null if none.
 */
function getPrimaryZoneCode(data) {
  try {
    const zones = getFloodZones(data);
    if (zones.length === 0) {
      return null;             // no zones intersecting the parcel
    }
    const first = zones[0];
    if (typeof first.fld_zone !== 'string') {
      throw new Error('Zone object missing `fld_zone` string property');
    }
    return first.fld_zone;
  } catch (err) {
    console.error('Error extracting flood zone:', err.message);
    return null;
  }
}

// 1. Map setup
const map = L.map('map').setView([39.8283, -98.5795], 4);  // US center :contentReference[oaicite:9]{index=9}
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);  // Basemap :contentReference[oaicite:10]{index=10}

// 2. Button handler
document.getElementById('go').onclick = async () => {
  const addr = document.getElementById('addr').value;

  // 2.1 Build API URL
  const url = new URL('https://api.nationalflooddata.com/v3/data');
  url.searchParams.set('searchtype', 'addressparcel');  // parcel lookup :contentReference[oaicite:11]{index=11}
  url.searchParams.set('address', addr.replace(/,/g, ''));

  fetch(url, { headers: { 'x-api-key': 'bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4' } })
    .then(res => res.json())
    .then(data => {
        const zones = getFloodZones(data);
        const zoneCode = getPrimaryZoneCode(data);

        console.log('All zones:', zones);
        if (zoneCode) {
            console.log('Primary zone code:', zoneCode);
        } else {
            console.log('No flood zone found for this parcel.');
        }

        // 2.4 Show on map
        const lat = data.geocode.Latitude;
        const lng = data.geocode.Longitude;

        console.log(`Zone: ${zoneCode}, Lat: ${lat}, Lng: ${lng}`);  // Debugging output

        map.setView([lat, lng], 14);
        L.marker([lat, lng]).addTo(map)
            .bindPopup(`Flood Zone: ${zoneCode}`)
            .openPopup();  // marker + popup :contentReference[oaicite:14]{index=14}
    })
    .catch(err => {
      console.error('Error fetching flood data:', err);
      alert('Failed to retrieve flood zone data. Please check the address and try again.');
    }
  );
};
