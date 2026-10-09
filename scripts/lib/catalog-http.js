// Diagnóstico limitado: nunca imprime o corpo ou parâmetros dos pedidos.
function createCatalogClient() {
  const controller = new AbortController();
  let fatal = null, samples = 0;
  const seen = new Set();
  const stop = message => {
    fatal = Object.assign(new Error(message), { catalogFatal: true });
    controller.abort(fatal);
    throw fatal;
  };
  const safeUrl = value => { const u = new URL(value); return u.origin + u.pathname; };
  async function catalogFetch(url, options = {}) {
    if (fatal) throw fatal;
    const signals = [controller.signal, AbortSignal.timeout(30000)];
    if (options.signal) signals.push(options.signal);
    let response;
    try { response = await globalThis.fetch(url, { ...options, signal: AbortSignal.any(signals) }); }
    catch (error) { if (fatal) throw fatal; throw error; }
    const sitemap = /\.xml(?:\?|$)/i.test(String(url));
    const metadata = { status: response.status, url: safeUrl(response.url || url), contentType: response.headers.get('content-type') };
    if (sitemap || !response.ok || !seen.has(new URL(url).host)) {
      console.log('[catalog-http]', JSON.stringify(metadata));
      seen.add(new URL(url).host);
    }
    if (response.status === 403 || response.status === 429) stop(`Recolha interrompida: HTTP ${response.status} em ${metadata.url}`);
    if (!response.ok && response.status < 500 && ![404, 410].includes(response.status)) stop(`Resposta HTTP ${response.status} em ${metadata.url}`);
    if (sitemap && !response.ok) stop(`Sitemap recusado: HTTP ${response.status} em ${metadata.url}`);
    let html;
    try { html = await response.text(); } catch (error) { if (fatal) throw fatal; throw error; }
    if (/cf-chl-|<title>\s*(?:Just a moment|Attention Required)/i.test(html)) stop(`Página de proteção em ${metadata.url}`);
    if (sitemap && !/<(?:[a-z]+:)?(?:urlset|sitemapindex)\b/i.test(html)) stop(`Resposta sem XML de sitemap em ${metadata.url} (${metadata.contentType}, ${html.length} caracteres)`);
    // O corpo é lido uma única vez; os consumidores mantêm a interface usada.
    return { status: response.status, ok: response.ok, url: response.url, headers: response.headers, text: async () => html };
  }
  function reportEmptyProduct(html) {
    if (samples++ >= 5) return;
    const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const counts = { chars: html.length, jsonld: blocks.length, invalidJson: 0, product: 0, gtin: 0, offers: 0 };
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const n of node) visit(n); return; }
      if (node['@graph']) visit(node['@graph']);
      if ([node['@type']].flat().includes('Product')) {
        counts.product++;
        if (node.gtin13 || node.gtin || node.gtin12 || node.gtin14) counts.gtin++;
        if (node.offers) counts.offers++;
      }
    }
    for (const block of blocks) { try { visit(JSON.parse(block[1])); } catch { counts.invalidJson++; } }
    console.log('[catalog-skip]', JSON.stringify(counts));
  }
  return { fetch: catalogFetch, reportEmptyProduct };
}
module.exports = { createCatalogClient };
