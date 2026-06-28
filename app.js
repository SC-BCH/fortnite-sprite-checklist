(function () {
  const MANIFEST_PATH = "./board.manifest.json";
  const $ = (id) => document.getElementById(id);

  const els = {
    board: $("board"),
    layer: $("layer"),
    boardImage: $("boardImage"),
    countBadge: $("countBadge"),
    saveBadge: $("saveBadge"),
    langJaBtn: $("langJaBtn"),
    langEnBtn: $("langEnBtn"),
    pageHint: $("pageHint"),
    pageFooter: $("pageFooter"),
    colorLabel: $("colorLabel"),
    sizeLabel: $("sizeLabel"),
    nameInput: $("nameInput"),
    nameColorSelect: $("nameColorSelect"),
    nameSizeSelect: $("nameSizeSelect"),
    metaOverlay: $("metaOverlay"),
    dateOverlay: $("dateOverlay"),
    countOverlay: $("countOverlay"),
    nameOverlay: $("nameOverlay"),
    completeBadge: $("completeBadge"),
    saveImageBtn: $("saveImageBtn"),
    resetBtn: $("resetBtn")
  };

  const required = ["board","layer","boardImage","countBadge","saveBadge","nameInput","nameColorSelect","nameSizeSelect","metaOverlay","dateOverlay","countOverlay","nameOverlay","completeBadge","saveImageBtn","resetBtn"];
  if (required.some((key) => !els[key])) return;

  const LEGACY_STORAGE_KEYS = {
    name: "fortnite_sprite_checklist_name_v1",
    color: "fortnite_sprite_checklist_name_color_v1",
    size: "fortnite_sprite_checklist_name_size_v1",
    lang: "fortnite_sprite_checklist_lang_v1"
  };

  const translations = {
    ja: {
      namePlaceholder: "名前（任意）",
      colorLabel: "文字色",
      sizeLabel: "名前サイズ",
      colorBlack: "黒",
      colorRed: "赤",
      colorWhite: "白",
      sizeSmall: "小",
      sizeMedium: "中",
      sizeLarge: "大",
      saveImage: "画像保存",
      reset: "全解除",
      saved: "保存済み",
      hint: "タップで切替。状態はこの端末のブラウザに保存されます。",
      footer: 'ローカル保存対応 | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a>',
      collected: "collected",
      loading: "チェックリストを読み込んでいます…",
      failed: "チェックリストの初期化に失敗しました。board.manifest.json と参照先ファイルを確認してください。"
    },
    en: {
      namePlaceholder: "Name (optional)",
      colorLabel: "Text color",
      sizeLabel: "Name size",
      colorBlack: "Black",
      colorRed: "Red",
      colorWhite: "White",
      sizeSmall: "Small",
      sizeMedium: "Medium",
      sizeLarge: "Large",
      saveImage: "Save Image",
      reset: "Clear All",
      saved: "Saved",
      hint: "Tap to toggle. Progress is saved in this browser on this device.",
      footer: 'Local save supported | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a> | <a href="https://buymeacoffee.com/bch1025?new=1" target="_blank" rel="noopener noreferrer">Support the developer</a>',
      collected: "collected",
      loading: "Loading checklist...",
      failed: "Failed to initialize the checklist. Check board.manifest.json and referenced files."
    }
  };

  const normalizeColor = (value) => ["black", "red", "white"].includes(value) ? value : "black";
  const normalizeSize = (value) => ["small", "medium", "large"].includes(value) ? value : "medium";
  const normalizeName = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const loadJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let manifest;
  let boardData;
  let eventsData = {
    version: 1,
    rawExportKey: "BCH_ServOfMiori_AD",
    completeBadge: { enabled: true, mainText: "COMPLETE!", subTextTemplate: "{count} / {total} COLLECTED" },
    metaOverlay: { showDate: true, showCount: true, showName: true }
  };
  let currentLanguage = localStorage.getItem(LEGACY_STORAGE_KEYS.lang) === "en" ? "en" : "ja";
  let state = {};
  let displayName = normalizeName(localStorage.getItem(LEGACY_STORAGE_KEYS.name) || "");
  let displayNameColor = normalizeColor(localStorage.getItem(LEGACY_STORAGE_KEYS.color) || "black");
  let displayNameSize = normalizeSize(localStorage.getItem(LEGACY_STORAGE_KEYS.size) || "medium");

  function t(key) {
    return translations[currentLanguage]?.[key] || translations.ja[key] || "";
  }
  function tLabel(item) {
    return item.label?.[currentLanguage] || item.label?.ja || item.id;
  }
  function stateStorageKey() {
    return boardData?.storage?.stateKey || manifest?.storage?.stateKey || "fortnite_sprite_checklist_v4";
  }
  function storageKey(kind) {
    const storage = boardData?.storage || {};
    if (kind === "name" && storage.nameKey) return storage.nameKey;
    if (kind === "color" && storage.nameColorKey) return storage.nameColorKey;
    if (kind === "size" && storage.nameSizeKey) return storage.nameSizeKey;
    if (kind === "lang" && storage.languageKey) return storage.languageKey;
    return LEGACY_STORAGE_KEYS[kind] || `${stateStorageKey()}:${kind}`;
  }
  function readStoredRaw(kind) {
    const key = storageKey(kind);
    const value = localStorage.getItem(key);
    return value === null ? null : value;
  }
  function readStoredLanguage(fallback) {
    const value = readStoredRaw("lang");
    if (value === "ja" || value === "en") return value;
    return fallback;
  }
  function readStoredName(fallback) {
    const value = readStoredRaw("name");
    if (value === null) return normalizeName(fallback);
    return normalizeName(value);
  }
  function readStoredColor(fallback) {
    const value = readStoredRaw("color");
    if (value === null) return normalizeColor(fallback);
    return normalizeColor(value);
  }
  function readStoredSize(fallback) {
    const value = readStoredRaw("size");
    if (value === null) return normalizeSize(fallback);
    return normalizeSize(value);
  }
  function collectedLabel() {
    const configured = eventsData?.text?.collectedLabel?.[currentLanguage] || eventsData?.text?.collectedLabel?.ja;
    return configured || t("collected");
  }
  function completeBadgeMainText() {
    const configured = eventsData?.completeBadge?.mainTextByLanguage?.[currentLanguage] || eventsData?.completeBadge?.mainTextByLanguage?.ja;
    return configured || eventsData?.completeBadge?.mainText || "COMPLETE!";
  }
  function completeBadgeSubTemplate() {
    const configured = eventsData?.completeBadge?.subTextTemplateByLanguage?.[currentLanguage] || eventsData?.completeBadge?.subTextTemplateByLanguage?.ja;
    return configured || eventsData?.completeBadge?.subTextTemplate || "{count} / {total} COLLECTED";
  }
  function pctX(value) { return (value / boardData.image.width) * 100; }
  function pctY(value) { return (value / boardData.image.height) * 100; }
  function checkedCount() {
    return boardData.items.reduce((sum, item) => sum + (state[item.id] ? 1 : 0), 0);
  }
  function isComplete() {
    return checkedCount() === boardData.items.length;
  }
  function isRawExportMode() {
    return normalizeName(displayName) === String(eventsData.rawExportKey || "");
  }
  function formatCurrentDate() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  function updateCount() {
    els.countBadge.textContent = `${checkedCount()} / ${boardData.items.length}`;
  }
  function updateCompleteBadge() {
    const show = eventsData.completeBadge?.enabled !== false && isComplete() && !isRawExportMode();
    els.completeBadge.classList.toggle("show", show);
    els.completeBadge.setAttribute("aria-hidden", show ? "false" : "true");
    const main = els.completeBadge.querySelector(".complete-badge-main");
    const sub = els.completeBadge.querySelector(".complete-badge-sub");
    if (main) main.textContent = completeBadgeMainText();
    if (sub) {
      sub.textContent = completeBadgeSubTemplate()
        .replace("{count}", String(boardData.items.length))
        .replace("{total}", String(boardData.items.length));
    }
  }
  function makeMark() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "mark");
    ["shadow", "main"].forEach((cls) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M18 54 L40 76 L82 24");
      path.setAttribute("class", cls);
      svg.appendChild(path);
    });
    return svg;
  }
  function refreshMetaOverlay() {
    const raw = isRawExportMode();
    const normalizedName = normalizeName(displayName);
    const normalizedColor = normalizeColor(displayNameColor);
    const normalizedSize = normalizeSize(displayNameSize);
    const countText = `${checkedCount()} / ${boardData.items.length} ${collectedLabel()}`;
    els.board.classList.toggle("is-raw-export", raw);
    els.metaOverlay.setAttribute("aria-hidden", raw ? "true" : "false");
    els.dateOverlay.className = `meta-line date-overlay color-${normalizedColor}`;
    els.countOverlay.className = `meta-line count-overlay color-${normalizedColor}`;
    els.nameOverlay.className = `meta-line name-overlay size-${normalizedSize} color-${normalizedColor}`;
    if (els.nameInput.value !== normalizedName) els.nameInput.value = normalizedName;
    if (els.nameColorSelect.value !== normalizedColor) els.nameColorSelect.value = normalizedColor;
    if (els.nameSizeSelect.value !== normalizedSize) els.nameSizeSelect.value = normalizedSize;
    if (raw) {
      els.dateOverlay.textContent = "";
      els.countOverlay.textContent = "";
      els.nameOverlay.textContent = "";
      els.dateOverlay.classList.add("is-hidden");
      els.countOverlay.classList.add("is-hidden");
      els.nameOverlay.classList.add("is-hidden");
      return;
    }
    els.dateOverlay.textContent = eventsData.metaOverlay?.showDate === false ? "" : formatCurrentDate();
    els.countOverlay.textContent = eventsData.metaOverlay?.showCount === false ? "" : countText;
    els.dateOverlay.classList.toggle("is-hidden", eventsData.metaOverlay?.showDate === false);
    els.countOverlay.classList.toggle("is-hidden", eventsData.metaOverlay?.showCount === false);
    if (normalizedName && eventsData.metaOverlay?.showName !== false) {
      els.nameOverlay.textContent = normalizedName;
      els.nameOverlay.classList.remove("is-hidden");
    } else {
      els.nameOverlay.textContent = "";
      els.nameOverlay.classList.add("is-hidden");
    }
  }
  function rebuildLayer() {
    els.layer.innerHTML = "";
    boardData.items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box";
      btn.setAttribute("aria-label", tLabel(item));
      btn.style.left = `${pctX(item.x)}%`;
      btn.style.top = `${pctY(item.y)}%`;
      btn.style.width = `${pctX(item.w)}%`;
      btn.style.height = `${pctY(item.h)}%`;
      if (state[item.id]) btn.appendChild(makeMark());
      btn.addEventListener("click", () => {
        state[item.id] = !state[item.id];
        saveJSON(stateStorageKey(), state);
        els.saveBadge.textContent = t("saved");
        rebuildLayer();
        updateCount();
        refreshMetaOverlay();
        updateCompleteBadge();
      });
      els.layer.appendChild(btn);
    });
  }
  function applyLanguage() {
    els.nameInput.placeholder = t("namePlaceholder");
    els.colorLabel.textContent = t("colorLabel");
    els.sizeLabel.textContent = t("sizeLabel");
    els.nameColorSelect.setAttribute("aria-label", t("colorLabel"));
    els.nameSizeSelect.setAttribute("aria-label", t("sizeLabel"));
    els.nameColorSelect.options[0].text = t("colorBlack");
    els.nameColorSelect.options[1].text = t("colorRed");
    els.nameColorSelect.options[2].text = t("colorWhite");
    els.nameSizeSelect.options[0].text = t("sizeSmall");
    els.nameSizeSelect.options[1].text = t("sizeMedium");
    els.nameSizeSelect.options[2].text = t("sizeLarge");
    els.saveImageBtn.textContent = t("saveImage");
    els.resetBtn.textContent = t("reset");
    els.saveBadge.textContent = t("saved");
    els.pageHint.textContent = t("hint");
    els.pageFooter.innerHTML = t("footer");
    els.langJaBtn?.classList.toggle("is-active", currentLanguage === "ja");
    els.langEnBtn?.classList.toggle("is-active", currentLanguage === "en");
    refreshMetaOverlay();
    rebuildLayer();
  }
  function fitFontSize(ctx, text, weight, startSize, minSize, maxWidth, fontFamily) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${fontFamily}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 1;
    }
    return minSize;
  }
  function drawCheckOnContext(ctx, box) {
    const p1x = box.x + box.w * 0.18;
    const p1y = box.y + box.h * 0.56;
    const p2x = box.x + box.w * 0.40;
    const p2y = box.y + box.h * 0.76;
    const p3x = box.x + box.w * 0.82;
    const p3y = box.y + box.h * 0.24;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.stroke();
    ctx.strokeStyle = "#ff4d4f";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.stroke();
    ctx.restore();
  }
  function drawMetaText(ctx, countLabel) {
    if (isRawExportMode()) return;
    const name = normalizeName(displayName);
    const dateText = formatCurrentDate();
    const countText = `${checkedCount()} / ${boardData.items.length} ${countLabel}`;
    const fontFamily = "Arial";
    const maxWidth = 720;
    const color = displayNameColor === "red"
      ? { fill:"#d11d2c", stroke:"rgba(255,255,255,0.72)" }
      : displayNameColor === "white"
        ? { fill:"#fff", stroke:"rgba(0,0,0,0.92)" }
        : { fill:"#111", stroke:"rgba(255,255,255,0.72)" };
    const drawLine = (text, y, start = 30, min = 22) => {
      const sz = fitFontSize(ctx, text, 700, start, min, maxWidth, fontFamily);
      ctx.font = `700 ${sz}px ${fontFamily}`;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 4;
      ctx.strokeText(text, 48, y);
      ctx.fillStyle = color.fill;
      ctx.fillText(text, 48, y);
    };
    ctx.save();
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    if (eventsData.metaOverlay?.showDate !== false) drawLine(dateText, 42);
    if (eventsData.metaOverlay?.showCount !== false) drawLine(countText, 72);
    if (name && eventsData.metaOverlay?.showName !== false) {
      const start = displayNameSize === "small" ? 30 : displayNameSize === "large" ? 42 : 36;
      const min = displayNameSize === "small" ? 20 : displayNameSize === "large" ? 28 : 24;
      drawLine(name, 102, start, min);
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawCompleteStamp(ctx) {
    if (!eventsData.completeBadge?.enabled || !isComplete() || isRawExportMode()) return;
    const x = 1376, y = 48, w = 420, h = 118;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 18);
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "rgba(255,255,255,0.96)");
    grad.addColorStop(1, "rgba(255,246,204,0.98)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,215,0,0.95)";
    ctx.stroke();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#d62828";
    ctx.font = "900 48px Arial";
    ctx.fillText(completeBadgeMainText(), 0, -16);
    ctx.fillStyle = "#111";
    ctx.font = "800 18px Arial";
    ctx.fillText(completeBadgeSubTemplate()
      .replace("{count}", String(boardData.items.length))
      .replace("{total}", String(boardData.items.length)), 0, 28);
    ctx.restore();
  }
  async function buildChecklistBlob() {
    const canvas = document.createElement("canvas");
    canvas.width = boardData.image.width;
    canvas.height = boardData.image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(els.boardImage, 0, 0, canvas.width, canvas.height);
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch {}
    }
    drawMetaText(ctx, collectedLabel());
    boardData.items.forEach((item) => { if (state[item.id]) drawCheckOnContext(ctx, item); });
    drawCompleteStamp(ctx);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  async function saveImage() {
    const blob = await buildChecklistBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortnite-sprite-checklist-${formatCurrentDate()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function wireInputs() {
    els.nameInput.value = displayName;
    els.nameColorSelect.value = displayNameColor;
    els.nameSizeSelect.value = displayNameSize;
    els.nameInput.addEventListener("input", (event) => {
      displayName = normalizeName(event.target.value);
      localStorage.setItem(storageKey("name"), displayName);
      els.saveBadge.textContent = t("saved");
      refreshMetaOverlay();
      updateCompleteBadge();
    });
    els.nameColorSelect.addEventListener("change", (event) => {
      displayNameColor = normalizeColor(event.target.value);
      localStorage.setItem(storageKey("color"), displayNameColor);
      els.saveBadge.textContent = t("saved");
      refreshMetaOverlay();
    });
    els.nameSizeSelect.addEventListener("change", (event) => {
      displayNameSize = normalizeSize(event.target.value);
      localStorage.setItem(storageKey("size"), displayNameSize);
      els.saveBadge.textContent = t("saved");
      refreshMetaOverlay();
    });
    els.langJaBtn?.addEventListener("click", () => {
      currentLanguage = "ja";
      localStorage.setItem(storageKey("lang"), currentLanguage);
      applyLanguage();
    });
    els.langEnBtn?.addEventListener("click", () => {
      currentLanguage = "en";
      localStorage.setItem(storageKey("lang"), currentLanguage);
      applyLanguage();
    });
    els.saveImageBtn.addEventListener("click", saveImage);
    els.resetBtn.addEventListener("click", () => {
      state = {};
      saveJSON(stateStorageKey(), state);
      els.saveBadge.textContent = t("saved");
      rebuildLayer();
      updateCount();
      refreshMetaOverlay();
      updateCompleteBadge();
    });
  }

  async function init() {
    try {
      els.pageHint.textContent = t("loading");
      manifest = await fetch(MANIFEST_PATH).then((res) => {
        if (!res.ok) throw new Error(`Manifest load failed: ${res.status}`);
        return res.json();
      });
      [boardData, eventsData] = await Promise.all([
        fetch(manifest.board).then((res) => {
          if (!res.ok) throw new Error(`Board load failed: ${res.status}`);
          return res.json();
        }),
        manifest.events ? fetch(manifest.events).then((res) => {
          if (!res.ok) throw new Error(`Events load failed: ${res.status}`);
          return res.json();
        }) : Promise.resolve(eventsData)
      ]);
      const validIds = new Set(boardData.items.map((item) => item.id));
      state = Object.fromEntries(Object.entries(loadJSON(stateStorageKey(), {})).filter(([key, value]) => validIds.has(key) && !!value));
      saveJSON(stateStorageKey(), state);
      displayName = readStoredName(displayName);
      displayNameColor = readStoredColor(displayNameColor);
      displayNameSize = readStoredSize(displayNameSize);
      currentLanguage = readStoredLanguage(currentLanguage);
      els.boardImage.src = manifest.image || boardData.image.src;
      await new Promise((resolve, reject) => {
        if (els.boardImage.complete && els.boardImage.naturalWidth > 0) return resolve();
        els.boardImage.addEventListener("load", resolve, { once:true });
        els.boardImage.addEventListener("error", reject, { once:true });
      });
      wireInputs();
      rebuildLayer();
      updateCount();
      applyLanguage();
      updateCompleteBadge();
      els.pageHint.textContent = t("hint");
    } catch (error) {
      console.error(error);
      els.pageHint.textContent = t("failed");
    }
  }

  init();
})();
