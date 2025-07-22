<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Flood Zone Lookup Application

This is a full-stack Node.js application for checking flood risk zones in the United States.

## Technology Stack
- **Backend**: Node.js with Express framework
- **Frontend**: Vanilla JavaScript with Leaflet maps
- **APIs**: National Flood Data API and FEMA NFHL
- **Styling**: Modern CSS with responsive design

## Key Features
- Address-based flood zone lookup
- Interactive map with click-to-search
- Real-time flood zone visualization
- Mobile-responsive design
- RESTful API architecture

## Code Style Guidelines
- Use modern JavaScript (ES6+) features
- Follow RESTful API conventions
- Implement proper error handling
- Use semantic HTML and accessible UI patterns
- Write clean, self-documenting code with appropriate comments

## API Integration
- National Flood Data API for address geocoding and flood zone data
- FEMA National Flood Hazard Layer for coordinate-based queries
- Vector tile overlays for visual flood zone display

## Development Notes
- The application uses environment variables for configuration
- Backend serves the frontend as static files
- All API endpoints are prefixed with `/api/flood-zone/`
- Error responses follow a consistent JSON format with `success: false`
