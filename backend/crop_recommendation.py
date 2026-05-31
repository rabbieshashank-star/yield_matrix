import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

KARNATAKA_DISTRICTS = [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
    "Bidar", "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan",
    "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal",
    "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir", "Hubballi-Dharwad"
]

def get_crop_recommendation(data):
    try:
        district    = data.get("district")
        soil_type   = data.get("soil_type")
        water       = data.get("water_source")
        season      = data.get("season")
        land_size   = data.get("land_size")
        goal        = data.get("goal")

        # Validate district
        if district not in KARNATAKA_DISTRICTS:
            return {"success": False, "error": "Invalid district selected"}

        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = f"""
        You are an expert agricultural advisor for Karnataka, India.

        Farmer Profile:
        - District: {district}, Karnataka
        - Soil Type: {soil_type}
        - Water Source: {water}
        - Season: {season}
        - Land Size: {land_size} acres
        - Farming Goal: {goal}

        Based on this profile give crop recommendations.
        Respond ONLY in this exact JSON format, nothing else:

        {{
            "primary_crops": [
                {{
                    "rank": 1,
                    "name": "Crop name",
                    "kannada_name": "Crop name in Kannada",
                    "why_suitable": "One sentence why this suits their soil, water, season",
                    "yield_per_acre": "X - Y quintals",
                    "profit_per_acre": "₹X - ₹Y",
                    "water_requirement": "Low / Medium / High",
                    "difficulty": "Easy / Medium / Hard",
                    "duration_days": "X days",
                    "best_sowing_time": "Month range",
                    "market_demand": "High / Medium / Low"
                }},
                {{
                    "rank": 2,
                    "name": "Crop name",
                    "kannada_name": "Crop name in Kannada",
                    "why_suitable": "One sentence why this suits their soil, water, season",
                    "yield_per_acre": "X - Y quintals",
                    "profit_per_acre": "₹X - ₹Y",
                    "water_requirement": "Low / Medium / High",
                    "difficulty": "Easy / Medium / Hard",
                    "duration_days": "X days",
                    "best_sowing_time": "Month range",
                    "market_demand": "High / Medium / Low"
                }},
                {{
                    "rank": 3,
                    "name": "Crop name",
                    "kannada_name": "Crop name in Kannada",
                    "why_suitable": "One sentence why this suits their soil, water, season",
                    "yield_per_acre": "X - Y quintals",
                    "profit_per_acre": "₹X - ₹Y",
                    "water_requirement": "Low / Medium / High",
                    "difficulty": "Easy / Medium / Hard",
                    "duration_days": "X days",
                    "best_sowing_time": "Month range",
                    "market_demand": "High / Medium / Low"
                }}
            ],
            "secondary_crops": [
                {{
                    "type": "Intercrop",
                    "name": "Crop name",
                    "kannada_name": "Crop name in Kannada",
                    "where_to_grow": "Between rows of main crop",
                    "extra_income": "₹X - ₹Y per acre",
                    "benefit": "One line benefit to main crop or farmer"
                }},
                {{
                    "type": "Border Crop",
                    "name": "Crop name",
                    "kannada_name": "Crop name in Kannada",
                    "where_to_grow": "Along field edges and boundaries",
                    "extra_income": "₹X - ₹Y per acre",
                    "benefit": "One line benefit to main crop or farmer"
                }}
            ],
            "season_advice": "One practical sentence about this season in this district",
            "soil_advice": "One practical sentence about this soil type for farming"
        }}

        Use realistic figures for Karnataka.
        Keep language simple.
        Kannada names should be in English script (transliterated).
        """

        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()

        result = json.loads(text)
        return {"success": True, "data": result}

    except json.JSONDecodeError:
        return {"success": False, "error": "AI response format error. Please try again."}
    except Exception as e:
        return {"success": False, "error": str(e)}