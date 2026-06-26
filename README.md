# AI Ops Sentinel & Autonomous Voice Agent

An advanced agentic voice and text platform powered by **Google Gemini Multimodal AI**, **FastAPI**, **Angular**, and **pyVoIP**. The system acts as an autonomous operations sentinel capable of answering SIP calls, analyzing visual feeds, executing remote SSH commands, and generating dynamic text-to-speech audio responses.

---

## 🏗️ System Architecture

The project is structured into three fully containerized microservices managed via **Docker Compose**:

1. **`frontend` (Angular 19 Dashboard)**
   - Displays real-time diagnostic logs via WebSockets.
   - Allows manual text-prompt execution ("Analyze Now") and camera/audio monitoring.
   - Accessible at: `http://localhost:4200`

2. **`backend` (FastAPI + pyVoIP SIP Server)**
   - **FastAPI Controller**: Listens on port `8000` (`/analyze`, `/ws/logs`). Handles Gemini multimodal inference and log broadcasting.
   - **SIP UAS Server**: Listens on UDP port `5060`. Answers incoming softphone calls, processes audio through Gemini, and streams PCMU TTS audio back to the caller.

3. **`ssh_target` (Remote Sandbox Container)**
   - Isolated Ubuntu/Debian sandbox running an SSH daemon on port `2222`.
   - Used by Gemini's tool-calling capabilities (`ssh_execute`) to safely execute diagnostic commands (`ls`, `df -h`, etc.).

---

## 🚀 Getting Started (Docker Compose)

### Prerequisites
- **Docker Desktop** installed and running.

### Launching the Stack
To build and launch all services simultaneously with zero manual scripts:

```bash
docker compose up --build -d
```

Check the status of running containers:
```bash
docker compose ps
```

View aggregated live logs:
```bash
docker compose logs -f
```

Stopping the stack:
```bash
docker compose down
```

---

## 📱 Testing SIP Calls (Android Softphone)

You can call your autonomous AI agent directly from your smartphone using any standard SIP softphone client. We recommend **Zoiper IAX SIP VOIP Softphone** (Free on Google Play Store).

### Setup Instructions
1. Ensure your Android smartphone is connected to the **exact same Wi-Fi network** as your computer.
2. Find your computer's local Wi-Fi IPv4 address (e.g. `192.168.1.24`).
3. Open **Zoiper** on your smartphone and enter the following credentials:
   - **Username**: `ai_ops@<YOUR_PC_IP>` (e.g. `ai_ops@192.168.1.24`)
   - **Password**: `password`
4. Tap **"Create an account"**.
5. Set Hostname/Provider to your PC IP (`192.168.1.24`) and hit **Next**.
6. Set Authentication Username to `ai_ops` and leave Outbound Proxy blank. Hit **Next**.
7. Zoiper will scan and verify **SIP UDP**. Tap **Finish**!
8. Dial any random extension (e.g. `100`) and hit **Call**. The AI will answer, listen to your spoken query, and respond in real-time!

---

## 🛠️ Configuration & Environment Variables

Services are automatically configured via `docker-compose.yml` defaults:

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `SSH_HOST` | `backend` | `ssh_target` | Hostname of remote SSH sandbox container. |
| `SSH_PORT` | `backend` | `22` | Internal SSH daemon port. |
| `SIP_BIND_IP` | `backend` | `0.0.0.0` | Bind address for standalone SIP UAS socket. |
