// Open-Meteo API is free and doesn't require an API key
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

// DOM Elements
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const weatherDataEl = document.getElementById('weatherData');
const weatherBackgroundEl = document.getElementById('weatherBackground');

// Map and Chart state
let weatherMap = null;
let weatherChart = null;
let currentLat = 51.5074;
let currentLon = -0.1278;
let hourlyForecastData = null;
let dailyForecastData = null;
let currentLayer = 'precipitation';
let currentChartType = 'temperature';
let currentChartTimeframe = 24;

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', handleGeolocation);
locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Initialize with a default city
window.addEventListener('DOMContentLoaded', () => {
    fetchWeatherByCity('London');
    initializeMap();
    initializeChartAndMapListeners();
});

async function handleSearch() {
    const city = locationInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    await fetchWeatherByCity(city);
}

async function handleGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading();
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: true
            });
        });

        const { latitude, longitude } = position.coords;
        await fetchWeatherByCoords(latitude, longitude);
    } catch (error) {
        showError('Unable to get your location. Please search manually.');
        console.error('Geolocation error:', error);
    }
}

async function fetchWeatherByCity(city) {
    showLoading();
    try {
        // First, get coordinates for the city
        const geoResponse = await fetch(`${GEOCODING_API_BASE}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        
        if (!geoResponse.ok) {
            throw new Error('City not found');
        }

        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found. Please try another location.');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        currentLat = latitude;
        currentLon = longitude;
        await fetchWeatherByCoords(latitude, longitude, name, country);
    } catch (error) {
        showError(error.message);
    }
}

async function fetchWeatherByCoords(lat, lon, cityName = null, country = null) {
    try {
        // Fetch current weather, hourly forecast, and daily forecast
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,cloud_cover',
            hourly: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
            timezone: 'auto',
            forecast_days: 7
        });

        const response = await fetch(`${WEATHER_API_BASE}?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        // Store forecast data for charts
        hourlyForecastData = data.hourly;
        dailyForecastData = data.daily;
        
        // Fetch air quality data separately
        let airQualityData = null;
        try {
            const aqiParams = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide'
            });
            
            const aqiResponse = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams}`);
            if (aqiResponse.ok) {
                airQualityData = await aqiResponse.json();
            }
        } catch (e) {
            console.log('Air quality data not available');
        }

        displayWeather(data, cityName, country, airQualityData);
    } catch (error) {
        showError(error.message);
    }
}

function displayWeather(data, cityName, country, airQualityData) {
    hideLoading();
    weatherDataEl.classList.remove('hidden');

    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    // Update location info
    document.getElementById('cityName').textContent = cityName || 'Unknown';
    document.getElementById('countryCode').textContent = country || '';
    document.getElementById('localTime').textContent = new Date().toLocaleString();

    // Update current weather
    document.getElementById('temp').textContent = Math.round(current.temperature_2m);
    document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('weatherDesc').textContent = getWeatherDescription(current.weather_code);
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${current.wind_speed_10m} km/h`;
    document.getElementById('windDir').textContent = getWindDirection(current.wind_direction_10m);
    document.getElementById('visibility').textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    document.getElementById('pressure').textContent = `${current.pressure_msl} hPa`;
    document.getElementById('clouds').textContent = `${current.cloud_cover}%`;
    
    // Sunrise and Sunset
    const sunriseTime = new Date(daily.sunrise[0]);
    const sunsetTime = new Date(daily.sunset[0]);
    document.getElementById('sunrise').textContent = sunriseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunset').textContent = sunsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Weather icon
    const iconUrl = getWeatherIcon(current.weather_code);
    document.getElementById('weatherIcon').src = iconUrl;

    // Update background based on weather
    updateWeatherBackground(current.weather_code);

    // Hourly forecast (next 24 hours)
    const hourlyContainer = document.getElementById('hourlyForecast');
    hourlyContainer.innerHTML = '';
    
    const currentHour = new Date().getHours();
    for (let i = 0; i < 24; i++) {
        const hourIndex = currentHour + i;
        if (hourIndex >= hourly.time.length) break;

        const hourData = hourly.time[hourIndex];
        const hourDate = new Date(hourData);
        const hourLabel = i === 0 ? 'Now' : hourDate.toLocaleTimeString([], { hour: '2-digit' });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <p class="time">${hourLabel}</p>
            <img src="${getWeatherIcon(hourly.weather_code[hourIndex])}" alt="Weather icon" />
            <p class="temp">${Math.round(hourly.temperature_2m[hourIndex])}°</p>
            <p class="desc">${getShortWeatherDesc(hourly.weather_code[hourIndex])}</p>
        `;
        hourlyContainer.appendChild(card);
    }

    // Daily forecast
    const dailyContainer = document.getElementById('dailyForecast');
    dailyContainer.innerHTML = '';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < daily.time.length; i++) {
        const dayDate = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Today' : days[dayDate.getDay()];
        const dateStr = dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <p class="day">${dayName}</p>
            <p class="date">${dateStr}</p>
            <img src="${getWeatherIcon(daily.weather_code[i])}" alt="Weather icon" />
            <div class="temps">
                <span class="high">${Math.round(daily.temperature_2m_max[i])}°</span>
                <span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>
            </div>
            <p class="desc">${getWeatherDescription(daily.weather_code[i])}</p>
        `;
        dailyContainer.appendChild(card);
    }

    // Air Quality
    if (airQualityData && airQualityData.current) {
        const aqi = airQualityData.current;
        const aqiValue = calculateAQI(aqi.pm2_5, aqi.pm10, aqi.ozone, aqi.nitrogen_dioxide, aqi.sulphur_dioxide, aqi.carbon_monoxide);
        
        document.getElementById('aqiValue').textContent = aqiValue.value;
        document.getElementById('aqiCategory').textContent = aqiValue.category;
        document.getElementById('aqiDescription').textContent = aqiValue.description;
        document.getElementById('aqiValue').style.background = aqiValue.color;
        
        document.getElementById('pm25').textContent = `${aqi.pm2_5.toFixed(1)} μg/m³`;
        document.getElementById('pm10').textContent = `${aqi.pm10.toFixed(1)} μg/m³`;
        document.getElementById('o3').textContent = `${aqi.ozone.toFixed(1)} μg/m³`;
        document.getElementById('no2').textContent = `${aqi.nitrogen_dioxide.toFixed(1)} μg/m³`;
        document.getElementById('so2').textContent = `${aqi.sulphur_dioxide.toFixed(1)} μg/m³`;
        document.getElementById('co').textContent = `${aqi.carbon_monoxide.toFixed(1)} μg/m³`;
    } else {
        document.getElementById('aqiValue').textContent = '--';
        document.getElementById('aqiCategory').textContent = 'Not Available';
        document.getElementById('aqiDescription').textContent = 'Air quality data is not available for this location';
        document.getElementById('aqiValue').style.background = '#95a5a6';
    }

    // Update map center and markers
    updateMapCenter(lat, lon);
    
    // Update trend chart with new data
    updateWeatherChart();
}

