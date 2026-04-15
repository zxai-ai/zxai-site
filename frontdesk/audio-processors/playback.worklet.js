// Plays 24kHz PCM audio from Gemini Live. Uses an offset tracker to avoid
// allocations on the real-time audio thread.

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioQueue = [];
    this.currentOffset = 0;
    this.port.onmessage = (ev) => {
      if (ev.data === "interrupt") {
        this.audioQueue = [];
        this.currentOffset = 0;
      } else if (ev.data instanceof Float32Array) {
        this.audioQueue.push(ev.data);
      }
    };
  }
  process(inputs, outputs) {
    const output = outputs[0];
    if (output.length === 0) return true;
    const channel = output[0];
    let i = 0;
    while (i < channel.length && this.audioQueue.length > 0) {
      const buf = this.audioQueue[0];
      if (!buf || buf.length === 0) {
        this.audioQueue.shift();
        this.currentOffset = 0;
        continue;
      }
      const remOut = channel.length - i;
      const remBuf = buf.length - this.currentOffset;
      const n = Math.min(remOut, remBuf);
      for (let k = 0; k < n; k++) channel[i++] = buf[this.currentOffset++];
      if (this.currentOffset >= buf.length) {
        this.audioQueue.shift();
        this.currentOffset = 0;
      }
    }
    while (i < channel.length) channel[i++] = 0;
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
