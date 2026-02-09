from google import genai
from google.genai import types
import paramiko
import wave
import os

# --- 1. CONFIGURATION ---
# Use one client for both operations (Chat & TTS)
API_KEY = "AIzaSyAMnkOwArOdiRZKS.........."  # Ideally, use os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)

# --- 2. DEFINE TOOLS (SSH) ---
def ssh_execute(command: str) -> str:
    """
    Executes a command on a remote server via SSH and returns the output.

    Args:
        command: The shell command to execute (e.g., 'ls -la', 'df -h').
    """
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # Note: Ensure your Docker container is running and mapped to port 2222
        ssh.connect('192.168.1.6', port=2222, username='moham', password='password')
        stdin, stdout, stderr = ssh.exec_command(command)
        output = stdout.read().decode("utf-8")
        error = stderr.read().decode("utf-8")
        ssh.close()
        return output if output else error
    except Exception as e:
        return f"Connection Error: {str(e)}"

# --- 3. INITIALIZE CHAT MODEL (The Brain) ---
tools_list = [ssh_execute]

# Initialize the chat session with the tool config
chat = client.chats.create(
    model="gemini-3-flash-preview",
    config=types.GenerateContentConfig(
        tools=tools_list,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=False,
            maximum_remote_calls=3
        )
    )
)

# --- 4. DEFINE TTS FUNCTION (The Voice) ---
def generate_3cx_audio(text_prompt: str):
    """
    Converts text response from the AI into an audio file.
        """
    print(f"Generating TTS for: {text_prompt[:50]}...")

    # CORRECTED: Send text directly to contents, do NOT wrap in Part.from_bytes
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=text_prompt,  # Direct text input
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"], # Explicitly ask for audio
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore" # Options: Kore, Puck, Charon, etc.
                    )
                )
            )
        )
    )

    # The API returns raw audio bytes (usually PCM 24kHz)
    try:
        audio_data = response.candidates[0].content.parts[0].inline_data.data

        # Save as raw WAV first
        output_filename = "temp_output.wav"
        with open(output_filename, "wb") as f:
            f.write(audio_data)

        print("Audio generated successfully!")
        return output_filename

    except Exception as e:
        print(f"Error generating audio: {e}")
        return None
