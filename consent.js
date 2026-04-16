// ZxAI Cookie Consent + Pixel Loader
// Handles GDPR opt-in, CCPA opt-out, GPC signal, and consent-gated pixel loading.
// Drop <script src="/consent.js" defer></script> in every page <head>.

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Config -- update pixel IDs here when new ones are added
  // ---------------------------------------------------------------------------
  var GOOGLE_ADS_ID = "AW-2635997892";
  // Meta Pixel is now installed directly in each HTML page's <head> (raw snippet),
  // not loaded via this consent gate. Leave blank here to avoid double-firing.
  var META_PIXEL_ID = "";
  var META_TEST_EVENT_CODE = "";

  var CONSENT_COOKIE = "zxai_consent";
  var CONSENT_DAYS   = 365;

  // ---------------------------------------------------------------------------
  // Cookie helpers
  // ---------------------------------------------------------------------------
  function getCookie(name) {
    var match = document.cookie.split("; ").find(function (c) {
      return c.startsWith(name + "=");
    });
    return match ? match.split("=")[1] : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + "=" + value + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  // ---------------------------------------------------------------------------
  // Global Privacy Control
  // GPC signal = automatic opt-out from advertising. Honor before anything fires.
  // ---------------------------------------------------------------------------
  function gpcActive() {
    return navigator.globalPrivacyControl === true;
  }

  // ---------------------------------------------------------------------------
  // Pixel loaders -- only called after consent
  // ---------------------------------------------------------------------------
  function loadGoogleAds() {
    if (!GOOGLE_ADS_ID) return;
    // Load gtag if not already present (GA4 may have already loaded it)
    if (!window.gtag) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_ADS_ID;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
    }
    window.gtag("config", GOOGLE_ADS_ID);
    // Remarketing tag
    window.gtag("event", "conversion", {
      send_to: GOOGLE_ADS_ID,
      allow_enhanced_conversions: true
    });
  }

  function loadMetaPixel() {
    if (!META_PIXEL_ID) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,"script","https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", META_PIXEL_ID);
    if (META_TEST_EVENT_CODE) {
      window.fbq("track", "PageView", {}, { test_event_code: META_TEST_EVENT_CODE });
    } else {
      window.fbq("track", "PageView");
    }
  }

  function loadAdvertisingPixels() {
    loadGoogleAds();
    loadMetaPixel();
  }

  // ---------------------------------------------------------------------------
  // Consent banner UI
  // ---------------------------------------------------------------------------
  var BANNER_ID = "zxai-consent-banner";

  function removeBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById(BANNER_ID)) return;

    var banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.style.cssText = [
      "position:fixed",
      "bottom:0",
      "left:0",
      "right:0",
      "z-index:99999",
      "background:#0d1117",
      "border-top:1px solid rgba(6,182,212,0.25)",
      "padding:16px 24px",
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:16px",
      "flex-wrap:wrap",
      "font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif",
      "font-size:13px",
      "color:rgba(255,255,255,0.75)",
      "line-height:1.5",
    ].join(";");

    var text = document.createElement("p");
    text.style.cssText = "margin:0;flex:1;min-width:240px;";
    text.innerHTML =
      "We use cookies for analytics and advertising. " +
      "See our <a href='/privacy-policy' style='color:#06B6D4;text-decoration:underline;'>Privacy Policy</a> " +
      "for details. You can change your preference at any time.";

    var btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;gap:10px;flex-shrink:0;";

    var btnDecline = document.createElement("button");
    btnDecline.textContent = "Decline";
    btnDecline.style.cssText = [
      "padding:8px 18px",
      "border-radius:6px",
      "border:1px solid rgba(255,255,255,0.2)",
      "background:transparent",
      "color:rgba(255,255,255,0.65)",
      "font-size:13px",
      "font-weight:500",
      "cursor:pointer",
      "transition:border-color 0.2s,color 0.2s",
    ].join(";");
    btnDecline.addEventListener("mouseenter", function () {
      btnDecline.style.borderColor = "rgba(255,255,255,0.5)";
      btnDecline.style.color = "#fff";
    });
    btnDecline.addEventListener("mouseleave", function () {
      btnDecline.style.borderColor = "rgba(255,255,255,0.2)";
      btnDecline.style.color = "rgba(255,255,255,0.65)";
    });

    var btnAccept = document.createElement("button");
    btnAccept.textContent = "Accept";
    btnAccept.style.cssText = [
      "padding:8px 18px",
      "border-radius:6px",
      "border:1px solid #06B6D4",
      "background:#06B6D4",
      "color:#060B18",
      "font-size:13px",
      "font-weight:600",
      "cursor:pointer",
      "transition:background 0.2s,border-color 0.2s",
    ].join(";");
    btnAccept.addEventListener("mouseenter", function () {
      btnAccept.style.background = "#22d3ee";
      btnAccept.style.borderColor = "#22d3ee";
    });
    btnAccept.addEventListener("mouseleave", function () {
      btnAccept.style.background = "#06B6D4";
      btnAccept.style.borderColor = "#06B6D4";
    });

    btnDecline.addEventListener("click", function () {
      setCookie(CONSENT_COOKIE, "declined", CONSENT_DAYS);
      removeBanner();
    });

    btnAccept.addEventListener("click", function () {
      setCookie(CONSENT_COOKIE, "accepted", CONSENT_DAYS);
      removeBanner();
      loadAdvertisingPixels();
    });

    btnWrap.appendChild(btnDecline);
    btnWrap.appendChild(btnAccept);
    banner.appendChild(text);
    banner.appendChild(btnWrap);
    document.body.appendChild(banner);

    // Keyboard focus trap -- Escape closes (as decline)
    banner.addEventListener("keydown", function (e) {
      if (e.key === "Escape") btnDecline.click();
    });
    btnDecline.focus();
  }

  // ---------------------------------------------------------------------------
  // Cookie Preferences link -- wire up any element with data-cookie-prefs attr
  // ---------------------------------------------------------------------------
  function wirePrefsLinks() {
    document.querySelectorAll("[data-cookie-prefs]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        setCookie(CONSENT_COOKIE, "", -1); // clear consent
        showBanner();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    // Honor GPC -- treat as declined without showing banner
    if (gpcActive()) {
      setCookie(CONSENT_COOKIE, "declined", CONSENT_DAYS);
      wirePrefsLinks();
      return;
    }

    var existing = getCookie(CONSENT_COOKIE);

    if (existing === "accepted") {
      loadAdvertisingPixels();
    } else if (existing === "declined") {
      // already declined, do nothing
    } else {
      // No prior choice -- show banner
      showBanner();
    }

    wirePrefsLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
