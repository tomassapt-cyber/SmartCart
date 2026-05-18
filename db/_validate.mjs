const urls = [
  ["NARS thcdn raw", "https://static.thcdn.com/productimg/original/10785712-1785249197799430.jpg"],
  ["NARS thcdn 480", "https://static.thcdn.com/productimg/480/480/10785712-1785249197799430.jpg"],
  ["NARS thcdn 960", "https://static.thcdn.com/productimg/960/960/10785712-1785249197799430.jpg"],
];
async function check(label, url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const ct = r.headers.get("content-type") || "";
    console.log(`[${r.status} ${ct}] ${label}: ${url}`);
  } catch (e) { console.log(`[ERR] ${label}: ${e.message}`); }
}
for (const [l,u] of urls) await check(l,u);
