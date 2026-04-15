// Front Desk (Katie) widget orchestration.
// Exposes `mountFrontDeskWidget(el, opts)` that renders into `el`.
// Works in two form factors:
//   - compact: the homepage hero companion card
//   - full:    the /demo/front-desk dedicated page

import { KATIE_CONFIG } from "./config.js";
import { GeminiLiveAPI, ResponseType } from "./gemini-live.js";
import { AudioStreamer, AudioPlayer } from "./audio-io.js";
import { CheckAvailabilityTool, BookConsultTool } from "./tools.js";

export function mountFrontDeskWidget(el, opts = {}) {
  const { variant = "compact" } = opts;

  const ui = renderShell(el, variant);
  const state = {
    client: null,
    streamer: null,
    player: null,
    active: false,
    startedAt: 0,
    softWrapTimer: null,
    hardStopTimer: null,
    transcript: [], // {role:"user"|"katie"|"tool"|"system", text, id}
    currentUtter: { role: null, id: null, text: "" },
  };

  ui.primary.addEventListener("click", async () => {
    if (state.active) {
      endCall("user_ended");
    } else {
      await startCall();
    }
  });

  ui.textSend.addEventListener("click", () => {
    const text = ui.textInput.value.trim();
    if (!text) return;
    if (!state.client?.connected) return;
    addLine("user", text);
    state.client.sendTextMessage(text);
    ui.textInput.value = "";
  });
  ui.textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ui.textSend.click();
  });

  ui.textToggle.addEventListener("click", () => {
    ui.root.classList.toggle("fd-text-open");
    ui.textInput.focus();
  });

  async function startCall() {
    try {
      ui.setStatus("connecting");
      ui.setPrimary({ label: "Connecting...", busy: true });

      // 1. token
      const r = await fetch(KATIE_CONFIG.apiBase + "/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "token_failed" }));
        throw new Error(err.error || "token_failed");
      }
      const { token } = await r.json();

      // 2. client
      state.client = new GeminiLiveAPI(token, KATIE_CONFIG.model);
      state.client.voiceName = KATIE_CONFIG.voice;
      state.client.temperature = KATIE_CONFIG.temperature;
      state.client.systemInstructions = KATIE_CONFIG.systemPrompt;
      state.client.inputAudioTranscription = true;
      state.client.outputAudioTranscription = true;

      const availabilityTool = new CheckAvailabilityTool(onToolEvent);
      const bookTool = new BookConsultTool(availabilityTool, onToolEvent);
      state.client.addFunction(availabilityTool);
      state.client.addFunction(bookTool);

      state.client.onOpen = () => ui.setStatus("listening");
      state.client.onClose = () => endCall("connection_closed");
      state.client.onError = () => endCall("error");
      state.client.onReceiveResponse = onResponse;

      state.client.connect();

      // 3. audio
      state.player = new AudioPlayer();
      await state.player.init();
      state.streamer = new AudioStreamer(state.client);
      await state.streamer.start();

      // 4. timers
      state.active = true;
      state.startedAt = Date.now();
      state.softWrapTimer = setTimeout(() => {
        state.client?.sendTextMessage("(system) Session ending in 30 seconds. Wrap gracefully.");
      }, KATIE_CONFIG.softWrapMs);
      state.hardStopTimer = setTimeout(() => endCall("time_up"), KATIE_CONFIG.maxSessionMs);

      ui.setPrimary({ label: "End call", busy: false, active: true });
    } catch (e) {
      console.error(e);
      ui.setStatus("error");
      ui.setPrimary({ label: "Start call", busy: false });
      ui.setBanner(friendlyError(e?.message));
    }
  }

  function endCall(reason) {
    if (!state.active && !state.client) return;
    state.active = false;
    clearTimeout(state.softWrapTimer);
    clearTimeout(state.hardStopTimer);
    try { state.streamer?.stop(); } catch {}
    try { state.player?.destroy(); } catch {}
    try { state.client?.disconnect(); } catch {}
    state.streamer = null;
    state.player = null;
    state.client = null;

    ui.setStatus("ended");
    ui.setPrimary({ label: "Start call", busy: false, active: false });
    if (reason === "time_up") ui.setBanner("Call ended at the 4-minute limit.");
    if (reason === "error") ui.setBanner("Something went wrong. Please try again.");
  }

  function onResponse(message) {
    switch (message.type) {
      case ResponseType.SETUP_COMPLETE:
        ui.setStatus("listening");
        break;
      case ResponseType.AUDIO:
        state.player?.play(message.data);
        ui.setStatus("speaking");
        break;
      case ResponseType.INPUT_TRANSCRIPTION:
        appendTranscript("user", message.data.text);
        if (message.data.finished) finalizeUtter();
        break;
      case ResponseType.OUTPUT_TRANSCRIPTION:
        appendTranscript("katie", message.data.text);
        if (message.data.finished) finalizeUtter();
        break;
      case ResponseType.TEXT:
        addLine("katie", message.data);
        break;
      case ResponseType.TURN_COMPLETE:
        finalizeUtter();
        ui.setStatus("listening");
        break;
      case ResponseType.INTERRUPTED:
        state.player?.interrupt();
        break;
      case ResponseType.TOOL_CALL: {
        const calls = message.data.functionCalls || [];
        (async () => {
          const responses = [];
          for (const c of calls) {
            try {
              const result = await state.client.callFunction(c.name, c.args);
              responses.push({ id: c.id, name: c.name, response: { result: result ?? "ok" } });
            } catch (err) {
              responses.push({ id: c.id, name: c.name, response: { error: String(err?.message ?? err) } });
            }
          }
          state.client?.sendToolResponse(responses);
        })();
        break;
      }
    }
  }

  function appendTranscript(role, text) {
    if (!text) return;
    if (state.currentUtter.role === role) {
      state.currentUtter.text += text;
      ui.updateLine(state.currentUtter.id, state.currentUtter.text);
    } else {
      const id = addLine(role, text);
      state.currentUtter = { role, id, text };
    }
  }

  function finalizeUtter() {
    state.currentUtter = { role: null, id: null, text: "" };
  }

  function onToolEvent(ev) {
    const label = ev.status === "ok"
      ? `${ev.name} → ${ev.result ?? "ok"}`
      : ev.status === "error"
      ? `${ev.name} → error`
      : `${ev.name} …`;
    addLine("tool", label);
  }

  function addLine(role, text) {
    return ui.addLine(role, text);
  }

  return { endCall };
}

