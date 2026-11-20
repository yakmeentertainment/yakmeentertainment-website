// Walking graph, shortest paths and turn-by-turn directions, built from one arena's data.
import { createGeometry, mid, dist } from "./geometry.js";

export const mins = s => `${Math.max(1, Math.round(s / 60))} min`;
export const ft = x => Math.max(10, Math.round(x / 10) * 10);
export function fmtList(a) {
  if (!a.length) return "";
  const runs = [[a[0]]];
  // Neighbors when the numbers differ by one and any letter after them matches ("315L", "314L").
  const num = s => /^(\d+)([A-Za-z]*)$/.exec(s), next = (x, y) => { const p = num(x), q = num(y); return !!p && !!q && p[2] === q[2] && Math.abs(p[1] - q[1]) === 1; };
  for (let i = 1; i < a.length; i++) { const r = runs[runs.length - 1]; if (next(a[i], r[r.length - 1])) r.push(a[i]); else runs.push([a[i]]); }
  const parts = runs.map(r => r.length > 2 ? `${r[0]}–${r[r.length - 1]}` : r.join(runs.length === 1 ? " and " : ", "));
  const word = a.length === 1 ? "section" : "sections";
  return word + " " + (parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0]);
}
const wrap = f => ((f % 1) + 1) % 1;
// Added to an elevator boarding when stairs and escalators are allowed, so a route only
// uses an elevator if no stairs or escalator route exists (owner decision, 2026-11-08).
const ELEVATOR_LAST_RESORT = 1e6;

// A level's extent: the whole ring from numbering.startF, or just its span (clockwise from startF to endF).
export function levelExtent(numbering, span) {
  return span ? { s: span.startF, len: wrap(span.endF - span.startF) || 1 } : { s: numbering.startF, len: 1 };
}

// Position of section i (0-based, in numbering order) on a level with `count` sections.
// Returns the center f and the edges f0 < f1, all measured clockwise from north.
// On a partial level (span), sections fill the span; ccw numbering starts at its clockwise end.
export function sectionArc(numbering, i, count, span) {
  const { s, len } = levelExtent(numbering, span);
  if (numbering.direction === "ccw") {
    const e = s + len;
    return { f: wrap(e - len * (i + .5) / count), f0: e - len * (i + 1) / count, f1: e - len * i / count };
  }
  return { f: wrap(s + len * (i + .5) / count), f0: s + len * i / count, f1: s + len * (i + 1) / count };
}

// Every ring of seats on a level: its own sections first, then any tiers that share its concourse
// (club boxes in front of the seats, or terrace seats behind the concourse). A tier follows the
// level's span and direction unless it sets its own; a level may set a direction of its own too.
export function seatRingsOf(lv, numbering) {
  const dir = lv.direction ?? numbering.direction;
  const ring = (t, tier) => ({ sections: t.sections, seatIn: t.seatIn, seatOut: t.seatOut, span: t.span ?? lv.span, tier,
    numbering: { ...numbering, direction: t.direction ?? dir },
    behind: t.seatIn[0] + t.seatIn[1] >= lv.rings.concOut[0] + lv.rings.concOut[1] });
  return [ring({ sections: lv.sections, seatIn: lv.rings.seatIn, seatOut: lv.rings.seatOut }, false), ...(lv.tiers ?? []).map(t => ring(t, true))];
}
export const sectionsOf = lv => [...lv.sections, ...(lv.tiers ?? []).flatMap(t => t.sections)];

// Ways between levels at a gate. Escalators keep the T prefix (TG3:1); ramps are R, stairs S.
const CONNECTORS = [
  { kind: "escalator", prefix: "T", type: "esc" },
  { kind: "ramp", prefix: "R", type: "ramp" },
  { kind: "stairs", prefix: "S", type: "stairs" }
];
export const connectorsOf = g => CONNECTORS.filter(c => g[c.kind]).map(c => ({ ...c, levels: g[c.kind].levels }));

