import { Injectable } from '@angular/core';

export interface AnalysisResponse {
  response?: string; // Optional field for simple string responses
}

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  async analyzeFrame(port: number, imageBase64: string, prompt: string): Promise<AnalysisResponse> {
    const url = `http://127.0.0.1:${port}/analyze`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ video: imageBase64 , prompt : prompt})
      });

      if (!response.ok) {
        throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[Backend] Failed to call ${url}:`, error);
      // Return a safe fallback so the app doesn't crash
      return { response: "Error communicating with backend" };
    }
  }


  async submitPermission(port: number, requestId: string, allowed: boolean): Promise<boolean> {
    const url = `http://localhost:${port}/permission`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, allowed })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to submit permission:', error);
      return false;
    }
  }
}