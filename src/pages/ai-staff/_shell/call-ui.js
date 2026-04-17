// Scripted voice call UI. Used by Mia, Jordan, Sam.
//
// Renders an iPhone-style incoming-call screen, accepts the call, plays
// pre-rendered TTS clips, shows a live transcript rail, and exposes 3
// response buttons per turn. No live LLM calls.
//
// Usage:
//   import { mountScriptedCall } from "/ai-staff/_shell/call-ui.js";
//   mountScriptedCall(containerEl, {
//     agent: "reactivation",
//     persona: "Jordan",
//     callerLabel: "YOUR Med Spa",
//     script: <loaded from script.json>,
//     audioBase: "/reactivation/audio/",
//     onEnd: ({ endingKey }) => showEndCard(endingKey),
//   });
//
// Script shape:
//   {
//     agent, voice, openingAudio, openingText,
//     turns: [{ id, branches: [{ label, responseAudio, responseText, nextTurn }] }],
//     endings: { [endingKey]: { proofPoint } }
//   }

import { trackEvent } from "./analytics.js";

export function mountScriptedCall(container, opts) {
  const {
    agent,
    persona,
    callerLabel,
    script,
    audioBase = "./audio/",
    onEnd,
    onSkip,
  } = opts;

  container.innerHTML = "";
  container.classList.add("ds-call-root");

  let state = "ringing"; // ringing | connected | ended
  let audioEl = null;
  let timerHandle = null;
  let elapsed = 0;
  const transcript = []; // { speaker: 'agent'|'patient', text }

  const ui = renderShell();
  container.appendChild(ui.root);
  trackEvent(agent, "demo_started");

  function renderShell() {
    const root = document.createElement("div");
    root.className = "ds-call";
    root.innerHTML = `
      <div class="ds-call-screen" data-state="ringing">
        <div class="ds-call-header">
          <div class="ds-call-caller">
            <div class="ds-call-avatar" aria-hidden="true">${persona[0]}</div>
            <div>
              <div class="ds-call-persona">${escapeHtml(persona)}</div>
              <div class="ds-call-org">${escapeHtml(callerLabel)}</div>
            </div>
          </div>
          <div class="ds-call-timer" data-timer>00:00</div>
        </div>

        <div class="ds-call-body">
          <div class="ds-call-status" data-status>Incoming call</div>
          <div class="ds-call-waveform" data-waveform>
            <span></span><span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="ds-call-transcript" data-transcript role="log" aria-live="polite"></div>
        </div>

        <div class="ds-call-controls" data-controls>
          <button type="button" class="ds-call-accept" data-accept>Accept</button>
        </div>

        <div class="ds-call-branches" data-branches hidden></div>
      </div>
    `;
    return { root };
  }

  const screen = ui.root.querySelector(".ds-call-screen");
  const statusEl = ui.root.querySelector("[data-status]");
  const timerEl = ui.root.querySelector("[data-timer]");
  const transcriptEl = ui.root.querySelector("[data-transcript]");
  const controls = ui.root.querySelector("[data-controls]");
  const branchesEl = ui.root.querySelector("[data-branches]");

  ui.root.querySelector("[data-accept]").addEventListener("click", accept);

  function accept() {
    if (state !== "ringing") return;
    state = "connected";
    screen.dataset.state = "connected";
    statusEl.textContent = "Connected";
    controls.hidden = true;
    startTimer();
    trackEvent(agent, "demo_opened");
    playOpening();
  }

  function endCall(endingKey = "ended") {
    if (state === "ended") return;
    state = "ended";
    stopTimer();
    screen.dataset.state = "ended";
    statusEl.textContent = "Call ended";
    branchesEl.hidden = true;
    if (typeof onEnd === "function") onEnd({ endingKey, transcript });
  }

  function startTimer() {
    elapsed = 0;
    timerHandle = setInterval(() => {
      elapsed++;
      const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const s = String(elapsed % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  async function playOpening() {
    await playAgentLine({
      audio: script.openingAudio,
      text: script.openingText,
    });
    showBranches(script.turns[0]);
    currentTurnId = script.turns[0].id;
  }

  async function playAgentLine({ audio, text }) {
    transcript.push({ speaker: "agent", text });
    appendTranscriptLine("agent", text, persona);
    await playAudio(audio);
  }

  function playAudio(filename) {
    return new Promise((resolve) => {
      if (!filename) { resolve(); return; }
      // Graceful fallback: if audio fails to load or play, continue silently.
      audioEl = new Audio(audioBase + filename);
      audioEl.addEventListener("ended", () => { audioEl = null; resolve(); });
      audioEl.addEventListener("error", () => { audioEl = null; resolve(); });
      audioEl.play().catch(() => { audioEl = null; resolve(); });
    });
  }

  function appendTranscriptLine(speaker, text, label) {
    const row = document.createElement("div");
    row.className = `ds-transcript-row ds-transcript-${speaker}`;
    row.innerHTML = `
      <span class="ds-transcript-speaker">${escapeHtml(label || (speaker === "agent" ? "Agent" : "You"))}</span>
      <span class="ds-transcript-text">${escapeHtml(text)}</span>
    `;
    transcriptEl.appendChild(row);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function showBranches(turn) {
    branchesEl.hidden = false;
    branchesEl.innerHTML = "";
    const turnIndex = script.turns.findIndex((t) => t.id === turn.id);
    turn.branches.forEach((branch, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ds-branch";
      btn.textContent = branch.label;
      btn.addEventListener("click", () => chooseBranch(turn, branch, turnIndex));
      branchesEl.appendChild(btn);
    });
  }

  async function chooseBranch(turn, branch, turnIndex) {
    branchesEl.hidden = true;
    branchesEl.innerHTML = "";
    transcript.push({ speaker: "patient", text: branch.label });
    appendTranscriptLine("patient", branch.label, "You");
    trackEvent(agent, "turn_branched", {
      turn_index: turnIndex,
      branch_chosen: branch.label,
    });

    await playAgentLine({ audio: branch.responseAudio, text: branch.responseText });

    if (branch.nextTurn && branch.nextTurn.startsWith("end-")) {
      endCall(branch.nextTurn);
      return;
    }
    const nextTurn = script.turns.find((t) => t.id === branch.nextTurn);
    if (!nextTurn) {
      endCall("ended");
      return;
    }
    currentTurnId = nextTurn.id;
    showBranches(nextTurn);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
