from db import get_all_prices

MANDIS = ['Mysore', 'Bangalore', 'Belgaum', 'Davanagere']

# Crop name normalization map: converts Kannada or raw operator inputs to clean English keys
CROP_MAP = {
    'ಟೊಮೆಟೋ': 'Tomato', 'ಟೊಮೆಟೊ': 'Tomato', 'tomato': 'Tomato', 'Tomato': 'Tomato',
    'ಈರುಳ್ಳಿ': 'Onion', 'onion': 'Onion', 'Onion': 'Onion',
    'ರಾಗಿ': 'Ragi', 'ragi': 'Ragi', 'Ragi': 'Ragi',
    'ಭತ್ತ': 'Paddy', 'paddy': 'Paddy', 'Paddy': 'Paddy',
    'ಹತ್ತಿ': 'Cotton', 'cotton': 'Cotton', 'Cotton': 'Cotton',
    'ಕಬ್ಬು': 'Sugarcane', 'sugarcane': 'Sugarcane', 'Sugarcane': 'Sugarcane',
    'ಅರಿಶಿನ': 'Turmeric', 'turmeric': 'Turmeric', 'Turmeric': 'Turmeric',
    'ಬದನೆ': 'Brinjal', 'ಬದನೆಕಾಯಿ': 'Brinjal', 'brinjal': 'Brinjal', 'Brinjal': 'Brinjal',
    'ಕೋಸು': 'Cabbage', 'ಎಲೆಕೋಸು': 'Cabbage', 'cabbage': 'Cabbage', 'Cabbage': 'Cabbage',
    'ಆಲೂಗಡ್ಡೆ': 'Potato', 'potato': 'Potato', 'Potato': 'Potato',
}

# District/Mandi name normalization map: handles old spellings, new spellings, and Kannada scripts
DISTRICT_MAP = {
    'Mysore': 'Mysore', 'Mysuru': 'Mysore', 'ಮೈಸೂರು': 'Mysore',
    'Bangalore': 'Bangalore', 'Bengaluru': 'Bangalore', 'Bengaluru Urban': 'Bangalore', 'Bengaluru Rural': 'Bangalore', 'ಬೆಂಗಳೂರು': 'Bangalore',
    'Belgaum': 'Belgaum', 'Belagavi': 'Belgaum', 'ಬೆಳಗಾವಿ': 'Belgaum',
    'Davanagere': 'Davanagere', 'Davangere': 'Davanagere', 'ದಾವಣಗೆರೆ': 'Davanagere'
}

# Standard fallback base prices for our 10 default crops
BASE_PRICES = {
    'Tomato': 2200,
    'Onion': 1800,
    'Ragi': 3200,
    'Paddy': 2100,
    'Cotton': 6500,
    'Sugarcane': 310,
    'Turmeric': 7200,
    'Brinjal': 1500,
    'Cabbage': 1200,
    'Potato': 1600
}


def generate_prices():
    """
    Returns market prices with smart fallbacks and full district normalization.
    If an admin has entered a price for a crop in at least one district, that price 
    is loaded as the default for all other districts/crops.
    """
    raw_db_prices = get_all_prices()  # {crop: {district: {price, change, volume}}}
    
    # 1. Normalize all crop and district keys retrieved from the database
    normalized_db_prices = {}
    for db_crop, districts in raw_db_prices.items():
        norm_crop = CROP_MAP.get(db_crop, db_crop)  # keep original if custom crop
        if norm_crop not in normalized_db_prices:
            normalized_db_prices[norm_crop] = {}
        for db_district, data in districts.items():
            norm_district = DISTRICT_MAP.get(db_district, db_district)
            normalized_db_prices[norm_crop][norm_district] = data

    market_data = {}

    # 2. Process all standard crops in BASE_PRICES
    for crop, default_base_price in BASE_PRICES.items():
        crop_db_entries = normalized_db_prices.get(crop, {})
        
        # Determine crop-wide fallback values (from DB first, else default static base)
        fallback_price = default_base_price
        fallback_change = 0.0
        fallback_volume = 150
        
        if crop_db_entries:
            # Use the first available live admin price as the fallback for other mandis
            first_mandi = list(crop_db_entries.keys())[0]
            fallback_price = crop_db_entries[first_mandi]['price']
            fallback_change = crop_db_entries[first_mandi]['change']
            fallback_volume = crop_db_entries[first_mandi]['volume']
            
        market_data[crop] = {}
        for mandi in MANDIS:
            if mandi in crop_db_entries:
                data = crop_db_entries[mandi]
                market_data[crop][mandi] = {
                    'price':  data['price'],
                    'change': data['change'],
                    'volume': data['volume'],
                    'trend':  [data['price']],
                    'source': 'live'
                }
            else:
                market_data[crop][mandi] = {
                    'price':  fallback_price,
                    'change': fallback_change,
                    'volume': fallback_volume,
                    'trend':  [fallback_price],
                    'source': 'fallback'
                }

    # 3. Process any custom crops entered in DB that aren't in standard BASE_PRICES
    for crop, crop_db_entries in normalized_db_prices.items():
        if crop not in market_data:
            first_mandi = list(crop_db_entries.keys())[0]
            fallback_price = crop_db_entries[first_mandi]['price']
            fallback_change = crop_db_entries[first_mandi]['change']
            fallback_volume = crop_db_entries[first_mandi]['volume']
            
            market_data[crop] = {}
            for mandi in MANDIS:
                if mandi in crop_db_entries:
                    data = crop_db_entries[mandi]
                    market_data[crop][mandi] = {
                        'price':  data['price'],
                        'change': data['change'],
                        'volume': data['volume'],
                        'trend':  [data['price']],
                        'source': 'live'
                    }
                else:
                    market_data[crop][mandi] = {
                        'price':  fallback_price,
                        'change': fallback_change,
                        'volume': fallback_volume,
                        'trend':  [fallback_price],
                        'source': 'fallback'
                    }

    return market_data