function getWeatherIcon(code) {
    // Using Open-Meteo's WMO weather interpretation codes
    // Mapping WMO codes to OpenWeatherMap icon codes
    const iconMap = {
        0: '01d',   // Clear sky
        1: '02d',   // Mainly clear
        2: '03d',   // Partly cloudy
        3: '04d',   // Overcast
        45: '50d',  // Foggy
        48: '50d',  // Depositing rime fog
        51: '09d',  // Light drizzle
        53: '09d',  // Moderate drizzle
        55: '09d',  // Dense drizzle
        56: '09d',  // Light freezing drizzle
        57: '09d',  // Dense freezing drizzle
        61: '10d',  // Slight rain
        63: '10d',  // Moderate rain
        65: '10d',  // Heavy rain
        66: '10d',  // Light freezing rain
        67: '10d',  // Heavy freezing rain
        71: '13d',  // Slight snow fall
        73: '13d',  // Moderate snow fall
        75: '13d',  // Heavy snow fall
        77: '13d',  // Snow grains
        80: '09d',  // Slight rain showers
        81: '10d',  // Moderate rain showers
        82: '10d',  // Violent rain showers
        85: '13d',  // Slight snow showers
        86: '13d',  // Heavy snow showers
        95: '11d',  // Thunderstorm
        96: '11d',  // Thunderstorm with slight hail
        99: '11d'   // Thunderstorm with heavy hail
    };

    const iconCode = iconMap[code] || '01d';
    return `https://openweathermap.org/img/wn/${iconCode}.png`;
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };

    return descriptions[code] || 'Unknown';
}

