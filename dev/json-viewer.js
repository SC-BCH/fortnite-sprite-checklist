const BOARD_PATH = "./boards/sprite-seirei.draft.json";
const EVENTS_PATH = "./events/sprite-seirei.draft.json";
const IMAGE_DATA_URL_KEY = "fortnite_sprite_checklist_json_dev_image_v1";
const IMAGE_DB_NAME = "fortnite_sprite_checklist_dev_assets";
const IMAGE_DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";
const IMAGE_RECORD_KEY = "shared-image";
const WORKING_BOARD_JSON_KEY = "fortnite_sprite_checklist_json_dev_working_board_v1";

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
    hint: "JSON 駆動の開発用 viewer です。まず画像を選択してください。状態は本番とは別の localStorage に保存されます。",
    footer: 'DEV JSON viewer | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a>',
    imageMissing: "画像未設定",
    imageLoaded: "画像設定済み",
    imageLoadFailed: "画像の読込に失敗しました。再選択してください。",
    boardLoaded: "board 読込済み",
    collected: "collected"
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
    hint: "JSON-driven development viewer. Select an image first. State is stored separately from production.",
    footer: 'DEV JSON viewer | Produced by BCH | <a href="https://x.com/BCH_1025" target="_blank" rel="noopener noreferrer">X @BCH_1025</a> | <a href="https://buymeacoffee.com/bch1025?new=1" target="_blank" rel="noopener noreferrer">Support the developer</a>',
    imageMissing: "No image selected",
    imageLoaded: "Image ready",
    imageLoadFailed: "Failed to load the image. Please select it again.",
    boardLoaded: "Board loaded",
    collected: "collected"
  }
};

const $ = (id) => document.getElementById(id);
const countBadge = $("countBadge");
const saveBadge = $("saveBadge");
const devModeFlag = $("devModeFlag");
const langJaBtn = $("langJaBtn");
const langEnBtn = $("langEnBtn");
const colorLabel = $("colorLabel");
const sizeLabel = $("sizeLabel");
const nameInput = $("nameInput");
const nameColorSelect = $("nameColorSelect");
const nameSizeSelect = $("nameSizeSelect");
const saveImageBtn = $("saveImageBtn");
const resetBtn = $("resetBtn");
const imageFileInput = $("imageFileInput");
const clearImageBtn = $("clearImageBtn");
const imageStatus = $("imageStatus");
const pageHint = $("pageHint");
const pageFooter = $("pageFooter");
const boardInfo = $("boardInfo");
const board = $("board");
const boardImage = $("boardImage");
const layer = $("layer");
const metaOverlay = $("metaOverlay");
const dateOverlay = $("dateOverlay");
const countOverlay = $("countOverlay");
const nameOverlay = $("nameOverlay");
const completeBadge = $("completeBadge");

const normalizeColor = (value) => ["black", "red", "white"].includes(value) ? value : "black";
const normalizeSize = (value) => ["small", "medium", "large"].includes(value) ? value : "medium";
const normalizeName = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
const loadJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

let boardData;
let eventsData;
let state = {};
let currentLanguage = "ja";
let displayName = "";
let displayNameColor = "black";
let displayNameSize = "medium";

