// Reusable skip control. Fires a demo_skipped analytics event and calls
// the provided onSkip handler.
//
// Usage:
//   import { mountSkipButton } from "/ai-staff/_shell/skip-button.js";
//   mountSkipButton(containerEl, { agent: "prior-auth", onSkip: () => showEndCard() });

import { trackEvent } from "./analytics.js";

export function mountSkipButton(container, { agent, onSkip, label = "Skip to result" } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ds-skip";
  btn.textContent = label;
  btn.setAttribute("aria-label", label);
  btn.addEventListener("click", () => {
    trackEvent(agent, "demo_skipped");
    if (typeof onSkip === "function") onSkip();
  });
  container.appendChild(btn);
  return btn;
}
