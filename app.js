"use strict";

/* ------------------------------------------------------------------ *
 * anti-clickjacking: en GitHub Pages no hay forma de mandar el header
 * X-Frame-Options/frame-ancestors (Pages no soporta headers custom), asi
 * que este guard cubre ese caso puntual. En Vercel ya lo hace vercel.json.
 * ------------------------------------------------------------------ */
if (window.top !== window.self) {
  window.top.location = window.self.location;
}

/* ------------------------------------------------------------------ *
 * config
 * ------------------------------------------------------------------ */

const API_BASE = "https://github-contributions-api.jogruber.de/v4/";
const CACHE_PREFIX = "ghcc:v1:";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min: corto, evita golpear la API en cada refresh
const QUARTER_DAYS = 91;

const STEP_PX = 18; // "step" fijo para dividir la distancia entre cuadrados
const MIN_STEPS = 3;
const MAX_STEPS = 14;
const TICK_MS = 90; // ~11fps, animacion en pasos (no transiciones suaves)

const LEVEL_COLORS = ["#1b1330", "#3a2a5c", "#6b3fa0", "#b355c9", "#ff8fd6"];

const CREATURE_ORDER = ["slime", "cat", "ghost"];

/* ------------------------------------------------------------------ *
 * pixel sprites (8 cols x 7 rows, "." = transparente)
 * cada criatura tiene 3 frames de salto: crouch / air / crouch(land)
 * y un frame idle para cuando esta sola/quieta
 * ------------------------------------------------------------------ */

const SPRITES = {
  slime: {
    palette: { A: "#b355c9", B: "#0e0918", C: "#ff8fd6" },
    frames: {
      idle: [
        ".AAAAAA.",
        "AAAAAAAA",
        "AB.CC.BA",
        "AAAAAAAA",
        "AAAAAAAA",
        ".AAAAAA.",
        ".A....A.",
      ],
      crouch: [
        "........",
        ".AAAAAA.",
        "AB.CC.BA",
        "AAAAAAAA",
        ".AAAAAA.",
        ".AAAAAA.",
        "AA.AA.AA",
      ],
      air: [
        "..AAAA..",
        ".AAAAAA.",
        ".B.CC.B.",
        ".AAAAAA.",
        ".AAAAAA.",
        ".AAAAAA.",
        "..AAAA..",
      ],
    },
  },
  cat: {
    palette: { A: "#8a5cf6", B: "#0e0918", C: "#ff8fd6" },
    frames: {
      idle: [
        "A......A",
        "AA....AA",
        "AAAAAAAA",
        "ABAACABA",
        "AAAAAAAA",
        ".AAAAAA.",
        "..A..A..",
      ],
      crouch: [
        "........",
        "A......A",
        "AAAAAAAA",
        "ABAACABA",
        "AAAAAAAA",
        "AAAAAAAA",
        "A.AAAA.A",
      ],
      air: [
        ".A....A.",
        "AA....AA",
        ".AAAAAA.",
        ".BAACAB.",
        ".AAAAAA.",
        "A.AAAA.A",
        "........",
      ],
    },
  },
  ghost: {
    palette: { A: "#ece6ff", B: "#0e0918", C: "#b9a3ff" },
    frames: {
      idle: [
        ".AAAAAA.",
        "AAAAAAAA",
        "AABAABAA",
        "AACAACAA",
        "AAAAAAAA",
        "AAAAAAAA",
        "A.A.A.A.",
      ],
      crouch: [
        "........",
        ".AAAAAA.",
        "AABAABAA",
        "AACAACAA",
        "AAAAAAAA",
        "A.A.A.A.",
        "........",
      ],
      air: [
        "..AAAA..",
        ".AAAAAA.",
        "AABAABAA",
        "AACAACAA",
        "AAAAAAAA",
        "AAAAAAAA",
        ".A.A.A..",
      ],
    },
  },
};

