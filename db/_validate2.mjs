const urls = [
  ["Versace BC", "https://static.thcdn.com/productimg/original/10048625-7005322024530583.jpg"],
  ["CT Magic Cream", "https://static.thcdn.com/productimg/original/17638977-8095316825438462.jpg"],
  ["NARS Concealer", "https://static.thcdn.com/productimg/original/10785712-1785249197799430.jpg"],
];
for (const [l,u] of urls) {
  try {
    const r = await fetch(u, { method: "HEAD" });
    const ct = r.headers.get("content-type") || "";
    console.log(`[${r.status} ${ct}] ${l}: ${u}`);
  } catch (e) { console.log(`[ERR] ${l}: ${e.message}`); }
}
