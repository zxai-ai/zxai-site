#!/usr/bin/env node
// Gemini TTS audio generator for scripted voice demos.
//
// Reads src/pages/<agent>/script.json, sends each utterance (opening + every
// branch response) to Gemini TTS, wraps the returned PCM in a WAV header, and
// writes the file to src/pages/<agent>/audio/<filename>.
//
// Usage:
//   GEMINI_API_KEY=xxx node scripts/generate-demo-audio.mjs --agent reactivation
//   GEMINI_API_KEY=xxx node scripts/generate-demo-audio.mjs --agent all
//
// Flags:
//   --agent <slug|all>   Which agent to generate. "all" does all three.
//   --force              Regenerate files that already exist.
//   --dry-run            Print the utterance plan without calling Gemini.
//
// Gemini TTS returns 24kHz 16-bit mono PCM. We wrap it in a standard WAV
// header (44 bytes) so the browser can play the file with a plain <audio>.
//
// Cost: very small. Roughly a few cents per full agent script.

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

const MODEL = "gemini-2.5-flash-preview-tts";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const SAMPLE_RATE = 24000;

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && !args.dryRun) {
  console.error("Missing GEMINI_API_KEY in environment.");
  process.exit(1);
}

const AGENTS = ["reactivation", "retention", "scheduling"];
const targets = args.agent === "all" ? AGENTS : [args.agent];
for (const agent of targets) {
  if (!AGENTS.includes(agent)) {
    console.error(`Unknown agent: ${agent}. Valid: ${AGENTS.join(", ")} or "all"`);
    process.exit(1);
  }
}

for (const agent of targets) {
  await generateForAgent(agent);
}

async function generateForAgent(agent) {
  const scriptPath = join(repoRoot, "src", "pages", agent, "script.json");
  const audioDir = join(repoRoot, "src", "pages", agent, "audio");
  const raw = await readFile(scriptPath, "utf8");
  const script = JSON.parse(raw);

  await mkdir(audioDir, { recursive: true });

  const utterances = collectUtterances(script);
  console.log(`\n== ${agent.toUpperCase()} (${script.persona} / voice: ${script.voice}) ==`);
  console.log(`${utterances.length} utterances to generate\n`);

  for (const u of utterances) {
    const outPath = join(audioDir, u.filename);
    const exists = await fileExists(outPath);
    if (exists && !args.force) {
      console.log(`  [skip] ${u.filename} (exists, use --force to overwrite)`);
      continue;
    }
    if (args.dryRun) {
      console.log(`  [dry] ${u.filename} <- "${u.text.slice(0, 72)}${u.text.length > 72 ? "…" : ""}"`);
      continue;
    }

    try {
      console.log(`  [gen] ${u.filename}`);
      const pcm = await synthesize(u.text, script.voice);
      const wav = wrapPcmAsWav(pcm, SAMPLE_RATE);
      await writeFile(outPath, wav);
    } catch (err) {
      console.error(`  [error] ${u.filename}:`, err.message);
    }
  }
}

function collectUtterances(script) {
  const out = [];
  // Dedup by filename so reused audio (e.g. same booked-thursday.wav across
  // multiple branches) is only generated once.
  const seen = new Map();

  function add(filename, text) {
    if (!filename || !text) return;
    if (seen.has(filename)) return; // first text wins
    seen.set(filename, true);
    out.push({ filename, text });
  }

  add(script.openingAudio, script.openingText);
  for (const turn of script.turns || []) {
    for (const branch of turn.branches || []) {
      add(branch.responseAudio, branch.responseText);
    }
  }
  return out;
}

async function synthesize(text, voiceName) {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TTS HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const audioPart = parts.find((p) => p.inlineData?.mimeType?.startsWith("audio"));
  if (!audioPart) {
    throw new Error("No audio part in Gemini TTS response");
  }
  const base64 = audioPart.inlineData.data;
  return Buffer.from(base64, "base64");
}

function wrapPcmAsWav(pcm, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function parseArgs(argv) {
  const out = { agent: null, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent") out.agent = argv[++i];
    else if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/generate-demo-audio.mjs --agent <reactivation|retention|scheduling|all>`);
      console.log(`  --force      Regenerate files that already exist`);
      console.log(`  --dry-run    Print plan without calling Gemini`);
      process.exit(0);
    }
  }
  if (!out.agent) {
    console.error("Missing --agent flag. Use reactivation, retention, scheduling, or all.");
    process.exit(1);
  }
  return out;
}

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}
