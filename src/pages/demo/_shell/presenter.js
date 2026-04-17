// Presenter Mode.
// URL flag `?presenter=1&practice=Foo+Med+Spa&provider=Dr.+Kim` triggers a
// client-side string swap across the entire demo page. No server round trip,
// no LLM cost. Pre-rendered TTS audio is NOT swapped; Anthony narrates over it.
//
// Usage:
//   import { initPresenterMode } from "/demo/_shell/presenter.js";
//   initPresenterMode();  // call as early as possible after DOMContentLoaded

const DEFAULT_PRACTICE_TOKENS = [
  "YOUR Practice",
  "YOUR Med Spa",
  "YOUR Concierge",
];
const DEFAULT_PROVIDER_TOKEN = "Dr. Reeves";

export function parsePresenterParams() {
  const params = new URLSearchParams(window.location.search);
  const active = params.get("presenter") === "1";
  return {
    active,
    practice: params.get("practice") || null,
    provider: params.get("provider") || null,
  };
}

export function initPresenterMode(root = document.body) {
  const { active, practice, provider } = parsePresenterParams();
  if (!active) return { active: false };

  if (practice) {
    swapTokens(root, DEFAULT_PRACTICE_TOKENS, practice);
  }
  if (provider) {
    swapTokens(root, [DEFAULT_PROVIDER_TOKEN], provider);
  }

  showPresenterBar(practice, provider);
  return { active: true, practice, provider };
}

function swapTokens(root, tokens, replacement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue && tokens.some((t) => node.nodeValue.includes(t))) {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }
  for (const n of textNodes) {
    let v = n.nodeValue;
    for (const t of tokens) {
      v = v.split(t).join(replacement);
    }
    n.nodeValue = v;
  }

  // Also swap in visible form fields and aria-labels.
  const attrSelectors = root.querySelectorAll("[aria-label], [title], [placeholder], [alt]");
  attrSelectors.forEach((el) => {
    ["aria-label", "title", "placeholder", "alt"].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (!val) return;
      let next = val;
      for (const t of tokens) {
        if (next.includes(t)) next = next.split(t).join(replacement);
      }
      if (next !== val) el.setAttribute(attr, next);
    });
  });
}

function showPresenterBar(practice, provider) {
  if (document.getElementById("ds-presenter-bar")) return;
  const bar = document.createElement("div");
  bar.id = "ds-presenter-bar";
  bar.setAttribute("role", "status");
  bar.innerHTML = `
    <span class="ds-presenter-dot"></span>
    <span class="ds-presenter-label">Presenter Mode</span>
    ${practice ? `<span class="ds-presenter-meta">practice: <strong>${escapeHtml(practice)}</strong></span>` : ""}
    ${provider ? `<span class="ds-presenter-meta">provider: <strong>${escapeHtml(provider)}</strong></span>` : ""}
  `;
  document.body.prepend(bar);
  document.body.classList.add("ds-has-presenter-bar");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
