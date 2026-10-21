// Fetch and parse the large search index away from the UI thread. Index
// normalization and publication remain in demo.html, in small yielding batches.
self.onmessage = async event => {
  const url = event.data && event.data.url;
  const epoch = Number(event.data && event.data.epoch) || 0;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const indice = await response.json();
    const size = indice.n;
    if (size && indice.e && indice.s && indice.mn && indice.mx) {
      const scores = new Float64Array(size);
      const order = new Array(size);
      for (let i = 0; i < size; i++) {
        const best = indice.mn[i] < 0 ? null : indice.mn[i] / 100;
        const worst = indice.mx[i] < 0 ? null : indice.mx[i] / 100;
        const savings = (best !== null && worst !== null) ? +(worst - best).toFixed(2) : 0;
        // Must stay identical to demo.html's popularityScore formula in
        // rebuildCatalogIndexesFromSources(); it builds the fallback score map.
        scores[i] = indice.s[i] * 1000 + Math.min(savings, 50) * 5 - (best ?? 9999) * 0.01;
        order[i] = i;
      }
      order.sort((a, b) => scores[b] - scores[a]);
      const rank = new Array(size);
      for (let i = 0; i < size; i++) rank[order[i]] = i + 1;
      indice.rnk = rank;
      const rotated = order.map((index, position) => {
        const ean = indice.e[index];
        const key = ean + '|' + epoch;
        let hash = 2166136261;
        for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 16777619); }
        const jitter = ((hash >>> 0) % 1000) / 1000;
        return { index, rank: position + 1 + jitter * 24 };
      });
      rotated.sort((a, b) => a.rank - b.rank);
      indice.pop = rotated.map(item => indice.e[item.index]);
    }
    const fields = Object.keys(indice).filter(key => Array.isArray(indice[key]) && indice[key].length === size);
    const fieldSet = new Set(fields);
    const meta = {};
    for (const key of Object.keys(indice)) if (!fieldSet.has(key)) meta[key] = indice[key];
    self.postMessage({ type: 'start', size, fields, meta });
    const chunkSize = 1024;
    for (let from = 0; from < size; from += chunkSize) {
      const arrays = {};
      for (const key of fields) arrays[key] = indice[key].slice(from, Math.min(from + chunkSize, size));
      self.postMessage({ type: 'chunk', from, arrays });
    }
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({ type: 'error', error: error && error.message || 'falha ao ler índice' });
  }
};