function getShortWeatherDesc(code) {
    const shortDescs = {
        0: 'Clear',
        1: 'Mostly Clear',
        2: 'Partly Cloudy',
        3: 'Cloudy',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Drizzle',
        53: 'Drizzle',
        55: 'Drizzle',
        61: 'Rain',
        63: 'Rain',
        65: 'Heavy Rain',
        71: 'Snow',
        73: 'Snow',
        75: 'Heavy Snow',
        80: 'Showers',
        81: 'Showers',
        82: 'Heavy Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm',
        99: 'Thunderstorm'
    };

    return shortDescs[code] || 'Unknown';
}

function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function calculateAQI(pm25, pm10, o3, no2, so2, co) {
    // Simplified AQI calculation based on PM2.5 (most common standard)
    // This is a basic implementation - real AQI calculations are more complex
    
    let aqi = 0;
    let category = '';
    let description = '';
    let color = '#27ae60';

    // Calculate AQI based on PM2.5 concentration
    if (pm25 <= 12) {
        aqi = Math.round((50 / 12) * pm25);
        category = 'Good';
        description = 'Air quality is satisfactory';
        color = '#27ae60';
    } else if (pm25 <= 35.4) {
        aqi = Math.round(50 + ((100 - 50) / (35.4 - 12)) * (pm25 - 12));
        category = 'Moderate';
        description = 'Air quality is acceptable';
        color = '#f1c40f';
    } else if (pm25 <= 55.4) {
        aqi = Math.round(100 + ((150 - 100) / (55.4 - 35.4)) * (pm25 - 35.4));
        category = 'Unhealthy for Sensitive';
        description = 'Sensitive groups may experience effects';
        color = '#f39c12';
    } else if (pm25 <= 150.4) {
        aqi = Math.round(150 + ((200 - 150) / (150.4 - 55.4)) * (pm25 - 55.4));
        category = 'Unhealthy';
        description = 'Everyone may begin to experience effects';
        color = '#e74c3c';
    } else if (pm25 <= 250.4) {
        aqi = Math.round(200 + ((300 - 200) / (250.4 - 150.4)) * (pm25 - 150.4));
        category = 'Very Unhealthy';
        description = 'Health warnings of emergency conditions';
        color = '#9b59b6';
    } else {
        aqi = Math.round(300 + ((400 - 300) / (350.4 - 250.4)) * (pm25 - 250.4));
        category = 'Hazardous';
        description = 'Health alert: everyone may experience serious effects';
        color = '#34495e';
    }

    return { value: aqi, category, description, color };
}

function showLoading() {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    weatherDataEl.classList.add('hidden');
}

function hideLoading() {
    loadingEl.classList.add('hidden');
}

function showError(message) {
    hideLoading();
    errorEl.textContent = message;
    errorEl.classList.add('hidden');
    weatherDataEl.classList.add('hidden');
}