function t(key) {
  return translations[currentLanguage]?.[key] || translations.ja[key] || "";
}
function pctX(value) { return (value / boardData.image.width) * 100; }
function pctY(value) { return (value / boardData.image.height) * 100; }
function checkedCount() {
  return boardData.items.reduce((total, box) => total + (state[box.id] ? 1 : 0), 0);
}
function isComplete() {
  return checkedCount() === boardData.items.length;
}
function isRawExportMode() {
  return normalizeName(displayName) === eventsData.rawExportKey;
}
function formatCurrentDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
function updateCount() {
  countBadge.textContent = `${checkedCount()} / ${boardData.items.length}`;
}
function updateCompleteBadge() {
  const show = eventsData.completeBadge?.enabled !== false && isComplete() && !isRawExportMode();
  completeBadge.classList.toggle("show", show);
  completeBadge.setAttribute("aria-hidden", show ? "false" : "true");
  completeBadge.querySelector(".complete-badge-main").textContent = eventsData.completeBadge?.mainText || "COMPLETE!";
  completeBadge.querySelector(".complete-badge-sub").textContent = (eventsData.completeBadge?.subTextTemplate || "{count} / {total} COLLECTED")
    .replace("{count}", String(boardData.items.length))
    .replace("{total}", String(boardData.items.length));
}
function makeMark() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "mark");
  for (const cls of ["shadow", "main"]) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M18 54 L40 76 L82 24");
    p.setAttribute("class", cls);
    svg.appendChild(p);
  }
  return svg;
}
function refreshMetaOverlay() {
  const raw = isRawExportMode();
  const countText = `${checkedCount()} / ${boardData.items.length} ${t("collected")}`;
  const normalizedName = normalizeName(displayName);
  const normalizedColor = normalizeColor(displayNameColor);
  const normalizedSize = normalizeSize(displayNameSize);
  board.classList.toggle("is-raw-export", raw);
  metaOverlay.setAttribute("aria-hidden", raw ? "true" : "false");
  dateOverlay.className = `meta-line date-overlay color-${normalizedColor}`;
  countOverlay.className = `meta-line count-overlay color-${normalizedColor}`;
  nameOverlay.className = `meta-line name-overlay size-${normalizedSize} color-${normalizedColor}`;
  if (raw) {
    dateOverlay.textContent = "";
    countOverlay.textContent = "";
    nameOverlay.textContent = "";
    dateOverlay.classList.add("is-hidden");
    countOverlay.classList.add("is-hidden");
    nameOverlay.classList.add("is-hidden");
    return;
  }
  dateOverlay.textContent = eventsData.metaOverlay?.showDate === false ? "" : formatCurrentDate();
  countOverlay.textContent = eventsData.metaOverlay?.showCount === false ? "" : countText;
  dateOverlay.classList.toggle("is-hidden", eventsData.metaOverlay?.showDate === false);
  countOverlay.classList.toggle("is-hidden", eventsData.metaOverlay?.showCount === false);
  if (normalizedName && eventsData.metaOverlay?.showName !== false) {
    nameOverlay.textContent = normalizedName;
    nameOverlay.classList.remove("is-hidden");
  } else {
    nameOverlay.textContent = "";
    nameOverlay.classList.add("is-hidden");
  }
}
function rebuildLayer() {
  layer.innerHTML = "";
  for (const box of boardData.items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "box";
    btn.setAttribute("aria-label", box.label?.[currentLanguage] || box.label?.ja || box.id);
    btn.style.left = `${pctX(box.x)}%`;
    btn.style.top = `${pctY(box.y)}%`;
    btn.style.width = `${pctX(box.w)}%`;
    btn.style.height = `${pctY(box.h)}%`;
    if (state[box.id]) btn.appendChild(makeMark());
    btn.addEventListener("click", () => {
      state[box.id] = !state[box.id];
      saveJSON(boardData.storage.stateKey, state);
      saveBadge.textContent = t("saved");
      rebuildLayer();
      updateCount();
      refreshMetaOverlay();
      updateCompleteBadge();
    });
    layer.appendChild(btn);
  }
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
  const countText = `${checkedCount()} / ${boardData.items.length} ${t("collected")}`;
  const fontFamily = "Arial";
  const maxWidth = 720;
  const color = displayNameColor === "red"
    ? { fill:"#d11d2c", stroke:"rgba(255,255,255,0.72)" }
    : displayNameColor === "white"
      ? { fill:"#fff", stroke:"rgba(0,0,0,0.92)" }
      : { fill:"#111", stroke:"rgba(255,255,255,0.72)" };
  const x = 48;
  const dateY = 42;
  const countY = 72;
  const nameY = name ? 102 : 0;
  const nameStart = displayNameSize === "small" ? 30 : displayNameSize === "large" ? 42 : 36;
  const nameMin = displayNameSize === "small" ? 20 : displayNameSize === "large" ? 28 : 24;
  ctx.save();
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  const drawLine = (text, y, start = 30, min = 22) => {
    const sz = fitFontSize(ctx, text, 700, start, min, maxWidth, fontFamily);
    ctx.font = `700 ${sz}px ${fontFamily}`;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color.fill;
    ctx.fillText(text, x, y);
  };
  if (eventsData.metaOverlay?.showDate !== false) drawLine(dateText, dateY);
  if (eventsData.metaOverlay?.showCount !== false) drawLine(countText, countY);
  if (name && eventsData.metaOverlay?.showName !== false) drawLine(name, nameY, nameStart, nameMin);
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
  const x = 1520;
  const y = 54;
  const w = 168;
  const h = 58;
  const r = 10;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.shadowColor = "rgba(0,0,0,0.20)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(255,255,255,0.96)");
  grad.addColorStop(1, "rgba(255,246,204,0.98)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowColor = "transparent";
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
function getDefaultBoardImageSrc() {
  return typeof boardData?.image?.src === "string" ? boardData.image.src.trim() : "";
}
function loadWorkingBoardOverride(fallbackBoardData) {
  try {
    const raw = localStorage.getItem(WORKING_BOARD_JSON_KEY) || "";
    if (!raw) return fallbackBoardData;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallbackBoardData;
    if (parsed.boardId !== fallbackBoardData.boardId) return fallbackBoardData;
    if (!Array.isArray(parsed.items)) return fallbackBoardData;
    if (!parsed.image || typeof parsed.image.width !== "number" || typeof parsed.image.height !== "number") {
      return fallbackBoardData;
    }
    return parsed;
  } catch (error) {
    console.warn("viewer working board load failed", error);
    return fallbackBoardData;
  }
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexedDB open failed"));
  });
}
async function readImageFromIndexedDb() {
  const db = await openImageDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.get(IMAGE_RECORD_KEY);
    request.onsuccess = () => {
      db.close();
      resolve(typeof request.result === "string" ? request.result : "");
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("indexedDB read failed"));
    };
  });
}
async function writeImageToIndexedDb(dataUrl) {
  const db = await openImageDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.put(dataUrl, IMAGE_RECORD_KEY);
    request.onsuccess = () => {
      db.close();
      resolve(true);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("indexedDB write failed"));
    };
  });
}
async function deleteImageFromIndexedDb() {
  const db = await openImageDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(IMAGE_RECORD_KEY);
    request.onsuccess = () => {
      db.close();
      resolve(true);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("indexedDB delete failed"));
    };
  });
}
async function waitForImageResult(img) {
  if (img.complete) {
    return img.naturalWidth > 0;
  }
  return await new Promise((resolve) => {
    img.addEventListener("load", () => resolve(true), { once:true });
    img.addEventListener("error", () => resolve(false), { once:true });
  });
}
async function loadImageSource(img, src) {
  if (!src) return false;
  img.src = src;
  return await waitForImageResult(img);
}
function getLegacyStoredImageDataUrl() {
  return localStorage.getItem(IMAGE_DATA_URL_KEY) || "";
}
function clearLegacyStoredImageDataUrl() {
  localStorage.removeItem(IMAGE_DATA_URL_KEY);
}
async function ensureBoardImageLoaded() {
  if (boardImage.complete && boardImage.naturalWidth > 0) return true;
  if (boardImage.src) {
    return await waitForImageResult(boardImage);
  }

  try {
    const idbImage = await readImageFromIndexedDb();
    if (idbImage) {
      const ready = await loadImageSource(boardImage, idbImage);
      if (ready) return true;
    }
  } catch (error) {
    console.warn("viewer indexedDB read failed", error);
  }

  const legacyImage = getLegacyStoredImageDataUrl();
  if (legacyImage) {
    const ready = await loadImageSource(boardImage, legacyImage);
    if (ready) {
      try {
        await writeImageToIndexedDb(legacyImage);
        clearLegacyStoredImageDataUrl();
      } catch (error) {
        console.warn("viewer legacy image migration failed", error);
      }
      return true;
    }
  }

  const fallback = getDefaultBoardImageSrc();
  if (!fallback) return false;
  return await loadImageSource(boardImage, fallback);
}
async function buildChecklistBlob() {
  const ready = await ensureBoardImageLoaded();
  if (!ready) return null;
  const canvas = document.createElement("canvas");
  canvas.width = boardData.image.width;
  canvas.height = boardData.image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(boardImage, 0, 0, canvas.width, canvas.height);
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch {}
  }
  drawMetaText(ctx);
  boardData.items.forEach((box) => {
    if (state[box.id]) drawCheckOnContext(ctx, box);
  });
  drawCompleteStamp(ctx);
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
async function saveImage() {
  const blob = await buildChecklistBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fortnite-sprite-checklist-dev-${formatCurrentDate()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function applyLanguage() {
  nameInput.placeholder = t("namePlaceholder");
  colorLabel.textContent = t("colorLabel");
  sizeLabel.textContent = t("sizeLabel");
  nameColorSelect.setAttribute("aria-label", t("colorLabel"));
  nameSizeSelect.setAttribute("aria-label", t("sizeLabel"));
  nameColorSelect.options[0].text = t("colorBlack");
  nameColorSelect.options[1].text = t("colorRed");
  nameColorSelect.options[2].text = t("colorWhite");
  nameSizeSelect.options[0].text = t("sizeSmall");
  nameSizeSelect.options[1].text = t("sizeMedium");
  nameSizeSelect.options[2].text = t("sizeLarge");
  saveImageBtn.textContent = t("saveImage");
  resetBtn.textContent = t("reset");
  saveBadge.textContent = t("saved");
  pageHint.textContent = t("hint");
  pageFooter.innerHTML = t("footer");
  langJaBtn.classList.toggle("is-active", currentLanguage === "ja");
  langEnBtn.classList.toggle("is-active", currentLanguage === "en");
  refreshMetaOverlay();
}
async function handleImageFile(file) {
  try {
    const dataUrl = await readAsDataUrl(file);
    const ready = await loadImageSource(boardImage, dataUrl);
    if (!ready) {
      throw new Error("selected image load failed");
    }

    let stored = true;
    try {
      await writeImageToIndexedDb(dataUrl);
      clearLegacyStoredImageDataUrl();
    } catch (error) {
      stored = false;
      console.warn("viewer image indexedDB save failed", error);
    }

    imageStatus.textContent = stored
      ? (currentLanguage === "ja" ? "画像設定済み" : "Image ready")
      : (currentLanguage === "ja"
        ? "画像は表示中 / 保存は失敗"
        : "Image loaded (save failed).");
    imageStatus.classList.remove("warn");
  } catch (error) {
    console.error(error);
    imageStatus.textContent = t("imageLoadFailed");
    imageStatus.classList.add("warn");
  }
}
async function init() {
  const fetchedBoardData = await fetch(BOARD_PATH).then((res) => res.json());
  [eventsData] = await Promise.all([
    fetch(EVENTS_PATH).then((res) => res.json())
  ]);
  boardData = loadWorkingBoardOverride(fetchedBoardData);
  const validIds = new Set(boardData.items.map((item) => item.id));
  state = Object.fromEntries(Object.entries(loadJSON(boardData.storage.stateKey, {})).filter(([key, value]) => validIds.has(key) && !!value));
  saveJSON(boardData.storage.stateKey, state);
  displayName = normalizeName(localStorage.getItem(boardData.storage.nameKey) || "");
  displayNameColor = normalizeColor(localStorage.getItem(boardData.storage.nameColorKey) || "black");
  displayNameSize = normalizeSize(localStorage.getItem(boardData.storage.nameSizeKey) || "medium");
  currentLanguage = localStorage.getItem(boardData.storage.languageKey) === "en" ? "en" : "ja";

  nameInput.value = displayName;
  nameColorSelect.value = displayNameColor;
  nameSizeSelect.value = displayNameSize;

  boardInfo.textContent = `${t("boardLoaded")} | ${boardData.items.length} items | ${boardData.image.width} x ${boardData.image.height}`;
  devModeFlag.textContent = eventsData.ui?.devFlagText || "DEV JSON";

  nameInput.addEventListener("input", (event) => {
    displayName = normalizeName(event.target.value);
    localStorage.setItem(boardData.storage.nameKey, displayName);
    saveBadge.textContent = t("saved");
    refreshMetaOverlay();
    updateCompleteBadge();
  });
  nameColorSelect.addEventListener("change", (event) => {
    displayNameColor = normalizeColor(event.target.value);
    localStorage.setItem(boardData.storage.nameColorKey, displayNameColor);
    saveBadge.textContent = t("saved");
    refreshMetaOverlay();
  });
  nameSizeSelect.addEventListener("change", (event) => {
    displayNameSize = normalizeSize(event.target.value);
    localStorage.setItem(boardData.storage.nameSizeKey, displayNameSize);
    saveBadge.textContent = t("saved");
    refreshMetaOverlay();
  });
  langJaBtn.addEventListener("click", () => {
    currentLanguage = "ja";
    localStorage.setItem(boardData.storage.languageKey, currentLanguage);
    applyLanguage();
    rebuildLayer();
  });
  langEnBtn.addEventListener("click", () => {
    currentLanguage = "en";
    localStorage.setItem(boardData.storage.languageKey, currentLanguage);
    applyLanguage();
    rebuildLayer();
  });
  saveImageBtn.addEventListener("click", saveImage);
  resetBtn.addEventListener("click", () => {
    state = {};
    saveJSON(boardData.storage.stateKey, state);
    saveBadge.textContent = t("saved");
    rebuildLayer();
    updateCount();
    refreshMetaOverlay();
    updateCompleteBadge();
  });
  imageFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await handleImageFile(file);
  });
  clearImageBtn.addEventListener("click", async () => {
    try {
      await deleteImageFromIndexedDb();
    } catch (error) {
      console.warn("viewer indexedDB delete failed", error);
    }
    clearLegacyStoredImageDataUrl();
    boardImage.removeAttribute("src");
    imageStatus.textContent = t("imageMissing");
    imageStatus.classList.add("warn");
  });

  rebuildLayer();
  updateCount();
  refreshMetaOverlay();
  applyLanguage();
  updateCompleteBadge();

  const ready = await ensureBoardImageLoaded();
  if (ready) {
    imageStatus.textContent = t("imageLoaded");
    imageStatus.classList.remove("warn");
  } else {
    imageStatus.textContent = t("imageMissing");
    imageStatus.classList.add("warn");
  }
}

init().catch((error) => {
  console.error(error);
  pageHint.textContent = "JSON viewer の初期化に失敗しました。コンソールを確認してください。";
});