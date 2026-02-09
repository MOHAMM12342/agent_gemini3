import base64
import fastapi
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import file_config

app = fastapi.FastAPI()
router = APIRouter()

# --- CORS Configuration ---
# Allows all origins, methods, and headers (adjust for production if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@router.post("/analyze")
async def analyze_data(data: dict):
    video_b64 = data.get("video")
    prompt = data.get("prompt")

    if not video_b64:
        raise fastapi.HTTPException(status_code=400, detail="No video provided")

    try:
        # 1. Decode the Base64 string into raw bytes
        video_bytes = base64.b64decode(video_b64)

        # 2. Create the Video Part object for Gemini
        video_part = types.Part.from_bytes(
            data=video_bytes,
            mime_type="video/mp4"  # Ensure this matches your video format
        )

        # 3. Generate content using the client (not the chat session)
        # This supports the list format [Video, Text]
        response = file_config.chat.send_message([video_part,prompt])

        if not response:
            raise fastapi.HTTPException(status_code=500, detail="Analysis failed")

        return {"response": response.text}

    except Exception as e:
        # Print error to console for debugging
        print(f"Error processing request: {e}")
        raise fastapi.HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

app.include_router(router)