export function buildVenue(building, amenities) {
  const geo = createGeometry(building.geometry);
  const { P, arcLen } = geo;
  const costs = building.costs;
  // Ramps and stairs fall back to escalator costs when an arena doesn't set its own.
  const rideCost = { esc: costs.escalatorRide, ramp: costs.rampRide ?? costs.escalatorRide, stairs: costs.stairsRide ?? costs.escalatorRide };
  const rideSecs = { esc: costs.escRideSecs, ramp: costs.rampRideSecs ?? costs.escRideSecs, stairs: costs.stairsRideSecs ?? costs.escRideSecs, elev: costs.elevRideSecs, elevdoor: costs.elevDoorSecs };
  const levels = building.levels.map(l => ({ ...l, seatMid: mid(l.rings.seatIn, l.rings.seatOut), conc: mid(l.rings.concIn, l.rings.concOut) }));
  const levelById = Object.fromEntries(levels.map(l => [l.level, l]));
  const sectionLevel = new Map(levels.flatMap(l => sectionsOf(l).map(s => [s, l.level])));
  const gateById = Object.fromEntries(building.gates.map(g => [g.id, g]));
  const nodes = {}, adj = {}, warnings = [];

  function addNode(id, o) { o.id = id; nodes[id] = o; adj[id] = []; }
  function addEdge(a, b, len, type, cost) { const e = { len, type, cost: cost ?? len }; adj[a].push({ to: b, ...e }); adj[b].push({ to: a, ...e }); }
  // Links consecutive stops; a stop with no node (data the schema would reject) is skipped, not a crash.
  function chain(ids, type, cost) { const ok = ids.filter(id => nodes[id]); for (let i = 0; i + 1 < ok.length; i++) addEdge(ok[i], ok[i + 1], 0, type, cost); }

  for (const lv of levels) {
    const L = lv.level, r = lv.rings, stops = [];
    for (const ring of seatRingsOf(lv, building.numbering)) {
      const seatMid = mid(ring.seatIn, ring.seatOut);
      ring.sections.forEach((sec, i) => {
        const { f } = sectionArc(ring.numbering, i, ring.sections.length, ring.span);
        addNode("S" + sec, { kind: "seat", level: L, sec, f, p: P(seatMid, f), behind: ring.behind });
        const c = "C" + L + ":" + sec;
        // Tier stops aren't named when you walk past: only the level's own sections are.
        addNode(c, { kind: "conc", level: L, f, sec, tier: ring.tier, p: P(lv.conc, f) });
        addEdge("S" + sec, c, dist(nodes["S" + sec].p, nodes[c].p), "aisle");
        stops.push(c);
      });
    }
    for (const g of building.gates) {
      if (!g.levels.includes(L)) continue;
      const c = "C" + L + ":" + g.id;
      addNode(c, { kind: "conc", level: L, f: g.f, gate: g, p: P(lv.conc, g.f) }); stops.push(c);
      for (const cn of connectorsOf(g)) {
        if (!cn.levels.includes(L)) continue;
        const t = cn.prefix + g.id + ":" + L;
        addNode(t, { kind: "tower", conn: cn.kind, level: L, f: g.f, gate: g, p: P(r.tower, g.f) });
        addEdge(c, t, dist(nodes[c].p, nodes[t].p), "gate");
      }
      for (const el of building.elevators) {
        if (el.nearGate !== g.id || !el.levels.includes(L)) continue;
        const ec = "C" + L + ":" + el.id;
        addNode(ec, { kind: "conc", level: L, f: el.f, elevOf: g, elevator: el, p: P(lv.conc, el.f) }); stops.push(ec);
        const e = el.id + ":" + L;
        addNode(e, { kind: "elev", level: L, f: el.f, gate: g, elevator: el, p: P(r.tower, el.f) });
        const d = dist(nodes[ec].p, nodes[e].p);
        addEdge(ec, e, d, "elevdoor", d + costs.elevatorWait);
      }
    }
    if (lv.span && !lv.loop) {
      // A partial level: the concourse runs from one end of the span to the other, no loop.
      // With loop: true the seats still fill the span, but the concourse goes all the way around (below).
      const { s } = levelExtent(building.numbering, lv.span), off = id => wrap(nodes[id].f - s);
      stops.sort((a, b) => off(a) - off(b));
      for (let i = 0; i + 1 < stops.length; i++) {
        const a = nodes[stops[i]], b = nodes[stops[i + 1]];
        addEdge(a.id, b.id, arcLen(lv.conc, s + off(a.id), s + off(b.id)), "conc");
      }
      continue;
    }
    stops.sort((a, b) => nodes[a].f - nodes[b].f);
    for (let i = 0; i < stops.length; i++) {
      const a = nodes[stops[i]], b = nodes[stops[(i + 1) % stops.length]];
      const fb = b.f + (i === stops.length - 1 ? 1 : 0);
      addEdge(a.id, b.id, arcLen(lv.conc, a.f, fb), "conc");
    }
  }
  for (const g of building.gates) {
    for (const cn of connectorsOf(g)) chain([...cn.levels].sort((a, b) => a - b).map(L => cn.prefix + g.id + ":" + L), cn.type, rideCost[cn.type]);
    for (const el of building.elevators) if (el.nearGate === g.id) chain([...el.levels].sort((a, b) => a - b).map(L => el.id + ":" + L), "elev", costs.elevatorRide);
  }

  // Stands with no section can't be routed to. They're kept in `unplaced` (level may be null)
  // so Food search can still list them and ask fans where they are.
  const stands = [], unplaced = [];
  for (const s of amenities.stands) {
    if (s.section === undefined) { unplaced.push({ ...s, level: s.level ?? null }); continue; }
    const L = sectionLevel.get(s.section);
    if (L === undefined) { warnings.push(`stand ${s.id}: section ${s.section} isn't in the building`); continue; }
    stands.push({ ...s, level: L, nodeId: "C" + L + ":" + s.section });
  }

  // Ways in: every gate except landmarks (entrance: false) such as an escalator bank mid-concourse.
  // Each on the lowest level that gate reaches (a bleacher gate may open straight onto an upper concourse).
  const lowest = g => levels.find(l => g.levels.includes(l.level))?.level;
  const entrances = building.gates.filter(g => g.entrance !== false && lowest(g) !== undefined).map(g => "C" + lowest(g) + ":" + g.id);

  const isRestricted = L => !!levelById[L]?.restricted;
  // A person has access to a restricted level only when they start from a seat on it, or on another
  // restricted level with the same label (one club spread over several levels).
  const hasAccess = (startId, L) => {
    if (!isRestricted(L)) return true;
    const n = nodes[startId];
    if (n?.kind !== "seat") return false;
    return n.level === L || levelById[n.level].restricted?.label === levelById[L].restricted.label;
  };
  const blockedFor = startId => new Set(levels.filter(l => !hasAccess(startId, l.level)).map(l => l.level));

  // Single-source shortest paths. Seats are dead ends: you never cut through someone else's section.
  // Seats and concourses on blockedLevels are never entered (except the start).
  function dijkstra(src, { avoidStairs = false, blockedLevels = new Set() } = {}) {
    const d = {}, pv = {}, done = {};
    for (const k in nodes) d[k] = Infinity;
    d[src] = 0;
    for (;;) {
      let u = null, best = Infinity;
      for (const k in d) if (!done[k] && d[k] < best) { best = d[k]; u = k; }
      if (u === null) break;
      done[u] = 1;
      if (nodes[u].kind === "seat" && u !== src) continue;
      for (const e of adj[u]) {
        if (avoidStairs && (e.type === "esc" || e.type === "stairs")) continue;
        // Elevators are for people who need them: without avoidStairs they are a last resort only.
        const extra = !avoidStairs && e.type === "elevdoor" ? ELEVATOR_LAST_RESORT : 0;
        const n = nodes[e.to];
        if ((n.kind === "seat" || n.kind === "conc") && blockedLevels.has(n.level) && e.to !== src) continue;
        const nd = d[u] + e.cost + extra;
        if (nd < d[e.to]) { d[e.to] = nd; pv[e.to] = u; }
      }
    }
    return { d, pv, src };
  }
  function pathTo(r, to) { if (r.d[to] === Infinity) return null; const p = [to]; while (p[0] !== r.src) p.unshift(r.pv[p[0]]); return p; }
  const edge = (a, b) => adj[a].find(e => e.to === b);
  function stats(path) {
    let walk = 0, ride = 0;
    const lv = new Set();
    for (let k = 0; k < path.length - 1; k++) {
      const e = edge(path[k], path[k + 1]);
      if (rideSecs[e.type] !== undefined) ride += rideSecs[e.type];
      if (!["esc", "ramp", "stairs", "elev"].includes(e.type)) walk += e.len;
    }
    path.forEach(id => { const n = nodes[id]; if (n.kind === "seat" || n.kind === "conc") lv.add(n.level); });
    return { walk, secs: walk / costs.walkFtPerSec + ride, levels: [...lv].sort((a, b) => a - b) };
  }

  const lvName = L => levelById[L].name;
  function placeName(n) {
    if (n.gate && !n.elevOf) return `${n.gate.name} on the ${lvName(n.level)}`;
    if (n.elevOf) return `the elevators by ${n.elevOf.name}`;
    return `the concourse behind Section ${n.sec}`;
  }

  // endLabel/finalText describe a concourse destination (food stand or meeting spot).
  function buildSteps(path, endLabel, finalText) {
    const N = id => nodes[id], steps = [];
    let i = 0, facing;
    const s0 = N(path[0]);
    if (s0.kind === "seat") { steps.push({ level: s0.level, text: `Head ${s0.behind ? "down" : "up"} the aisle out of Section ${s0.sec} to the ${lvName(s0.level)} concourse.`, d: edge(path[0], path[1]).len }); facing = "out"; i = 1; }
    else { steps.push({ level: s0.level, text: s0.gate && !s0.elevOf ? `Come in through ${s0.gate.name} onto the ${lvName(s0.level)} concourse.` : `Start on the concourse at ${placeName(s0)}.`, d: 0 }); facing = "in"; }
    while (i < path.length - 1) {
      const a = N(path[i]);
      if (a.kind !== "conc") { i++; continue; }
      let j = i;
      while (j + 1 < path.length && N(path[j + 1]).kind === "conc") j++;
      if (j > i) {
        const run = path.slice(i, j + 1).map(N);
        let df = run[1].f - run[0].f; df = ((df % 1) + 1.5) % 1 - .5;
        const cw = df > 0;
        const turn = ((facing === "out") === cw) ? "right" : "left";
        let dd = 0;
        for (let k = i; k < j; k++) dd += edge(path[k], path[k + 1]).len;
        const isLast = j === path.length - 1;
        const passed = run.slice(1, -1).filter(x => x.sec && !x.tier).map(x => x.sec);
        const end = run[run.length - 1], nx = N(path[j + 1]);
        let endL;
        if (nx && nx.kind === "seat") endL = `Section ${nx.sec}`;
        else if (nx && nx.kind === "tower") endL = nx.conn === "escalator" ? `the ${end.gate.name} escalators` : `the ${nx.conn} at ${end.gate.name}`;
        else if (nx && nx.kind === "elev") endL = `the elevators by ${nx.gate.name}`;
        else if (isLast && endLabel) endL = endLabel;
        else endL = placeName(end);
        const via = passed.length ? ` and walk past ${fmtList(passed)}` : " and walk";
        steps.push({ level: a.level, text: `Turn ${turn} on the concourse${via} to ${endL}.`, d: dd });
      }
      i = j;
      if (i >= path.length - 1) break;
      const nx = N(path[i + 1]);
      if (nx.kind === "seat") { steps.push({ level: nx.level, section: nx.sec, text: `Go ${nx.behind ? "up" : "down"} into Section ${nx.sec}. You've arrived.`, d: edge(path[i], path[i + 1]).len }); break; }
      if (nx.kind === "tower" || nx.kind === "elev") {
        let k = i + 1;
        while (k + 1 < path.length && N(path[k + 1]).kind === nx.kind) k++;
        const from = N(path[i + 1]).level, to = N(path[k]).level, dir = to > from ? "up" : "down";
        const g = nx.gate;
        const ride = nx.kind === "elev"
          ? { text: `Take the elevator by ${g.name} ${dir} to the ${lvName(to)}.`, meta: "Elevator", item: { type: "elevator", id: nx.elevator.id, name: `Elevator by ${g.name}` } }
          : nx.conn === "escalator"
            ? { text: `Take the ${g.name} escalators ${dir} to the ${lvName(to)}.${g.escalator.stairs ? " Stairs run alongside." : ""}`, meta: "Escalator", item: { type: "escalator", id: g.id, name: `${g.name} escalators` } }
            : { text: `Take the ${nx.conn} at ${g.name} ${dir} to the ${lvName(to)}.`, meta: nx.conn === "ramp" ? "Ramp" : "Stairs", item: { type: nx.conn, id: g.id, name: `${g.name} ${nx.conn}` } };
        steps.push({ level: from, toLevel: to, ride: true, ...ride });
        steps.push({ level: to, text: `Step back out onto the ${lvName(to)} concourse.`, d: edge(path[k], path[k + 1]).len + edge(path[i], path[i + 1]).len, merge: true });
        facing = "in"; i = k + 1; continue;
      }
    }
    const out = [];
    for (let s = 0; s < steps.length; s++) {
      const st = steps[s];
      if (st.merge && steps[s + 1] && !steps[s + 1].ride && steps[s + 1].level === st.level) { steps[s + 1].text = `Exit onto the ${lvName(st.level)} concourse. ` + steps[s + 1].text; steps[s + 1].d += st.d; continue; }
      out.push(st);
    }
    if (finalText && out.length && out[out.length - 1].merge) { const mg = out.pop(); finalText = `Step off onto the ${lvName(mg.level)} concourse. ` + finalText; }
    if (finalText) out.push({ level: N(path[path.length - 1]).level, text: finalText, d: 0, final: true });
    return out;
  }

  return {
    building, amenities, geo, levels, levelById, sectionLevel, gateById, nodes, adj, stands, unplaced, warnings, entrances,
    isRestricted, hasAccess, blockedFor, dijkstra, pathTo, edge, stats, placeName, buildSteps
  };
}
