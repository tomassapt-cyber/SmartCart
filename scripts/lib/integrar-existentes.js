'use strict';
/**
 * Integração "só produtos existentes" de uma loja nova (regra de 08/10/2026).
 * ===========================================================================
 * Generaliza o integrador da Farmácia Nova da Maia (#40): a loja só acrescenta
 * OFERTAS a produtos que o catálogo já tem, nunca cria produtos nem mexe em
 * nomes, imagens ou ofertas das outras lojas.
 *   - identidade: GTIN exato, EAN antigo do produto, alias documentado em
 *     data/product-aliases.json ou grafia UPC-A/EAN-13 ("0"+12) — só quando
 *     aponta para UM produto;
 *   - recusa (fica no relatório) volumes ou unidades diferentes dos que o
 *     produto já tem, e GTIN com duas ofertas diferentes para o mesmo volume;
 *   - com `loja.semCodigosInternos`, recusa (fica no relatório) os GTIN de
 *     circulação restrita (EAN-13 começado por 2): são códigos internos de cada
 *     loja e podem coincidir por acaso com o código interno de outra (14/10/2026);
 *   - não grava com feed incompleto, vazio, com mais de 24 h, ou se a
 *     cobertura cair mais de 20% face à integração anterior;
 *   - idempotente: correr duas vezes sobre o mesmo seed dá o mesmo seed.
 * Os sem par seguro ficam em "unmatched" com candidatos por impressão digital
 * e volume, para revisão manual de aliases (nunca juntados automaticamente).
 */
const fs = require('fs'), path = require('path');
const { productFingerprint, extractVolumeMl } = require('./product-fingerprint');

// zeros à esquerda não mudam o GTIN: "0"+EAN-13 (GTIN-14) = EAN-13 e "0"+UPC-A (EAN-13) = UPC-A
const semZero = e => { let s = String(e); while (s.length > 12 && s[0] === '0' && /^\d+$/.test(s)) s = s.slice(1); return s; };
const gtinValido = e => /^(?:\d{12}|\d{13}|\d{14})$/.test(String(e)) && [...String(e).slice(0, -1)].reverse().reduce((s, d, i) => s + Number(d) * (i % 2 ? 1 : 3), Number(String(e).at(-1))) % 10 === 0;
const normalizado = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const unidade = nome => { const m = String(nome || '').match(/\d(?:[.,]\d+)?\s*(ml|l|gr|g|kg)\b/i); return m ? (/g/i.test(m[1]) ? 'g' : 'ml') : null; };

function indiceIdentidade(seed, aliases = {}) {
  const exato = new Map(), conhecidos = new Map();
  const junta = (k, p) => { k = semZero(k); if (!conhecidos.has(k)) conhecidos.set(k, new Set()); conhecidos.get(k).add(p); };
  for (const p of seed.products) { exato.set(String(p.ean), p); junta(p.ean, p); for (const e of p.eans_antigos || []) junta(e, p); }
  for (const [ean, entrada] of Object.entries(aliases)) { const p = exato.get(ean); if (p) for (const e of entrada.aliases || []) junta(e, p); }
  const marcas = [...new Set(seed.products.map(p => p.brand).filter(Boolean))].map(b => ({ marca: b, texto: normalizado(b) })).sort((a, b) => b.texto.length - a.texto.length);
  const impressoes = new Map();
  for (const p of seed.products) { const k = productFingerprint(p); if (!k) continue; if (!impressoes.has(k)) impressoes.set(k, []); impressoes.get(k).push(p); }
  return {
    resolver(e) {
      const direto = exato.get(String(e));
      if (direto) return { produto: direto, metodo: 'GTIN' };
      const lista = [...(conhecidos.get(semZero(e)) || [])];
      return lista.length === 1 ? { produto: lista[0], metodo: 'alias documentado/UPC' } : null;
    },
    rever(linha) {
      const nome = normalizado(linha.name);
      const marca = (linha.brand && marcas.find(b => b.texto === normalizado(linha.brand))?.marca) || marcas.find(b => nome === b.texto || nome.startsWith(b.texto + ' '))?.marca;
      if (!marca) return [];
      const vol = extractVolumeMl(linha.name);
      return (impressoes.get(productFingerprint({ name: linha.name, brand: marca })) || [])
        .filter(p => { const pv = extractVolumeMl(p.name); return !!vol && !!pv && vol === pv; })
        .map(p => ({ ean: p.ean, name: p.name, brand: p.brand, motivo: 'mesma impressão digital e volume; identidade física por confirmar' }));
    },
  };
}

