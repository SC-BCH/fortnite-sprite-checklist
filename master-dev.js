(function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    layer: $("layer"),
    boardImage: $("boardImage"),
    countBadge: $("countBadge"),
    saveBadge: $("saveBadge"),
    dateOverlay: $("dateOverlay"),
    countOverlay: $("countOverlay"),
    nameOverlay: $("nameOverlay"),
    nameInput: $("nameInput"),
    nameColorSelect: $("nameColorSelect"),
    nameSizeSelect: $("nameSizeSelect"),
    langJaBtn: $("langJaBtn"),
    langEnBtn: $("langEnBtn"),
    saveImageBtn: $("saveImageBtn"),
    resetBtn: $("resetBtn"),
    completeBadge: $("completeBadge")
  };

  if (!els.layer || !els.boardImage) return;

  let manifest;
  let board;
  let state = {};

  const json = (url) => fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  });
  const pctX = (value) => `${(value / board.image.width) * 100}%`;
  const pctY = (value) => `${(value / board.image.height) * 100}%`;
  const pad = (value) => String(value).padStart(2, "0");
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };
  const normalizeName = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const normalizeState = (value) => {
    if (value === true) return 1;
    if (value === 1 || value === "1") return 1;
    if (value === 2 || value === "2") return 2;
    return 0;
  };
  const getState = (item) => normalizeState(state[item.id]);
  const lang = () => localStorage.getItem(board.storage.languageKey) === "en" ? "en" : "ja";
  const collectedText = () => lang() === "en" ? "Collected" : "所持";
  const masteredText = () => lang() === "en" ? "Mastered" : "マスター";
  const collected = () => board.items.reduce((sum, item) => sum + (getState(item) >= 1 ? 1 : 0), 0);
  const mastered = () => board.items.reduce((sum, item) => sum + (getState(item) === 2 ? 1 : 0), 0);
  const isComplete = () => collected() === board.items.length;
  const masterBox = (item) => ({ x: item.x + 10, y: item.y - 205, w: 88, h: 62 });

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(board.storage.stateKey) || "{}");
      state = {};
      Object.entries(raw).forEach(([key, value]) => {
        const normalized = normalizeState(value);
        if (normalized > 0) state[key] = normalized;
      });
    } catch {
      state = {};
    }
  }
  function saveState() {
    const clean = {};
    board.items.forEach((item) => {
      const value = getState(item);
      if (value > 0) clean[item.id] = value;
    });
    state = clean;
    localStorage.setItem(board.storage.stateKey, JSON.stringify(state));
    if (els.saveBadge) els.saveBadge.textContent = lang() === "en" ? "Saved" : "保存済み";
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
  function updateMeta() {
    if (els.countBadge) els.countBadge.textContent = `${collected()} / ${board.items.length}`;
    if (els.dateOverlay) els.dateOverlay.textContent = today();
    if (els.countOverlay) els.countOverlay.textContent = `${collectedText()} ${collected()} / ${board.items.length}\n${masteredText()} ${mastered()} / ${board.items.length}`;
    if (els.nameOverlay && els.nameInput) {
      const name = normalizeName(els.nameInput.value || localStorage.getItem(board.storage.nameKey) || "");
      els.nameOverlay.textContent = name;
      els.nameOverlay.classList.toggle("is-hidden", !name);
    }
    if (els.completeBadge) {
      const show = isComplete();
      els.completeBadge.classList.toggle("show", show);
      els.completeBadge.setAttribute("aria-hidden", show ? "false" : "true");
      const sub = els.completeBadge.querySelector(".complete-badge-sub");
      if (sub) sub.textContent = `${board.items.length} / ${board.items.length} COLLECTED`;
    }
  }
  function render() {
    els.layer.innerHTML = "";
    board.items.forEach((item) => {
      const value = getState(item);
      if (value === 2) {
        const crown = document.createElement("div");
        const box = masterBox(item);
        crown.className = "master-crown";
        crown.style.left = pctX(box.x);
        crown.style.top = pctY(box.y);
        crown.style.width = pctX(box.w);
        crown.style.height = pctY(box.h);
        crown.appendChild(makeCrown());
        els.layer.appendChild(crown);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box";
      btn.style.left = pctX(item.x);
      btn.style.top = pctY(item.y);
      btn.style.width = pctX(item.w);
      btn.style.height = pctY(item.h);
      btn.dataset.state = String(value);
      if (value >= 1) btn.appendChild(makeMark());
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = (getState(item) + 1) % 3;
        if (next === 0) delete state[item.id];
        else state[item.id] = next;
        saveState();
        render();
      });
      els.layer.appendChild(btn);
    });
    updateMeta();
  }
  function drawCheck(ctx, item) {
    const p1x = item.x + item.w * 0.18;
    const p1y = item.y + item.h * 0.56;
    const p2x = item.x + item.w * 0.40;
    const p2y = item.y + item.h * 0.76;
    const p3x = item.x + item.w * 0.82;
    const p3y = item.y + item.h * 0.24;
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
  function drawCrown(ctx, item) {
    const b = masterBox(item);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.w / 100, b.h / 70);
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
  function drawText(ctx, text, x, y, size) {
    ctx.font = `700 ${size}px Arial`;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#111";
    ctx.fillText(text, x, y);
  }
  async function saveImage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const canvas = document.createElement("canvas");
    canvas.width = board.image.width;
    canvas.height = board.image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(els.boardImage, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "top";
    drawText(ctx, today(), 48, 42, 30);
    drawText(ctx, `${collectedText()} ${collected()} / ${board.items.length}`, 48, 72, 30);
    drawText(ctx, `${masteredText()} ${mastered()} / ${board.items.length}`, 48, 102, 28);
    const name = normalizeName(els.nameInput?.value || "");
    if (name) drawText(ctx, name, 48, 132, 36);
    board.items.forEach((item) => { if (getState(item) === 2) drawCrown(ctx, item); });
    board.items.forEach((item) => { if (getState(item) >= 1) drawCheck(ctx, item); });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortnite-sprite-checklist-master-dev-${today()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function init() {
    manifest = await json("./board.manifest.json");
    board = await json(manifest.board);
    if (manifest.image) els.boardImage.src = manifest.image;
    loadState();
    saveState();
    if (els.saveImageBtn) els.saveImageBtn.addEventListener("click", saveImage, true);
    if (els.resetBtn) els.resetBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      state = {};
      saveState();
      render();
    }, true);
    [els.langJaBtn, els.langEnBtn, els.nameInput, els.nameColorSelect, els.nameSizeSelect].forEach((el) => {
      if (el) el.addEventListener("click", () => setTimeout(render, 0));
      if (el) el.addEventListener("input", () => setTimeout(render, 0));
      if (el) el.addEventListener("change", () => setTimeout(render, 0));
    });
    if (els.boardImage.complete && els.boardImage.naturalWidth > 0) render();
    else els.boardImage.addEventListener("load", render, { once: true });
  }
  init().catch((error) => {
    console.error(error);
    const hint = $("pageHint");
    if (hint) hint.textContent = "Master dev initialization failed.";
  });
})();