function renderShell(el, variant) {
  el.classList.add("fd-root", `fd-variant-${variant}`);
  el.innerHTML = `
    <div class="fd-card">
      <div class="fd-header">
        <div class="fd-avatar">
          <div class="fd-avatar-ring"></div>
          <div class="fd-avatar-dot" data-fd-status="idle"></div>
        </div>
        <div class="fd-title">
          <div class="fd-name">Katie</div>
          <div class="fd-role">Ask me anything about AI staff</div>
        </div>
        <div class="fd-status-pill" role="status" aria-live="polite">Ready</div>
      </div>
      <p class="fd-desc">Learn what AI staff do for practices like yours. Or book 15 minutes with Anthony.</p>
      <button class="fd-primary" type="button" aria-label="Ask Katie a question about ZxAI">
        <svg class="fd-mic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19v3"/><path d="M8 22h8"/><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/></svg>
        <span class="fd-primary-label">Ask Katie a question</span>
      </button>
      <div class="fd-banner" hidden></div>
      <div class="fd-text-row">
        <span class="fd-mode-hint">Voice or text</span>
        <button class="fd-text-toggle" type="button">Type instead</button>
      </div>
      <div class="fd-text-input-row">
        <input class="fd-text-input" type="text" placeholder="Type a question about AI staff..." />
        <button class="fd-text-send" type="button">Send</button>
      </div>
      <div class="fd-transcript" aria-live="polite"></div>
      <div class="fd-footer">
        <span>Live AI voice</span>
        <button class="fd-disclose" type="button">Privacy</button>
      </div>
    </div>
  `;

  const root = el;
  const primary = el.querySelector(".fd-primary");
  const primaryLabel = el.querySelector(".fd-primary-label");
  const statusPill = el.querySelector(".fd-status-pill");
  const statusDot = el.querySelector(".fd-avatar-dot");
  const transcript = el.querySelector(".fd-transcript");
  const banner = el.querySelector(".fd-banner");
  const textToggle = el.querySelector(".fd-text-toggle");
  const textInput = el.querySelector(".fd-text-input");
  const textSend = el.querySelector(".fd-text-send");
  const disclose = el.querySelector(".fd-disclose");

  disclose.addEventListener("click", () => {
    setBanner(
      "Live voice with Gemini. Your mic can be stopped anytime. We keep only the booking you confirm; audio is not stored."
    );
  });

  function setStatus(s) {
    const labels = {
      idle: "Ready",
      connecting: "Connecting",
      listening: "Listening",
      speaking: "Speaking",
      ended: "Call ended",
      error: "Error",
    };
    statusDot.dataset.fdStatus = s;
    statusPill.textContent = labels[s] ?? s;
  }
  function setPrimary({ label, busy, active }) {
    primaryLabel.textContent = label;
    primary.classList.toggle("is-busy", !!busy);
    primary.classList.toggle("is-active", !!active);
  }
  function setBanner(text) {
    if (!text) {
      banner.hidden = true;
      banner.textContent = "";
      return;
    }
    banner.hidden = false;
    banner.textContent = text;
  }
  function addLine(role, text) {
    const line = document.createElement("div");
    line.className = `fd-line fd-line-${role}`;
    const who = document.createElement("span");
    who.className = "fd-who";
    who.textContent = role === "katie" ? "Katie" : role === "user" ? "You" : role === "tool" ? "→" : "•";
    const body = document.createElement("span");
    body.className = "fd-body";
    body.textContent = text;
    line.append(who, body);
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;
    const id = `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    line.dataset.id = id;
    return id;
  }
  function updateLine(id, text) {
    if (!id) return;
    const line = transcript.querySelector(`[data-id="${id}"] .fd-body`);
    if (line) {
      line.textContent = text;
      transcript.scrollTop = transcript.scrollHeight;
    }
  }

  return { root, primary, primaryLabel, statusPill, textToggle, textInput, textSend, setStatus, setPrimary, setBanner, addLine, updateLine };
}

function friendlyError(msg) {
  if (!msg) return "Could not start the call. Please try again.";
  if (msg.includes("demo_disabled")) return "The demo is paused right now. Please try again later.";
  if (msg.includes("rate_limited")) return "You've hit the per-visitor limit for today. Come back tomorrow.";
  if (msg.includes("daily_cap_reached")) return "The demo has hit its daily cap. Come back tomorrow.";
  if (msg.includes("turnstile")) return "Bot check failed. Refresh the page and try again.";
  if (msg.includes("NotAllowedError") || msg.includes("Permission"))
    return "Microphone permission was blocked. Allow mic access and try again.";
  return msg;
}
