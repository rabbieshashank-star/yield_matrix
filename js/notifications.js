// Push Notifications System
// Handles weather alerts, pest warnings, market prices, and scheme deadlines
// No user account required - uses browser Notification API

class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.notificationQueue = [];
        this.notificationPreferences = this.loadPreferences();
        this.init();
    }

    init() {
        if (Notification.permission === 'granted') {
            this.permission = 'granted';
        } else if (Notification.permission === 'denied') {
            this.permission = 'denied';
        } else {
            // 'default' - not yet asked
            this.permission = 'default';
        }
    }

    requestPermission() {
        if (Notification.permission === 'granted') {
            return Promise.resolve('granted');
        }
        
        return Notification.requestPermission().then(permission => {
            this.permission = permission;
            this.savePermission(permission);
            return permission;
        });
    }

    loadPreferences() {
        const prefs = localStorage.getItem('notificationPrefs');
        if (prefs) {
            return JSON.parse(prefs);
        }
        return {
            weather: true,
            pests: true,
            market: true,
            schemes: true,
            soundEnabled: true,
            sound: 'default'
        };
    }

    savePreferences(prefs) {
        this.notificationPreferences = prefs;
        localStorage.setItem('notificationPrefs', JSON.stringify(prefs));
    }

    savePermission(permission) {
        localStorage.setItem('notificationPermission', permission);
    }

    getPermission() {
        return this.permission;
    }

    // Weather Alert Notifications
    async notifyWeatherAlert(data) {
        if (!this.notificationPreferences.weather) return;
        if (this.permission !== 'granted') return;

        const title = 'Weather Alert ⛈️';
        const options = {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FFD700"/><path d="M 30 50 Q 30 60 40 60 L 60 60 Q 70 60 70 50" fill="%23333" stroke="%23333" stroke-width="2"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FFD700"/></svg>',
            tag: 'weather-alert',
            requireInteraction: false,
            actions: [
                { action: 'view', title: 'View Details' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        const body = `${data.condition}\nTemperature: ${data.temperature}°C\nHumidity: ${data.humidity}%\nRainfall: ${data.rainfall}mm`;

        this.showNotification(title, body, options, 'weather');
    }

    // Pest & Disease Threat Notifications
    async notifyPestThreat(threat) {
        if (!this.notificationPreferences.pests) return;
        if (this.permission !== 'granted') return;

        const riskColor = threat.riskLevel === 'High' ? '🔴' : threat.riskLevel === 'Medium' ? '🟠' : '🟢';
        const title = `${riskColor} Pest Alert: ${threat.name}`;
        const options = {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FF6B6B"/><ellipse cx="40" cy="40" rx="8" ry="10" fill="%23000"/><ellipse cx="60" cy="40" rx="8" ry="10" fill="%23000"/><path d="M 30 70 Q 50 80 70 70" stroke="%23000" stroke-width="2" fill="none"/></svg>',
            tag: `pest-${threat.name}`,
            requireInteraction: true,
            actions: [
                { action: 'solutions', title: 'View Solutions' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        const body = `Risk Level: ${threat.riskLevel}\n${threat.description}\n\nRecommendation: ${threat.recommendation}`;

        this.showNotification(title, body, options, 'pest');
    }

    // Market Price Spike Notifications
    async notifyPriceSpike(crop) {
        if (!this.notificationPreferences.market) return;
        if (this.permission !== 'granted') return;

        const title = `📈 Price Alert: ${crop.name}`;
        const options = {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%2328a745"/><polyline points="20,80 35,60 50,70 65,40 80,50" stroke="white" stroke-width="3" fill="none"/><circle cx="20" cy="80" r="3" fill="white"/><circle cx="35" cy="60" r="3" fill="white"/><circle cx="50" cy="70" r="3" fill="white"/><circle cx="65" cy="40" r="3" fill="white"/><circle cx="80" cy="50" r="3" fill="white"/></svg>',
            tag: 'price-spike',
            requireInteraction: false,
            actions: [
                { action: 'market', title: 'Check Market' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        const priceChange = crop.change >= 0 ? `+${crop.change}%` : `${crop.change}%`;
        const body = `Current Price: ₹${crop.currentPrice}/kg\n24h Change: ${priceChange}\nTrend: ${crop.trend}`;

        this.showNotification(title, body, options, 'market');
    }

    // Government Scheme Deadline Notifications
    async notifySchemeDeadline(scheme) {
        if (!this.notificationPreferences.schemes) return;
        if (this.permission !== 'granted') return;

        const title = `📋 Scheme Deadline: ${scheme.name}`;
        const options = {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%234169E1"/><rect x="30" y="30" width="40" height="40" fill="white" stroke="%234169E1" stroke-width="2"/><text x="50" y="65" font-size="30" fill="%234169E1" text-anchor="middle" font-weight="bold">!</text></svg>',
            tag: 'scheme-deadline',
            requireInteraction: true,
            actions: [
                { action: 'apply', title: 'Apply Now' },
                { action: 'close', title: 'Remind Later' }
            ]
        };

        const daysLeft = this.calculateDaysLeft(scheme.deadline);
        const body = `${scheme.description}\nDeadline: ${scheme.deadline}\nDays Remaining: ${daysLeft}\nBenefits: ${scheme.benefits}`;

        this.showNotification(title, body, options, 'scheme');
    }

    // Generic notification display
    showNotification(title, body, options, type) {
        if (this.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: body,
            ...options
        });

        // Play sound if enabled
        if (this.notificationPreferences.soundEnabled) {
            this.playNotificationSound();
        }

        // Handle notification click
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Handle notification actions
        notification.onaction = (event) => {
            this.handleNotificationAction(event.action, type);
        };

        // Auto-close in 6 seconds if not requireInteraction
        if (!options.requireInteraction) {
            setTimeout(() => {
                notification.close();
            }, 6000);
        }

        return notification;
    }

    handleNotificationAction(action, type) {
        if (action === 'view' || action === 'solutions') {
            window.open('/threat-alerts.html', '_blank');
        } else if (action === 'market') {
            window.open('/market.html', '_blank');
        } else if (action === 'apply') {
            window.open('/schemes.html', '_blank');
        } else if (action === 'close') {
            // Just close
        }
    }

    playNotificationSound() {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    calculateDaysLeft(deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const timeDiff = deadlineDate - today;
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    }

    // Batch notification for daily weather summary
    async sendDailySummary(weatherData, threats, marketTrends) {
        if (this.permission !== 'granted') return;

        const title = '📊 Daily Farming Summary';
        const options = {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%236C5CE7"/><g fill="white"><rect x="20" y="60" width="10" height="20"/><rect x="40" y="40" width="10" height="40"/><rect x="60" y="30" width="10" height="50"/><rect x="80" y="50" width="10" height="30"/></g></svg>',
            tag: 'daily-summary',
            requireInteraction: false
        };

        const summary = `
Weather: ${weatherData.condition} | ${weatherData.temperature}°C
Active Threats: ${threats.length} detected
Market Highlights: ${marketTrends.best} trending up
        `;

        this.showNotification(title, summary.trim(), options, 'summary');
    }

    // Setup automatic notifications for monitoring
    setupAutomaticMonitoring(interval = 3600000) { // 1 hour default
        setInterval(() => {
            this.checkAndNotify();
        }, interval);
    }

    async checkAndNotify() {
        try {
            // Fetch weather and check for alerts
            const weatherData = await this.getWeatherData();
            if (weatherData && this.shouldAlertWeather(weatherData)) {
                await this.notifyWeatherAlert(weatherData);
            }

            // Check market prices
            const marketData = await this.getMarketData();
            if (marketData && this.shouldAlertPrice(marketData)) {
                await this.notifyPriceSpike(marketData);
            }

        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    async getWeatherData() {
        try {
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=15.3&longitude=75.1&current=temperature_2m,relative_humidity_2m,weather_code,precipitation&timezone=Asia/Kolkata');
            const data = await response.json();
            return {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                rainfall: data.current.precipitation || 0,
                condition: this.getWeatherDescription(data.current.weather_code)
            };
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    }

    async getMarketData() {
        // In real implementation, fetch from data.gov.in Agmarknet API
        return null;
    }

    getWeatherDescription(code) {
        const codes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with hail',
            99: 'Thunderstorm with hail'
        };
        return codes[code] || 'Unknown weather';
    }

    shouldAlertWeather(weather) {
        // Alert if heavy rain, thunderstorm, or extreme humidity
        return weather.rainfall > 10 || weather.humidity > 90;
    }

    shouldAlertPrice(market) {
        // Alert if price change > 15%
        return Math.abs(market.change) > 15;
    }

    // Get all active notifications for UI display
    getNotificationStatus() {
        return {
            permission: this.permission,
            preferences: this.notificationPreferences,
            enabled: this.permission === 'granted'
        };
    }
}

// Initialize notification manager globally
const notificationManager = new NotificationManager();
