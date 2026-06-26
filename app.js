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

  const normalizeColor = (value) => ["black", "red", "white"].includes(value) ? value : "black";
  const normalizeSize = (value) => ["small", "medium", "large"].includes(value) ? value : "medium";
  const normalizeName = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const loadJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let manifest;
  let boardData;
  let eventsData = { version:1, rawExportKey:"", completeBadge:{ enabled:true, mainText:"COMPLETE!", subTextTemplate:"{count} / {total} COLLECTED" }, metaOverlay:{ showDate:true, showCount:true, showName:true } };
  let currentLanguage = "ja";
  let state = {};
  let displayName = "";
  let displayNameColor = "black";
  let displayNameSize = "medium";

  function tLabel(item) {
    return item.label?.[currentLanguage] || item.label?.ja || item.id;
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
    if (main) main.textContent = eventsData.completeBadge?.mainText || "COMPLETE!";
    if (sub) {
      sub.textContent = (eventsData.completeBadge?.subTextTemplate || "{count} / {total} COLLECTED")
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
    const countText = `${checkedCount()} / ${boardData.items.length} collected`;
    const normalizedName = normalizeName(displayName);
    const normalizedColor = normalizeColor(displayNameColor);
    const normalizedSize = normalizeSize(displayNameSize);
    els.board.classList.toggle("is-raw-export", raw);
    els.metaOverlay.setAttribute("aria-hidden", raw ? "true" : "false");
    els.dateOverlay.className = `meta-line date-overlay color-${normalizedColor}`;
    els.countOverlay.className = `meta-line count-overlay color-${normalizedColor}`;
    els.nameOverlay.className = `meta-line name-overlay size-${normalizedSize} color-${normalizedColor}`;
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
        saveJSON(boardData.storage.stateKey, state);
        els.saveBadge.textContent = "Saved";
        rebuildLayer();
        updateCount();
        refreshMetaOverlay();
        updateCompleteBadge();
      });
      els.layer.appendChild(btn);
    });
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
  function drawMetaText(ctx) {
    if (isRawExportMode()) return;
    const name = normalizeName(displayName);
    const dateText = formatCurrentDate();
    const countText = `${checkedCount()} / ${boardData.items.length} collected`;
    const fontFamily = "Arial";
    const maxWidth = 720;
    const color = displayNameColor === "red"
      ? { fill:"#d11d2c", stroke:"rgba(255,255,255,0.72)" }
      : displayNameColor === "white"
        ? { fill:"#fff", stroke:"rgba(0,0,0,0.92)" }
        : { fill:"#111", stroke:"rgba(255,255,255,0.72)" };
    const x = 48;
    const drawLine = (text, y, start = 30, min = 22) => {
      const sz = fitFontSize(ctx, text, 700, start, min, maxWidth, fontFamily);
      ctx.font = `700 ${sz}px ${fontFamily}`;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 4;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color.fill;
      ctx.fillText(text, x, y);
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
    const x = 1520, y = 54, w = 168, h = 58;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 10);
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "rgba(255,255,255,0.96)");
    grad.addColorStop(1, "rgba(255,246,204,0.98)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,215,0,0.95)";
    ctx.stroke();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#d62828";
    ctx.font = "900 22px Arial";
    ctx.fillText(eventsData.completeBadge?.mainText || "COMPLETE!", 0, -8);
    ctx.fillStyle = "#111";
    ctx.font = "800 10px Arial";
    ctx.fillText((eventsData.completeBadge?.subTextTemplate || "{count} / {total} COLLECTED")
      .replace("{count}", String(boardData.items.length))
      .replace("{total}", String(boardData.items.length)), 0, 11);
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
    drawMetaText(ctx);
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
      localStorage.setItem(`${boardData.storage.stateKey}:name`, displayName);
      refreshMetaOverlay();
      updateCompleteBadge();
    });
    els.nameColorSelect.addEventListener("change", (event) => {
      displayNameColor = normalizeColor(event.target.value);
      localStorage.setItem(`${boardData.storage.stateKey}:color`, displayNameColor);
      refreshMetaOverlay();
    });
    els.nameSizeSelect.addEventListener("change", (event) => {
      displayNameSize = normalizeSize(event.target.value);
      localStorage.setItem(`${boardData.storage.stateKey}:size`, displayNameSize);
      refreshMetaOverlay();
    });
    els.langJaBtn?.addEventListener("click", () => {
      currentLanguage = "ja";
      localStorage.setItem(`${boardData.storage.stateKey}:lang`, currentLanguage);
      rebuildLayer();
    });
    els.langEnBtn?.addEventListener("click", () => {
      currentLanguage = "en";
      localStorage.setItem(`${boardData.storage.stateKey}:lang`, currentLanguage);
      rebuildLayer();
    });
    els.saveImageBtn.addEventListener("click", saveImage);
    els.resetBtn.addEventListener("click", () => {
      state = {};
      saveJSON(boardData.storage.stateKey, state);
      rebuildLayer();
      updateCount();
      refreshMetaOverlay();
      updateCompleteBadge();
    });
  }

  async function init() {
    try {
      els.pageHint.textContent = "manifest viewer を初期化しています…";
      manifest = await fetch(MANIFEST_PATH).then((res) => {
        if (!res.ok) throw new Error(`Manifest load failed: ${res.status}`);
        return res.json();
      });
      [boardData, eventsData] = await Promise.all([
        fetch(manifest.board).then((res) => res.json()),
        manifest.events ? fetch(manifest.events).then((res) => res.json()) : Promise.resolve(eventsData)
      ]);
      const validIds = new Set(boardData.items.map((item) => item.id));
      state = Object.fromEntries(Object.entries(loadJSON(boardData.storage.stateKey, {})).filter(([key, value]) => validIds.has(key) && !!value));
      saveJSON(boardData.storage.stateKey, state);
      displayName = normalizeName(localStorage.getItem(`${boardData.storage.stateKey}:name`) || "");
      displayNameColor = normalizeColor(localStorage.getItem(`${boardData.storage.stateKey}:color`) || "black");
      displayNameSize = normalizeSize(localStorage.getItem(`${boardData.storage.stateKey}:size`) || "medium");
      currentLanguage = localStorage.getItem(`${boardData.storage.stateKey}:lang`) === "en" ? "en" : "ja";
      els.boardImage.src = manifest.image || boardData.image.src;
      await new Promise((resolve, reject) => {
        if (els.boardImage.complete && els.boardImage.naturalWidth > 0) return resolve();
        els.boardImage.addEventListener("load", resolve, { once:true });
        els.boardImage.addEventListener("error", reject, { once:true });
      });
      wireInputs();
      rebuildLayer();
      updateCount();
      refreshMetaOverlay();
      updateCompleteBadge();
      els.pageHint.textContent = "manifest viewer の土台は読み込まれました。";
    } catch (error) {
      console.error(error);
      els.pageHint.textContent = "manifest viewer の初期化に失敗しました。board.manifest.json と参照先ファイルを確認してください。";
    }
  }

  init();
})();
