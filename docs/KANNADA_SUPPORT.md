# Kannada Language Support Implementation Guide

## What Has Been Implemented:

### 1. **Comprehensive Translation File (`js/i18n.js`)**
- ✅ 150+ key translations in English and Kannada
- ✅ Coverage for all major features and UI elements
- ✅ localStorage persistence for language preference
- ✅ Automatic language detection and switching

### 2. **Language Switcher**
- ✅ Fixed position in top-right corner (mobile-optimized)
- ✅ Two buttons: English & ಕನ್ನಡ (Kannada)
- ✅ Active state highlighting
- ✅ Responsive design for all screen sizes

### 3. **Translation Methods**
Two ways to implement translations in HTML:

#### Method 1: HTML Element Attribute
```html
<h1 data-i18n="app_name">Yield Matrix</h1>
<p data-i18n="tagline">Free AI tools for small farmers</p>
<input data-i18n-placeholder="your_name" placeholder="Your name">
```

#### Method 2: JavaScript
```javascript
const label = t('crop_health_title');  // Returns translated string
document.getElementById('title').textContent = t('weather_title');
```

## How to Add Language Support to Each Page:

### Step 1: Add Script Tag
Add this to the `<head>` section of every HTML page:
```html
<script src="js/i18n.js"></script>
```

### Step 2: Add Language Switcher
Add this after `<body>` tag in every page:
```html
<div class="lang-switcher">
    <button class="lang-btn active" data-lang="en" onclick="setLanguage('en')">English</button>
    <button class="lang-btn" data-lang="kn" onclick="setLanguage('kn')">ಕನ್ನಡ</button>
</div>
```

### Step 3: Replace Static Text with Translations
Change static text to use `data-i18n` attributes:

**Before:**
```html
<h1>Weather Information</h1>
<p>5-day forecast and spray advisory</p>
```

**After:**
```html
<h1 data-i18n="weather_title">Weather Information</h1>
<p data-i18n="weather_subtitle">5-day forecast and spray advisory</p>
```

### Step 4: Add Placeholders (if needed)
```html
<input data-i18n-placeholder="your_name" placeholder="Your name">
<textarea data-i18n-placeholder="question_details" placeholder="Question details"></textarea>
```

## Pages to Update:

1. **weather.html** - Weather titles, labels, button texts
2. **disease.html** - Disease detection UI strings
3. **crop-health.html** - Health analysis labels
4. **threat-alerts.html** - Alert titles and messages
5. **irrigation.html** - Water management labels
6. **market.html** - Price-related strings
7. **crop-recommend.html** - Recommendation form labels
8. **guide.html** - Crop guide section titles
9. **schemes.html** - Government scheme text
10. **forum.html** - Forum UI elements
11. **chatbot.html** - Chat interface strings
12. **tril.html** - If has user-facing text

## Translation Keys Available:

### Navigation & Common
- `app_name`, `tagline`, `language`, `english`, `kannada`
- `select`, `submit`, `cancel`, `save`, `delete`, `edit`
- `loading`, `error`, `success`, `try_again`, `close`, `refresh`

### Feature-Specific
- Weather: `weather_title`, `current_weather`, `forecast`, `temperature`, `humidity`, `rainfall`
- Disease: `disease_title`, `disease_found`, `no_disease`, `treatment`
- Irrigation: `irrigation_title`, `water_needed`, `crop_type`, `irrigation_method`
- Market: `market_title`, `select_crop`, `price_comparison`, `selling_tips`
- Forum: `forum_title`, `ask_question`, `post_answer`, `answers`, `helpful`
- Schemes: `schemes_title`, `eligibility`, `apply_now`
- Guide: `guide_title`, `planting_season`, `harvesting`, `pest_management`

## How Language Switching Works:

1. **User clicks language button** → `setLanguage('kn')` is called
2. **Language saved** → localStorage stores preference
3. **Page updates** → All `data-i18n` attributes refresh instantly
4. **Persists** → User's choice remembered on next visit

## Adding New Translations:

To add translations for new features:

1. Open `js/i18n.js`
2. Add key-value pairs to both 'en' and 'kn' objects:
```javascript
'my_new_key': 'English text',
// Kannada version
'my_new_key': 'ಕನ್ನಡ ಪಠ್ಯ',
```
3. Use in HTML: `<p data-i18n="my_new_key">Fallback text</p>`

## Testing Kannada Support:

1. Open index.html
2. See both "English" and "ಕನ್ನಡ" buttons in top-right
3. Click "ಕನ್ನಡ" button
4. All visible text should convert to Kannada
5. Refresh page - preference should persist
6. Click any feature link - should maintain Kannada
7. Click "English" to switch back

## Mobile Responsiveness:

- Language switcher buttons stack on small phones
- Font sizes adjust for readability
- Kannada script displays properly on all devices
- Touch-friendly button sizing (44px minimum)

## Browser Compatibility:

✅ Works on all modern browsers (Chrome, Firefox, Safari, Edge)
✅ Kannada Unicode (UTF-8) displays correctly
✅ localStorage support required (works offline after first visit)
✅ No external dependencies needed

## Future Enhancements:

- Add Hindi (हिन्दी) translations
- Add local language support for other Indian states
- Implement right-to-left (RTL) support if needed
- Add language selection on first visit
- Collect user feedback on translations

## Quick Reference:

```javascript
// In any page's JavaScript
const welcomeText = t('app_name');  // Get translated string
setLanguage('kn');  // Switch to Kannada
setLanguage('en');  // Switch to English
```

The system automatically:
- ✅ Saves user preference in localStorage
- ✅ Applies language on page load
- ✅ Updates all data-i18n elements
- ✅ Falls back to English if translation missing
- ✅ Works with or without internet after first load
