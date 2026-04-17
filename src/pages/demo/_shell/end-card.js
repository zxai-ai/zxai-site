// End card. Renders the sales proof point and primary CTA after a demo
// completes. Fires demo_completed and cta_clicked analytics events.
//
// Usage:
//   import { renderEndCard } from "/demo/_shell/end-card.js";
//   renderEndCard(containerEl, {
//     agent: "reactivation",
//     proofPoint: "That patient is worth $332 on average...",
//     ctaLabel: "Book 15 minutes with Anthony",
//     ctaHref: "https://calendar.app.google/jF4TiJNkzXP8DE8n9",
//     secondaryLabel: "Try another demo",
//     secondaryHref: "/demo/",
//     onReplay: () => restart(),
//   });

import { trackEvent } from "./analytics.js";

const DEFAULT_CTA = {
  label: "Book 15 minutes with Anthony",
  href: "https://calendar.app.google/jF4TiJNkzXP8DE8n9",
};

export function renderEndCard(container, opts) {
  const agent = opts.agent;
  const proofPoint = opts.proofPoint || "";
  const ctaLabel = opts.ctaLabel || DEFAULT_CTA.label;
  const ctaHref = opts.ctaHref || DEFAULT_CTA.href;
  const secondaryLabel = opts.secondaryLabel;
  const secondaryHref = opts.secondaryHref;
  const onReplay = opts.onReplay;

  trackEvent(agent, "demo_completed");

  container.innerHTML = "";
  const card = document.createElement("div");
  card.className = "ds-end-card";
  card.setAttribute("role", "region");
  card.setAttribute("aria-label", "Demo complete");
  card.innerHTML = `
    <div class="ds-end-badge">Demo complete</div>
    <p class="ds-end-proof"></p>
    <div class="ds-end-actions">
      <a class="ds-cta ds-cta-primary" href="${escapeAttr(ctaHref)}" target="_blank" rel="noopener"></a>
      ${secondaryHref ? `<a class="ds-cta ds-cta-secondary" href="${escapeAttr(secondaryHref)}"></a>` : ""}
      ${onReplay ? `<button type="button" class="ds-cta ds-cta-ghost" data-replay>Replay</button>` : ""}
    </div>
  `;
  card.querySelector(".ds-end-proof").textContent = proofPoint;
  card.querySelector(".ds-cta-primary").textContent = ctaLabel;
  if (secondaryHref) card.querySelector(".ds-cta-secondary").textContent = secondaryLabel || "Try another demo";

  card.querySelector(".ds-cta-primary").addEventListener("click", () => {
    trackEvent(agent, "cta_clicked", { cta: "primary", href: ctaHref });
  });
  if (secondaryHref) {
    card.querySelector(".ds-cta-secondary").addEventListener("click", () => {
      trackEvent(agent, "cta_clicked", { cta: "secondary", href: secondaryHref });
    });
  }
  const replayBtn = card.querySelector("[data-replay]");
  if (replayBtn && typeof onReplay === "function") {
    replayBtn.addEventListener("click", () => {
      trackEvent(agent, "replay");
      onReplay();
    });
  }

  container.appendChild(card);
  return card;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
