// Arena picker: lists arenas from arenas/index.json with a search box.
import { filterArenas } from "./arena-list.js";

const list = document.getElementById("arena-list"), search = document.getElementById("arena-search");
let arenas = [];

function render() {
  const shown = filterArenas(arenas, search.value);
  list.innerHTML = "";
  if (!shown.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "No arena matches that search."; list.appendChild(li); return; }
  for (const a of shown) {
    const li = document.createElement("li"), link = document.createElement("a");
    link.href = `arena.html?id=${encodeURIComponent(a.id)}`;
    const name = document.createElement("strong"); name.textContent = a.name;
    const city = document.createElement("span"); city.textContent = [a.city, a.region].filter(Boolean).join(", ");
    link.append(name, city); li.appendChild(link); list.appendChild(li);
  }
}

search.addEventListener("input", render);
try {
  const res = await fetch("arenas/index.json");
  if (!res.ok) throw new Error(String(res.status));
  arenas = (await res.json()).arenas;
} catch (e) {
  console.error(e);
}
render();
