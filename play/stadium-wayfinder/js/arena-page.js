// Entry point for arena.html?id=<arena-id>: loads that arena's data, builds the venue, starts the UI.
import { buildVenue } from "./graph.js";
import { start } from "./app.js";

const id = new URLSearchParams(location.search).get("id");
const showError = msg => { document.getElementById("arena-name").textContent = msg; };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

if (!id || !/^[a-z0-9-]{1,64}$/.test(id)) showError("Pick an arena first.");
else {
  try {
    const [building, amenities] = await Promise.all([getJson(`arenas/${id}/building.json`), getJson(`arenas/${id}/amenities.json`)]);
    start(buildVenue(building, amenities));
  } catch (e) {
    console.error(e);
    showError("Couldn't load this arena.");
  }
}
