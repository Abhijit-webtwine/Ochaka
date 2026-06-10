(async function () {
  const config = window.ochaka_app || {};
  const isDesignMode = config.is_design_mode ||
                       (window.Shopify && window.Shopify.designMode) ||
                       location.search.includes("editor_q");
  if (!isDesignMode) return;

  const purchaseCode = config.lic || '';
  const dec = (str) => atob(str);
  const u = dec("aHR0cHM6Ly93cGRlbW8udGVtcGxhdGVvcHRpb24uY29tL2VudmF0by9vY2hha2Etc2hvcGlmeS12ZXJpZnkucGhw");
  const vClass = dec("dGYtbG9hZGVkLXN0YXRl");
  const sKey = dec("b2NoYWthX3ZlcmlmaWVk");
  const itemId = 63575446;
  const saltA = "ochaka";
  const saltB = "theme";

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const getCookie = (n) => (document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)') || []).pop();

  function showOverlay(msg) {
    const sId = "theme-activation-overlay";

    // Overlay already exists — just update the title
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
      .activation-subtitle { font-size: 14px; color: #b5b5b5 !important; margin-bottom: 30px; }
      .activation-button { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 500; margin-bottom: 26px; }
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
      setInterval(() => {
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
    document.cookie = `${sKey}=false; path=/; max-age=604800; Secure; SameSite=Lax`;
    const applyBlock = () => { document.body.classList.remove(vClass); };
    if (document.body) { applyBlock(); }
    else { document.addEventListener("DOMContentLoaded", applyBlock); }
    showOverlay(msg);
  }

  function unblock(hashVal) {
    document.cookie = `${sKey}=${hashVal}; path=/; max-age=604800; Secure; SameSite=Lax`;
    const applyUnblock = () => {
      document.body.classList.add(vClass);
      const overlay = document.getElementById("theme-activation-overlay");
      if (overlay) overlay.remove();
    };
    if (document.body) { applyUnblock(); }
    else { document.addEventListener("DOMContentLoaded", applyUnblock); }
  }

  if (!purchaseCode) {
    block("To activate Ochaka Multipurpose Shopify theme,<br>please use Envato purchase code");
    return;
  }

  const partialHash = await sha256(purchaseCode + saltA);
  const expected = await sha256(partialHash + (config.domain || location.hostname) + saltB);

  if (getCookie(sKey) === expected) { unblock(expected); return; }

  const params = new URLSearchParams();
  params.append(dec("ZG9tYWlu"), config.domain || location.hostname);
  params.append(dec("cHVyY2hhc2VfY29kZQ=="), purchaseCode);
  params.append(dec("aXRlbV9pZA=="), itemId);
  params.append(dec("YWN0aW9u"), dec("YWN0aXZhdGU="));
  params.append(dec("aXRlbV90eXBl"), dec("c2hvcGlmeQ=="));

  fetch(`${u}?${params.toString()}`)
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => {
      const currentDomain = config.domain || location.hostname;
      const shopDomain = config.shop || (window.Shopify ? window.Shopify.shop : "");
      if (data && data.result == 1 && (
        data.data.domain === currentDomain ||
        data.data.domain === shopDomain
      )) {
        unblock(expected);
      } else {
        block(data && data.message ? data.message : "This purchase code is invalid!");
      }
    })
    .catch(() => { block("This purchase code is invalid!"); });
})();
