# Flood Zone Lookup Application

A modern full-stack application for checking flood risk zones across the United States. Built with Node.js/Express backend and vanilla JavaScript frontend.

## Features

- 🌊 **Flood Zone Lookup** - Search by address or map coordinates
- 🗺️ **Interactive Map** - Click-to-search functionality with Leaflet
- 📍 **Multiple Data Sources** - National Flood Data API and FEMA NFHL
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Clean, intuitive interface with real-time feedback
- 🔍 **Visual Flood Layers** - Optional vector tile overlay showing flood zones

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Development

Start the development server with auto-restart:
```bash
npm run dev
```

## API Endpoints

### POST `/api/flood-zone/address`
Lookup flood zone by address.
```json
{
  "address": "123 Main St, City, ST 12345"
}
```

### POST `/api/flood-zone/coordinates`
Lookup flood zone by latitude/longitude.
```json
{
  "lat": 40.7128,
  "lng": -74.0060
}
```

### GET `/api/flood-zone/colors`
Get flood zone color mapping for legend.

### GET `/api/flood-zone/health`
Health check endpoint.

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NFD_API_KEY=your_national_flood_data_api_key_here
```

## Project Structure

```
├── backend/
│   ├── server.js           # Express server setup
│   └── routes/
│       └── floodZone.js    # Flood zone API routes
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styles
│   └── app.js              # Frontend JavaScript
├── .env                    # Environment variables
├── package.json            # Project dependencies
└── README.md              # This file
```

## Data Sources

- **National Flood Data API** - Primary source for address-based lookups
- **FEMA NFHL** - Direct queries to FEMA's National Flood Hazard Layer
- **Vector Tiles** - Optional flood zone overlay visualization

## Flood Zone Types

- **AE, A, AH, AO** - High risk areas with detailed studies
- **VE, V** - High risk coastal areas with wave action
- **X** - Areas of minimal flood hazard
- **X500** - Areas of moderate flood hazard (500-year flood)
- **D** - Areas with undetermined flood hazard

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with modern JavaScript support

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues or questions, please open an issue on the GitHub repository.
