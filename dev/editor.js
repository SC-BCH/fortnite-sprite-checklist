const BOARD_PATH = "./boards/sprite-seirei.draft.json";
const IMAGE_DATA_URL_KEY = "fortnite_sprite_checklist_json_dev_image_v1";

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

let boardData;
let selectedId = null;
let originals = new Map();
let dragState = null;
let suppressNextLayerClick = false;

function pctX(value) { return (value / boardData.image.width) * 100; }
function pctY(value) { return (value / boardData.image.height) * 100; }
function getSelectedItem() {
  return boardData.items.find((item) => item.id === selectedId) || null;
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
  if (!item) return;
  selectedIdInput.value = item.id;
  selectedLabelInput.value = item.label?.ja || "";
  selectedXInput.value = String(item.x);
  selectedYInput.value = String(item.y);
  selectedWInput.value = String(item.w);
  selectedHInput.value = String(item.h);
}
function renderList() {
  itemList.innerHTML = "";
  for (const item of boardData.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `item-row${item.id === selectedId ? " is-active" : ""}`;
    button.innerHTML = `${item.label?.ja || item.id}<small>${item.id}</small>`;
    button.addEventListener("click", () => {
      selectedId = item.id;
      renderRects();
      renderList();
      syncInputs();
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
    rect.className = `editor-rect${item.id === selectedId ? " is-active" : ""}`;
    rect.style.left = `${pctX(item.x)}%`;
    rect.style.top = `${pctY(item.y)}%`;
    rect.style.width = `${pctX(item.w)}%`;
    rect.style.height = `${pctY(item.h)}%`;
    rect.title = item.label?.ja || item.id;
    rect.style.touchAction = "none";
    rect.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedId = item.id;
      renderRects();
      renderList();
      syncInputs();
    });
    rect.addEventListener("pointerdown", (event) => {
      if (event.target instanceof HTMLElement && event.target.dataset.handle) return;
      event.preventDefault();
      event.stopPropagation();
      selectedId = item.id;
      renderRects();
      renderList();
      syncInputs();
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
        event.preventDefault();
        event.stopPropagation();
        selectedId = item.id;
        renderRects();
        renderList();
        syncInputs();
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
async function ensureImageLoaded() {
  const saved = localStorage.getItem(IMAGE_DATA_URL_KEY) || "";
  if (!editorBoardImage.src && saved) editorBoardImage.src = saved;
  if (editorBoardImage.complete && editorBoardImage.naturalWidth > 0) return true;
  if (!editorBoardImage.src) return false;
  await new Promise((resolve, reject) => {
    editorBoardImage.addEventListener("load", resolve, { once:true });
    editorBoardImage.addEventListener("error", reject, { once:true });
  });
  return true;
}
async function handleImageFile(file) {
  try {
    const dataUrl = await readAsDataUrl(file);
    localStorage.setItem(IMAGE_DATA_URL_KEY, dataUrl);
    editorBoardImage.src = dataUrl;
    await ensureImageLoaded();
    setStatus("画像設定済み", false);
  } catch (error) {
    console.error(error);
    setStatus("画像の読込に失敗しました", true);
  }
}
function downloadJson() {
  const blob = new Blob([jsonOutput.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sprite-seirei.draft.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  boardData = await fetch(BOARD_PATH).then((res) => res.json());
  originals = new Map(boardData.items.map((item) => [item.id, JSON.parse(JSON.stringify(item))]));
  selectedId = boardData.items[0]?.id || null;
  itemCountBadge.textContent = `${boardData.items.length} items`;
  editorBoardInfo.textContent = `board 読込済み | ${boardData.image.width} x ${boardData.image.height}`;
  syncJsonOutput();
  renderList();
  renderRects();
  syncInputs();

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
  copyJsonBtn.addEventListener("click", copyJson);
  downloadJsonBtn.addEventListener("click", downloadJson);
  editorImageFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await handleImageFile(file);
  });
  editorClearImageBtn.addEventListener("click", () => {
    localStorage.removeItem(IMAGE_DATA_URL_KEY);
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
