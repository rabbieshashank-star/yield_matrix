# Push Notifications System - Implementation Guide

## Overview
Yield Matrix now includes a comprehensive push notification system that sends real-time alerts about weather, pests, market prices, and government schemes. **No user account is required** - the system uses the browser's native Notification API and localStorage for preferences.

## Features Implemented

### 1. **Notification Types**
- **Weather Alerts**: Heavy rain, thunderstorms, extreme humidity
- **Pest Warnings**: High-risk insect and disease threats
- **Market Alerts**: Significant price changes (>15%) for crops
- **Scheme Deadlines**: Government scheme application deadlines
- **Daily Summary**: Batch notification with daily farming updates

### 2. **Notification Manager Class**
File: `js/notifications.js` (600+ lines)

#### Core Methods:
```javascript
// Permission Management
notificationManager.requestPermission()           // Request browser permission
notificationManager.getPermission()               // Check current permission status

// Send Notifications
notificationManager.notifyWeatherAlert(data)      // Weather notifications
notificationManager.notifyPestThreat(threat)      // Pest warnings
notificationManager.notifyPriceSpike(crop)        // Market price alerts
notificationManager.notifySchemeDeadline(scheme)  // Scheme deadline alerts
notificationManager.sendDailySummary(...)         // Batch daily summary

// Preferences
notificationManager.loadPreferences()             // Load from localStorage
notificationManager.savePreferences(prefs)        // Save to localStorage

// Monitoring
notificationManager.setupAutomaticMonitoring()    // Start hourly checks
notificationManager.checkAndNotify()              // Manual check for alerts
```

### 3. **Notification Preferences**
Stored in localStorage with keys:
```javascript
{
  weather: true,           // Weather alerts enabled
  pests: true,            // Pest warnings enabled
  market: true,           // Market price alerts enabled
  schemes: true,          // Scheme deadline alerts enabled
  soundEnabled: true,     // Play notification sound
  sound: 'default'        // Sound type (extensible)
}
```

### 4. **Notification UI Features**
- Visual icons and emojis for quick identification
- Interactive buttons for notifications (View Details, Apply Now, etc.)
- Auto-dismiss for non-critical alerts (6 seconds)
- Persistent display for critical alerts (requires interaction)
- Sound notification using Web Audio API
- Auto-redirect to relevant pages on action click

## Usage Guide

### For Farmers (Frontend)

#### 1. **Enable Notifications**
- Navigate to `/notifications.html`
- Click "Enable Notifications" button
- Browser will request permission
- Grant permission to receive alerts

#### 2. **Customize Preferences**
- Toggle each notification type on/off
- Enable/disable sound alerts
- Changes saved automatically to localStorage

#### 3. **Test Notifications**
- Click "Test Weather Alert" to see weather notification
- Click "Test Pest Alert" to see pest warning
- Click "Test Price Alert" to see market notification
- Click "Test Scheme Alert" to see scheme deadline notification

#### 4. **Start Monitoring**
- Click "Start Monitoring" to begin hourly checks
- Notifications will appear automatically based on conditions
- Works even when browser tab is not in focus

### For Developers

#### 1. **Import Notification System**
```html
<script src="js/notifications.js"></script>
```

#### 2. **Send Weather Alert**
```javascript
notificationManager.notifyWeatherAlert({
  temperature: 38,
  humidity: 85,
  rainfall: 15,
  condition: 'Heavy Rain Expected'
});
```

#### 3. **Send Pest Warning**
```javascript
notificationManager.notifyPestThreat({
  name: 'Stem Borer',
  riskLevel: 'High',
  description: 'Stem borer activity detected',
  recommendation: 'Apply recommended pesticide'
});
```

#### 4. **Send Market Alert**
```javascript
notificationManager.notifyPriceSpike({
  name: 'Tomato',
  currentPrice: 42,
  change: 18.5,
  trend: 'Upward'
});
```

#### 5. **Send Scheme Alert**
```javascript
notificationManager.notifySchemeDeadline({
  name: 'PM-KISAN',
  description: 'Direct benefit transfer scheme',
  deadline: '2026-06-30',
  benefits: '₹6000 per year'
});
```

#### 6. **Setup Automatic Monitoring**
```javascript
// Start monitoring with 1-hour interval
notificationManager.setupAutomaticMonitoring(3600000);
```

## Integration Points

### 1. **Weather Page Integration**
Modify `weather.html` to trigger notifications:
```javascript
// After fetching weather data
if (weatherData.rainfall > 10 || weatherData.humidity > 90) {
  notificationManager.notifyWeatherAlert(weatherData);
}
```

### 2. **Threat Alerts Integration**
Modify `threat-alerts.html`:
```javascript
// After calculating threat risks
threats.forEach(threat => {
  if (threat.riskLevel === 'High') {
    notificationManager.notifyPestThreat(threat);
  }
});
```

### 3. **Market Page Integration**
Modify `market.html`:
```javascript
// When price changes are detected
if (Math.abs(priceChange) > 15) {
  notificationManager.notifyPriceSpike(crop);
}
```

### 4. **Schemes Page Integration**
Modify `schemes.html`:
```javascript
// Before scheme deadline
const daysLeft = calculateDaysLeft(scheme.deadline);
if (daysLeft <= 7) {
  notificationManager.notifySchemeDeadline(scheme);
}
```

## Technical Architecture

### Permission Flow
```
User clicks "Enable Notifications"
    ↓
Browser requests permission dialog
    ↓
User grants/denies permission
    ↓
Permission stored in localStorage
    ↓
Preferences UI activated/deactivated
```

