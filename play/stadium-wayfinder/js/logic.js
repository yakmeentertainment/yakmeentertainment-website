// Route, food search and meet-up logic, kept free of the DOM so it can be tested.
// Every function takes the venue object `v` from buildVenue().

// labels: optional {endLabel, finalText} describing a concourse destination.
// A route may end at a seat on a restricted level (the UI shows the access note),
// but never passes through a restricted concourse the person can't enter.
export function route(v, fromId, toId, avoid, labels = {}) {
  if (!toId || toId === fromId || !v.nodes[toId]) return null;
  const blockedLevels = v.blockedFor(fromId), target = v.nodes[toId];
  if (target.kind === "seat") blockedLevels.delete(target.level);
  const path = v.pathTo(v.dijkstra(fromId, { avoidStairs: avoid, blockedLevels }), toId);
  if (!path) return null;
  return { path, steps: v.buildSteps(path, labels.endLabel ?? null, labels.finalText ?? null), stats: v.stats(path) };
}

// Stands matching the query, nearest first. Stands on restricted levels are hidden unless you sit there.
export function findFood(v, fromId, query, avoid) {
  const you = v.dijkstra(fromId, { avoidStairs: avoid, blockedLevels: v.blockedFor(fromId) });
  const q = query.trim().toLowerCase();
  const matches = [];
  let restrictedHidden = 0;
  if (q) for (const s of v.stands) {
    const hit = s.items.filter(it => it.toLowerCase().includes(q));
    if (!hit.length && !s.name.toLowerCase().includes(q)) continue;
    if (!v.hasAccess(fromId, s.level)) { restrictedHidden++; continue; }
    matches.push({
      key: s.id, name: s.name, section: s.section, level: s.level, nodeId: s.nodeId, cost: you.d[s.nodeId],
      secs: isFinite(you.d[s.nodeId]) ? v.stats(v.pathTo(you, s.nodeId)).secs : null, hits: hit.length ? hit : s.items.slice(0, 3),
      endLabel: `the ${s.name} stand behind Section ${s.section}`,
      finalText: `You're at the ${s.name} stand on the ${v.levelById[s.level].name} concourse, behind Section ${s.section}.`
    });
  }
  matches.sort((a, b) => a.cost - b.cost);
  // Stands whose spot isn't known: no route, listed so fans can tell us where they are.
  const unplaced = [];
  if (q) for (const s of v.unplaced ?? []) {
    const hit = s.items.filter(it => it.toLowerCase().includes(q));
    if (!hit.length && !s.name.toLowerCase().includes(q)) continue;
    if (s.level != null && !v.hasAccess(fromId, s.level)) { restrictedHidden++; continue; }
    unplaced.push({ key: s.id, name: s.name, level: s.level, hits: hit.length ? hit : s.items.slice(0, 3) });
  }
  return { matches, restrictedHidden, unplaced };
}

// Fair meeting spot: minimizes the longer walk, keeps the total short, and prefers gates as landmarks.
// Only levels both people can enter are considered.
export function findMeetingSpot(v, aId, bId, avoid) {
  const { nodes } = v;
  if (aId === bId) return null;
  const you = v.dijkstra(aId, { avoidStairs: avoid, blockedLevels: v.blockedFor(aId) });
  const fr = v.dijkstra(bId, { avoidStairs: avoid, blockedLevels: v.blockedFor(bId) });
  let best = null, bc = Infinity;
  for (const id in nodes) {
    const n = nodes[id];
    if (n.kind !== "conc" || n.elevOf) continue;
    if (!v.hasAccess(aId, n.level) || !v.hasAccess(bId, n.level)) continue;
    const a = you.d[id], b = fr.d[id];
    if (!isFinite(a) || !isFinite(b)) continue;
    const c = Math.max(a, b) + 0.15 * (a + b) + (n.gate ? -15 : 0);
    if (c < bc) { bc = c; best = id; }
  }
  if (!best) return null;
  const n = nodes[best], lvName = v.levelById[n.level].name;
  const place = n.gate ? `${n.gate.name}, ${lvName} concourse` : `${lvName} concourse, behind Section ${n.sec}`;
  const endLabel = n.gate ? `${n.gate.name}` : `the concourse behind Section ${n.sec}`;
  const finalText = `Wait here for your friend. Meeting spot: ${place}.`;
  const yourPath = best === aId ? null : v.pathTo(you, best);
  const friendPath = best === bId ? null : v.pathTo(fr, best);
  const yourSteps = yourPath ? v.buildSteps(yourPath, endLabel, finalText) : [{ level: n.level, text: finalText, d: 0 }];
  const friendSteps = friendPath && friendPath.length > 1 ? v.buildSteps(friendPath, endLabel, `Wait here. Meeting spot: ${place}.`) : [];
  return { nodeId: best, place, endLabel, yourPath, friendPath, yourSteps, friendSteps };
}
