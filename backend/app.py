from flask import Flask, request, jsonify
from flask_cors import CORS
from disease_detector import detect_disease
from db import (
    init_db, upsert_price, get_prices_for_district, delete_price,
    get_all_districts, get_district_names, add_district,
    update_district_password, delete_district,
    get_all_schemes, add_scheme, delete_scheme,
    get_all_crop_metadata, add_crop_metadata, delete_crop_metadata
)
import os
import json
from admin_auth import (
    authenticate, authenticate_superadmin,
    verify_district_token, verify_superadmin_token
)
import jwt

app = Flask(__name__)
CORS(app)  # Allow frontend and admin portal to call this API

# Initialise SQLite DB on startup
with app.app_context():
    init_db()

@app.route("/list-models", methods=["GET"])
def list_models():
    import google.generativeai as genai
    models = [m.name for m in genai.list_models() 
              if "generateContent" in m.supported_generation_methods]
    return jsonify(models)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Yield Matrix API is running!"})

@app.route("/detect-disease", methods=["POST"])
def detect():
    try:
        # Check if image was uploaded
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error": "No image uploaded"
            }), 400

        image_file = request.files["image"]

        # Validate file type
        allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
        if image_file.content_type not in allowed:
            return jsonify({
                "success": False,
                "error": "Please upload a JPG or PNG image"
            }), 400

        # Read image bytes
        image_bytes = image_file.read()

        # Run detection
        result = detect_disease(image_bytes)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    

from crop_recommendation import get_crop_recommendation, KARNATAKA_DISTRICTS

@app.route("/get-districts", methods=["GET"])
def get_districts():
    return jsonify({"districts": KARNATAKA_DISTRICTS})

@app.route("/recommend-crops", methods=["POST"])
def recommend_crops():
    try:
        data = request.get_json()

        # Validate required fields
        required = ["district", "soil_type", "water_source", "season", "land_size", "goal"]
        for field in required:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Missing field: {field}"
                }), 400

        result = get_crop_recommendation(data)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
from chatbot import chat_with_farmer, clear_history
import uuid

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "").strip()
        session_id = data.get("session_id", "default")
        farmer_context = data.get("farmer_context", None)

        if not message:
            return jsonify({
                "success": False,
                "error": "Message cannot be empty"
            }), 400

        result = chat_with_farmer(message, session_id, farmer_context)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/clear-chat", methods=["POST"])
