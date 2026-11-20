// Hand-written checks for building.json and amenities.json. Each returns a list of
// human-readable problems; an empty list means the file is usable.

const isStr = x => typeof x === "string" && x.length > 0;
const isNum = x => typeof x === "number" && Number.isFinite(x);
const isPair = x => Array.isArray(x) && x.length === 2 && x.every(isNum);
const isFrac = x => isNum(x) && x >= 0 && x < 1;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]{1,64}$/;
const wrap = f => ((f % 1) + 1) % 1;
const isSpan = s => isFrac(s?.startF) && isFrac(s?.endF) && s.startF !== s.endF;
const DIRS = ["cw", "ccw"];
// True when f lies on a level: anywhere for a full ring, inside the span for a partial level.
export const inSpan = (span, f) => !span || wrap(f - span.startF) <= (wrap(span.endF - span.startF) || 1) + 1e-9;

function common(o, errs) {
  if (!o || typeof o !== "object") { errs.push("file must be a JSON object"); return false; }
  if (o.schema !== 1) errs.push("schema must be 1");
  if (!ID.test(o.id ?? "")) errs.push("id must be lowercase letters, digits and dashes");
  if (typeof o.version !== "string") errs.push("version must be a string");
  if (!DATE.test(o.lastVerified ?? "")) errs.push("lastVerified must be YYYY-MM-DD");
  if (!Array.isArray(o.sources)) errs.push("sources must be an array");
  return true;
}

function checkLevelList(list, known, where, errs, min = 1) {
  if (!Array.isArray(list) || list.length < min || !list.every(l => known.has(l)))
    errs.push(`${where} must list at least ${min} of the building's levels`);
}

export function validateBuilding(b) {
  const errs = [];
  if (!common(b, errs)) return errs;
  if (!isStr(b.name)) errs.push("name is required");
  if (!["cw", "ccw"].includes(b.numbering?.direction)) errs.push('numbering.direction must be "cw" or "ccw"');
  if (!isFrac(b.numbering?.startF)) errs.push("numbering.startF must be between 0 and 1");
  if (!(isNum(b.geometry?.shapeExp) && b.geometry.shapeExp > 0)) errs.push("geometry.shapeExp must be a positive number");
  if (!isPair(b.geometry?.refRing)) errs.push("geometry.refRing must be [width, height]");
  if (!isPair(b.geometry?.court)) errs.push("geometry.court must be [width, height]");

  const levels = new Set(), sections = new Set();
  if (!Array.isArray(b.levels) || !b.levels.length) errs.push("levels must be a non-empty array");
  else b.levels.forEach((l, i) => {
    const w = `levels[${i}]`;
    if (!Number.isInteger(l.level) || levels.has(l.level)) errs.push(`${w}.level must be a unique whole number`);
    levels.add(l.level);
    for (const k of ["name", "sub", "short"]) if (!isStr(l[k])) errs.push(`${w}.${k} is required`);
    if (!Array.isArray(l.sections) || !l.sections.length || !l.sections.every(isStr)) errs.push(`${w}.sections must be a non-empty array of strings`);
    else for (const s of l.sections) { if (sections.has(s)) errs.push(`section ${s} appears twice`); sections.add(s); }
    if (l.restricted !== null && !(isStr(l.restricted?.label) && isStr(l.restricted?.needs))) errs.push(`${w}.restricted must be null or {label, needs}`);
    for (const r of ["seatIn", "seatOut", "concIn", "concOut", "tower"]) if (!isPair(l.rings?.[r])) errs.push(`${w}.rings.${r} must be [width, height]`);
    if (!(Array.isArray(l.viewBox) && l.viewBox.length === 4 && l.viewBox.every(isNum))) errs.push(`${w}.viewBox must be 4 numbers`);
    if (!isNum(l.fontSize)) errs.push(`${w}.fontSize must be a number`);
    if (l.direction !== undefined && !DIRS.includes(l.direction)) errs.push(`${w}.direction must be "cw" or "ccw" (or left out to follow numbering.direction)`);
    // Tiers: extra rings of seats sharing this level's concourse (in front of its seats, or behind the concourse).
    if (l.tiers !== undefined) {
      if (!Array.isArray(l.tiers)) errs.push(`${w}.tiers must be an array`);
      else l.tiers.forEach((t, j) => {
        const tw = `${w}.tiers[${j}]`;
        if (!Array.isArray(t?.sections) || !t.sections.length || !t.sections.every(isStr)) errs.push(`${tw}.sections must be a non-empty array of strings`);
        else for (const s of t.sections) { if (sections.has(s)) errs.push(`section ${s} appears twice`); sections.add(s); }
        for (const r of ["seatIn", "seatOut"]) if (!isPair(t?.[r])) errs.push(`${tw}.${r} must be [width, height]`);
        if (t?.span !== undefined && !isSpan(t.span)) errs.push(`${tw}.span must be {startF, endF}, two different numbers between 0 and 1`);
        if (t?.direction !== undefined && !DIRS.includes(t.direction)) errs.push(`${tw}.direction must be "cw" or "ccw"`);
      });
    }
    if (l.span !== undefined && !isSpan(l.span))
      errs.push(`${w}.span must be {startF, endF}, two different numbers between 0 and 1 (clockwise from startF to endF)`);
    if (l.loop !== undefined && (typeof l.loop !== "boolean" || l.span === undefined))
      errs.push(`${w}.loop must be true or false, and only on a level with a span`);
  });
  const spanOf = new Map((b.levels || []).filter(l => l.span && !l.loop && isFrac(l.span.startF) && isFrac(l.span.endF)).map(l => [l.level, l.span]));
  const checkOnSpan = (f, lvls, w) => {
    if (!isFrac(f) || !Array.isArray(lvls)) return;
    for (const L of lvls) if (spanOf.has(L) && !inSpan(spanOf.get(L), f)) errs.push(`${w}.f ${f} is outside level ${L}'s span`);
  };

  const gateIds = new Set();
  if (!Array.isArray(b.gates)) errs.push("gates must be an array");
  else b.gates.forEach((g, i) => {
    const w = `gates[${i}]`;
    if (!isStr(g.id) || gateIds.has(g.id)) errs.push(`${w}.id must be unique`);
    gateIds.add(g.id);
    if (!isStr(g.name) || !isStr(g.label)) errs.push(`${w} needs name and label`);
    if (!isFrac(g.f)) errs.push(`${w}.f must be between 0 and 1`);
    checkLevelList(g.levels, levels, `${w}.levels`, errs);
    checkOnSpan(g.f, g.levels, w);
    if (g.entrance !== undefined && typeof g.entrance !== "boolean") errs.push(`${w}.entrance must be true or false (false for a landmark that isn't a way in)`);
    for (const kind of ["escalator", "ramp", "stairs"]) {
      const c = g[kind];
      if (!c) continue;
      checkLevelList(c.levels, levels, `${w}.${kind}.levels`, errs, 2);
      if (Array.isArray(g.levels) && Array.isArray(c.levels) && !c.levels.every(l => g.levels.includes(l)))
        errs.push(`${w}.${kind}.levels must only list levels where the gate exists (gate levels: ${g.levels.join(", ")})`);
    }
    if (g.escalator?.stairs !== undefined && typeof g.escalator.stairs !== "boolean") errs.push(`${w}.escalator.stairs must be true or false`);
  });

  const elevIds = new Set();
  if (!Array.isArray(b.elevators)) errs.push("elevators must be an array");
  else b.elevators.forEach((e, i) => {
    const w = `elevators[${i}]`;
    if (!isStr(e.id) || elevIds.has(e.id) || gateIds.has(e.id)) errs.push(`${w}.id must be unique`);
    elevIds.add(e.id);
    if (!gateIds.has(e.nearGate)) errs.push(`${w}.nearGate must be a gate id`);
    if (!isFrac(e.f)) errs.push(`${w}.f must be between 0 and 1`);
    checkLevelList(e.levels, levels, `${w}.levels`, errs, 2);
    checkOnSpan(e.f, e.levels, w);
    const gate = (b.gates || []).find(g => g.id === e.nearGate);
    if (gate && Array.isArray(gate.levels) && Array.isArray(e.levels) && !e.levels.every(l => gate.levels.includes(l)))
      errs.push(`${w}.levels must only list levels where ${gate.id} exists (gate levels: ${gate.levels.join(", ")})`);
  });

  for (const k of ["escalatorRide", "elevatorRide", "elevatorWait", "walkFtPerSec", "escRideSecs", "elevRideSecs", "elevDoorSecs"])
    if (!isNum(b.costs?.[k])) errs.push(`costs.${k} must be a number`);
  return errs;
}

