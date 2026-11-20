// UI: the three modes, directions lists and the SVG level map. All arena facts come from the venue object.
import { mins, ft, sectionArc, levelExtent, connectorsOf, seatRingsOf, sectionsOf } from "./graph.js";
import { route, findFood, findMeetingSpot } from "./logic.js";

const NS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
const joinAnd = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

export function start(V) {
  const { nodes, levels, levelById, building } = V;
  const { P, arcPts } = V.geo;
  const low = levels[0], high = levels[levels.length - 1];
  const mid = l => "S" + l.sections[Math.floor(l.sections.length / 2)];
  const state = {
    mode: "section", from: mid(low), to: mid(high), friend: "S" + high.sections[high.sections.length - 1],
    foodQ: V.amenities.popular[0] ?? "", foodPick: null, tap: "to", level: low.level, avoid: false,
    routes: [], steps: [], frSteps: [], meet: null, foodMatches: []
  };
  const entrances = V.entrances;

  // ---- static page text ----
  document.title = `${building.name} Wayfinder`;
  $("arena-name").textContent = `${building.name} Wayfinder`;
  $("map").setAttribute("aria-label", `${building.name} level map with route`);
  // Each gate once, even when it has more than one elevator nearby.
  const elevGates = [...new Set(building.elevators.map(e => e.nearGate))].map(id => V.gateById[id]);
  const allGateNamed = elevGates.every(g => g.name === "Gate " + g.label);
  $("acc-where").textContent = elevGates.length
    ? ` (use elevators at ${allGateNamed ? (elevGates.length > 1 ? "Gates " : "Gate ") + joinAnd(elevGates.map(g => g.label)) : joinAnd(elevGates.map(g => g.name))})` : "";
  $("food-q").placeholder = "Try " + V.amenities.popular.slice(0, 3).map(s => s.toLowerCase()).join(", ");
  // One note per club, even when the club spans several levels.
  const clubs = new Map();
  for (const l of levels.filter(l => l.restricted)) { const c = clubs.get(l.restricted.label) ?? { needs: l.restricted.needs, names: [] }; c.names.push(l.name); clubs.set(l.restricted.label, c); }
  const restrictedNotes = [...clubs].map(([label, c]) => `The ${joinAnd(c.names)} ${c.names.length > 1 ? "are" : "is"} the ${label}, so you need ${c.needs} to go in.`);
  $("fine").textContent = [building.disclaimer, "Section spacing, distances and elevator spots are approximate.", ...restrictedNotes].join(" ");

  // ---- pickers, tabs, chips ----
  function optLabel(id) { const n = nodes[id]; return n.kind === "seat" ? `Section ${n.sec}` : `${n.gate.name} entrance`; }
  function fillSelect(sel) {
    sel.innerHTML = "";
    for (const l of levels) {
      const g = document.createElement("optgroup"); g.label = `${l.name} · ${l.sub}`;
      for (const s of sectionsOf(l)) { const o = document.createElement("option"); o.value = "S" + s; o.textContent = optLabel(o.value); g.appendChild(o); }
      sel.appendChild(g);
    }
    if (entrances.length) {
      const g = document.createElement("optgroup"); g.label = "Entrances";
      for (const id of entrances) { const o = document.createElement("option"); o.value = id; o.textContent = optLabel(id); g.appendChild(o); }
      sel.appendChild(g);
    }
  }
  fillSelect($("from")); fillSelect($("to"));

  const tabs = $("tabs"); tabs.innerHTML = "";
  for (const l of levels) {
    const b = document.createElement("button"); b.className = "tab"; b.type = "button"; b.role = "tab"; b.id = "tab" + l.level;
    b.innerHTML = `<span class="has"></span><strong></strong><small></small>`;
    b.querySelector("strong").textContent = l.name; b.querySelector("small").textContent = l.sub;
    b.onclick = () => { state.level = l.level; draw(); }; tabs.appendChild(b);
  }
  $("food-chips").innerHTML = "";
  for (const p of V.amenities.popular) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = p;
    b.onclick = () => { state.foodQ = p; state.foodPick = null; $("food-q").value = p; compute(); }; $("food-chips").appendChild(b);
  }

  function renderSteps(ol, steps) {
    ol.innerHTML = "";
    steps.forEach(st => {
      const li = document.createElement("li"); if (st.ride) li.className = "ride";
      const b = document.createElement("button"); b.type = "button";
      const meta = st.ride ? `${st.meta} · ${levelById[st.level].name} → ${levelById[st.toLevel].name}` : `${levelById[st.level].name}${st.d ? ` · about ${ft(st.d)} ft` : ""}`;
      const s1 = document.createElement("span"); s1.textContent = st.text;
      const m = document.createElement("span"); m.className = "st-meta"; m.textContent = meta; s1.appendChild(m);
      b.appendChild(s1); b.onclick = () => { state.level = st.level; draw(); }; li.appendChild(b); ol.appendChild(li);
    });
  }

  function setMode(m) {
    state.mode = m;
    for (const k of ["section", "food", "meet"]) $("m-" + k).setAttribute("aria-selected", k === m);
    const toVal = m === "meet" ? state.friend : state.to;
    $("to-field").hidden = m === "food"; $("swap").hidden = m === "food"; $("food-ui").hidden = m !== "food";
    $("to-lbl").textContent = m === "meet" ? "Your friend is at" : "Going to";
    $("tap-to").hidden = m === "food"; $("tap-to-lbl").textContent = m === "meet" ? "Friend's spot" : "Destination";
    $("lg-dest").textContent = m === "meet" ? "Friend" : m === "food" ? "Chosen stand" : "Destination";
    $("lg-fr").hidden = m !== "meet"; $("lg-food").hidden = m !== "food";
    setTap(m === "food" ? "from" : "to");
    $("to").value = toVal; compute();
  }

  function compute() {
    const m = state.mode; $("from").value = state.from;
    state.routes = []; state.steps = []; state.frSteps = []; state.meet = null;
    const notes = [];
    if (m === "section") {
      $("to").value = state.to;
      if (state.to === state.from) notes.push("Start and destination are the same. Pick a different destination.");
      else { const r = route(V, state.from, state.to, state.avoid); if (r) { state.routes.push({ path: r.path, cls: "rt" }); state.steps = r.steps; } }
    } else if (m === "food") {
      const { matches, restrictedHidden, unplaced } = findFood(V, state.from, state.foodQ, state.avoid); state.foodMatches = matches;
      const pick = matches.find(x => state.foodPick && x.key === state.foodPick) || matches[0];
      const ul = $("food-results"); ul.innerHTML = "";
      if (!state.foodQ.trim()) ul.innerHTML = '<li class="empty">Type a food or drink, or tap one above.</li>';
      else if (!matches.length && !unplaced.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = `No stand on the dining map lists "${state.foodQ}". Try a broader word like sandwich or burger.`; ul.appendChild(li); }
      matches.slice(0, 6).forEach(x => {
        const li = document.createElement("li"), b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-pressed", x === pick);
        const left = document.createElement("span"); const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = `${x.name} · Section ${x.section}`;
        const it = document.createElement("span"); it.className = "it"; it.textContent = x.hits.join(", "); left.append(nm, it);
        const tm = document.createElement("span"); tm.className = "tm"; tm.textContent = x.secs != null ? mins(x.secs) : "–";
        b.append(left, tm); b.onclick = () => { state.foodPick = x.key; compute(); }; li.appendChild(b); ul.appendChild(li);
      });
      // Vendors whose spot isn't known yet: listed without a route, asking fans where they are.
      unplaced.forEach(x => {
        const li = document.createElement("li"); li.className = "unplaced";
        const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = x.name + (x.level != null ? ` · ${V.levelById[x.level].name}` : "");
        const it = document.createElement("span"); it.className = "it"; it.textContent = x.hits.join(", ");
        const ask = document.createElement("span"); ask.className = "ask"; ask.textContent = "Where is this vendor? We don't know its section yet. If you spot it, tell us.";
        li.append(nm, it, ask); ul.appendChild(li);
      });
      if (restrictedHidden) {
        const hidden = levels.filter(l => l.restricted && !V.hasAccess(state.from, l.level));
        notes.push(hidden.map(l => `${l.restricted.label} stands are hidden because you're not on the ${l.name}.`).join(" "));
      }
      if (pick) {
        state.foodPick = pick.key;
        if (pick.nodeId === state.from) state.steps = [{ level: pick.level, text: pick.finalText, d: 0 }];
        else { const r = route(V, state.from, pick.nodeId, state.avoid, pick); if (r) { state.routes.push({ path: r.path, cls: "rt" }); state.steps = r.steps; } }
      }
    } else {
      $("to").value = state.friend;
      if (state.friend === state.from) notes.push("You and your friend are at the same spot.");
      else {
        const spot = findMeetingSpot(V, state.from, state.friend, state.avoid);
        if (spot) {
          state.meet = spot.nodeId;
          if (spot.yourPath) state.routes.push({ path: spot.yourPath, cls: "rt" });
          if (spot.friendPath && spot.friendPath.length > 1) state.routes.push({ path: spot.friendPath, cls: "rt2" });
          state.steps = spot.yourSteps; state.frSteps = spot.friendSteps;
          $("meet-where").textContent = spot.place;
          $("meet-fr").textContent = state.frSteps.length ? mins(V.stats(spot.friendPath).secs) : "already there";
          state.meetPlace = spot.place;
        }
      }
    }
    const mine = state.routes.find(r => r.cls === "rt");
    if (m === "meet") $("meet-you").textContent = mine ? mins(V.stats(mine.path).secs) : "already there";
    const st = mine ? V.stats(mine.path) : null;
    $("sum-time").textContent = st ? mins(st.secs) : "–";
    $("sum-dist").textContent = st ? `${ft(st.walk)} ft` : "–";
    $("sum-lv").textContent = st ? st.levels.map(l => levelById[l].short).join(" → ") : "–";
    const ends = [nodes[state.from], m === "section" ? nodes[state.to] : null, m === "meet" ? nodes[state.friend] : null].filter(Boolean);
    for (const l of levels.filter(l => l.restricted)) {
      if (m !== "food" && ends.some(n => n.level === l.level && n.kind === "seat")) notes.push(`The ${l.name} is the ${l.restricted.label}. Ushers check for ${l.restricted.needs} at the entrance.`);
      if (m === "food" && state.foodPick) { const p = state.foodMatches.find(x => x.key === state.foodPick); if (p && p.level === l.level && !V.hasAccess(state.from, l.level)) notes.push(`This stand is on the ${l.restricted.label}. You need ${l.restricted.needs} to get in.`); }
      if (m === "meet" && state.meet && nodes[state.meet].level === l.level) notes.push(`This spot is on the ${l.restricted.label}, so both of you need ${l.restricted.needs}.`);
    }
    $("note").textContent = notes.join(" ");
    $("meetbox").hidden = !(m === "meet" && state.meet); $("copy-msg").textContent = "";
    $("summary").hidden = m === "meet";
    $("you-h").hidden = m !== "meet"; $("fr-h").hidden = !(m === "meet" && state.frSteps.length); $("fr-steps").hidden = !(m === "meet" && state.frSteps.length);
    renderSteps($("steps"), state.steps); renderSteps($("fr-steps"), state.frSteps);
    state.level = nodes[state.from].level;
    draw();
  }

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const dStr = pts => "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
  const ringPath = r => dStr(arcPts(r, 0, 1, 160)) + "Z";
  // A level's outline: a full ring, or for a partial level only its span.
  const extent = l => levelExtent(building.numbering, l.span);
  const outline = (l, r) => { if (!l.span) return ringPath(r); const { s, len } = extent(l); return dStr(arcPts(r, s, s + len, Math.ceil(160 * len))); };
  const band = (l, rIn, rOut) => { if (!l.span || l.loop) return ringPath(rOut) + ringPath(rIn); const { s, len } = extent(l), n = Math.ceil(160 * len); return dStr(arcPts(rOut, s, s + len, n).concat(arcPts(rIn, s + len, s, n))) + "Z"; };
  const onLevel = (path, k) => path.some(id => nodes[id].level === k && (nodes[id].kind === "seat" || nodes[id].kind === "conc"));

  function draw() {
    const L = state.level, v = levelById[L], r = v.rings, svg = $("map"), m = state.mode; svg.innerHTML = "";
    svg.setAttribute("viewBox", v.viewBox.join(" "));
    for (const l of levels) {
      const t = $("tab" + l.level); t.setAttribute("aria-selected", l.level === L);
      t.classList.toggle("route", state.routes.some(rt => onLevel(rt.path, l.level)));
    }
    const fs = v.fontSize, vb = v.viewBox, court = building.geometry.court;
    el("text", { x: 0, y: vb[1] + 14, class: "street", "font-size": fs + 2 }, svg).textContent = building.streets?.north ?? "NORTH";
    el("text", { x: 0, y: vb[1] + vb[3] - 6, class: "street", "font-size": fs + 2 }, svg).textContent = building.streets?.south ?? "";
    for (const l of levels) if (l.level !== L) el("path", { d: outline(l, l.rings.seatOut), class: "ghost" }, svg);
    el("rect", { x: -court[0] / 2, y: -court[1] / 2, width: court[0], height: court[1], rx: 3, class: "courtc" }, svg);
    el("path", { d: band(v, r.concIn, r.concOut), "fill-rule": "evenodd", class: "concb" }, svg);
    const second = m === "section" ? state.to : m === "meet" ? state.friend : null;
    const labels = [];
    // Every ring of seats on this level: its own, plus tiers sharing its concourse.
    for (const ring of seatRingsOf(v, building.numbering)) ring.sections.forEach((sec, i) => {
      const id = "S" + sec, { f, f0, f1 } = sectionArc(ring.numbering, i, ring.sections.length, ring.span);
      const pts = arcPts(ring.seatOut, f0, f1, 8).concat(arcPts(ring.seatIn, f1, f0, 8));
      const cls = id === state.from ? "sec you" : id === second ? "sec friend" : "sec";
      const p = el("path", { d: dStr(pts) + "Z", class: cls, tabindex: 0, role: "button", "aria-label": "Section " + sec }, svg);
      el("title", {}, p).textContent = "Section " + sec;
      p.addEventListener("click", () => pick(id));
      p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(id); } });
      labels.push([nodes[id].p, sec, cls !== "sec"]);
    });
    // routes (friend first so yours sits on top)
    for (const rt of [...state.routes].reverse()) {
      const segs = []; let cur = null;
      for (let k = 0; k < rt.path.length - 1; k++) {
        const a = nodes[rt.path[k]], b = nodes[rt.path[k + 1]];
        if (a.level !== L || b.level !== L) { cur = null; continue; }
        let pts;
        if (a.kind === "conc" && b.kind === "conc") { let df = b.f - a.f; df = ((df % 1) + 1.5) % 1 - .5; pts = arcPts(v.conc, a.f, a.f + df, Math.max(2, Math.ceil(Math.abs(df) * 120))); }
        else pts = [a.p, b.p];
        if (!cur) { cur = []; segs.push(cur); } cur.push(...pts);
      }
      for (const s of segs) { el("path", { d: dStr(s), class: "rt-halo", "stroke-width": 7 }, svg); el("path", { d: dStr(s), class: rt.cls, "stroke-width": 3.6 }, svg); }
    }
    for (const [c, sec, on] of labels) el("text", { x: c[0], y: c[1], class: "slab" + (on ? " on" : ""), "font-size": fs }, svg).textContent = sec;
    // gates & elevators
    for (const g of building.gates) {
      if (!g.levels.includes(L)) continue;
      const p = P(r.tower, g.f);
      const rect = el("rect", { x: p[0] - 21, y: p[1] - 9, width: 42, height: 18, rx: 4, class: "gate" }, svg);
      const to = lv => lv.length === levels.length ? "all levels" : joinAnd(lv.map(x => levelById[x].name));
      const ways = connectorsOf(g).map(c => c.kind === "escalator" ? `escalators${g.escalator.stairs ? " and stairs" : ""} to ${to(c.levels)}` : `${c.kind} to ${to(c.levels)}`);
      el("title", {}, rect).textContent = g.name + (ways.length ? " · " + ways.join(" · ") : g.entrance === false ? "" : " · entrance");
      if (L === low.level && g.entrance !== false) rect.addEventListener("click", () => pick("C" + L + ":" + g.id)); else rect.style.cursor = "default";
      el("text", { x: p[0], y: p[1], class: "glab", "font-size": 10 }, svg).textContent = g.entrance === false ? g.label : "GATE " + g.label;
    }
    for (const e of building.elevators) {
      if (!e.levels.includes(L)) continue;
      const ep = P(r.tower, e.f);
      const c = el("circle", { cx: ep[0], cy: ep[1], r: 6.5, class: "elev" }, svg); el("title", {}, c).textContent = "Elevator by " + V.gateById[e.nearGate].name;
      el("text", { x: ep[0], y: ep[1], class: "elab", "font-size": 8 }, svg).textContent = "E";
    }
    // food stands on this level
    if (m === "food") {
      const seen = new Set();
      for (const x of state.foodMatches) {
        if (x.level !== L || seen.has(x.key)) continue; seen.add(x.key);
        const on = state.foodPick === x.key;
        const p = nodes[x.nodeId].p; const c = el("circle", { cx: p[0], cy: p[1], r: on ? 7 : 5, class: "stand" + (on ? " on" : "") }, svg);
        el("title", {}, c).textContent = `${x.name} · Section ${x.section}`;
        c.addEventListener("click", () => { state.foodPick = x.key; const keep = state.level; compute(); state.level = keep; draw(); });
      }
    }
    // level-change badges
    const rides = [[state.routes.find(rt => rt.cls === "rt"), state.steps], [state.routes.find(rt => rt.cls === "rt2"), state.frSteps]];
    for (const [rt, steps] of rides) {
      if (!rt) continue;
      steps.filter(s => s.ride && (s.level === L || s.toLevel === L)).forEach(s => {
        const idx = rt.path.findIndex(id => (nodes[id].kind === "tower" || nodes[id].kind === "elev") && nodes[id].level === L);
        if (idx < 0) return; const n = nodes[rt.path[idx]]; const leaving = s.level === L;
        const txt = leaving ? `${s.toLevel > s.level ? "↑" : "↓"} to ${levelById[s.toLevel].short}` : `from ${levelById[s.level].short}`;
        const bp = P([r.tower[0] + 22, r.tower[1] + 22], n.f);
        el("rect", { x: bp[0] - 26, y: bp[1] - 9, width: 52, height: 18, rx: 9, class: "badge" }, svg);
        el("text", { x: bp[0], y: bp[1], class: "badgetxt", "font-size": 9 }, svg).textContent = txt;
      });
    }
    // pins
    const pin = (id, cls) => { const n = nodes[id]; if (!n || n.level !== L || n.kind === "seat") return; el("circle", { cx: n.p[0], cy: n.p[1], r: 6, class: cls }, svg); };
    pin(state.from, "pin-you"); if (second) pin(second, "pin-friend");
    if (m === "meet" && state.meet && nodes[state.meet].level === L) {
      const p = nodes[state.meet].p;
      const c = el("circle", { cx: p[0], cy: p[1], r: 10, class: "meet" }, svg); el("title", {}, c).textContent = "Meeting spot";
      el("text", { x: p[0], y: p[1], class: "meettxt", "font-size": 10 }, svg).textContent = "★";
    }
  }

  function pick(id) {
    if (state.tap === "from") { state.from = id; if (state.mode !== "food") setTap("to"); }
    else if (state.mode === "meet") state.friend = id; else state.to = id;
    const keep = state.level; compute(); state.level = keep; draw();
  }
  function setTap(t) { state.tap = t; $("tap-from").setAttribute("aria-pressed", t === "from"); $("tap-to").setAttribute("aria-pressed", t === "to"); }
  $("tap-from").onclick = () => setTap("from"); $("tap-to").onclick = () => setTap("to");
  $("m-section").onclick = () => setMode("section"); $("m-food").onclick = () => setMode("food"); $("m-meet").onclick = () => setMode("meet");
  $("from").onchange = e => { state.from = e.target.value; compute(); };
  $("to").onchange = e => { if (state.mode === "meet") state.friend = e.target.value; else state.to = e.target.value; compute(); };
  $("swap").onclick = () => { if (state.mode === "meet") [state.from, state.friend] = [state.friend, state.from]; else [state.from, state.to] = [state.to, state.from]; compute(); };
  $("acc").onchange = e => { state.avoid = e.target.checked; compute(); };
  $("food-q").value = state.foodQ;
  $("food-q").addEventListener("input", e => { state.foodQ = e.target.value; state.foodPick = null; compute(); });
  $("copy").onclick = async () => {
    const txt = `Meet me at the ${building.name}: ${state.meetPlace}.\n` + state.frSteps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
    try { await navigator.clipboard.writeText(txt); $("copy-msg").textContent = "Copied. Paste it into a text to your friend."; }
    catch (e) { $("copy-msg").textContent = "Couldn't copy here. Select your friend's directions below and copy them."; }
  };
  setMode("section");
  return { state, compute, setMode };
}