/**
 * @param {object} seed   catálogo (alterado no lugar)
 * @param {object} feed   saída do scraper: {in_progress:false, completed_at, products:[{status:'ok', ean, name, price, in_stock, url, previous_price?}]}
 * @param {{slug:string, name:string, base_url:string, urlPrefix:string, maxIdadeH?:number, semCodigosInternos?:boolean}} loja
 */
function integrar(seed, feed, loja, aliases = {}) {
  if (!feed || feed.in_progress !== false || !Array.isArray(feed.products) || !feed.products.length || !feed.completed_at) throw Error('Feed incompleto ou vazio');
  const idade = Date.now() - Date.parse(feed.completed_at);
  if (!Number.isFinite(idade) || idade < 0 || idade > (loja.maxIdadeH ?? 24) * 3600000) throw Error('Feed com mais de 24 h ou data inválida');
  const chavesOriginais = seed.products.map(p => p.ean);
  const indice = indiceIdentidade(seed, aliases);
  const semPar = [], conflitos = [], baldes = new Map(), bloqueados = new Set(), volumesConhecidos = new Map();
  let porAlias = 0;
  for (const g of seed.store_products) {
    if (g.store_slug === loja.slug) continue;
    for (const of of g.items || []) for (const v of of.variants || []) if (v.volume_ml > 0) { if (!volumesConhecidos.has(of.ean)) volumesConhecidos.set(of.ean, new Set()); volumesConhecidos.get(of.ean).add(v.volume_ml); }
  }
  for (const linha of feed.products) {
    if (linha.status !== 'ok' || !gtinValido(linha.ean) || !Number.isFinite(linha.price) || linha.price <= 0 || typeof linha.in_stock !== 'boolean' || typeof linha.url !== 'string' || !linha.url.startsWith(loja.urlPrefix)) throw Error('Linha inválida no feed: ' + JSON.stringify(linha).slice(0, 200));
    if (loja.semCodigosInternos && /^2\d{12}$/.test(semZero(linha.ean))) { conflitos.push({ ean: linha.ean, motivo: 'código interno de circulação restrita (prefixo 2)', loja: linha.name }); continue; }
    const r = indice.resolver(linha.ean);
    if (!r) { semPar.push({ ean: linha.ean, name: linha.name, url: linha.url, candidatos: indice.rever(linha) }); continue; }
    if (r.metodo !== 'GTIN') porAlias++;
    const p = r.produto;
    const volNovo = extractVolumeMl(linha.name), volProduto = extractVolumeMl(p.name);
    const uniNova = unidade(linha.name), uniProduto = unidade(p.name);
    if (uniNova && uniProduto && uniNova !== uniProduto) { conflitos.push({ ean: linha.ean, canonico: p.ean, motivo: 'unidades diferentes (massa/volume)', loja: linha.name, catalogo: p.name }); continue; }
    if (volNovo && volProduto && volNovo !== volProduto && !volumesConhecidos.get(p.ean)?.has(volNovo)) { conflitos.push({ ean: linha.ean, canonico: p.ean, motivo: 'volume que o produto ainda não tem', loja: linha.name, catalogo: p.name }); continue; }
    const chave = p.ean + '|' + (volNovo || 'sem-volume') + '|' + (uniNova || 'ml');
    if (bloqueados.has(chave)) continue;
    if (!baldes.has(p.ean)) baldes.set(p.ean, new Map());
    const vs = baldes.get(p.ean);
    const variante = { volume_ml: volNovo || null, unit: uniNova || 'ml', price: linha.price, previous_price: linha.previous_price > linha.price ? linha.previous_price : null, in_stock: linha.in_stock, url: linha.url };
    if (vs.has(chave)) {
      if (JSON.stringify(vs.get(chave)) !== JSON.stringify(variante)) { bloqueados.add(chave); conflitos.push({ ean: linha.ean, canonico: p.ean, motivo: 'duas ofertas diferentes para o mesmo volume', anterior: vs.get(chave), nova: variante }); vs.delete(chave); }
      continue;
    }
    vs.set(chave, variante);
  }
  const itens = [];
  for (const [ean, balde] of baldes) {
    const vs = [...balde.values()];
    if (!vs.length) continue;
    const emStock = vs.filter(v => v.in_stock);
    const melhor = (emStock.length ? emStock : vs).reduce((a, b) => a.price <= b.price ? a : b);
    const item = { ean, price: melhor.price, in_stock: !!emStock.length, url: melhor.url, verified: true, verified_url: true, verified_at: feed.completed_at, source: 'scraped' };
    if (melhor.previous_price > melhor.price) item.previous_price = melhor.previous_price;
    const comVolume = vs.filter(v => v.volume_ml > 0);
    if (comVolume.length) item.variants = comVolume;
    itens.push(item);
  }
  if (!itens.length) throw Error('Nenhum produto existente casou; seed preservado');
  const atual = seed.store_products.find(g => g.store_slug === loja.slug);
  if (atual?.items?.length && itens.length < atual.items.length * 0.8) throw Error(`Cobertura caiu mais de 20% (${atual.items.length} → ${itens.length}); seed preservado`);
  if (!seed.stores.some(s => s.slug === loja.slug)) seed.stores.push({ slug: loja.slug, name: loja.name, base_url: loja.base_url, logo_url: null });
  if (atual) atual.items = itens; else seed.store_products.push({ store_slug: loja.slug, items: itens });
  if (seed.products.length !== chavesOriginais.length || seed.products.some((p, i) => p.ean !== chavesOriginais[i])) throw Error('As chaves dos produtos mudaram');
  return {
    loja: loja.slug, products_created: 0, offers: itens.length, active_offers: itens.filter(i => i.in_stock).length, inactive_offers: itens.filter(i => !i.in_stock).length,
    feed_rows: feed.products.length, matched_by_alias: porAlias, unmatched_count: semPar.length, conflicts_count: conflitos.length, unmatched: semPar, conflicts: conflitos,
  };
}

