import base64
import fastapi
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from google import genai
from google.genai import types
import file_config

app = fastapi.FastAPI()
router = APIRouter()

# --- WebSocket Manager for Live Logs ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.post("/broadcast_log")
async def broadcast_log(data: dict):
    message = data.get("message")
    if message:
        await manager.broadcast(message)
        return {"status": "success"}
    return {"status": "error"}

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

    try:
        if not video_b64:
            # If no video is provided, just send the text prompt
            response = file_config.chat.send_message(prompt)
        else:
            # 1. Decode the Base64 string into raw bytes
            video_bytes = base64.b64decode(video_b64)

            # 2. Create the Video Part object for Gemini
            video_part = types.Part.from_bytes(
                data=video_bytes,
                mime_type="video/mp4" 
            )

            # 3. Generate content using the client (not the chat session)
            # This supports the list format [Video, Text]
            response = file_config.chat.send_message([video_part, prompt])

        if not response:
            raise fastapi.HTTPException(status_code=500, detail="Analysis failed")

        try:
            text_output = response.text
        except ValueError:
            text_output = "Model executed successfully but returned no text."

        return {"response": text_output}

    except Exception as e:
        # Print error to console for debugging
        print(f"Error processing request: {e}")
        raise fastapi.HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
app.include_router(router)