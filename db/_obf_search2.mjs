// Broader OBF searches for remaining missing items
const queries = [
  ["3360372059707", "Armani Code"],
  ["3360372059707", "Armani Code men"],
  ["8011003845460", "Bright Crystal Versace"],
  ["8011003845460", "Versace Crystal"],
  ["3337875585026", "Effaclar Duo"],
  ["3337875585026", "La Roche Posay Effaclar"],
  ["5060542790147", "Charlotte Tilbury Magic"],
  ["5060542790147", "Magic Cream Tilbury"],
  ["0607845029250", "NARS Concealer"],
  ["0607845029250", "Radiant Creamy Concealer"],
];

async function search(name) {
  const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,image_front_url,image_url`;
  const r = await fetch(url, { headers: { "User-Agent": "duo-seed/1.0" } });
  if (!r.ok) return [];
  const j = await r.json();
  return j.products || [];
}
async function headOk(url) {
  if (!url) return false;
  try { const r = await fetch(url, { method: "HEAD" }); if (!r.ok) return false; const ct = r.headers.get("content-type") || ""; return ct.startsWith("image/"); } catch { return false; }
}

for (const [ean, q] of queries) {
  const products = await search(q);
  const candidates = [];
  for (const p of products) {
    const u = p.image_front_url || p.image_url;
    if (u) candidates.push({ code: p.code, brand: p.brands, name: p.product_name, url: u });
  }
  console.log(`\n=== ${ean} "${q}" (${candidates.length} candidates) ===`);
  for (const c of candidates.slice(0, 5)) {
    const ok = await headOk(c.url);
    console.log(`  [${ok?"OK":"X "}] ${c.brand} | ${c.name} -> ${c.url}`);
  }
}