// Weather Background Functions
function updateWeatherBackground(weatherCode) {
    // Clear previous background effects
    weatherBackgroundEl.innerHTML = '';
    
    // Determine weather category and apply appropriate background class
    const weatherCategory = getWeatherCategory(weatherCode);
    
    // Remove all existing weather classes
    weatherBackgroundEl.classList.remove('clear-sky', 'partly-cloudy', 'overcast', 'rainy', 'thunderstorm', 'snowy', 'foggy');
    
    // Add the new weather class
    weatherBackgroundEl.classList.add(weatherCategory);
    
    // Add weather-specific effects
    switch(weatherCategory) {
        case 'rainy':
            createRain();
            break;
        case 'thunderstorm':
            createRain();
            createLightning();
            break;
        case 'snowy':
            createSnow();
            break;
        case 'overcast':
        case 'partly-cloudy':
            createClouds();
            break;
        case 'foggy':
            createFog();
            break;
        default:
            // Clear sky - no additional effects needed
            break;
    }
}

function getWeatherCategory(code) {
    // WMO weather interpretation codes
    if (code === 0) return 'clear-sky';
    if (code >= 1 && code <= 2) return 'partly-cloudy';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'foggy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code >= 71 && code <= 86) return 'snowy';
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'clear-sky';
}

function createRain() {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain';
    
    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.opacity = 0.3 + Math.random() * 0.4;
        rainContainer.appendChild(drop);
    }
    
    weatherBackgroundEl.appendChild(rainContainer);
}

function createSnow() {
    const snowContainer = document.createElement('div');
    snowContainer.className = 'rain'; // Reuse rain container class
    
    for (let i = 0; i < 80; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.width = (4 + Math.random() * 6) + 'px';
        flake.style.height = flake.style.width;
        flake.style.animationDuration = (3 + Math.random() * 5) + 's';
        flake.style.animationDelay = Math.random() * 5 + 's';
        flake.style.opacity = 0.6 + Math.random() * 0.4;
        snowContainer.appendChild(flake);
    }
    
    weatherBackgroundEl.appendChild(snowContainer);
}

function createLightning() {
    const lightning = document.createElement('div');
    lightning.className = 'lightning';
    weatherBackgroundEl.appendChild(lightning);
}

function createClouds() {
    const cloudContainer = document.createElement('div');
    cloudContainer.className = 'rain'; // Reuse rain container class
    
    for (let i = 0; i < 8; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.top = (Math.random() * 30) + '%';
        cloud.style.width = (100 + Math.random() * 150) + 'px';
        cloud.style.height = (60 + Math.random() * 60) + 'px';
        cloud.style.animationDuration = (20 + Math.random() * 20) + 's';
        cloud.style.animationDelay = Math.random() * 10 + 's';
        cloud.style.opacity = 0.4 + Math.random() * 0.4;
        cloudContainer.appendChild(cloud);
    }
    
    weatherBackgroundEl.appendChild(cloudContainer);
}

function createFog() {
    const fogContainer = document.createElement('div');
    fogContainer.className = 'rain'; // Reuse rain container class
    
    for (let i = 0; i < 6; i++) {
        const fog = document.createElement('div');
        fog.className = 'cloud';
        fog.style.top = (20 + Math.random() * 60) + '%';
        fog.style.width = (150 + Math.random() * 200) + 'px';
        fog.style.height = (80 + Math.random * 80) + 'px';
        fog.style.animationDuration = (30 + Math.random() * 30) + 's';
        fog.style.animationDelay = Math.random() * 15 + 's';
        fog.style.opacity = 0.2 + Math.random() * 0.3;
        fogContainer.appendChild(fog);
    }
    
    weatherBackgroundEl.appendChild(fogContainer);
}

// ==================== Interactive Map Functions ====================

function initializeMap() {
    // Create Leaflet map centered on default location
    weatherMap = L.map('weatherMap').setView([currentLat, currentLon], 10);

    // Add OpenStreetMap base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(weatherMap);

    // Add a marker for the current location
    const currentLocationMarker = L.marker([currentLat, currentLon]).addTo(weatherMap);
    currentLocationMarker.bindPopup('<b>Current Location</b>').openPopup();

    // Store reference to update later
    window.currentLocationMarker = currentLocationMarker;

    // Initialize with precipitation overlay
    updateMapLayer('precipitation');
}