export function validateAmenities(a, building) {
  const errs = [];
  if (!common(a, errs)) return errs;
  if (building && a.id !== building.id) errs.push("id must match the building's id");
  const known = building ? new Set(building.levels.flatMap(l => [...l.sections, ...(l.tiers ?? []).flatMap(t => t.sections)])) : null;
  const levelIds = building ? new Set(building.levels.map(l => l.level)) : null;
  const ids = new Set();
  if (!Array.isArray(a.stands)) errs.push("stands must be an array");
  else a.stands.forEach((s, i) => {
    const w = `stands[${i}]`;
    if (!ID.test(s.id ?? "") || ids.has(s.id)) errs.push(`${w}.id must be unique, lowercase letters, digits and dashes`);
    ids.add(s.id);
    if (!isStr(s.name)) errs.push(`${w}.name is required`);
    if (!["food", "bar", "restroom"].includes(s.kind)) errs.push(`${w}.kind must be food, bar or restroom`);
    // section is optional: a stand whose spot isn't known yet may give only its level, or nothing.
    if (s.section !== undefined) {
      if (!isStr(s.section)) errs.push(`${w}.section must be a string`);
      else if (known && !known.has(s.section)) errs.push(`${w}.section ${s.section} isn't in the building`);
    }
    if (s.level !== undefined) {
      if (s.section !== undefined) errs.push(`${w} gives both section and level; the section sets the level`);
      else if (!Number.isInteger(s.level)) errs.push(`${w}.level must be a whole number`);
      else if (levelIds && !levelIds.has(s.level)) errs.push(`${w}.level ${s.level} isn't in the building`);
    }
    if (!Array.isArray(s.items) || !s.items.every(isStr)) errs.push(`${w}.items must be an array of strings`);
  });
  if (!Array.isArray(a.popular) || !a.popular.every(isStr)) errs.push("popular must be an array of strings");
  return errs;
}