def clear_chat():
    try:
        data = request.get_json()
        session_id = data.get("session_id", "default")
        result = clear_history(session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

from market_data import generate_prices

@app.route("/api/prices", methods=["GET"])
def get_prices():
    try:
        data = generate_prices()
        return jsonify(data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Admin Portal Routes ────────────────────────────────────────────────────

def _bearer_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise PermissionError("Missing or invalid Authorization header")
    return auth.split(" ", 1)[1]


# ── Public ───────────────────────────────────────────────────

@app.route("/admin/districts", methods=["GET"])
def admin_districts():
    """Return district names stored in DB (for the login dropdown)."""
    return jsonify({"districts": get_district_names()})


@app.route("/admin/login", methods=["POST"])
def admin_login():
    try:
        data = request.get_json()
        district = (data.get("district") or "").strip()
        password = (data.get("password") or "").strip()
        if not district or not password:
            return jsonify({"success": False, "error": "District and password required"}), 400
        token = authenticate(district, password)
        return jsonify({"success": True, "token": token, "district": district})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/superadmin/login", methods=["POST"])
def superadmin_login():
    try:
        data = request.get_json()
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        if not username or not password:
            return jsonify({"success": False, "error": "Username and password required"}), 400
        token = authenticate_superadmin(username, password)
        return jsonify({"success": True, "token": token})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── District operator ───────────────────────────────────────────

@app.route("/admin/prices", methods=["GET"])
def admin_get_prices():
    try:
        district = verify_district_token(_bearer_token())
        rows = get_prices_for_district(district)
        return jsonify({"success": True, "district": district, "prices": rows})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/prices", methods=["POST"])
def admin_set_price():
    try:
        district = verify_district_token(_bearer_token())
        data      = request.get_json()
        crop       = (data.get("crop") or "").strip()
        price      = data.get("price")
        change_pct = float(data.get("change_pct", 0.0))
        volume     = int(data.get("volume", 0))
        if not crop or price is None:
            return jsonify({"success": False, "error": "crop and price are required"}), 400
        price = int(price)
        if price <= 0:
            return jsonify({"success": False, "error": "Price must be a positive number"}), 400
        upsert_price(district, crop, price, change_pct, volume)
        return jsonify({"success": True, "message": f"{crop} price updated for {district}"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/prices/<crop>", methods=["DELETE"])
def admin_delete_price(crop):
    try:
        district = verify_district_token(_bearer_token())
        deleted = delete_price(district, crop)
        if deleted:
            return jsonify({"success": True, "message": f"{crop} removed from {district}"})
        return jsonify({"success": False, "error": "Crop not found"}), 404
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Superadmin ───────────────────────────────────────────────

@app.route("/admin/superadmin/districts", methods=["GET"])
def sa_list_districts():
    try:
        verify_superadmin_token(_bearer_token())
        return jsonify({"success": True, "districts": get_all_districts()})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/superadmin/districts", methods=["POST"])
def sa_add_district():
    try:
        verify_superadmin_token(_bearer_token())
        data     = request.get_json()
        name     = (data.get("name") or "").strip()
        password = (data.get("password") or "").strip()
        if not name or not password:
            return jsonify({"success": False, "error": "name and password are required"}), 400
        ok = add_district(name, password)
        if not ok:
            return jsonify({"success": False, "error": f"District '{name}' already exists"}), 409
        return jsonify({"success": True, "message": f"District '{name}' added"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/superadmin/districts/<name>", methods=["PATCH"])
def sa_update_district(name):
    """Update a district's password."""
    try:
        verify_superadmin_token(_bearer_token())
        data     = request.get_json()
        password = (data.get("password") or "").strip()
        if not password:
            return jsonify({"success": False, "error": "password is required"}), 400
        ok = update_district_password(name, password)
        if not ok:
            return jsonify({"success": False, "error": "District not found"}), 404
        return jsonify({"success": True, "message": f"Password updated for '{name}'"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/superadmin/districts/<name>", methods=["DELETE"])
def sa_delete_district(name):
    try:
        verify_superadmin_token(_bearer_token())
        ok = delete_district(name)
        if not ok:
            return jsonify({"success": False, "error": "District not found"}), 404
        return jsonify({"success": True, "message": f"District '{name}' removed"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ─── Government Schemes Routes ───────────────────────────────────────────

@app.route("/api/schemes", methods=["GET"])
def public_schemes():
    """Public endpoint — returns all schemes for the main Yield Matrix app."""
    try:
        return jsonify({"success": True, "schemes": get_all_schemes()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/schemes", methods=["POST"])
def admin_add_scheme():
    """Superadmin-protected — add a new government scheme."""
    try:
        verify_superadmin_token(_bearer_token())
        data        = request.get_json()
        name        = (data.get("name")        or "").strip()
        category    = (data.get("category")    or "").strip()
        description = (data.get("description") or "").strip()
        link        = (data.get("link")        or "").strip() or None
        if not name or not category or not description:
            return jsonify({"success": False, "error": "name, category and description are required"}), 400
        scheme_id = add_scheme(name, category, description, link)
        return jsonify({"success": True, "id": scheme_id, "message": f"Scheme '{name}' added"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/schemes/<int:scheme_id>", methods=["DELETE"])
def admin_delete_scheme(scheme_id):
    """Superadmin-protected — delete a scheme by id."""
    try:
        verify_superadmin_token(_bearer_token())
        ok = delete_scheme(scheme_id)
        if not ok:
            return jsonify({"success": False, "error": "Scheme not found"}), 404
        return jsonify({"success": True, "message": "Scheme deleted"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Crop Guides Routes ──────────────────────────────────────────────────

GUIDES_DIR = os.path.join(os.path.dirname(__file__), "data", "guides")
os.makedirs(GUIDES_DIR, exist_ok=True)

@app.route("/api/crop-guides", methods=["GET"])
def public_crop_guides():
    """Public endpoint — returns all crop guides with sections from JSON."""
    try:
        metadata = get_all_crop_metadata()
        guides = []
        for crop in metadata:
            crop_id = crop["crop_id"]
            file_path = os.path.join(GUIDES_DIR, f"{crop_id}.json")
            sections = []
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        sections = json.load(f)
                except Exception:
                    pass
            crop["sections"] = sections
            guides.append(crop)
        return jsonify({"success": True, "guides": guides})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/crop-guides", methods=["POST"])
def admin_add_crop_guide():
    """Superadmin-protected — add or update a crop guide."""
    try:
        verify_superadmin_token(_bearer_token())
        data = request.get_json()
        crop_id = (data.get("crop_id") or "").strip()
        crop_name = (data.get("crop_name") or "").strip()
        emoji = (data.get("emoji") or "").strip() or None
        sections = data.get("sections", [])

        if not crop_id or not crop_name:
            return jsonify({"success": False, "error": "crop_id and crop_name are required"}), 400

        # Save metadata to DB
        add_crop_metadata(crop_id, crop_name, emoji)

        # Save sections to JSON file
        file_path = os.path.join(GUIDES_DIR, f"{crop_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(sections, f, ensure_ascii=False, indent=2)

        return jsonify({"success": True, "message": f"Crop guide '{crop_name}' saved"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/crop-guides/<crop_id>", methods=["DELETE"])
def admin_delete_crop_guide(crop_id):
    """Superadmin-protected — delete a crop guide."""
    try:
        verify_superadmin_token(_bearer_token())
        ok = delete_crop_metadata(crop_id)
        if not ok:
            return jsonify({"success": False, "error": "Crop guide not found"}), 404
        
        file_path = os.path.join(GUIDES_DIR, f"{crop_id}.json")
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({"success": True, "message": "Crop guide deleted"})
    except (PermissionError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



from crop_health import analyze_crop_health

@app.route("/analyze-crop-health", methods=["POST"])
def crop_health():
    try:
        # Image is required
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No image uploaded"}), 400

        image_file = request.files["image"]

        allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
        if image_file.content_type not in allowed:
            return jsonify({"success": False, "error": "Please upload a JPG or PNG image"}), 400

        image_bytes = image_file.read()

        # Weather context is optional — sent as a form field
        weather_context = request.form.get("weather_context", "")

        result = analyze_crop_health(image_bytes, weather_context)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

from threat_detector import detect_threats

@app.route("/detect-threats", methods=["POST"])
def threat_alerts():
    try:
        weather_data = request.get_json()
        if not weather_data:
            return jsonify({"success": False, "error": "No weather data provided"}), 400

        result = detect_threats(weather_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)