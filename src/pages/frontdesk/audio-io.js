// AudioStreamer: mic -> 16kHz PCM -> Gemini.
// AudioPlayer:  24kHz PCM from Gemini -> speakers, with interrupt/barge-in.

export class AudioStreamer {
  constructor(client) {
    this.client = client;
    this.audioContext = null;
    this.worklet = null;
    this.mediaStream = null;
    this.streaming = false;
  }

  async start() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
    await this.audioContext.audioWorklet.addModule(
      "/frontdesk/audio-processors/capture.worklet.js"
    );
    this.worklet = new AudioWorkletNode(this.audioContext, "audio-capture-processor");
    this.worklet.port.onmessage = (ev) => {
      if (!this.streaming) return;
      if (ev.data.type !== "audio") return;
      const pcm16 = floatToPCM16(ev.data.data);
      const b64 = arrayBufferToBase64(pcm16);
      if (this.client?.connected) this.client.sendAudioMessage(b64);
    };
    const src = this.audioContext.createMediaStreamSource(this.mediaStream);
    src.connect(this.worklet);
    this.streaming = true;
  }

  stop() {
    this.streaming = false;
    if (this.worklet) {
      try { this.worklet.disconnect(); } catch {}
      try { this.worklet.port.close(); } catch {}
      this.worklet = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    if (this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
      this.mediaStream = null;
    }
  }
}

export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.worklet = null;
    this.gain = null;
    this.initialized = false;
    this.volume = 1.0;
  }

  async init() {
    if (this.initialized) return;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000,
    });
    await this.audioContext.audioWorklet.addModule(
      "/frontdesk/audio-processors/playback.worklet.js"
    );
    this.worklet = new AudioWorkletNode(this.audioContext, "pcm-processor");
    this.gain = this.audioContext.createGain();
    this.gain.gain.value = this.volume;
    this.worklet.connect(this.gain);
    this.gain.connect(this.audioContext.destination);
    this.initialized = true;
  }

  async play(base64) {
    if (!this.initialized) await this.init();
    if (this.audioContext.state === "suspended") await this.audioContext.resume();
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;
    this.worklet.port.postMessage(f32);
  }

  interrupt() {
    if (this.worklet) this.worklet.port.postMessage("interrupt");
  }

  destroy() {
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    this.initialized = false;
  }
}

function floatToPCM16(f32) {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = s * 0x7fff;
  }
  return i16.buffer;
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