function drawSprite(ctx, spriteKey, frameKey, cx, cy, size) {
  const sprite = SPRITES[spriteKey];
  const frame = sprite.frames[frameKey] || sprite.frames.idle;
  const px = size / 8;
  const w = 8 * px;
  const h = 7 * px;
  const originX = cx - w / 2;
  const originY = cy - h / 2;
  for (let row = 0; row < frame.length; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      ctx.fillStyle = sprite.palette[ch] || "#fff";
      ctx.fillRect(
        Math.round(originX + col * px),
        Math.round(originY + row * px),
        Math.ceil(px),
        Math.ceil(px)
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * cache (localStorage)
 * ------------------------------------------------------------------ */

function cacheKey(user) {
  return CACHE_PREFIX + user.toLowerCase();
}

function readCache(user) {
  try {
    const raw = localStorage.getItem(cacheKey(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.ts) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function writeCache(user, data) {
  try {
    localStorage.setItem(cacheKey(user), JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {
    /* localStorage lleno o deshabilitado: seguimos sin cache */
  }
}

/* ------------------------------------------------------------------ *
 * fetch de contribuciones
 * ------------------------------------------------------------------ */

async function fetchContributions(username) {
  const cached = readCache(username);
  const fresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;
  if (fresh) {
    return { data: cached.data, fromCache: true, stale: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(API_BASE + encodeURIComponent(username) + "?y=last", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (res.status === 404) {
      throw new Error("not_found");
    }
    if (!res.ok) {
      throw new Error("http_" + res.status);
    }
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error === "not found" ? "not_found" : json.error);
    }
    if (!Array.isArray(json.contributions)) {
      throw new Error("bad_shape");
    }
    writeCache(username, json);
    return { data: json, fromCache: false, stale: false };
  } catch (err) {
    if (cached) {
      // fuente caida pero hay algo viejo en cache: mejor mostrar eso que nada
      return { data: cached.data, fromCache: true, stale: true };
    }
    if (err.name === "AbortError") {
      throw new Error("timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Los datos vienen de una API de terceros (y a veces de localStorage, que
 * cualquier script del mismo origen podria haber escrito). Nunca se confia
 * en su forma: se filtra/coerciona antes de usarlos en la grilla o en sumas,
 * asi un date/count/level invalido no puede romper el layout ni "envenenar"
 * silenciosamente el total mostrado (p.ej. concatenacion de strings si
 * count llegara como texto).
 */
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function normalizeContributions(raw) {
  if (!raw || !Array.isArray(raw.contributions)) return { contributions: [] };
  const now = Date.now();
  const contributions = raw.contributions
    .filter((d) => {
      if (!d || typeof d.date !== "string" || !ISO_DATE_RE.test(d.date)) return false;
      const t = parseLocalDate(d.date).getTime();
      if (Number.isNaN(t)) return false; // fecha con forma ISO pero invalida (ej. mes 13)
      return t <= now + ONE_DAY_MS && t >= now - TEN_YEARS_MS;
    })
    .map((d) => {
      const count = Number(d.count);
      const level = Number(d.level);
      return {
        date: d.date,
        count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
        level: Number.isFinite(level) ? Math.min(4, Math.max(0, Math.round(level))) : 0,
      };
    });
  return { contributions };
}

/* ------------------------------------------------------------------ *
 * grilla (52 semanas x 7 dias, layout tipo GitHub)
 * ------------------------------------------------------------------ */

function parseLocalDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

function buildWeeks(days) {
  if (!days.length) return [];
  const weeks = [];
  let week = [];
  const firstDow = parseLocalDate(days[0].date).getDay();
  for (let i = 0; i < firstDow; i++) week.push(null);
  for (const day of days) {
    const dow = parseLocalDate(day.date).getDay();
    if (dow === 0 && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    week.push(day);
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function computeLayout(weeksCount, canvasW, canvasH) {
  const marginLeft = 26;
  const marginRight = 16;
  const marginTop = 30;
  const marginBottom = 10;
  const gap = 3;
  const availW = canvasW - marginLeft - marginRight;
  const availH = canvasH - marginTop - marginBottom;
  let cellSize = Math.floor(Math.min(availW / weeksCount, availH / 7) - gap);
  cellSize = Math.max(6, Math.min(cellSize, 26));
  const gridW = weeksCount * (cellSize + gap) - gap;
  const gridH = 7 * (cellSize + gap) - gap;
  const originX = marginLeft + Math.max(0, (availW - gridW) / 2);
  const originY = marginTop + Math.max(0, (availH - gridH) / 2);
  return { cellSize, gap, originX, originY, marginTop };
}

function cellCenter(layout, week, day) {
  const { cellSize, gap, originX, originY } = layout;
  return {
    x: originX + week * (cellSize + gap) + cellSize / 2,
    y: originY + day * (cellSize + gap) + cellSize / 2,
  };
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/* ------------------------------------------------------------------ *
 * audio: "boing" pixel corto, sintetizado (sin assets)
 * ------------------------------------------------------------------ */

class Boinger {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  play(pitchOffset) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startFreq = 520 + (pitchOffset || 0) + Math.random() * 40;
    osc.type = "square";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, startFreq * 0.32), now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (_) {
        /* ya desconectado */
      }
    };
  }
}

/* ------------------------------------------------------------------ *
 * motor de criaturas: timeline de "hops" por pasos
 * ------------------------------------------------------------------ */

class Creature {
  constructor(type, stops, layout, boinger, pitchOffset) {
    this.type = type;
    this.layout = layout;
    this.boinger = boinger;
    this.pitchOffset = pitchOffset;
    this.segments = this.buildSegments(stops, layout);
    this.segIndex = 0;
    this.stepIndex = 0;
    this.pos = this.segments.length
      ? cellCenter(layout, this.segments[0].from.week, this.segments[0].from.day)
      : { x: 0, y: 0 };
  }

  buildSegments(stops, layout) {
    if (stops.length < 2) {
      return stops.length === 1
        ? [{ from: stops[0], to: stops[0], steps: MIN_STEPS, arcHeight: 5 + stops[0].level * 4 }]
        : [];
    }
    const segments = [];
    for (let i = 0; i < stops.length; i++) {
      const from = stops[i];
      const to = stops[(i + 1) % stops.length];
      const a = cellCenter(layout, from.week, from.day);
      const b = cellCenter(layout, to.week, to.day);
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const rawSteps = Math.round(dist / STEP_PX) - to.level;
      const steps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, rawSteps || MIN_STEPS));
      const arcHeight = 5 + to.level * 4;
      segments.push({ from, to, steps, arcHeight });
    }
    return segments;
  }

  tick() {
    if (!this.segments.length) return;
    const seg = this.segments[this.segIndex];
    this.stepIndex++;
    if (this.stepIndex > seg.steps) {
      this.segIndex = (this.segIndex + 1) % this.segments.length;
      this.stepIndex = 0;
      this.boinger.play(this.pitchOffset + this.segments[this.segIndex].to.level * 12);
    }
    const active = this.segments[this.segIndex];
    const t = active.steps === 0 ? 1 : this.stepIndex / active.steps;
    const a = cellCenter(this.layout, active.from.week, active.from.day);
    const b = cellCenter(this.layout, active.to.week, active.to.day);
    const arc = active.arcHeight * 4 * t * (1 - t);
    this.pos = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t - arc,
      groundY: a.y + (b.y - a.y) * t,
    };
    if (t < 0.22 || t > 0.85) this.frame = "crouch";
    else this.frame = "air";
  }

  draw(ctx) {
    if (!this.segments.length) return;
    const size = this.layout.cellSize * 1.35;
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    const shadowW = size * 0.55;
    ctx.beginPath();
    ctx.ellipse(this.pos.x, this.pos.groundY ?? this.pos.y, shadowW / 2, shadowW / 5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(ctx, this.type, this.frame || "idle", this.pos.x, this.pos.y, size);
  }
}

/* ------------------------------------------------------------------ *
 * app state
 * ------------------------------------------------------------------ */

const state = {
  username: null,
  apiData: null,
  viewMode: "quarter", // "quarter" | "year"
  creatures: [],
  layout: null,
  weeks: [],
  rafId: null,
  lastTick: 0,
  boinger: new Boinger(),
};

const el = {
  form: document.getElementById("user-form"),
  input: document.getElementById("username-input"),
  status: document.getElementById("status"),
  stageWrap: document.getElementById("stage-wrap"),
  canvas: document.getElementById("scene"),
  summary: document.getElementById("summary"),
  emptyHint: document.getElementById("empty-hint"),
  rangeToggle: document.getElementById("range-toggle"),
  muteBtn: document.getElementById("mute-btn"),
  shareBtn: document.getElementById("share-btn"),
};

const ctx = el.canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* ------------------------------------------------------------------ *
 * username helpers
 * ------------------------------------------------------------------ */

function sanitizeUsername(raw) {
  let u = raw.trim();
  u = u.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  u = u.replace(/^@/, "");
  u = u.split("/")[0];
  return u;
}

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

/* ------------------------------------------------------------------ *
 * render pipeline
 * ------------------------------------------------------------------ */

function setStatus(msg, isError) {
  el.status.textContent = msg || "";
  el.status.classList.toggle("is-error", !!isError);
}

function visibleDays() {
  const all = state.apiData.contributions.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  if (state.viewMode === "quarter") {
    return all.slice(Math.max(0, all.length - QUARTER_DAYS));
  }
  return all;
}

function rebuildScene() {
  const days = visibleDays();
  state.weeks = buildWeeks(days);
  const weeksCount = Math.max(1, state.weeks.length);
  state.layout = computeLayout(weeksCount, el.canvas.width, el.canvas.height);

  const activeDays = [];
  state.weeks.forEach((week, w) => {
    week.forEach((day, d) => {
      if (day && day.count > 0) {
        activeDays.push({ week: w, day: d, level: day.level, count: day.count, date: day.date });
      }
    });
  });

  const numCreatures = activeDays.length === 0 ? 0 : activeDays.length >= 12 ? 3 : activeDays.length >= 4 ? 2 : 1;

  state.creatures = [];
  for (let i = 0; i < numCreatures; i++) {
    const stops = activeDays.filter((_, idx) => idx % numCreatures === i);
    state.creatures.push(new Creature(CREATURE_ORDER[i], stops, state.layout, state.boinger, i * 60));
  }

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const rangeLabel = state.viewMode === "quarter" ? "the last quarter" : "the last year";
  if (activeDays.length === 0) {
    el.summary.innerHTML = `no commits in ${rangeLabel}. the creatures are sleeping <span aria-hidden="true">zzz</span>`;
  } else {
    el.summary.innerHTML = `<strong>${total}</strong> contributions in ${rangeLabel} · <strong>${activeDays.length}</strong> active days · <strong>${numCreatures}</strong> creature${numCreatures > 1 ? "s" : ""} hopping`;
  }

  el.rangeToggle.hidden = false;
  el.rangeToggle.textContent = state.viewMode === "quarter" ? "view full year" : "view last quarter";

  // pinta de inmediato: el loop de animacion solo redibuja en cada tick
  // (TICK_MS), asi que sin esto quedaria un frame en blanco/viejo hasta
  // el proximo tick.
  drawGrid();
  drawCreatures();
}

function drawGrid() {
  const { cellSize, gap, originX, originY, marginTop } = state.layout;
  ctx.fillStyle = "#120c1e";
  ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);

  ctx.font = "9px monospace";
  ctx.fillStyle = "#6f5f99";
  ctx.textBaseline = "alphabetic";
  let lastMonth = -1;
  state.weeks.forEach((week, w) => {
    const firstReal = week.find((d) => d);
    if (!firstReal) return;
    const month = parseLocalDate(firstReal.date).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const x = originX + w * (cellSize + gap);
      ctx.fillText(MONTH_NAMES[month], x, marginTop - 8);
    }
  });

  state.weeks.forEach((week, w) => {
    week.forEach((day, d) => {
      const x = originX + w * (cellSize + gap);
      const y = originY + d * (cellSize + gap);
      const level = day ? day.level : 0;
      ctx.fillStyle = LEVEL_COLORS[level] || LEVEL_COLORS[0];
      ctx.fillRect(x, y, cellSize, cellSize);
      if (!day) {
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    });
  });
}

function drawCreatures() {
  state.creatures.forEach((c) => c.draw(ctx));
}

function animationFrame(ts) {
  if (!state.lastTick) state.lastTick = ts;
  const elapsed = ts - state.lastTick;
  if (elapsed >= TICK_MS) {
    state.lastTick = ts;
    state.creatures.forEach((c) => c.tick());
    drawGrid();
    drawCreatures();
  }
  state.rafId = requestAnimationFrame(animationFrame);
}

function startAnimation() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.lastTick = 0;
  state.rafId = requestAnimationFrame(animationFrame);
}

/* ------------------------------------------------------------------ *
 * carga de usuario
 * ------------------------------------------------------------------ */

async function loadUser(rawUsername) {
  const username = sanitizeUsername(rawUsername);
  if (!USERNAME_RE.test(username)) {
    setStatus("that doesn't look like a valid github username.", true);
    return;
  }

  el.emptyHint.hidden = true;
  el.stageWrap.hidden = true;
  el.shareBtn.hidden = true;
  el.rangeToggle.hidden = true;
  setStatus(`loading contributions for @${username}...`);

  try {
    const { data, fromCache, stale } = await fetchContributions(username);
    state.username = username;
    state.apiData = normalizeContributions(data);
    state.viewMode = "quarter";

    el.input.value = username;
    const url = new URL(location.href);
    url.searchParams.set("user", username);
    history.replaceState(null, "", url.toString());

    rebuildScene();
    el.stageWrap.hidden = false;
    el.shareBtn.hidden = false;

    if (stale) {
      setStatus(`could not refresh from the API — showing cached data (@${username}).`);
    } else if (fromCache) {
      setStatus(`@${username} (local cached data)`);
    } else {
      setStatus(`@${username}`);
    }

    startAnimation();
  } catch (err) {
    el.stageWrap.hidden = true;
    el.emptyHint.hidden = false;
    if (err.message === "not_found") {
      setStatus(`could not find @${username} (or they have no public activity).`, true);
    } else if (err.message === "timeout") {
      setStatus("the data source took too long to respond. please try again.", true);
    } else {
      setStatus("could not load activity right now. please try again in a bit.", true);
    }
  }
}

/* ------------------------------------------------------------------ *
 * UI wiring
 * ------------------------------------------------------------------ */

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  state.boinger.ensureCtx();
  if (el.input.value.trim()) loadUser(el.input.value);
});

el.rangeToggle.addEventListener("click", () => {
  state.viewMode = state.viewMode === "quarter" ? "year" : "quarter";
  rebuildScene();
});

el.muteBtn.addEventListener("click", () => {
  state.boinger.muted = !state.boinger.muted;
  state.boinger.ensureCtx();
  el.muteBtn.textContent = state.boinger.muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-pressed", String(state.boinger.muted));
});

el.shareBtn.addEventListener("click", async () => {
  const url = new URL(location.href);
  url.searchParams.set("user", state.username);
  const shareUrl = url.toString();
  try {
    await navigator.clipboard.writeText(shareUrl);
    setStatus("link copied to clipboard!");
  } catch (_) {
    window.prompt("copy this link:", shareUrl);
  }
});

document.querySelectorAll("[data-demo]").forEach((btn) => {
  btn.addEventListener("click", () => {
    el.input.value = btn.dataset.demo;
    loadUser(btn.dataset.demo);
  });
});

/* ------------------------------------------------------------------ *
 * bootstrap
 * ------------------------------------------------------------------ */

(function init() {
  const params = new URLSearchParams(location.search);
  const userParam = params.get("user");
  if (userParam) {
    el.input.value = userParam;
    loadUser(userParam);
  }
})();
