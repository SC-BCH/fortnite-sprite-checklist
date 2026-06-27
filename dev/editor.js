const BOARD_PATH = "./boards/sprite-seirei.draft.json";
const IMAGE_DATA_URL_KEY = "fortnite_sprite_checklist_json_dev_image_v1";
const IMAGE_DB_NAME = "fortnite_sprite_checklist_dev_assets";
const IMAGE_DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";
const IMAGE_RECORD_KEY = "shared-image";
const WORKING_BOARD_JSON_KEY = "fortnite_sprite_checklist_json_dev_working_board_v1";

const $ = (id) => document.getElementById(id);
const itemCountBadge = $("itemCountBadge");
const editorImageStatus = $("editorImageStatus");
const editorBoardInfo = $("editorBoardInfo");
const editorHint = $("editorHint");
const editorBoardImage = $("editorBoardImage");
const editorLayer = $("editorLayer");
const editorImageFileInput = $("editorImageFileInput");
const editorClearImageBtn = $("editorClearImageBtn");
const selectedIdInput = $("selectedIdInput");
const selectedLabelInput = $("selectedLabelInput");
const selectedXInput = $("selectedXInput");
const selectedYInput = $("selectedYInput");
const selectedWInput = $("selectedWInput");
const selectedHInput = $("selectedHInput");
const nudgeLeftBtn = $("nudgeLeftBtn");
const nudgeUpBtn = $("nudgeUpBtn");
const nudgeDownBtn = $("nudgeDownBtn");
const nudgeRightBtn = $("nudgeRightBtn");
const resetSelectedBtn = $("resetSelectedBtn");
const selectionCountBadge = $("selectionCountBadge");
const alignXBtn = $("alignXBtn");
const alignYBtn = $("alignYBtn");
const distributeXBtn = $("distributeXBtn");
const clearSelectionBtn = $("clearSelectionBtn");
const copyJsonBtn = $("copyJsonBtn");
const downloadJsonBtn = $("downloadJsonBtn");
const itemList = $("itemList");
const jsonOutput = $("jsonOutput");

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isMultiSelectEvent = (event) => !!(event?.ctrlKey || event?.metaKey || event?.shiftKey);

let boardData;
let selectedId = null;
let selectedIds = new Set();
let originals = new Map();
let dragState = null;
let suppressNextLayerClick = false;

