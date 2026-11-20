// Arena picker search: matches name or city, downloaded arenas first, then by name.
export function filterArenas(arenas, query, downloaded = new Set()) {
  const q = query.trim().toLowerCase();
  return arenas
    .filter(a => !q || a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q))
    .sort((a, b) => (downloaded.has(b.id) - downloaded.has(a.id)) || a.name.localeCompare(b.name));
}
