import google.generativeai as genai
from PIL import Image
import io
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


def analyze_crop_health(image_bytes, weather_context=""):
    """
    Analyzes a crop photo for overall health using Gemini vision AI.
    Optionally incorporates current weather data for context-aware advice.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        model = genai.GenerativeModel("gemini-2.5-flash")

        weather_section = ""
        if weather_context:
            weather_section = f"\n        Current Weather Context: {weather_context}\n"

        prompt = f"""
        ನೀವು ಭಾರತೀಯ ಬೆಳೆಗಳಲ್ಲಿ ಪರಿಣತ ಬೆಳೆ ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಕರಾಗಿದ್ದೀರಿ —
        ರಾಗಿ, ಭತ್ತ, ಗೋಧಿ, ಹತ್ತಿ, ಟೊಮ್ಯಾಟೊ, ಮೆಕ್ಕೆಜೋಳ, ಸೋಯಾಬೀನ್,
        ಕಬ್ಬು ಮತ್ತು ಕರ್ನಾಟಕದ ಸಾಮಾನ್ಯ ಬೆಳೆಗಳಲ್ಲಿ.
{weather_section}
        ಈ ಬೆಳೆಯ ಫೋಟೋವನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಈ ಕೆಳಗಿನ ನಿಖರ JSON
        ಸ್ವರೂಪದಲ್ಲಿ ಮಾತ್ರ ಉತ್ತರಿಸಿ, ಬೇರೇನೂ ಬೇಡ:

        IMPORTANT LANGUAGE RULE:
        - ALL text values inside the JSON MUST be written in Kannada script (ಕನ್ನಡ).
        - The JSON keys must remain in English exactly as shown.
        - health_status must be one of these exact Kannada words:
            "ಆರೋಗ್ಯಕರ" (Healthy), "ಒತ್ತಡದಲ್ಲಿದೆ" (Stressed),
            "ರೋಗಗ್ರಸ್ತ" (Diseased), "ಅಜ್ಞಾತ" (Unknown).
        - confidence must be: "ಹೆಚ್ಚು" (High), "ಮಧ್ಯಮ" (Medium), or "ಕಡಿಮೆ" (Low).

        {{
            "health_status": "ಆರೋಗ್ಯಕರ | ಒತ್ತಡದಲ್ಲಿದೆ | ರೋಗಗ್ರಸ್ತ | ಅಜ್ಞಾತ",
            "crop_identified": "ಬೆಳೆಯ ಹೆಸರು ಕನ್ನಡದಲ್ಲಿ, ಗೊತ್ತಿಲ್ಲದಿದ್ದರೆ ಅಜ್ಞಾತ",
            "confidence": "ಹೆಚ್ಚು | ಮಧ್ಯಮ | ಕಡಿಮೆ",
            "overall_score": 85,
            "observations": [
                "ಗೋಚರ ಬೆಳೆ ಸ್ಥಿತಿ ಬಗ್ಗೆ ಮುಖ್ಯ ವೀಕ್ಷಣೆ 1",
                "ಎಲೆಯ ಬಣ್ಣ, ವಿನ್ಯಾಸ ಅಥವಾ ರಚನೆ ಬಗ್ಗೆ ವೀಕ್ಷಣೆ 2",
                "ಯಾವುದೇ ಒತ್ತಡ ಅಥವಾ ಹಾನಿ ಬಗ್ಗೆ ವೀಕ್ಷಣೆ 3"
            ],
            "weather_impact": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಬೆಳೆಯ ಮೇಲೆ ಹೇಗೆ ಪರಿಣಾಮ ಬೀರುತ್ತಿದೆ ಎಂಬ ವಿವರಣೆ (ಹವಾಮಾನ ಡೇಟಾ ಇಲ್ಲದಿದ್ದರೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ ಎಂದು ಬರೆಯಿರಿ)",
            "recommendations": [
                "ಕ್ರಿಯಾತ್ಮಕ ಶಿಫಾರಸು 1",
                "ಕ್ರಿಯಾತ್ಮಕ ಶಿಫಾರಸು 2",
                "ಕ್ರಿಯಾತ್ಮಕ ಶಿಫಾರಸು 3"
            ],
            "next_action": "ರೈತ ಈಗಲೇ ತೆಗೆದುಕೊಳ್ಳಬೇಕಾದ ಅತ್ಯಂತ ತುರ್ತು ಕ್ರಮ",
            "is_urgent": true or false,
            "urgency_message": "ತುರ್ತಾಗಿದ್ದರೆ ರೈತ ತಕ್ಷಣ ಏನು ಮಾಡಬೇಕು, ಇಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಸ್ಟ್ರಿಂಗ್"
        }}

        ನಿಯಮಗಳು:
        - overall_score ಎಂಬುದು 0 ರಿಂದ 100 ರ ನಡುವಿನ ಪೂರ್ಣ ಸಂಖ್ಯೆ (100 = ಸಂಪೂರ್ಣ ಆರೋಗ್ಯಕರ).
        - ಚಿತ್ರವು ಬೆಳೆ ಅಥವಾ ಸಸ್ಯ ಅಲ್ಲದಿದ್ದರೆ, health_status ಅನ್ನು "ಅಜ್ಞಾತ" ಎಂದು ಹೊಂದಿಸಿ,
          overall_score ಅನ್ನು 0 ಮಾಡಿ ಮತ್ತು urgency_message ನಲ್ಲಿ ವಿವರಿಸಿ.
        - ಕರ್ನಾಟಕದ ರೈತರು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಬಹುದಾದ ಸರಳ ಕನ್ನಡ ಬಳಸಿ.
        - ಸಂಬಂಧಿತ ಭಾರತೀಯ ಉತ್ಪನ್ನ/ಗೊಬ್ಬರ ಹೆಸರುಗಳನ್ನು ಸೇರಿಸಿ.
        - ಪ್ರತಿ ವೀಕ್ಷಣೆ ಮತ್ತು ಶಿಫಾರಸು 20 ಪದಗಳಿಗಿಂತ ಕಡಿಮೆ ಇರಲಿ.
        """

        response = model.generate_content([prompt, image])

        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()

        result = json.loads(text)
        return {"success": True, "data": result}

    except json.JSONDecodeError:
        # Gemini responded but not in JSON — return raw text gracefully
        return {
            "success": True,
            "data": {
                "health_status": "ಅಜ್ಞಾತ",
                "crop_identified": "ಅಜ್ಞಾತ",
                "confidence": "ಕಡಿಮೆ",
                "overall_score": 0,
                "observations": [response.text],
                "weather_impact": "ಅನ್ವಯಿಸುವುದಿಲ್ಲ",
                "recommendations": ["ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟ ಫೋಟೋದೊಂದಿಗೆ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."],
                "next_action": "ಒಳ್ಳೆಯ ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
                "is_urgent": False,
                "urgency_message": ""
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
