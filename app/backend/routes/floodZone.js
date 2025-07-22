import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

// Configuration
const NFD_API_KEY = process.env.NFD_API_KEY || "bo5mKCRexh9L5YlTM1xF55ABg7rUEAzB7p1boYP4";
const NFD_DATA_URL = "https://api.nationalflooddata.com/v3/data";
const FEMA_NFHL_QUERY = "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query";

/**
 * Check flood zone by address
 * POST /api/flood-zone/address
 * Body: { address: string }
 */
router.post('/address', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ 
        error: 'Address is required',
        success: false 
      });
    }

    const params = new URLSearchParams({ 
      searchtype: 'addresscoord', 
      address, 
      loma: false 
    });

    const response = await fetch(`${NFD_DATA_URL}?${params.toString()}`, {
      headers: { 'x-api-key': NFD_API_KEY }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `NFD API Error: ${errorText}`,
        success: false 
      });
    }

    const data = await response.json();
    
    // Extract flood zone information
    const floodData = data?.result?.['flood.s_fld_haz_ar']?.[0];
    const coords = data?.coords || data?.geocode;

    const result = {
      success: true,
      data: {
        zone: floodData?.fld_zone || 'UNKNOWN',
        sfha: floodData?.sfha_tf === 'T',
        coordinates: coords ? { lat: coords.lat, lng: coords.lng } : null,
        source: 'National Flood Data',
        raw: data
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Address lookup error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
});

/**
 * Check flood zone by coordinates
 * POST /api/flood-zone/coordinates
 * Body: { lat: number, lng: number }
 */
router.post('/coordinates', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required',
        success: false 
      });
    }

    // Use FEMA NFHL directly (no API key required)
    const params = new URLSearchParams({
      f: 'json',
      returnGeometry: false,
      spatialRel: 'esriSpatialRelIntersects',
      geometry: JSON.stringify({
        x: lng, 
        y: lat, 
        spatialReference: { wkid: 4326 }
      }),
      geometryType: 'esriGeometryPoint',
      outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID'
    });

    const response = await fetch(`${FEMA_NFHL_QUERY}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `FEMA API Error: ${errorText}`,
        success: false 
      });
    }

    const data = await response.json();
    const attributes = data.features?.[0]?.attributes;

    if (!attributes) {
      return res.json({
        success: true,
        data: {
          zone: 'NOT_FOUND',
          sfha: false,
          coordinates: { lat, lng },
          source: 'FEMA NFHL',
          message: 'No flood polygon found at this location'
        }
      });
    }

    const result = {
      success: true,
      data: {
        zone: attributes.FLD_ZONE || 'UNKNOWN',
        sfha: attributes.SFHA_TF === 'T',
        coordinates: { lat, lng },
        source: 'FEMA NFHL',
        details: {
          zoneSubtype: attributes.ZONE_SUBTY,
          dfirmId: attributes.DFIRM_ID
        },
        raw: attributes
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Coordinates lookup error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
});

/**
 * Get flood zone colors for the map legend
 * GET /api/flood-zone/colors
 */
router.get('/colors', (req, res) => {
  const ZONE_COLORS = {
    "AE": "#d7191c",
    "A": "#fdae61",
    "AH": "#f46d43",
    "AO": "#fee08b",
    "VE": "#2c7bb6",
    "V": "#abd9e9",
    "X": "#1a9641",
    "X500": "#66bd63",
    "D": "#cccccc",
    "AR": "#f1b6da",
    "A99": "#fddbc7"
  };

  res.json({
    success: true,
    data: ZONE_COLORS
  });
});

/**
 * Health check endpoint
 * GET /api/flood-zone/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Flood Zone API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
