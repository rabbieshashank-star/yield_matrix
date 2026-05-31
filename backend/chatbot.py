import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Store conversation history per session
conversation_history = {}

def chat_with_farmer(message, session_id="default", farmer_context=None):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Build system context
        context = ""
        if farmer_context:
            context = f"""
            Farmer Details:
            - Location: {farmer_context.get('location', 'Karnataka')}
            - Current Crop: {farmer_context.get('crop', 'Not specified')}
            - Land Size: {farmer_context.get('land_size', 'Not specified')} acres
            - Season: {farmer_context.get('season', 'Not specified')}
            """

        system_prompt = f"""
        ನೀವು Yield Matrix ಎಂಬ AI ತಂತ್ರಜ್ಞಾನ ಬಳಸುವ ಕೃಷಿ ಸಹಾಯಕ.
        (You are Yield Matrix, an AI farming assistant.)

        STRICT RULES — Follow always:
        1. ALWAYS reply in Kannada only — never use English or Hindi
        2. Use simple Kannada words a farmer understands
        3. Address farmer respectfully as "ನೀವು" 
        4. Keep answers short and practical — maximum 5-6 lines
        5. Always end with one clear action the farmer can take today
        6. If asked about diseases, give medicine names in simple terms
        7. If asked about prices, give realistic Karnataka market ranges
        8. If asked about weather, give general seasonal advice
        9. Be warm and friendly like a trusted neighbour
        10. Never use technical or scientific jargon

        Your expertise:
        - Crop diseases and treatments
        - Best crops for Karnataka soil and season
        - Irrigation advice
        - Market prices and selling tips
        - Government schemes for farmers
        - General farming tips for Karnataka

        {context}
        """

        # Get or create conversation history
        if session_id not in conversation_history:
            conversation_history[session_id] = []

        # Add user message to history
        conversation_history[session_id].append({
            "role": "user",
            "parts": [message]
        })

        # Keep only last 10 messages to avoid token limit
        history = conversation_history[session_id][-10:]

        # Start chat with history
        chat = model.start_chat(history=history[:-1])

        # Send message with system prompt prepended to first message
        full_message = f"{system_prompt}\n\nFarmer's question: {message}"
        if len(history) > 1:
            # Not first message — just send the question
            full_message = message

        response = chat.send_message(full_message)

        # Add assistant response to history
        conversation_history[session_id].append({
            "role": "model",
            "parts": [response.text]
        })

        return {
            "success": True,
            "reply": response.text,
            "session_id": session_id
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def clear_history(session_id="default"):
    if session_id in conversation_history:
        del conversation_history[session_id]
    return {"success": True, "message": "Conversation cleared"}