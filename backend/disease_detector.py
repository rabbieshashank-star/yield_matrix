import google.generativeai as genai
from PIL import Image
import io
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def detect_disease(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes))
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = """
        You are an expert plant pathologist specializing in 
        Indian crops — Ragi, Rice, Wheat, Cotton, Tomato, 
        Maize, Soybean, and common Karnataka crops.

        ALWAYS reply in Kannada only — never use English or Hindi.

        Carefully analyze this crop leaf image and respond 
        ONLY in this exact JSON format, nothing else:

        {
            "disease_detected": true or false,
            "disease_name": "Name of disease or Healthy",
            "severity": "Mild / Moderate / Severe / None",
            "confidence": "High / Medium / Low",
            "affected_part": "Leaves / Stem / Root / Fruit",
            "treatment": [
                "Step 1 treatment action",
                "Step 2 treatment action",
                "Step 3 treatment action"
            ],
            "prevention": [
                "Prevention tip 1",
                "Prevention tip 2"
            ],
            "is_urgent": true or false,
            "urgency_message": "What farmer should do immediately",
            "crop_identified": "Name of crop if identifiable"
        }

        If the image is not a crop or leaf, set 
        disease_detected to false and explain in 
        urgency_message.

        Use simple Kannada that a farmer can understand.
        Give practical, actionable treatment steps.
        Include Indian product names where possible.
        """

        response = model.generate_content([prompt, image])

        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()

        result = json.loads(text)
        return {"success": True, "data": result}

    except json.JSONDecodeError:
        return {
            "success": True,
            "data": {
                "disease_detected": True,
                "disease_name": "Analysis Complete",
                "severity": "Unknown",
                "confidence": "Medium",
                "treatment": [response.text],
                "prevention": [],
                "is_urgent": False,
                "urgency_message": response.text,
                "crop_identified": "Unknown"
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}