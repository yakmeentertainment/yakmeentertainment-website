// One small key-value store for the app's saved data (arena files, the report queue).
// Android app: Capacitor Filesystem plugin. Browser: IndexedDB. Neither available: memory only.
// Every backend has the same async interface: get, set, remove, keys(prefix). Values are JSON.

const DIR = "DATA";   // Capacitor Directory.Data: the app's private storage
const ENC = "utf8";   // Capacitor Encoding.UTF8
const FOLDER = "sw";

export function memoryStorage() {
  const m = new Map();
  return {
    backend: "memory",
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : undefined; },
    async set(k, v) { m.set(k, JSON.stringify(v)); },
    async remove(k) { m.delete(k); },
    async keys(prefix = "") { return [...m.keys()].filter(k => k.startsWith(prefix)); }
  };
}

export function filesystemStorage(fs) {
  const file = k => `${FOLDER}/${encodeURIComponent(k)}.json`;
  const quiet = p => p.catch(() => {});
  return {
    backend: "filesystem",
    async get(k) {
      let data;
      try { ({ data } = await fs.readFile({ path: file(k), directory: DIR, encoding: ENC })); } catch { return undefined; }
      try { return JSON.parse(data); } catch { await quiet(fs.deleteFile({ path: file(k), directory: DIR })); return undefined; }
    },
    async set(k, v) {
      // Write a temporary file first, so a crash mid-write never leaves a half-written file under the real name.
      const tmp = file(k) + ".tmp";
      await fs.writeFile({ path: tmp, data: JSON.stringify(v), directory: DIR, encoding: ENC, recursive: true });
      await quiet(fs.deleteFile({ path: file(k), directory: DIR }));
      await fs.rename({ from: tmp, to: file(k), directory: DIR, toDirectory: DIR });
    },
    async remove(k) { await quiet(fs.deleteFile({ path: file(k), directory: DIR })); },
    async keys(prefix = "") {
      let files;
      try { ({ files } = await fs.readdir({ path: FOLDER, directory: DIR })); } catch { return []; }
      return files.map(f => f.name).filter(n => n.endsWith(".json")).map(n => decodeURIComponent(n.slice(0, -5))).filter(k => k.startsWith(prefix));
    }
  };
}

export function indexedDbStorage(idb) {
  let dbp;
  const db = () => dbp ??= new Promise((resolve, reject) => {
    const req = idb.open("stadium-wayfinder", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  async function run(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction("kv", mode), req = fn(tx.objectStore("kv"));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  return {
    backend: "indexeddb",
    async get(k) { const s = await run("readonly", st => st.get(k)); if (s === undefined) return undefined; try { return JSON.parse(s); } catch { return undefined; } },
    async set(k, v) { await run("readwrite", st => st.put(JSON.stringify(v), k)); },
    async remove(k) { await run("readwrite", st => st.delete(k)); },
    async keys(prefix = "") { return (await run("readonly", st => st.getAllKeys())).map(String).filter(k => k.startsWith(prefix)); }
  };
}

export function createStorage(env = globalThis) {
  const cap = env.Capacitor;
  if (cap?.isNativePlatform?.() && cap.Plugins?.Filesystem) return filesystemStorage(cap.Plugins.Filesystem);
  if (env.indexedDB) return indexedDbStorage(env.indexedDB);
  return memoryStorage();
}
