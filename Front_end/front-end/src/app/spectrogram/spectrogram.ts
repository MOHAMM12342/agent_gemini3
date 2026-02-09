import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, input, effect } from '@angular/core';

@Component({
  selector: 'app-spectrogram',
  standalone: true,
  template: `
    <canvas #canvas class="w-full h-full bg-black/50 rounded-lg"></canvas>
  `
})
export class SpectrogramComponent implements AfterViewInit, OnDestroy {
  audioStream = input<MediaStream | null>(null);
  
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;

  constructor() {
    effect(() => {
      const stream = this.audioStream();
      if (stream) {
        this.initAudio(stream);
      } else {
        this.stopAudio();
      }
    });
  }

  ngAfterViewInit() {
    // Initial resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  ngOnDestroy() {
    this.stopAudio();
  }

  private resize() {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }

  private initAudio(stream: MediaStream) {
    this.stopAudio(); // Clear previous

    this.audioCtx = new AudioContext();
    this.analyser = this.audioCtx.createAnalyser();
    this.source = this.audioCtx.createMediaStreamSource(stream);

    this.source.connect(this.analyser);
    this.analyser.fftSize = 256;
    
    this.draw();
  }

  private stopAudio() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private draw() {
    if (!this.canvasRef || !this.analyser) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawVisual = () => {
      this.animationId = requestAnimationFrame(drawVisual);
      this.analyser!.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade out
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5; // Scale down slightly

        // Sentinel green to red gradient
        const r = barHeight + (25 * (i / bufferLength));
        const g = 250 * (i / bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    drawVisual();
  }
}