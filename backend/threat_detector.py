import google.generativeai as genai
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


def detect_threats(weather_data: dict) -> dict:
    """
    Takes real-time weather data and uses Gemini AI to predict crop threats
    (pests, diseases, weather hazards) for Karnataka farmers.

    weather_data keys expected:
        temperature     – current temp in °C
        humidity        – relative humidity %
        wind_speed      – wind speed in km/h
        precipitation   – today's rainfall in mm
        weather_code    – Open-Meteo WMO code
        condition_label – human-readable condition string
        location        – location name (optional)
        forecast_5day   – list of {"day", "max_temp", "min_temp", "rain", "code"}
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        temp        = weather_data.get("temperature", "--")
        humidity    = weather_data.get("humidity", "--")
        wind        = weather_data.get("wind_speed", "--")
        rain        = weather_data.get("precipitation", 0)
        condition   = weather_data.get("condition_label", "Unknown")
        location    = weather_data.get("location", "Karnataka")
        forecast    = weather_data.get("forecast_5day", [])

        forecast_text = ""
        for day in forecast:
            forecast_text += (
                f"  - {day.get('day')}: {day.get('min_temp')}°C–{day.get('max_temp')}°C, "
                f"Rain: {day.get('rain')}mm\n"
            )

        crop = weather_data.get("crop", "ವಿವಿಧ ಬೆಳೆಗಳು")

        prompt = f"""
        ನೀವು ಕರ್ನಾಟಕದ ರೈತರಿಗಾಗಿ ತಜ್ಞ ಕೃಷಿ ಬೆದರಿಕೆ ವಿಶ್ಲೇಷಕರಾಗಿದ್ದೀರಿ.

        ಬೆಳೆ: {crop}
        ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಡೇಟಾ ({location}):
        - ತಾಪಮಾನ: {temp}°C
        - ಆರ್ದ್ರತೆ: {humidity}%
        - ಗಾಳಿ ವೇಗ: {wind} km/h
        - ಇಂದಿನ ಮಳೆ: {rain} mm
        - ಸ್ಥಿತಿ: {condition}

        5-ದಿನದ ಮುನ್ಸೂಚನೆ:
{forecast_text if forecast_text else "        - ಲಭ್ಯವಿಲ್ಲ"}

        ಈ ಹವಾಮಾನ ಆಧಾರದ ಮೇಲೆ, '{crop}' ಬೆಳೆಗೆ ಪ್ರಸ್ತುತ ಮತ್ತು ಮುಂಬರುವ ದಿನಗಳಲ್ಲಿ 
        ಸಂಭವಿಸಬಹುದಾದ ಕೀಟ, ರೋಗ ಮತ್ತು ಹವಾಮಾನ ಬೆದರಿಕೆಗಳನ್ನು ನಿಖರವಾಗಿ ಗುರುತಿಸಿ.

        IMPORTANT: ಎಲ್ಲಾ ಪಠ್ಯ ಮೌಲ್ಯಗಳನ್ನು ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ ಬರೆಯಿರಿ.
        JSON keys ಇಂಗ್ಲಿಷ್‌ನಲ್ಲೇ ಇರಲಿ.

        ಈ ನಿಖರ JSON ಸ್ವರೂಪದಲ್ಲಿ ಮಾತ್ರ ಉತ್ತರಿಸಿ, ಬೇರೇನೂ ಬೇಡ:

        {{
            "overall_risk": "ಅಪಾಯಕಾರಿ | ಹೆಚ್ಚು | ಮಧ್ಯಮ | ಕಡಿಮೆ",
            "summary": "ಒಟ್ಟಾರೆ ಬೆದರಿಕೆ ಪರಿಸ್ಥಿತಿಯ ಒಂದು ವಾಕ್ಯದ ಸಾರಾಂಶ",
            "threats": [
                {{
                    "type": "ಕೀಟ | ರೋಗ | ಹವಾಮಾನ | ಪ್ರಾಣಿ",
                    "name": "ಬೆದರಿಕೆಯ ಹೆಸರು",
                    "icon": "ಸೂಕ್ತ emoji",
                    "risk_level": "ಅಪಾಯಕಾರಿ | ಹೆಚ್ಚು | ಮಧ್ಯಮ | ಕಡಿಮೆ",
                    "affected_crops": ["ಬೆಳೆ 1", "ಬೆಳೆ 2"],
                    "why": "ಈ ಹವಾಮಾನದಲ್ಲಿ ಇದು ಏಕೆ ಅಪಾಯಕಾರಿ ಎಂಬ ಒಂದು ವಾಕ್ಯ",
                    "signs": "ಗುರುತಿಸಲು ಗೋಚರ ಲಕ್ಷಣಗಳು",
                    "action": "ರೈತ ತಕ್ಷಣ ತೆಗೆದುಕೊಳ್ಳಬೇಕಾದ ಕ್ರಮ",
                    "is_urgent": true or false
                }}
            ],
            "safe_activities": ["ಇಂದು ಮಾಡಬಹುದಾದ ಸುರಕ್ಷಿತ ಕೃಷಿ ಚಟುವಟಿಕೆ 1", "ಚಟುವಟಿಕೆ 2"],
            "avoid_activities": ["ಇಂದು ತಪ್ಪಿಸಬೇಕಾದ ಚಟುವಟಿಕೆ 1", "ಚಟುವಟಿಕೆ 2"],
            "forecast_advice": "5-ದಿನದ ಮುನ್ಸೂಚನೆ ಆಧಾರದ ಮೇಲೆ ರೈತರಿಗೆ ಒಂದು ಪ್ರಾಯೋಗಿಕ ಸಲಹೆ"
        }}

        ನಿಯಮಗಳು:
        - threats ಪಟ್ಟಿಯಲ್ಲಿ ಕನಿಷ್ಠ 2 ಮತ್ತು ಗರಿಷ್ಠ 6 ಬೆದರಿಕೆಗಳಿರಲಿ.
        - ಕಡಿಮೆ ಅಪಾಯದ ಬೆದರಿಕೆಗಳು ಇದ್ದರೆ ಅವನ್ನು ಸೇರಿಸಿ; ಇಲ್ಲದಿದ್ದರೆ ಬಿಡಿ.
        - ಕರ್ನಾಟಕಕ್ಕೆ ಸ್ಥಳೀಯವಾದ ಕೀಟನಾಶಕ/ಗೊಬ್ಬರ ಹೆಸರುಗಳನ್ನು ಬಳಸಿ.
        - ಸರಳ ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ, ರೈತರಿಗೆ ಅರ್ಥವಾಗಲಿ.
        """

        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()

        result = json.loads(text)
        return {"success": True, "data": result}

    except json.JSONDecodeError:
        return {
            "success": False,
            "error": "AI ಪ್ರತಿಕ್ರಿಯೆ ಸ್ವರೂಪ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