/** Corre a integração de uma loja sobre data/seed-bundle.json (use --dry-run para não gravar). */
function executar(loja, argv = process.argv) {
  const raiz = path.resolve(__dirname, '..', '..');
  const ficheiroSeed = path.join(raiz, 'data/seed-bundle.json');
  const ficheiroFeed = path.join(raiz, `data/catalog/${loja.slug}-full.json`);
  const ficheiroRelatorio = path.join(raiz, `data/catalog/${loja.slug}-integration-report.json`);
  const antes = fs.readFileSync(ficheiroSeed);
  const seed = JSON.parse(antes), feed = JSON.parse(fs.readFileSync(ficheiroFeed, 'utf8'));
  const caminhoAliases = path.join(raiz, 'data/product-aliases.json');
  const aliases = fs.existsSync(caminhoAliases) ? JSON.parse(fs.readFileSync(caminhoAliases, 'utf8')) : {};
  const resultado = integrar(seed, feed, loja, aliases);
  const depois = JSON.stringify(seed);
  resultado.seed_bytes_delta = Buffer.byteLength(depois) - antes.length;
  fs.writeFileSync(ficheiroRelatorio, JSON.stringify(resultado, null, 2) + '\n');
  console.log(JSON.stringify({ ...resultado, unmatched: undefined, conflicts: undefined }));
  if (argv.includes('--dry-run')) { if (!fs.readFileSync(ficheiroSeed).equals(antes)) throw Error('O ensaio escreveu no seed'); return resultado; }
  fs.writeFileSync(ficheiroSeed, depois);
  return resultado;
}

module.exports = { integrar, executar, indiceIdentidade, gtinValido };
