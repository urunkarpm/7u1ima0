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

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', handleGeolocation);
locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Initialize with a default city
window.addEventListener('DOMContentLoaded', () => {
    fetchWeatherByCity('London');
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
    errorEl.classList.remove('hidden');
    weatherDataEl.classList.add('hidden');
}