function pctX(value) { return (value / boardData.image.width) * 100; }
function pctY(value) { return (value / boardData.image.height) * 100; }
function getSelectedItem() {
  return boardData.items.find((item) => item.id === selectedId) || null;
}
function getSelectedItems() {
  return boardData.items.filter((item) => selectedIds.has(item.id));
}
function syncJsonOutput() {
  jsonOutput.value = JSON.stringify(boardData, null, 2);
}
function setStatus(text, warn) {
  editorImageStatus.textContent = text;
  editorImageStatus.classList.toggle("warn", !!warn);
}
function syncInputs() {
  const item = getSelectedItem();
  if (!item) {
    selectedIdInput.value = "";
    selectedLabelInput.value = "";
    selectedXInput.value = "";
    selectedYInput.value = "";
    selectedWInput.value = "";
    selectedHInput.value = "";
    return;
  }
  selectedIdInput.value = item.id;
  selectedLabelInput.value = item.label?.ja || "";
  selectedXInput.value = String(item.x);
  selectedYInput.value = String(item.y);
  selectedWInput.value = String(item.w);
  selectedHInput.value = String(item.h);
}
function updateSelectionControls() {
  const count = selectedIds.size;
  selectionCountBadge.textContent = `${count}選択`;
  const hasPrimary = !!getSelectedItem();
  const hasMany = count >= 2;
  const hasThree = count >= 3;

  selectedLabelInput.disabled = !hasPrimary;
  selectedXInput.disabled = !hasPrimary;
  selectedYInput.disabled = !hasPrimary;
  selectedWInput.disabled = !hasPrimary;
  selectedHInput.disabled = !hasPrimary;
  nudgeLeftBtn.disabled = !hasPrimary;
  nudgeUpBtn.disabled = !hasPrimary;
  nudgeDownBtn.disabled = !hasPrimary;
  nudgeRightBtn.disabled = !hasPrimary;
  resetSelectedBtn.disabled = !hasPrimary;
  alignXBtn.disabled = !hasMany;
  alignYBtn.disabled = !hasMany;
  distributeXBtn.disabled = !hasThree;
  clearSelectionBtn.disabled = count === 0;
}
function selectSingleItem(itemId) {
  selectedId = itemId || null;
  selectedIds = itemId ? new Set([itemId]) : new Set();
}
function toggleSelectedItem(itemId) {
  if (!itemId) return;
  if (selectedIds.has(itemId)) {
    selectedIds.delete(itemId);
    if (selectedId === itemId) {
      selectedId = selectedIds.size ? Array.from(selectedIds).at(-1) : null;
    }
  } else {
    selectedIds.add(itemId);
    selectedId = itemId;
  }
}
function applySelection(itemId, additive) {
  if (additive) {
    toggleSelectedItem(itemId);
  } else {
    selectSingleItem(itemId);
  }
  syncAll();
}
function clearSelection() {
  selectSingleItem(null);
  syncAll();
}
function renderList() {
  itemList.innerHTML = "";
  for (const item of boardData.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `item-row${selectedIds.has(item.id) ? " is-active" : ""}`;
    button.innerHTML = `${item.label?.ja || item.id}<small>${item.id}</small>`;
    button.addEventListener("click", (event) => {
      applySelection(item.id, isMultiSelectEvent(event));
    });
    itemList.appendChild(button);
  }
}
function normalizeItem(item) {
  item.x = clamp(Math.round(item.x), 0, boardData.image.width - 1);
  item.y = clamp(Math.round(item.y), 0, boardData.image.height - 1);
  item.w = clamp(Math.round(item.w), 1, boardData.image.width);
  item.h = clamp(Math.round(item.h), 1, boardData.image.height);
  if (item.x + item.w > boardData.image.width) item.x = boardData.image.width - item.w;
  if (item.y + item.h > boardData.image.height) item.y = boardData.image.height - item.h;
}
function createHandle(position, cursor) {
  const handle = document.createElement("span");
  handle.dataset.handle = position;
  handle.style.position = "absolute";
  handle.style.width = "14px";
  handle.style.height = "14px";
  handle.style.borderRadius = "999px";
  handle.style.background = "rgba(255,255,255,0.92)";
  handle.style.border = "2px solid rgba(255,77,79,0.95)";
  handle.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
  handle.style.pointerEvents = "auto";
  handle.style.cursor = cursor;
  handle.style.zIndex = "2";
  if (position.includes("t")) handle.style.top = "-7px";
  if (position.includes("b")) handle.style.bottom = "-7px";
  if (position.includes("l")) handle.style.left = "-7px";
  if (position.includes("r")) handle.style.right = "-7px";
  return handle;
}
function renderRects() {
  editorLayer.innerHTML = "";
  for (const item of boardData.items) {
    const rect = document.createElement("button");
    rect.type = "button";
    rect.className = `editor-rect${selectedIds.has(item.id) ? " is-active" : ""}`;
    rect.style.left = `${pctX(item.x)}%`;
    rect.style.top = `${pctY(item.y)}%`;
    rect.style.width = `${pctX(item.w)}%`;
    rect.style.height = `${pctY(item.h)}%`;
    rect.title = item.label?.ja || item.id;
    rect.style.touchAction = "none";
    rect.addEventListener("click", (event) => {
      event.stopPropagation();
      applySelection(item.id, isMultiSelectEvent(event));
    });
    rect.addEventListener("pointerdown", (event) => {
      if (event.target instanceof HTMLElement && event.target.dataset.handle) return;
      if (isMultiSelectEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!selectedIds.has(item.id) || selectedIds.size !== 1) {
        selectSingleItem(item.id);
        syncAll();
      }
      rect.setPointerCapture?.(event.pointerId);
      dragState = {
        pointerId: event.pointerId,
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: item.x,
        startY: item.y,
        startW: item.w,
        startH: item.h,
        itemId: item.id,
        moved: false
      };
    });

    const handles = [
      ["tl", "nwse-resize"],
      ["tr", "nesw-resize"],
      ["bl", "nesw-resize"],
      ["br", "nwse-resize"]
    ];
    for (const [position, cursor] of handles) {
      const handle = createHandle(position, cursor);
      handle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      handle.addEventListener("pointerdown", (event) => {
        if (isMultiSelectEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!selectedIds.has(item.id) || selectedIds.size !== 1) {
          selectSingleItem(item.id);
          syncAll();
        }
        rect.setPointerCapture?.(event.pointerId);
        dragState = {
          pointerId: event.pointerId,
          mode: `resize-${position}`,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: item.x,
          startY: item.y,
          startW: item.w,
          startH: item.h,
          itemId: item.id,
          moved: false
        };
      });
      rect.appendChild(handle);
    }

    editorLayer.appendChild(rect);
  }
}
function syncAll() {
  renderRects();
  renderList();
  syncInputs();
  updateSelectionControls();
  syncJsonOutput();
}
function updateSelected(mutator) {
  const item = getSelectedItem();
  if (!item) return;
  mutator(item);
  normalizeItem(item);
  syncAll();
}
function updateItemById(itemId, mutator) {
  const item = boardData.items.find((entry) => entry.id === itemId);
  if (!item) return;
  mutator(item);
  normalizeItem(item);
  syncAll();
}
function moveDraggedItem(event) {
  if (!dragState) return;
  if (event.pointerId !== dragState.pointerId) return;
  const rect = editorLayer.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dx = (event.clientX - dragState.startClientX) / rect.width * boardData.image.width;
  const dy = (event.clientY - dragState.startClientY) / rect.height * boardData.image.height;
  if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
    dragState.moved = true;
  }

  updateItemById(dragState.itemId, (item) => {
    if (dragState.mode === "move") {
      item.x = dragState.startX + dx;
      item.y = dragState.startY + dy;
      return;
    }
    if (dragState.mode === "resize-br") {
      item.w = dragState.startW + dx;
      item.h = dragState.startH + dy;
      return;
    }
    if (dragState.mode === "resize-tr") {
      item.y = dragState.startY + dy;
      item.w = dragState.startW + dx;
      item.h = dragState.startH - dy;
      return;
    }
    if (dragState.mode === "resize-bl") {
      item.x = dragState.startX + dx;
      item.w = dragState.startW - dx;
      item.h = dragState.startH + dy;
      return;
    }
    if (dragState.mode === "resize-tl") {
      item.x = dragState.startX + dx;
      item.y = dragState.startY + dy;
      item.w = dragState.startW - dx;
      item.h = dragState.startH - dy;
    }
  });
}
function endDrag(event) {
  if (!dragState) return;
  if (event.pointerId !== dragState.pointerId) return;
  const moved = dragState.moved;
  dragState = null;
  if (moved) {
    suppressNextLayerClick = true;
    setTimeout(() => {
      suppressNextLayerClick = false;
    }, 0);
  }
}
function alignSelectedX() {
  const anchor = getSelectedItem();
  const items = getSelectedItems();
  if (!anchor || items.length < 2) return;
  const targetX = anchor.x;
  items.forEach((item) => {
    item.x = targetX;
    normalizeItem(item);
  });
  syncAll();
}
function alignSelectedY() {
  const anchor = getSelectedItem();
  const items = getSelectedItems();
  if (!anchor || items.length < 2) return;
  const targetY = anchor.y;
  items.forEach((item) => {
    item.y = targetY;
    normalizeItem(item);
  });
  syncAll();
}
function distributeSelectedX() {
  const items = getSelectedItems().slice().sort((a, b) => a.x - b.x);
  if (items.length < 3) return;
  const firstX = items[0].x;
  const lastX = items[items.length - 1].x;
  const step = (lastX - firstX) / (items.length - 1);
  items.forEach((item, index) => {
    if (index === 0 || index === items.length - 1) return;
    item.x = Math.round(firstX + step * index);
    normalizeItem(item);
  });
  syncAll();
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
    console.warn("editor working board load failed", error);
    return fallbackBoardData;
  }
}
function saveWorkingBoardOverride() {
  localStorage.setItem(WORKING_BOARD_JSON_KEY, JSON.stringify(boardData));
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
async function ensureImageLoaded() {
  if (editorBoardImage.complete && editorBoardImage.naturalWidth > 0) return true;
  if (editorBoardImage.src) {
    return await waitForImageResult(editorBoardImage);
  }

  try {
    const idbImage = await readImageFromIndexedDb();
    if (idbImage) {
      const ready = await loadImageSource(editorBoardImage, idbImage);
      if (ready) return true;
    }
  } catch (error) {
    console.warn("editor indexedDB read failed", error);
  }

  const legacyImage = getLegacyStoredImageDataUrl();
  if (legacyImage) {
    const ready = await loadImageSource(editorBoardImage, legacyImage);
    if (ready) {
      try {
        await writeImageToIndexedDb(legacyImage);
        clearLegacyStoredImageDataUrl();
      } catch (error) {
        console.warn("editor legacy image migration failed", error);
      }
      return true;
    }
  }

  const fallback = getDefaultBoardImageSrc();
  if (!fallback) return false;
  return await loadImageSource(editorBoardImage, fallback);
}
async function handleImageFile(file) {
  try {
    const dataUrl = await readAsDataUrl(file);
    const ready = await loadImageSource(editorBoardImage, dataUrl);
    if (!ready) {
      throw new Error("selected image load failed");
    }

    let stored = true;
    try {
      await writeImageToIndexedDb(dataUrl);
      clearLegacyStoredImageDataUrl();
    } catch (error) {
      stored = false;
      console.warn("editor image indexedDB save failed", error);
    }

    setStatus(stored ? "画像設定済み" : "画像は表示中 / 保存は失敗", false);
  } catch (error) {
    console.error(error);
    setStatus("画像の読込に失敗しました", true);
  }
}
function saveWorkingBoardJson() {
  try {
    saveWorkingBoardOverride();
    editorHint.textContent = "作業中JSONをブラウザ保存しました。viewer で位置確認できます。";
  } catch (error) {
    console.error(error);
    editorHint.textContent = "作業中JSONの保存に失敗しました。コンソールを確認してください。";
  }
}
function copyJson() {
  jsonOutput.focus();
  jsonOutput.select();
  document.execCommand("copy");
  editorHint.textContent = "JSON をコピーしました。";
}
function resetSelected() {
  const item = getSelectedItem();
  if (!item) return;
  const original = originals.get(item.id);
  if (!original) return;
  item.label = { ...original.label };
  item.x = original.x;
  item.y = original.y;
  item.w = original.w;
  item.h = original.h;
  syncAll();
}

async function init() {
  const fetchedBoardData = await fetch(BOARD_PATH).then((res) => res.json());
  boardData = loadWorkingBoardOverride(fetchedBoardData);
  originals = new Map(fetchedBoardData.items.map((item) => [item.id, JSON.parse(JSON.stringify(item))]));
  selectedId = boardData.items[0]?.id || null;
  selectedIds = selectedId ? new Set([selectedId]) : new Set();
  itemCountBadge.textContent = `${boardData.items.length} items`;
  editorBoardInfo.textContent = `board 読込済み | ${boardData.image.width} x ${boardData.image.height}`;
  syncJsonOutput();
  renderList();
  renderRects();
  syncInputs();
  updateSelectionControls();

  editorLayer.addEventListener("click", (event) => {
    if (suppressNextLayerClick) return;
    const item = getSelectedItem();
    if (!item) return;
    const rect = editorLayer.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * boardData.image.width;
    const py = (event.clientY - rect.top) / rect.height * boardData.image.height;
    updateSelected((target) => {
      target.x = Math.round(px - target.w / 2);
      target.y = Math.round(py - target.h / 2);
    });
  });
  window.addEventListener("pointermove", moveDraggedItem);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  selectedLabelInput.addEventListener("input", (event) => updateSelected((item) => {
    item.label = item.label || {};
    item.label.ja = String(event.target.value || "");
  }));
  selectedXInput.addEventListener("input", (event) => updateSelected((item) => { item.x = Number(event.target.value || 0); }));
  selectedYInput.addEventListener("input", (event) => updateSelected((item) => { item.y = Number(event.target.value || 0); }));
  selectedWInput.addEventListener("input", (event) => updateSelected((item) => { item.w = Number(event.target.value || 1); }));
  selectedHInput.addEventListener("input", (event) => updateSelected((item) => { item.h = Number(event.target.value || 1); }));

  nudgeLeftBtn.addEventListener("click", () => updateSelected((item) => { item.x -= 1; }));
  nudgeUpBtn.addEventListener("click", () => updateSelected((item) => { item.y -= 1; }));
  nudgeDownBtn.addEventListener("click", () => updateSelected((item) => { item.y += 1; }));
  nudgeRightBtn.addEventListener("click", () => updateSelected((item) => { item.x += 1; }));
  resetSelectedBtn.addEventListener("click", resetSelected);
  alignXBtn.addEventListener("click", alignSelectedX);
  alignYBtn.addEventListener("click", alignSelectedY);
  distributeXBtn.addEventListener("click", distributeSelectedX);
  clearSelectionBtn.addEventListener("click", clearSelection);
  copyJsonBtn.addEventListener("click", copyJson);
  downloadJsonBtn.addEventListener("click", saveWorkingBoardJson);
  editorImageFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await handleImageFile(file);
  });
  editorClearImageBtn.addEventListener("click", async () => {
    try {
      await deleteImageFromIndexedDb();
    } catch (error) {
      console.warn("editor indexedDB delete failed", error);
    }
    clearLegacyStoredImageDataUrl();
    editorBoardImage.removeAttribute("src");
    setStatus("画像未設定", true);
  });

  const ready = await ensureImageLoaded();
  if (ready) {
    setStatus("画像設定済み", false);
  } else {
    setStatus("画像未設定", true);
  }
}

init().catch((error) => {
  console.error(error);
  editorHint.textContent = "editor の初期化に失敗しました。コンソールを確認してください。";
});