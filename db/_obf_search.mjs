// For products not found by direct EAN lookup, try OBF text search by name
const queries = [
  ["3145891264100", "Chanel No 5 Eau de Parfum"],
  ["3360372059707", "Armani Code Homme"],
  ["8011003845460", "Versace Bright Crystal"],
  ["3614271326072", "Lancome Genifique"],
  ["0887167491625", "Estee Lauder Advanced Night Repair"],
  ["3337875585132", "Vichy Mineral 89"],
  ["3337875585026", "La Roche Posay Effaclar Duo"],
  ["3264680004605", "Nuxe Huile Prodigieuse"],
  ["3337875597196", "CeraVe Moisturising Cream"],
  ["3600523432059", "L'Oreal Elvive Extraordinary Oil"],
  ["3474630639785", "Kerastase Elixir Ultime"],
  ["0884486373601", "Redken All Soft Shampoo"],
  ["8719134109924", "Rituals Sakura Body Cream"],
  ["3401395614172", "Bioderma Sensibio H2O"],
  ["3600524025632", "Maybelline Fit Me Foundation"],
  ["5060542790147", "Charlotte Tilbury Magic Cream"],
  ["0607845029250", "NARS Radiant Creamy Concealer"],
];

async function search(name) {
  const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,image_front_url,image_url`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "duo-seed/1.0" } });
    if (!r.ok) return [];
    const j = await r.json();
    return j.products || [];
  } catch (e) { return []; }
}

async function headOk(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch (e) { return false; }
}

for (const [ean, q] of queries) {
  const products = await search(q);
  let found = null;
  for (const p of products) {
    const u = p.image_front_url || p.image_url;
    if (u && await headOk(u)) {
      found = { code: p.code, name: p.product_name, url: u };
      break;
    }
  }
  console.log(`${ean} "${q}": ${found ? "OK " + found.url : "FAIL"}`);
}