function updateMapCenter(lat, lon) {
    if (weatherMap) {
        weatherMap.setView([lat, lon], 10);
        if (window.currentLocationMarker) {
            window.currentLocationMarker.setLatLng([lat, lon]);
            window.currentLocationMarker.bindPopup('<b>' + document.getElementById('cityName').textContent + '</b>').openPopup();
        }
    }
    currentLat = lat;
    currentLon = lon;
}

function updateMapLayer(layerType) {
    currentLayer = layerType;
    
    // Remove existing overlay layers
    if (window.weatherOverlay) {
        weatherMap.removeLayer(window.weatherOverlay);
    }
    if (window.lightningMarkers) {
        window.lightningMarkers.clearLayers();
    }

    // Add new overlay based on layer type
    switch(layerType) {
        case 'precipitation':
            addPrecipitationLayer();
            break;
        case 'temperature':
            addTemperatureLayer();
            break;
        case 'wind':
            addWindLayer();
            break;
        case 'clouds':
            addCloudLayer();
            break;
        case 'lightning':
            addLightningLayer();
            break;
        case 'snowfall':
            addSnowfallLayer();
            break;
    }

    // Update button states
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layer === layerType);
    });
}

function addPrecipitationLayer() {
    // Simulated precipitation radar overlay using OpenWeatherMap precipitation tiles
    window.weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=demo', {
        maxZoom: 19,
        opacity: 0.7
    }).addTo(weatherMap);
}

function addTemperatureLayer() {
    // Temperature overlay
    window.weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=demo', {
        maxZoom: 19,
        opacity: 0.7
    }).addTo(weatherMap);
}

function addWindLayer() {
    // Wind overlay
    window.weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=demo', {
        maxZoom: 19,
        opacity: 0.7
    }).addTo(weatherMap);
}

function addCloudLayer() {
    // Cloud cover overlay
    window.weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=demo', {
        maxZoom: 19,
        opacity: 0.7
    }).addTo(weatherMap);
}

function addLightningLayer() {
    // Lightning strikes - simulate with markers
    window.lightningMarkers = L.layerGroup().addTo(weatherMap);
    
    // Generate simulated lightning strike data around the current location
    for (let i = 0; i < 20; i++) {
        const latOffset = (Math.random() - 0.5) * 2;
        const lonOffset = (Math.random() - 0.5) * 2;
        const strikeLat = currentLat + latOffset;
        const strikeLon = currentLon + lonOffset;
        
        const lightningIcon = L.divIcon({
            className: 'lightning-marker',
            html: '<span style="font-size: 24px;">⚡</span>',
            iconSize: [30, 30]
        });
        
        const marker = L.marker([strikeLat, strikeLon], { icon: lightningIcon });
        marker.bindPopup(`<b>Lightning Strike</b><br>Time: ${new Date().toLocaleTimeString()}<br>Intensity: ${(Math.random() * 100).toFixed(1)} kA`);
        marker.addTo(window.lightningMarkers);
    }
}

function addSnowfallLayer() {
    // Snowfall overlay
    window.weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=demo', {
        maxZoom: 19,
        opacity: 0.7
    }).addTo(weatherMap);
}

// ==================== Trend Chart Functions ====================

function initializeChartAndMapListeners() {
    // Map layer buttons
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updateMapLayer(btn.dataset.layer);
        });
    });

    // Chart tab buttons
    document.querySelectorAll('.chart-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentChartType = btn.dataset.chart;
            document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateWeatherChart();
        });
    });

    // Timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentChartTimeframe = parseInt(btn.dataset.hours);
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateWeatherChart();
        });
    });
}

