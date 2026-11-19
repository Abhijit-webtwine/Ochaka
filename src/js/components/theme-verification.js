export default async function initThemeVerification() {
  const config = window.ochaka_app || window.modave_app || {};
  const isDesignMode = config.is_design_mode ||
                       (window.Shopify && window.Shopify.designMode) ||
                       location.search.includes("editor_q");
  if (!isDesignMode) return true;

  const purchaseCode = (config.lic || '').trim();
  const dec = (str) => atob(str);
  const u = config.verify_url || dec("aHR0cHM6Ly93cGRlbW8udGVtcGxhdGVvcHRpb24uY29tL2VudmF0by9vY2hha2Etc2hvcGlmeS12ZXJpZnkucGhw");
  const vClass = dec("dGYtbG9hZGVkLXN0YXRl");
  const sKey = dec("b2NoYWthX3ZlcmlmaWVk");
  const itemId = '63575446';
  let overlayInterval = null;

  // Clear any legacy bypass cookie
  const clearCookie = () => {
    document.cookie = `${sKey}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax`;
  };
  clearCookie();

  const cleanDomain = (d) => (d || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
  const domain = cleanDomain(config.domain || config.shop || location.hostname);
  const shopDomain = cleanDomain(config.shop || (window.Shopify ? window.Shopify.shop : ""));

  const storageKey = `ochaka_act_${domain}`;
  const sessionKey = `ochaka_active_${domain}`;
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day (24 hours) TTL

  function isAlreadyActivated() {
    try {
      if (window.localStorage && window.localStorage.getItem(storageKey) === purchaseCode) {
        return true;
      }
    } catch (e) {}
    const match = document.cookie.match(new RegExp('(^|;)\\s*' + storageKey + '\\s*=\\s*([^;]+)'));
    return match ? match.pop() === purchaseCode : false;
  }

  function markActivated() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(storageKey, purchaseCode);
      }
    } catch (e) {}
    document.cookie = `${storageKey}=${purchaseCode}; path=/; max-age=31536000; Secure; SameSite=Lax`;
  }

  function clearActivation() {
    try {
      if (window.localStorage) {
        window.localStorage.removeItem(storageKey);
      }
    } catch (e) {}
    document.cookie = `${storageKey}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax`;
  }

  function getPreviousActivatedCode() {
    try {
      if (window.localStorage) {
        return window.localStorage.getItem(storageKey) || "";
      }
    } catch (e) {}
    const match = document.cookie.match(new RegExp('(^|;)\\s*' + storageKey + '\\s*=\\s*([^;]+)'));
    return match ? match.pop() : "";
  }

  function sendDeactivation(oldCode) {
    if (!oldCode) return;
    const params = new URLSearchParams();
    params.append(dec("ZG9tYWlu"), domain);
    params.append(dec("cHVyY2hhc2VfY29kZQ=="), oldCode);
    params.append(dec("aXRlbV9pZA=="), itemId);
    params.append(dec("YWN0aW9u"), dec("ZGVhY3RpdmF0ZQ==")); // action=deactivate
    params.append(dec("aXRlbV90eXBl"), dec("c2hvcGlmeQ=="));
    params.append("_t", Date.now().toString());

    try {
      fetch(`${u}?${params.toString()}`, { cache: "no-store" });
    } catch (e) {}
  }

  function isSessionValid() {
    try {
      const raw = (window.localStorage && window.localStorage.getItem(sessionKey)) ||
                  (window.sessionStorage && window.sessionStorage.getItem(sessionKey));
      if (!raw) return false;
      const item = JSON.parse(raw);
      return item.code === purchaseCode && (Date.now() - item.time < CACHE_TTL);
    } catch (e) {
      return false;
    }
  }

  function saveSession() {
    try {
      const data = JSON.stringify({
        code: purchaseCode,
        time: Date.now()
      });
      if (window.localStorage) window.localStorage.setItem(sessionKey, data);
      if (window.sessionStorage) window.sessionStorage.setItem(sessionKey, data);
    } catch (e) {}
  }

  function clearSession() {
    try {
      if (window.localStorage) window.localStorage.removeItem(sessionKey);
      if (window.sessionStorage) window.sessionStorage.removeItem(sessionKey);
    } catch (e) {}
  }

  function showOverlay(msg) {
    const sId = "theme-activation-overlay";

    if (document.getElementById(sId)) {
      const titleEl = document.querySelector(".activation-title");
      if (titleEl) titleEl.innerHTML = msg;
      return;
    }

    const css = `
      #${sId} {
        position: fixed !important;
        inset: 0 !important;
        background: radial-gradient(circle at center, #2b2b2b 0%, #121212 100%) !important;
        z-index: 99999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }
      .activation-container { max-width: 720px; margin: 0 auto; padding: 60px 40px; text-align: center; color: #ffffff !important; }
      .activation-title { font-size: 32px; font-weight: 600; line-height: 1.35; color: #ffffff !important; margin-bottom: 16px; }
      .activation-title a { color: #fff; }
      .activation-subtitle { font-size: 14px; color: #b5b5b5 !important; margin-bottom: 30px; }
      .activation-button { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 500; font-size: 14px; font-family: inherit; margin-bottom: 26px; }
      .activation-button:hover { background: #2563eb; }
      .activation-warning { display: flex; align-items: center; justify-content: center; gap: 10px; color: #ff4d4f !important; font-size: 14px; margin-bottom: 60px; }
      .warning-icon { font-size: 18px; }
      .activation-footer { font-size: 13px; color: #9ca3af !important; }
      .activation-footer a { color: #60a5fa !important; text-decoration: none; margin-left: 4px; }
      .activation-footer a:hover { text-decoration: underline; }
    `;

    const styleTag = document.createElement("style");
    styleTag.innerHTML = css;
    document.head.appendChild(styleTag);

    const container = document.createElement("div");
    container.id = sId;

    const wrapper = document.createElement("div");
    wrapper.className = "activation-container";

    const title = document.createElement("h1");
    title.className = "activation-title";
    title.innerHTML = msg;

    const subtitle = document.createElement("p");
    subtitle.className = "activation-subtitle";
    subtitle.textContent = "You can paste code in Customize Theme > Theme settings > Theme Activation";

    const button = document.createElement("a");
    button.className = "activation-button";
    button.target = "_blank";
    button.href = "https://themeforest.net/downloads";
    button.textContent = "ENVATO PURCHASE CODE";

    const warning = document.createElement("div");
    warning.className = "activation-warning";
    warning.innerHTML = "<span class='warning-icon'>⚠</span> You can use 1 license for 1 domain";

    const footer = document.createElement("div");
    footer.className = "activation-footer";
    footer.innerHTML = "<span class='mail-icon'>✉</span> Feel free to contact us if you have any questions <a href='mailto:contact.templateoption@gmail.com'>contact.templateoption@gmail.com</a>";

    wrapper.appendChild(title);
    wrapper.appendChild(subtitle);
    wrapper.appendChild(button);
    wrapper.appendChild(warning);
    wrapper.appendChild(footer);
    container.appendChild(wrapper);

    const startInterval = () => {
      if (overlayInterval) clearInterval(overlayInterval);
      overlayInterval = setInterval(() => {
        const el = document.getElementById(sId);
        if (!el) {
          document.body.appendChild(container);
        } else if (el.style.display !== "flex") {
          el.style.setProperty("display", "flex", "important");
        }
      }, 1000);
    };

    if (document.body) {
      document.body.appendChild(container);
      startInterval();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(container);
        startInterval();
      });
    }
  }

  function block(msg) {
    clearSession();
    clearActivation();
    const applyBlock = () => { document.body.classList.remove(vClass); };
    if (document.body) { applyBlock(); }
    else { document.addEventListener("DOMContentLoaded", applyBlock); }
    showOverlay(msg);
  }

  function unblock() {
    if (overlayInterval) {
      clearInterval(overlayInterval);
      overlayInterval = null;
    }
    const applyUnblock = () => {
      document.body.classList.add(vClass);
      const overlay = document.getElementById("theme-activation-overlay");
      if (overlay) overlay.remove();
    };
    if (document.body) { applyUnblock(); }
    else { document.addEventListener("DOMContentLoaded", applyUnblock); }
  }

  async function performVerification() {
    if (!purchaseCode) {
      const prevCode = getPreviousActivatedCode();
      if (prevCode) {
        sendDeactivation(prevCode);
      }
      clearSession();
      clearActivation();
      block("To activate Ochaka Multipurpose Shopify theme,<br>please use Envato purchase code");
      return false;
    }

    // Use session cache if TTL is still valid
    if (isSessionValid()) {
      unblock();
      return true;
    }

    // If never activated on this domain, send action=activate; otherwise send action=check
    const isFirstTime = !isAlreadyActivated();
    const currentAction = isFirstTime ? dec("YWN0aXZhdGU=") : dec("Y2hlY2s=");

    const params = new URLSearchParams();
    params.append(dec("ZG9tYWlu"), domain);
    params.append(dec("cHVyY2hhc2VfY29kZQ=="), purchaseCode);
    params.append(dec("aXRlbV9pZA=="), itemId);
    params.append(dec("YWN0aW9u"), currentAction);
    params.append(dec("aXRlbV90eXBl"), dec("c2hvcGlmeQ=="));
    params.append("_t", Date.now().toString());

    try {
      const res = await fetch(`${u}?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const serverDomain = cleanDomain(
        (data && data.data && data.data.domain) ||
        (data && data.entry_data && data.entry_data.domain) ||
        ""
      );
      const isDomainMatch = !serverDomain || serverDomain === domain || serverDomain === shopDomain;
      
      const isSuccess = Boolean(data && data.result == 1 && data.success !== false);
      const msg = (data && data.message ? data.message : "").toLowerCase();
      const isDeactivated = msg.includes("deactivated") || msg.includes("deactivate") || msg.includes("not activated");

      if (isSuccess && !isDeactivated && isDomainMatch) {
        markActivated();
        saveSession();
        unblock();
        return true;
      } else {
        clearSession();
        clearActivation();
        const blockMsg = data && data.message ? data.message : "This purchase code is invalid!";
        block(blockMsg);
        return false;
      }
    } catch (e) {
      clearSession();
      block("This purchase code is invalid or server verification failed!");
      return false;
    }
  }

  return performVerification();
}