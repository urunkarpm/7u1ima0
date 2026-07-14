# Weather Web App 🌤️

A beautiful, responsive weather dashboard that displays comprehensive weather data for any location worldwide. Built with vanilla HTML, CSS, and JavaScript using free APIs.

## Features

- **Current Weather**: Temperature, feels like, humidity, wind speed/direction, visibility, pressure, cloudiness
- **Sunrise & Sunset Times**: Daily solar information
- **Hourly Forecast**: 24-hour weather predictions
- **7-Day Forecast**: Weekly weather outlook with high/low temperatures
- **Air Quality Index (AQI)**: Real-time air quality data with pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- **Interactive Radar Map**: 
  - Pinch-to-zoom and pan functionality
  - Multiple overlay layers: precipitation, temperature, wind, cloud cover
  - Specialised layers: lightning strikes, snowfall accumulation
  - Click markers for detailed information
- **Trend Charts**:
  - Interactive line and bar charts using Chart.js
  - View temperature, precipitation, or wind speed trends
  - Toggle between 24-hour and 7-day timeframes
- **Geolocation Support**: Get weather for your current location
- **Search Functionality**: Search for any city worldwide
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Weather API**: [Open-Meteo](https://open-meteo.com/) - Free, no API key required
- **Air Quality API**: [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) - Free, no API key required
- **Geocoding API**: [Open-Meteo Geocoding](https://geocoding-api.open-meteo.com/) - Free, no API key required

## Getting Started

### Option 1: Open Directly in Browser
Simply open `index.html` in your web browser.

### Option 2: Use a Local Server (Recommended)
For best results, serve the files using a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Then open http://localhost:8000 in your browser
```

## Usage

1. **Search by City**: Enter a city name in the search box and click "Search" or press Enter
2. **Use Your Location**: Click the 📍 button to get weather for your current location
3. **View All Data**: The app displays:
   - Current weather conditions
   - Hourly forecast for the next 24 hours
   - 7-day daily forecast
   - Air quality index and pollutant levels

## File Structure

```
/workspace
├── index.html      # Main HTML file
├── styles.css      # Stylesheet with responsive design
├── app.js          # JavaScript application logic
└── README.md       # This file
```

## API Information

All APIs used are completely free and do not require an API key:

- **Open-Meteo Weather API**: Provides current weather, hourly and daily forecasts
- **Open-Meteo Air Quality API**: Provides air quality measurements
- **Open-Meteo Geocoding API**: Converts city names to coordinates

## Browser Compatibility

Works on all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## License

This project is open source and available for personal and commercial use.

---

Built with ❤️ using Open-Meteo APIs