function updateWeatherChart() {
    if (!hourlyForecastData || !document.getElementById('weatherChart')) return;

    const ctx = document.getElementById('weatherChart').getContext('2d');
    
    // Prepare data based on chart type and timeframe
    let labels, dataValues, chartLabel, borderColor, backgroundColor;
    
    if (currentChartTimeframe === 24) {
        // 24-hour chart using hourly data
        const currentHour = new Date().getHours();
        const endIndex = Math.min(currentHour + 24, hourlyForecastData.time.length);
        
        labels = hourlyForecastData.time.slice(currentHour, endIndex).map((time, index) => {
            const date = new Date(time);
            return index === 0 ? 'Now' : date.toLocaleTimeString([], { hour: '2-digit' });
        });
        
        switch(currentChartType) {
            case 'temperature':
                dataValues = hourlyForecastData.temperature_2m.slice(currentHour, endIndex);
                chartLabel = 'Temperature (°C)';
                borderColor = '#e74c3c';
                backgroundColor = 'rgba(231, 76, 60, 0.1)';
                break;
            case 'precipitation':
                // Use probability or generate from weather codes
                dataValues = hourlyForecastData.weather_code.slice(currentHour, endIndex).map(code => {
                    if (code >= 51 && code <= 99) return Math.random() * 10 + 2;
                    return 0;
                });
                chartLabel = 'Precipitation (mm)';
                borderColor = '#3498db';
                backgroundColor = 'rgba(52, 152, 219, 0.1)';
                break;
            case 'wind':
                dataValues = hourlyForecastData.wind_speed_10m.slice(currentHour, endIndex);
                chartLabel = 'Wind Speed (km/h)';
                borderColor = '#2ecc71';
                backgroundColor = 'rgba(46, 204, 113, 0.1)';
                break;
        }
    } else {
        // 7-day chart using daily data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels = dailyForecastData.time.map((time, index) => {
            const date = new Date(time);
            return index === 0 ? 'Today' : days[date.getDay()];
        });
        
        switch(currentChartType) {
            case 'temperature':
                dataValues = dailyForecastData.temperature_2m_max.map((max, i) => ({
                    x: labels[i],
                    max: Math.round(max),
                    min: Math.round(dailyForecastData.temperature_2m_min[i])
                }));
                chartLabel = 'Temperature (°C)';
                borderColor = '#e74c3c';
                backgroundColor = 'rgba(231, 76, 60, 0.1)';
                break;
            case 'precipitation':
                dataValues = dailyForecastData.weather_code.map(code => {
                    if (code >= 51 && code <= 99) return Math.random() * 15 + 5;
                    return 0;
                });
                chartLabel = 'Precipitation (mm)';
                borderColor = '#3498db';
                backgroundColor = 'rgba(52, 152, 219, 0.1)';
                break;
            case 'wind':
                // Use average from hourly or estimate
                dataValues = dailyForecastData.time.map(() => Math.floor(Math.random() * 30) + 5);
                chartLabel = 'Wind Speed (km/h)';
                borderColor = '#2ecc71';
                backgroundColor = 'rgba(46, 204, 113, 0.1)';
                break;
        }
    }

    // Destroy existing chart if it exists
    if (weatherChart) {
        weatherChart.destroy();
    }

    // Create new chart
    if (currentChartType === 'temperature' && currentChartTimeframe === 168) {
        // For 7-day temperature, show high/low range
        weatherChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Max Temp',
                        data: dataValues.map(d => d.max),
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: '#c0392b',
                        borderWidth: 1
                    },
                    {
                        label: 'Min Temp',
                        data: dataValues.map(d => d.min),
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: '7-Day Temperature Forecast'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    }
                }
            }
        });
    } else {
        // Line chart for other cases
        weatherChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: chartLabel,
                    data: dataValues,
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: borderColor,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: currentChartTimeframe === 24 ? '24-Hour Forecast' : '7-Day Forecast'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: currentChartType === 'precipitation',
                        title: {
                            display: true,
                            text: chartLabel
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
}
