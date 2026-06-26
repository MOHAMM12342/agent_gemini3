import { Component, ElementRef, ViewChild, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService, AnalysisResponse } from './backend';
import { SpectrogramComponent } from './spectrogram/spectrogram';
import { PLATFORM_ID } from '@angular/core';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  message: string;
}

interface PendingAction {
  requestId: string;
  action: string;
  reason: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SpectrogramComponent],
  templateUrl: './app.html',
})
export class AppComponent implements OnDestroy {
  private backendService = inject(BackendService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Signals
  isMonitoring = signal(false);
  backendPort = signal(8000);
  logs = signal<LogEntry[]>([]);
  stream = signal<MediaStream | null>(null);
  lastAnalysis = signal<string>("System Idle. Waiting to start.");
  isAnalyzing = signal(false);
  
//prompt écrit
  prompt = "Detect any anomalies in the video feed";

  //response from backend
  response !: Promise<AnalysisResponse>;
  // Permission State
  pendingAction = signal<PendingAction | null>(null);

  // Private state
  private intervalId: any;
  private readonly REFRESH_RATE_MS = 3000; // Analyze every 3 seconds
  private ws: WebSocket | null = null;

  async toggleMonitoring() {
    if (this.isMonitoring()) {
      this.stopMonitoring();
    } else {
      await this.startMonitoring();
    }
  }

  private async startMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true 
      });
      
      this.stream.set(stream);
      this.videoElement.nativeElement.srcObject = stream;
      this.isMonitoring.set(true);
      this.addLog('info', 'Camera and Audio connected. Sentinel System Active.');
      this.addLog('info', `Connected to Backend on Port ${this.backendPort()}`);
      
      this.setupWebSocket();
      
    } catch (err) {
      this.addLog('error', 'Failed to access camera/microphone: ' + err);
    }
  }

  private stopMonitoring() {
    const s = this.stream();
    this.analyzeTick();
    if (s) {
      s.getTracks().forEach(t => t.stop());
    }
    this.stream.set(null);
    this.isMonitoring.set(false);
    this.videoElement.nativeElement.srcObject = null;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.addLog('info', 'Monitoring stopped.');
    this.lastAnalysis.set("System Idle.");
  }

  private setupWebSocket() {
    if (this.ws) {
      this.ws.close();
    }
    try {
      this.ws = new WebSocket(`ws://localhost:${this.backendPort()}/ws/logs`);
      this.ws.onmessage = (event) => {
        this.addLog('action', `[SYS] ${event.data}`);
      };
      this.ws.onopen = () => {
        this.addLog('success', 'Connected to Live Diagnostic Terminal.');
      };
      this.ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
      };
      this.ws.onclose = () => {
        this.addLog('warning', 'Live Diagnostics connection closed.');
      };
    } catch (e) {
      this.addLog('error', 'Failed to initialize Live Diagnostics WS.');
    }
  }

  async analyzeTick() {
    if (this.isAnalyzing() || this.pendingAction()) return;
    
    this.isAnalyzing.set(true);
    try {
      let videoBase64 = "";
      
      // Only capture a frame if camera is connected
      if (this.isMonitoring() && isPlatformBrowser(this.platformId)) {
        const captured = await this.captureFrame();
        if (captured) {
          videoBase64 = captured;
        }
      }
      
      // Send to backend (with or without video)
      this.response = this.backendService.analyzeFrame(this.backendPort(), videoBase64, this.prompt);
      
      const result = await this.response;
      console.log('Backend Response:', result);
    } catch (err) {
      this.addLog('error', 'Analysis cycle failed: ' + err);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

//  private handleBackendResponse(response: AnalysisResponse) {
 //   if (response.type === 'action_request' && response.requestId && response.action) {
      // Critical Path: Dangerous Action Requested
 //     this.pendingAction.set({
   //     requestId: response.requestId,
     //   action: response.action,
       // reason: response.reason || 'No reason provided.'
     // });
      //this.addLog('warning', `Action Request Received: ${response.action}`);
      // Play a sound or alert here if needed
    //} else if (response.type === 'action_executed') {
     // this.addLog('success', `Backend Executed: ${response.action}`);
      //this.lastAnalysis.set(`Action Taken: ${response.action}`);
    //} else if (response.type === 'info' || response.type === 'nominal') {
     // const msg = response.message || "Nominal";
    //  this.lastAnalysis.set(msg);
     // if (msg !== "Nominal" && msg !== "Backend Disconnected") {
      //  this.addLog('info', msg);
     // }
   // }
  //}

  async resolvePermission(allowed: boolean) {
    const action = this.pendingAction();
    if (!action) return;

    this.addLog(allowed ? 'success' : 'warning', `User ${allowed ? 'APPROVED' : 'DENIED'} action: ${action.action}`);
    
    const success = await this.backendService.submitPermission(this.backendPort(), action.requestId, allowed);
    
    if (success) {
      this.addLog('info', 'Decision sent to backend.');
    } else {
      this.addLog('error', 'Failed to send decision to backend.');
    }

    this.pendingAction.set(null);
  }

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private async captureFrame(): Promise<string | null> {
  const stream = this.stream();
  if (!stream) return null;

  return new Promise((resolve) => {
    this.recordedChunks = [];
    
    // Initialisation du recorder (webm est le standard navigateur)
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };

    this.mediaRecorder.onstop = async () => {
      const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
      
      // Conversion en Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(videoBlob);
    };

    // On démarre l'enregistrement
    this.mediaRecorder.start();
  });
}

  private addLog(type: LogEntry['type'], message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    this.logs.update(prev => [entry, ...prev].slice(0, 50));
  }

  ngOnDestroy() {
    this.stopMonitoring();
  }
}