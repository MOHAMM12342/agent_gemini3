import os
import time
from pyVoIP.VoIP import VoIPPhone, CallState
import voice_pipeline

def answer(call):
    print("Incoming call!")
    voice_pipeline.notify_frontend("📞 Incoming SIP Call received. Connecting...")
    
    try:
        call.answer()
        voice_pipeline.notify_frontend("🎙️ Call answered. Listening for request (10s)...")
        
        # Read audio from SIP RTP stream.
        # pyVoIP provides raw PCMU (u-law) data
        audio_data = bytearray()
        
        # Listen for 10 seconds (500 chunks * 20ms = 10s)
        for _ in range(500): 
            if call.state == CallState.ANSWERED:
                chunk = call.read_audio()
                if chunk:
                    audio_data.extend(chunk)
            else:
                break
                
        if len(audio_data) > 0:
            voice_pipeline.notify_frontend("⚙️ Processing audio request...")
            response_pcmu_file = voice_pipeline.process_audio_request(bytes(audio_data))
            
            if response_pcmu_file:
                voice_pipeline.notify_frontend("🔊 Streaming AI response back to caller...")
                with open(response_pcmu_file, "rb") as f:
                    pcmu_audio = f.read()
                
                # Write audio back in chunks
                chunk_size = 160
                for i in range(0, len(pcmu_audio), chunk_size):
                    if call.state == CallState.ANSWERED:
                        call.write_audio(pcmu_audio[i:i+chunk_size])
                        time.sleep(0.02)
        
        voice_pipeline.notify_frontend("✅ Call complete. Hanging up...")
        call.hangup()
    except Exception as e:
        print(f"Call error: {e}")
        voice_pipeline.notify_frontend(f"❌ Call error: {e}")
        call.hangup()

def start_sip_server():
    # Acting as a standalone UAS.
    sip_ip = os.getenv("SIP_BIND_IP", "192.168.1.24")
    phone = VoIPPhone(sip_ip, 5060, "ai_ops", "password", callCallback=answer)
    phone.start()
    print("SIP Server listening on port 5060...")
    voice_pipeline.notify_frontend("🟢 SIP Server is ONLINE on port 5060")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        phone.stop()

if __name__ == "__main__":
    start_sip_server()
