// Cache-first arena loader. Opening an arena shows what's saved on the device (or the copy
// built into the app) right away, then checks the server in the background and downloads
// only the files whose version changed. Being offline is never an error the fan sees.
import { validateBuilding, validateAmenities } from "./schema.js";

export class ArenaUnavailableError extends Error {
  constructor(id) { super(`Arena ${id} isn't available offline.`); this.name = "ArenaUnavailableError"; this.arenaId = id; }
}

const FILES = ["building", "amenities"];
const validators = { building: b => validateBuilding(b), amenities: a => validateAmenities(a) };

function validFile(kind, id, obj) {
  return !!obj && typeof obj === "object" && obj.schema === 1 && obj.id === id && validators[kind](obj).length === 0;
}
function validIndex(obj) {
  return !!obj && typeof obj === "object" && obj.schema === 1 && Array.isArray(obj.arenas);
}

export function createLoader({ baseUrl, fetch, storage, bundledUrl, now = Date.now, timeoutMs = 8000 }) {
  const key = (id, kind) => `arena/${id}/${kind}`;

  // Fetches JSON. Anything that isn't a 2xx response with parseable JSON (offline, timeout,
  // a Wi-Fi sign-in page, a 500) returns undefined.
  async function getJson(url) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(() => { ctl?.abort(); resolve(undefined); }, timeoutMs); });
    const attempt = (async () => {
      try {
        const res = await fetch(url, { cache: "no-cache", signal: ctl?.signal });
        if (!res.ok) return undefined;
        return JSON.parse(await res.text());
      } catch { return undefined; }
    })();
    try { return await Promise.race([attempt, timeout]); } finally { clearTimeout(timer); }
  }

  async function fetchIndex() {
    const idx = await getJson(baseUrl + "arenas/index.json");
    if (!validIndex(idx)) return undefined;
    await storage.set("index", idx);
    return idx;
  }

  async function fetchFile(id, kind) {
    const obj = await getJson(`${baseUrl}arenas/${id}/${kind}.json`);
    return validFile(kind, id, obj) ? obj : undefined;
  }

  async function readCached(id, kind) {
    let obj;
    try { obj = await storage.get(key(id, kind)); } catch { return undefined; }
    return validFile(kind, id, obj) ? obj : undefined;
  }

  async function readBundled(id, kind) {
    const obj = await getJson(`${bundledUrl}arenas/${id}/${kind}.json`);
    return validFile(kind, id, obj) ? obj : undefined;
  }

  async function markDownloaded(id) {
    await storage.set(key(id, "meta"), { downloadedAt: new Date(now()).toISOString() });
  }

  // Downloads every file whose version differs from `current`. Returns the replaced files.
  async function refresh(id, current) {
    const idx = await fetchIndex();
    const entry = idx?.arenas.find(a => a.id === id);
    if (!entry) return {};
    const fresh = {};
    for (const kind of FILES) {
      if (current[kind]?.version === entry.files?.[kind]) continue;
      const obj = await fetchFile(id, kind);
      if (obj) { await storage.set(key(id, kind), obj); fresh[kind] = obj; }
    }
    if (Object.keys(fresh).length && (await readCached(id, "building")) && (await readCached(id, "amenities"))) await markDownloaded(id);
    return fresh;
  }

  async function openArena(id, onUpdate = () => {}) {
    const files = {};
    let source = "cache";
    for (const kind of FILES) {
      files[kind] = await readCached(id, kind);
      if (!files[kind]) { files[kind] = await readBundled(id, kind); if (files[kind]) source = "bundled"; }
    }
    if (!files.building || !files.amenities) {
      // Nothing saved and nothing built in: try the network before giving up.
      const fresh = await refresh(id, files).catch(() => ({}));
      Object.assign(files, fresh);
      if (!files.building || !files.amenities) throw new ArenaUnavailableError(id);
      return { building: files.building, amenities: files.amenities, source: "network", refreshed: Promise.resolve(false) };
    }
    const refreshed = refresh(id, files).then(fresh => {
      if (!Object.keys(fresh).length) return false;
      onUpdate({ building: fresh.building ?? files.building, amenities: fresh.amenities ?? files.amenities });
      return true;
    }).catch(() => false);
    return { building: files.building, amenities: files.amenities, source, refreshed };
  }

  async function getIndex() {
    const net = await fetchIndex();
    if (net) return net;
    let cached;
    try { cached = await storage.get("index"); } catch { cached = undefined; }
    if (validIndex(cached)) return cached;
    const bundled = await getJson(bundledUrl + "arenas/index.json");
    return validIndex(bundled) ? bundled : undefined;
  }

  async function downloadArena(id) {
    const idx = await fetchIndex();
    if (!idx?.arenas.some(a => a.id === id)) throw new Error("Couldn't reach the server. Try again when you have a signal.");
    const files = {};
    for (const kind of FILES) {
      files[kind] = await fetchFile(id, kind);
      if (!files[kind]) throw new Error("The download didn't finish. Try again.");
    }
    for (const kind of FILES) await storage.set(key(id, kind), files[kind]);
    await markDownloaded(id);
  }

  async function arenaStatus(id, index) {
    let meta;
    try { meta = await storage.get(key(id, "meta")); } catch { meta = undefined; }
    if (!meta?.downloadedAt) return { state: "none" };
    const entry = index?.arenas?.find(a => a.id === id);
    if (entry) {
      for (const kind of FILES) {
        const cached = await readCached(id, kind);
        if (cached?.version !== entry.files?.[kind]) return { state: "update", downloadedAt: meta.downloadedAt };
      }
    }
    return { state: "downloaded", downloadedAt: meta.downloadedAt };
  }

  return { openArena, getIndex, downloadArena, arenaStatus };
}
