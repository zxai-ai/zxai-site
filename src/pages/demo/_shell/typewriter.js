// Typewriter text animation. Streams characters into a target element
// at a natural cadence with slight randomization so it feels like live output.
//
// Usage:
//   import { typeInto } from "/demo/_shell/typewriter.js";
//   await typeInto(el, "Hello world", { cps: 45 });
//
// Options:
//   cps:      characters per second (default 55)
//   jitter:   random variance 0-1 (default 0.3)
//   onChunk:  callback fired after each chunk render

export async function typeInto(el, text, opts = {}) {
  const cps = opts.cps ?? 55;
  const jitter = opts.jitter ?? 0.3;
  const onChunk = opts.onChunk;

  el.textContent = "";
  const baseDelay = 1000 / cps;

  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    if (onChunk) onChunk(el.textContent);
    const delay = baseDelay * (1 + (Math.random() * 2 - 1) * jitter);
    // Slow down slightly on punctuation for natural rhythm.
    const bonus = /[.,;:!?]/.test(text[i]) ? 120 : 0;
    await sleep(delay + bonus);
  }
}

export function skipType(el, text) {
  el.textContent = text;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
