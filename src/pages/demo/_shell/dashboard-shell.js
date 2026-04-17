// Dashboard shell for visual demos (Prior Auth, Revenue Recovery, Reputation,
// Marketing, Web/SEO). Provides consistent header, content slot, skip button,
// and end-card mount point.
//
// Usage:
//   import { mountDashboard } from "/demo/_shell/dashboard-shell.js";
//   const { contentEl, endCardEl, finish } = mountDashboard(rootEl, {
//     agent: "prior-auth",
//     title: "Prior Auth Agent",
//     subtitle: "Files. Follows up. Wins approvals in days, not weeks.",
//     onReplay: () => rerun(),
//   });
//   // render your demo inside contentEl
//   // when done: finish({ proofPoint, ctaLabel, ctaHref })

import { mountSkipButton } from "./skip-button.js";
import { renderEndCard } from "./end-card.js";
import { trackEvent } from "./analytics.js";

export function mountDashboard(root, opts) {
  const { agent, title, subtitle, onReplay, onSkip } = opts;
  root.classList.add("ds-dashboard");
  root.innerHTML = `
    <header class="ds-dashboard-header">
      <div>
        <h2 class="ds-dashboard-title"></h2>
        <p class="ds-dashboard-subtitle"></p>
      </div>
      <div class="ds-dashboard-actions" data-actions></div>
    </header>
    <section class="ds-dashboard-content" data-content></section>
    <section class="ds-dashboard-end" data-end hidden></section>
  `;
  root.querySelector(".ds-dashboard-title").textContent = title || "";
  root.querySelector(".ds-dashboard-subtitle").textContent = subtitle || "";

  const contentEl = root.querySelector("[data-content]");
  const endCardEl = root.querySelector("[data-end]");
  const actionsEl = root.querySelector("[data-actions]");

  mountSkipButton(actionsEl, {
    agent,
    onSkip: () => {
      if (typeof onSkip === "function") onSkip();
    },
  });

  trackEvent(agent, "demo_started");

  function finish(endOpts = {}) {
    contentEl.hidden = true;
    endCardEl.hidden = false;
    renderEndCard(endCardEl, {
      agent,
      proofPoint: endOpts.proofPoint,
      ctaLabel: endOpts.ctaLabel,
      ctaHref: endOpts.ctaHref,
      secondaryLabel: "Try another agent",
      secondaryHref: "/demo/",
      onReplay: onReplay
        ? () => {
            contentEl.hidden = false;
            endCardEl.hidden = true;
            endCardEl.innerHTML = "";
            onReplay();
          }
        : null,
    });
  }

  return { contentEl, endCardEl, finish };
}
