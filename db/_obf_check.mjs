// Query OpenBeautyFacts API for each EAN, get image_front_url
const eans = [
  ["3145891264100", "Chanel No. 5"],
  ["3365440787858", "YSL Black Opium"],
  ["3348901250146", "Dior Sauvage"],
  ["3360372059707", "Armani Code"],
  ["8011003845460", "Versace Bright Crystal"],
  ["3614271326072", "Lancome Genifique"],
  ["0887167491625", "EL ANR"],
  ["3337875585132", "Vichy Mineral 89"],
  ["3337875585026", "LRP Effaclar"],
  ["3264680004605", "Nuxe Huile"],
  ["3522930003151", "Caudalie Vinoperfect"],
  ["3337875597196", "CeraVe Creme"],
  ["3600523432059", "Loreal Elvive"],
  ["3474630639785", "Kerastase Elixir"],
  ["0884486373601", "Redken All Soft"],
  ["8719134109924", "Rituals Sakura"],
  ["3401395614172", "Bioderma Sensibio"],
  ["3600524025632", "Maybelline Fit Me"],
  ["5060542790147", "CT Magic Cream"],
  ["0607845029250", "NARS Concealer"],
];

async function checkObf(ean) {
  const url = `https://world.openbeautyfacts.org/api/v2/product/${ean}.json?fields=image_front_url,image_url,product_name`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "duo-seed/1.0" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== 1) return null;
    return j.product?.image_front_url || j.product?.image_url || null;
  } catch (e) {
    return null;
  }
}

async function checkOff(ean) {
  // some cosmetics also live in OpenFoodFacts
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=image_front_url,image_url`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "duo-seed/1.0" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.status !== 1) return null;
    return j.product?.image_front_url || j.product?.image_url || null;
  } catch (e) {
    return null;
  }
}

async function headOk(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch (e) {
    return false;
  }
}

const results = {};
for (const [ean, name] of eans) {
  let url = await checkObf(ean);
  let src = "obf";
  if (!url) {
    url = await checkOff(ean);
    src = "off";
  }
  const ok = await headOk(url);
  results[ean] = { name, url, src, ok };
  console.log(`${ean} ${name}: ${ok ? "OK" : "FAIL"} [${src}] ${url || "(none)"}`);
}

console.log("\n--- SUMMARY ---");
const okCount = Object.values(results).filter(r => r.ok).length;
console.log(`${okCount}/${eans.length} OK`);
console.log(JSON.stringify(results, null, 2));
