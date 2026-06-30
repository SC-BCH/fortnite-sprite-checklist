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
    tipsBtn: $("tipsBtn"),
    tipsPanel: $("tipsPanel"),
    tipsText: $("tipsText"),
    tipsLink: $("tipsLink"),
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
      hint: "チェック内容はこの端末のブラウザに自動保存されます。",
      tipsButton: "使い方",
      tipsText: "ワンタップでチェックが付き、所持数にカウントされます。2タップで精霊に王冠マークが付き、マスターした精霊としてマスター数にカウントされます。もう一度タップすると未所持に戻ります。チェック内容はこの端末のブラウザに自動保存されます。最新の使い方・更新情報はこちら：",
      tipsLink: "https://x.com/BCH_1025",
      footer: 'ローカル保存対応 | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a>',
      collected: "所持",
      mastered: "マスター",
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
      hint: "Your checklist is saved automatically in this browser on this device.",
      tipsButton: "Tips",
      tipsText: "Tap once to mark a Sprite as collected and add it to the Collected count. Tap twice to add a crown mark and count it as mastered. Tap again to return it to unowned. Your checklist is saved automatically in this browser on this device. Latest guide and updates:",
      tipsLink: "https://x.com/BCH_1025",
      footer: 'Local save supported | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a> | <a href="https://buymeacoffee.com/bch1025?new=1" target="_blank" rel="noopener noreferrer">Support the developer</a>',
      collected: "Collected",
      mastered: "Mastered",
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
  function masteredLabel() {
    const configured = eventsData?.text?.masteredLabel?.[currentLanguage] || eventsData?.text?.masteredLabel?.ja;
    return configured || t("mastered");
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
  function normalizeStateValue(value) {
    if (value === true) return 1;
    if (value === 1 || value === "1") return 1;
    if (value === 2 || value === "2") return 2;
    return 0;
  }
  function itemState(item) {
    return normalizeStateValue(state[item.id]);
  }
  function checkedCount() {
    return collectedCount();
  }
  function collectedCount() {
    return boardData.items.reduce((sum, item) => sum + (itemState(item) >= 1 ? 1 : 0), 0);
  }
  function masteredCount() {
    return boardData.items.reduce((sum, item) => sum + (itemState(item) === 2 ? 1 : 0), 0);
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
  function masterBox(item) {
    return { x: item.x + 10, y: item.y - 205, w: 88, h: 62 };
  }
  function makeCrown() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 70");
    svg.setAttribute("class", "crown-mark");
    const paths = [
      ["path", "crown-burst", "M6 25 L0 20 M18 12 L14 3 M37 8 L36 0 M63 8 L64 0 M82 12 L86 3 M94 25 L100 20 M8 48 L0 51 M92 48 L100 51"],
      ["path", "crown-shadow", "M12 56 L20 25 L38 44 L50 14 L62 44 L80 25 L88 56 Z"],
      ["path", "crown-body", "M12 54 L20 25 L38 44 L50 14 L62 44 L80 25 L88 54 Q50 66 12 54 Z"]
    ];
    paths.forEach(([, cls, d]) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", cls);
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    [[20,24],[50,12],[80,24]].forEach(([cx, cy]) => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "crown-dot");
      dot.setAttribute("cx", String(cx));
      dot.setAttribute("cy", String(cy));
      dot.setAttribute("r", "4");
      svg.appendChild(dot);
    });
    return svg;
  }
  function refreshMetaOverlay() {
    const raw = isRawExportMode();
    const normalizedName = normalizeName(displayName);
    const normalizedColor = normalizeColor(displayNameColor);
    const normalizedSize = normalizeSize(displayNameSize);
    const countText = `${collectedLabel()} ${checkedCount()} / ${boardData.items.length}\n${masteredLabel()} ${masteredCount()} / ${boardData.items.length}`;
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
      const value = itemState(item);

      if (value === 2) {
        const crown = document.createElement("div");
        const box = masterBox(item);
        crown.className = "master-crown";
        crown.style.left = `${pctX(box.x)}%`;
        crown.style.top = `${pctY(box.y)}%`;
        crown.style.width = `${pctX(box.w)}%`;
        crown.style.height = `${pctY(box.h)}%`;
        crown.appendChild(makeCrown());
        els.layer.appendChild(crown);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box";
      btn.setAttribute("aria-label", tLabel(item));
      btn.dataset.state = String(value);
      btn.style.left = `${pctX(item.x)}%`;
      btn.style.top = `${pctY(item.y)}%`;
      btn.style.width = `${pctX(item.w)}%`;
      btn.style.height = `${pctY(item.h)}%`;
      if (value >= 1) btn.appendChild(makeMark());
      btn.addEventListener("click", () => {
        const next = (itemState(item) + 1) % 3;
        if (next === 0) delete state[item.id];
        else state[item.id] = next;
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
    if (els.tipsBtn) els.tipsBtn.textContent = t("tipsButton");
    if (els.tipsText) els.tipsText.textContent = t("tipsText");
    if (els.tipsLink) els.tipsLink.textContent = t("tipsLink");
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
  function drawCrownOnContext(ctx, item) {
    const box = masterBox(item);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.w / 100, box.h / 70);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(15,15,15,0.62)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    [[6,25,0,20],[18,12,14,3],[37,8,36,0],[63,8,64,0],[82,12,86,3],[94,25,100,20],[8,48,0,51],[92,48,100,51]].forEach(([x1,y1,x2,y2]) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 54);
    ctx.lineTo(20, 25);
    ctx.lineTo(38, 44);
    ctx.lineTo(50, 14);
    ctx.lineTo(62, 44);
    ctx.lineTo(80, 25);
    ctx.lineTo(88, 54);
    ctx.quadraticCurveTo(50, 66, 12, 54);
    ctx.closePath();
    ctx.fillStyle = "#ffd92e";
    ctx.fill();
    ctx.strokeStyle = "rgba(70,58,8,0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff47a";
    [[20,24],[50,12],[80,24]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }
  function drawMetaText(ctx, countLabel) {
    if (isRawExportMode()) return;
    const name = normalizeName(displayName);
    const dateText = formatCurrentDate();
    const collectedText = `${collectedLabel()} ${checkedCount()} / ${boardData.items.length}`;
    const masteredText = `${masteredLabel()} ${masteredCount()} / ${boardData.items.length}`;
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
    if (eventsData.metaOverlay?.showCount !== false) {
      drawLine(collectedText, 72);
      drawLine(masteredText, 102, 28, 20);
    }
    if (name && eventsData.metaOverlay?.showName !== false) {
      const start = displayNameSize === "small" ? 30 : displayNameSize === "large" ? 42 : 36;
      const min = displayNameSize === "small" ? 20 : displayNameSize === "large" ? 28 : 24;
      drawLine(name, 132, start, min);
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
    boardData.items.forEach((item) => { if (itemState(item) === 2) drawCrownOnContext(ctx, item); });
    boardData.items.forEach((item) => { if (itemState(item) >= 1) drawCheckOnContext(ctx, item); });
    drawCompleteStamp(ctx);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  async function saveImage() {
    const blob = await buildChecklistBlob();
    if (!blob) return;

    const fileName = `fortnite-sprite-checklist-${formatCurrentDate()}.png`;

    const downloadBlob = () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isAndroidDevice = /Android/i.test(userAgent);

    if (isAndroidDevice) {
      downloadBlob();
      return;
    }

    const isIOSShareDevice =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOSShareDevice && navigator.canShare && navigator.share) {
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Fortnite Sprite Checklist",
            text: "Fortnite Sprite Checklist"
          });
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
          console.warn("Share failed. Falling back to download.", error);
        }
      }
    }

    downloadBlob();
  }
  function wireInputs() {
    els.tipsBtn?.addEventListener("click", () => {
      if (!els.tipsPanel) return;
      const hidden = els.tipsPanel.classList.toggle("is-hidden");
      els.tipsBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
    });
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
      const rawState = loadJSON(stateStorageKey(), {});
      state = {};
      Object.entries(rawState).forEach(([key, value]) => {
        if (!validIds.has(key)) return;
        const normalized = normalizeStateValue(value);
        if (normalized > 0) state[key] = normalized;
      });
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

