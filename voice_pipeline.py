import file_config
import requests
import wave
import audioop
import os

def notify_frontend(message: str):
    print(f"[Frontend Notify] {message}")
    try:
        requests.post("http://127.0.0.1:8000/broadcast_log", json={"message": message})
    except Exception as e:
        pass # Silently fail if FastAPI is not running

def process_audio_request(pcmu_data: bytes) -> str:
    # Convert PCMU to WAV
    wav_filename = "temp_input.wav"
    with wave.open(wav_filename, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(8000)
        pcm_data = audioop.ulaw2lin(pcmu_data, 2)
        wav_file.writeframes(pcm_data)
        
    notify_frontend("🤖 Sending audio to Gemini for analysis...")
    # Read the wav file and send to gemini chat
    with open(wav_filename, "rb") as f:
        audio_bytes = f.read()
        
    from google.genai import types
    audio_part = types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav")
    
    try:
        # Note: file_config.chat should maintain conversational memory
        response = file_config.chat.send_message([audio_part])
        notify_frontend(f"💡 Gemini replied: {response.text}")
        
        notify_frontend("🎵 Generating TTS audio...")
        output_wav = file_config.generate_3cx_audio(response.text)
        
        if output_wav:
            notify_frontend("🔄 Converting TTS to SIP format (PCMU)...")
            pcmu_filename = "temp_output.pcmu"
            with wave.open(output_wav, 'rb') as wav_in:
                pcm_data = wav_in.readframes(wav_in.getnframes())
                # Ensure the audio from TTS is converted correctly based on its sample width
                pcmu_data = audioop.lin2ulaw(pcm_data, wav_in.getsampwidth())
                with open(pcmu_filename, 'wb') as pcmu_out:
                    pcmu_out.write(pcmu_data)
            return pcmu_filename
    except Exception as e:
        notify_frontend(f"❌ Error processing with Gemini: {e}")
        
    return None
