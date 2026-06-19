(() => {
  "use strict";

  const UI_STORAGE_KEY = "threadsme.ui.simpleMode";
  const SESSION_STORAGE_KEY = "threadsme.auth.sessionToken";
  const MOBILE_BREAKPOINT = 860;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // UI preference storage is optional.
    }
  }

  function getSessionToken() {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function getApiUrl() {
    return String(window.THREADSME_CONFIG?.apiUrl || window.location.origin).replace(/\/+$/, "");
  }

  function notify(message, tone = "info") {
    const notice = makeElement("div", `tm-ui-notice ${tone}`, message);
    notice.setAttribute("role", tone === "error" ? "alert" : "status");
    document.body.append(notice);
    window.requestAnimationFrame(() => notice.classList.add("visible"));
    window.setTimeout(() => {
      notice.classList.remove("visible");
      window.setTimeout(() => notice.remove(), 220);
    }, tone === "error" ? 5200 : 3200);
  }

  function buildAuthHeaders(csrfToken = "") {
    const headers = new Headers({ "content-type": "application/json" });
    const sessionToken = getSessionToken();
    if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);
    if (csrfToken) headers.set("x-threadsme-csrf", csrfToken);
    return headers;
  }

  async function readAuthStatus() {
    const headers = new Headers();
    const sessionToken = getSessionToken();
    if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);
    const response = await fetch(`${getApiUrl()}/api/auth/status`, {
      credentials: "include",
      cache: "no-store",
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Sesi admin tidak dapat disahkan.");
    if (data.authRequired && !data.authenticated) throw new Error("Sesi admin tamat. Login semula sebelum refresh Product Intel.");
    return data;
  }

  function activeNavigation() {
    return document.querySelector(".nav-item.active") || document.querySelector(".nav-item");
  }

  function navigationLabel(navItem) {
    return navItem?.querySelector("strong")?.textContent?.trim() || "ThreadsMe";
  }

  function navigationHint(navItem) {
    return navItem?.querySelector("small")?.textContent?.trim() || "Papan operasi";
  }

  function closeMobileDrawer() {
    document.body.classList.remove("tm-nav-open");
    document.querySelector("#tmMobileMenuButton")?.setAttribute("aria-expanded", "false");
  }

  function buildMobileNavigation(navItems) {
    const sideMenu = document.querySelector(".side-menu");
    const shell = document.querySelector(".system-shell");
    if (!sideMenu || !shell || !navItems.length || document.querySelector(".tm-mobile-topbar")) return;

    sideMenu.classList.add("tm-navigation-drawer");

    const topbar = makeElement("header", "tm-mobile-topbar");
    const menuButton = makeElement("button", "tm-mobile-menu-button", "Menu");
    menuButton.id = "tmMobileMenuButton";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Buka menu ThreadsMe");
    menuButton.setAttribute("aria-controls", "tmNavigationDrawer");
    menuButton.setAttribute("aria-expanded", "false");
    sideMenu.id = "tmNavigationDrawer";

    const titleWrap = makeElement("div", "tm-mobile-title");
    const title = makeElement("strong", "", "ThreadsMe");
    const subtitle = makeElement("span", "", "Papan operasi");
    titleWrap.append(title, subtitle);

    const pulse = makeElement("span", "tm-mobile-pulse", "Pending 0/25");
    topbar.append(menuButton, titleWrap, pulse);
    document.body.insertBefore(topbar, shell);

    const backdrop = makeElement("button", "tm-nav-backdrop");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Tutup menu ThreadsMe");
    document.body.append(backdrop);

    const bottomNav = makeElement("nav", "tm-bottom-nav");
    bottomNav.setAttribute("aria-label", "Navigasi pantas ThreadsMe");
    navItems.forEach((navItem) => {
      const button = makeElement("button", "tm-bottom-nav-item");
      button.type = "button";
      button.dataset.viewTarget = navItem.dataset.viewTarget || "";
      const mark = makeElement("span", "", navItem.querySelector(":scope > span")?.textContent?.trim() || navigationLabel(navItem).charAt(0));
      mark.setAttribute("aria-hidden", "true");
      const label = makeElement("strong", "", navigationLabel(navItem));
      button.append(mark, label);
      button.addEventListener("click", () => {
        navItem.click();
        closeMobileDrawer();
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      });
      bottomNav.append(button);
    });
    document.body.append(bottomNav);

    menuButton.addEventListener("click", () => {
      const open = !document.body.classList.contains("tm-nav-open");
      document.body.classList.toggle("tm-nav-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
    });
    backdrop.addEventListener("click", closeMobileDrawer);
    window.addEventListener("resize", () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) closeMobileDrawer();
    });

    const updateNavigationState = () => {
      const active = activeNavigation();
      title.textContent = navigationLabel(active);
      subtitle.textContent = navigationHint(active);
      bottomNav.querySelectorAll(".tm-bottom-nav-item").forEach((button) => {
        const current = button.dataset.viewTarget === active?.dataset.viewTarget;
        button.classList.toggle("active", current);
        if (current) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      const pending = document.querySelector("#pendingPosts")?.textContent?.trim() || "0";
      const blocked = document.querySelector("#blockedPosts")?.textContent?.trim() || "0";
      pulse.textContent = `Pending ${pending}/25 · Blocked ${blocked}`;
    };

    navItems.forEach((item) => {
      new MutationObserver(updateNavigationState).observe(item, { attributes: true, attributeFilter: ["class"] });
    });
    ["pendingPosts", "blockedPosts"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) new MutationObserver(updateNavigationState).observe(node, { childList: true, characterData: true, subtree: true });
    });
    updateNavigationState();
  }

  function addFieldBadges() {
    document.querySelectorAll(".field-stack > span:first-child").forEach((label) => {
      if (label.querySelector(".tm-field-badge")) return;
      const text = label.textContent || "";
      if (!/optional/i.test(text)) return;
      label.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = node.textContent.replace(/\s*optional\s*/i, " ");
      });
      label.append(makeElement("small", "tm-field-badge", "Optional"));
    });
  }

  function markAdvancedFields() {
    ["storyInput", "productImageUrl", "storyTheme", "imageNotes"].forEach((id) => {
      document.getElementById(id)?.closest("label")?.classList.add("tm-advanced-field");
    });
  }

  function setSimpleMode(enabled, toggleButton) {
    document.body.classList.toggle("tm-simple-mode", enabled);
    if (toggleButton) {
      toggleButton.textContent = enabled ? "Tunjuk pilihan lanjutan" : "Guna mod ringkas";
      toggleButton.setAttribute("aria-pressed", String(enabled));
    }
    safeStorageSet(UI_STORAGE_KEY, enabled ? "true" : "false");
  }

  function buildStoryGuide() {
    const storyPage = document.querySelector('[data-view="story"]');
    const storyLab = storyPage?.querySelector(".story-lab");
    if (!storyPage || !storyLab || storyPage.querySelector(".tm-workflow-guide")) return;

    markAdvancedFields();
    addFieldBadges();

    const guide = makeElement("section", "tm-workflow-guide reveal");
    guide.setAttribute("aria-label", "Panduan ringkas jana story");
    const heading = makeElement("div", "tm-workflow-heading");
    const copy = makeElement("div");
    copy.append(
      makeElement("p", "eyebrow", "Aliran mudah"),
      makeElement("h2", "", "Tiga langkah untuk mula"),
      makeElement("span", "", "Masukkan pautan, semak produk, kemudian jana dan jadualkan."),
    );
    const simpleToggle = makeElement("button", "tm-secondary-button", "Guna mod ringkas");
    simpleToggle.type = "button";
    simpleToggle.setAttribute("aria-pressed", "false");
    heading.append(copy, simpleToggle);

    const steps = makeElement("div", "tm-workflow-steps");
    const stepData = [
      ["1", "Pautan produk", "Masukkan link affiliate yang tepat.", "tmStepLink"],
      ["2", "Semak produk", "Product Intel sahkan tajuk dan kategori.", "tmStepProduct"],
      ["3", "Jana & jadual", "Pilih jumlah versi dan terus bina queue.", "tmStepGenerate"],
    ];
    stepData.forEach(([number, title, detail, id]) => {
      const card = makeElement("article", "tm-workflow-step");
      card.id = id;
      const marker = makeElement("span", "tm-step-number", number);
      const body = makeElement("div");
      body.append(makeElement("strong", "", title), makeElement("small", "", detail));
      const status = makeElement("mark", "", "Belum");
      card.append(marker, body, status);
      steps.append(card);
    });
    guide.append(heading, steps);
    storyLab.before(guide);

    const linkInput = document.querySelector("#productAffiliateLink");
    const titleInput = document.querySelector("#productTitle");
    const output = document.querySelector("#storyOutput");
    const generateButton = document.querySelector("#generateStoryButton");

    const update = () => {
      const states = [
        [document.querySelector("#tmStepLink"), Boolean(linkInput?.value.trim()), "Pautan sedia"],
        [document.querySelector("#tmStepProduct"), Boolean(titleInput?.value.trim()), "Produk dikenal"],
        [document.querySelector("#tmStepGenerate"), Boolean(output?.value.trim()) || generateButton?.getAttribute("aria-busy") === "true", output?.value.trim() ? "Story siap" : "Sedia jana"],
      ];
      states.forEach(([card, complete, label]) => {
        if (!card) return;
        card.classList.toggle("complete", complete);
        const mark = card.querySelector("mark");
        if (mark) mark.textContent = complete ? label : card.id === "tmStepGenerate" ? "Langkah akhir" : "Belum";
      });
    };

    [linkInput, titleInput, output].filter(Boolean).forEach((input) => input.addEventListener("input", update));
    if (generateButton) new MutationObserver(update).observe(generateButton, { attributes: true, attributeFilter: ["aria-busy", "disabled"] });
    simpleToggle.addEventListener("click", () => setSimpleMode(!document.body.classList.contains("tm-simple-mode"), simpleToggle));
    setSimpleMode(safeStorageGet(UI_STORAGE_KEY) !== "false", simpleToggle);
    update();
  }

  function buildScheduleFilterChips() {
    const schedulePage = document.querySelector('[data-view="schedule"]');
    const controlBand = schedulePage?.querySelector(".control-band");
    const select = document.querySelector("#statusFilter");
    if (!schedulePage || !controlBand || !select || schedulePage.querySelector(".tm-filter-chips")) return;

    const chips = makeElement("div", "tm-filter-chips");
    chips.setAttribute("aria-label", "Tapis status dengan pantas");
    Array.from(select.options).forEach((option) => {
      const button = makeElement("button", "tm-filter-chip", option.textContent || option.value);
      button.type = "button";
      button.dataset.value = option.value;
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        update();
      });
      chips.append(button);
    });
    controlBand.after(chips);

    function update() {
      chips.querySelectorAll(".tm-filter-chip").forEach((button) => {
        const active = button.dataset.value === select.value;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
    select.addEventListener("change", update);
    update();
  }

  async function refreshProductIntelWithoutCache(button) {
    const note = document.querySelector("#productIntelNote");
    const titleInput = document.querySelector("#productTitle");
    const categoryInput = document.querySelector("#productCategory");
    const affiliateInput = document.querySelector("#productAffiliateLink");
    const imageInput = document.querySelector("#productImageUrl");
    const sourceInput = document.querySelector("#storyInput");
    const notesInput = document.querySelector("#imageNotes");
    const originalLabel = button.textContent;

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Refresh...";
    if (note) note.textContent = "Menyemak semula link tanpa menggunakan cache runtime lama.";

    try {
      const auth = await readAuthStatus();
      const response = await fetch(`${getApiUrl()}/api/product-intel`, {
        method: "POST",
        credentials: "include",
        headers: buildAuthHeaders(auth.csrfToken || ""),
        body: JSON.stringify({
          affiliateLink: affiliateInput?.value.trim() || "",
          imageUrl: imageInput?.value.trim() || "",
          sourceText: sourceInput?.value.trim() || "",
          imageNotes: notesInput?.value.trim() || "",
          productTitle: titleInput?.value.trim() || "",
          productCategory: categoryInput?.value.trim() || "",
          skipCache: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "Refresh Product Intel gagal.");

      const keptManualTitle = Boolean(titleInput?.value.trim());
      if (data.productTitle && !keptManualTitle && titleInput) titleInput.value = data.productTitle;
      if (data.productCategory && !categoryInput?.value.trim() && categoryInput) categoryInput.value = data.productCategory;
      titleInput?.dispatchEvent(new Event("input", { bubbles: true }));
      categoryInput?.dispatchEvent(new Event("input", { bubbles: true }));
      try {
        if (typeof state !== "undefined" && data.productTitle) {
          state.productIntel = {
            productTitle: data.productTitle,
            productCategory: data.productCategory || "",
            linkVerified: Boolean(data.linkVerified),
            autoResolvable: Boolean(data.autoResolvable),
            evidenceLevel: data.evidenceLevel || "",
            confidence: Number(data.confidence || 0),
            source: data.source || "Product Intel refresh",
          };
        }
      } catch {
        // The core app state is optional; refreshed form values remain usable.
      }

      const confidence = Number.isFinite(Number(data.confidence)) ? `${Number(data.confidence)}%` : "tidak diketahui";
      if (note) {
        note.textContent = data.productTitle
          ? `Semakan baharu: ${data.productTitle} (${confidence}). ${keptManualTitle ? "Tajuk manual semasa dikekalkan." : "Medan produk sudah dikemas kini."}`
          : "Semakan baharu selesai, tetapi produk masih belum dapat dikenal pasti dengan yakin.";
      }
      notify(data.productTitle ? "Product Intel berjaya direfresh tanpa cache." : "Refresh selesai; produk masih memerlukan semakan.", data.productTitle ? "success" : "warn");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "Refresh gagal.");
      if (note) note.textContent = message;
      notify(message, "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = originalLabel;
    }
  }

  function addProductIntelRefresh() {
    const strip = document.querySelector(".product-intel-strip");
    const primaryButton = document.querySelector("#productIntelButton");
    if (!strip || !primaryButton || document.querySelector("#productIntelRefreshButton")) return;

    const actions = makeElement("div", "tm-product-intel-actions");
    primaryButton.before(actions);
    actions.append(primaryButton);
    const refreshButton = makeElement("button", "tm-secondary-button", "Semak tanpa cache");
    refreshButton.id = "productIntelRefreshButton";
    refreshButton.type = "button";
    refreshButton.dataset.toast = "Refresh Product Intel tanpa cache";
    refreshButton.addEventListener("click", () => refreshProductIntelWithoutCache(refreshButton));
    actions.append(refreshButton);
  }

  function enhanceMetrics() {
    const labels = {
      totalPosts: "Jumlah semua siri dalam runtime",
      passedPosts: "Siri yang sudah selesai",
      pendingPosts: "Siri aktif dalam queue",
      failedPosts: "Siri yang gagal diproses",
      blockedPosts: "Siri menunggu slot kosong",
    };
    Object.entries(labels).forEach(([id, title]) => {
      const card = document.getElementById(id)?.closest("article");
      if (!card) return;
      card.title = title;
      card.setAttribute("tabindex", "0");
    });
  }

  ready(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-item[data-view-target]"));
    buildMobileNavigation(navItems);
    buildStoryGuide();
    buildScheduleFilterChips();
    addProductIntelRefresh();
    enhanceMetrics();
    addFieldBadges();
    document.documentElement.classList.add("tm-ui-ready");
  });
})();