### Notification Flow
```
Event triggered (e.g., heavy rain detected)
    ↓
Check if notification type enabled
    ↓
Check if permission granted
    ↓
Create Notification object with title, body, options
    ↓
Play sound (if enabled)
    ↓
Show notification to user
    ↓
Handle user action (click on notification)
```

### Data Persistence
- **Permission**: localStorage key `notificationPermission`
- **Preferences**: localStorage key `notificationPrefs` (JSON object)
- **Language**: Kannada translations in `js/i18n.js` with 35+ keys

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Chromium 50+
- ✅ Firefox 48+
- ✅ Edge 17+
- ✅ Safari 14+ (limited support)
- ⚠️ Safari on iOS (limited by OS restrictions)

### Feature Support
- Notification API: Supported in most modern browsers
- Web Audio API: For notification sounds
- localStorage: For preferences persistence
- Service Workers: Optional (not required for basic functionality)

## Privacy & Security

### Privacy Protection
1. **No Data Collection**: Notification system doesn't collect user data
2. **Local Storage Only**: All preferences stored locally on device
3. **No Server Communication**: Notifications managed entirely client-side
4. **No Tracking**: No analytics or tracking for notification events

### Security Measures
1. **Permission Control**: Browser controls notification permission
2. **User Consent**: Explicit user grant required for each notification type
3. **Content Validation**: All notification content validated before display
4. **No Script Injection**: Notifications use safe DOM APIs only

## Multilingual Support

### Translations Available
- **English**: All 35+ notification keys
- **ಕನ್ನಡ (Kannada)**: All 35+ keys translated

### Translation Keys
```javascript
// English
'notifications': 'Notifications & Alerts'
'enableNotifications': 'Enable Notifications'
'weatherAlerts': '⛈️ Weather Alerts'
'pestWarnings': '🐛 Pest & Disease Warnings'
'marketAlerts': '📈 Market Price Alerts'
'schemeAlerts': '📋 Government Scheme Alerts'

// Kannada
'notifications': 'ಅಧಿಸೂಚನೆಗಳು ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳು'
'enableNotifications': 'ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ'
'weatherAlerts': '⛈️ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳು'
'pestWarnings': '🐛 ಕೀಟ ಮತ್ತು ರೋಗ ಎಚ್ಚರಿಕೆಗಳು'
'marketAlerts': '📈 ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಎಚ್ಚರಿಕೆಗಳು'
'schemeAlerts': '📋 ಸರ್ಕಾರಿ ಯೋಜನೆ ಎಚ್ಚರಿಕೆಗಳು'
```

## Advanced Features

### 1. **Sound Notifications**
Uses Web Audio API to create notification beep:
- Frequency: 800 Hz sine wave
- Duration: 0.5 seconds
- Volume: 30% (0.3)
- Smooth fade-out

### 2. **Smart Risk Evaluation**
Weather-based threat assessment:
```javascript
shouldAlertWeather(weather) {
  return weather.rainfall > 10 || weather.humidity > 90;
}

shouldAlertPrice(market) {
  return Math.abs(market.change) > 15;
}
```

### 3. **Notification Actions**
Interactive buttons in notifications:
- "View Details" → Opens threat-alerts.html
- "Check Market" → Opens market.html
- "Apply Now" → Opens schemes.html
- "Remind Later" → Closes notification

## Testing Checklist

- [ ] Permission request works on first visit
- [ ] Preferences save to localStorage correctly
- [ ] Test Weather Alert shows notification
- [ ] Test Pest Alert shows notification with high risk level
- [ ] Test Price Alert shows price change
- [ ] Test Scheme Alert shows deadline countdown
- [ ] Sound plays when sound enabled
- [ ] Notification actions redirect to correct pages
- [ ] Automatic monitoring checks every hour
- [ ] Language switcher updates notification text
- [ ] Mobile responsive (touch-friendly buttons)
- [ ] Notifications work on mobile browsers

## Known Limitations

1. **iOS Safari**: Limited notification support due to OS restrictions
2. **Incognito Mode**: Some browsers restrict notifications in private browsing
3. **Permission Persistence**: Permission cannot be revoked programmatically (only via browser settings)
4. **API Keys**: Open-Meteo weather fetch doesn't require API key, but Agmarknet data may

## Future Enhancements

1. **Service Workers**: Enable notifications when app is closed
2. **Geo-targeting**: Show alerts specific to farmer's location only
3. **Subscription Topics**: Subscribe to specific crop notifications
4. **Time Scheduling**: Choose quiet hours for notifications
5. **Batch Notifications**: Group related alerts into single notification
6. **Historical Analytics**: Track notification effectiveness
7. **Device Sync**: Sync notification preferences across devices (with account)

## Troubleshooting

### Notifications Not Showing
- Check browser permission settings
- Ensure "Allow notifications" is granted for the website
- Verify "Do Not Disturb" mode is disabled
- Clear localStorage and try again

### Permission Always "Default"
- Try different browser (test in Chrome, Firefox)
- Clear site cookies and localStorage
- Try in incognito/private window
- Check browser notification settings

### Sound Not Playing
- Check system volume is not muted
- Verify sound is enabled in preferences
- Check browser audio permissions
- Try different browser

### Preferences Not Saving
- Check browser localStorage is enabled
- Verify localStorage quota not exceeded
- Try clearing localStorage and reconfiguring
- Check browser privacy settings

## Support

For issues or questions about the notification system:
1. Check browser console for error messages
2. Verify all files are loaded correctly
3. Test with different browser
4. Check localStorage contents in DevTools
5. Clear cache and reload page

## Version History

- **v1.0** (May 2026): Initial release with weather, pest, market, and scheme notifications

## References

- [Notification API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
