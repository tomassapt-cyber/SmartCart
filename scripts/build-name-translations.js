#!/usr/bin/env node
/**
 * SmartCart — Tradução PT de NOMES (whitelist, sem híbridos)
 * ============================================================
 *
 * NÃO-destrutivo. Nunca toca em data/seed-bundle.json (o nome é o
 * fingerprint do dedup). Apenas popula a secção "names" do overlay
 * data/translations.json, que o inject aplica SÓ à cópia embebida no HTML.
 *
 * Estratégia "WHITELIST" (mais segura que a antiga blocklist):
 *   Tokeniza o nome. Cada token alfabético TEM de ser classificável como:
 *     (a) chave do DICT  → será traduzido ES→PT, ou
 *     (b) token SEGURO   → fica igual (já é PT, ou é inglês/unidade), ou
 *     (c) token da própria MARCA do produto (p.brand), ou
 *     (d) contém dígito  → código (Q10, SPF50, C50, 30ml) → fica igual.
 *   Se ALGUM token não couber em (a)-(d), o nome é IGNORADO por completo.
 *   Assim nunca emitimos híbridos nem partimos nomes ingleses: ou o nome é
 *   100% reconhecido (e fica limpo em PT) ou não é emitido.
 *
 *   Só emitimos quando, além de tudo reconhecido, a tradução MUDOU algo
 *   (tr !== nome) — senão não há nada a fazer.
 *
 * Uso: node scripts/build-name-translations.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const TR = path.join(ROOT, 'data', 'translations.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ── DICT ES→PT (chaves minúsculas, sem acento-sensitivity nas chaves além
//    do que está escrito). Valores Title-case; matchCase ajusta o caso. Só
//    termos cuja tradução é INEQUÍVOCA e segura. ──────────────────────────
const DICT = {
  // tipos de produto
  'aceite': 'Óleo', 'aceites': 'Óleos',
  'crema': 'Creme', 'cremas': 'Cremes',
  'champú': 'Champô', 'champu': 'Champô', 'champús': 'Champôs', 'champus': 'Champôs',
  'jabón': 'Sabonete', 'jabon': 'Sabonete', 'jabones': 'Sabonetes',
  'mascarilla': 'Máscara', 'mascarillas': 'Máscaras',
  'loción': 'Loção', 'locion': 'Loção',
  'leche': 'Leite', 'polvos': 'Pós',
  'acondicionador': 'Condicionador',
  'exfoliante': 'Esfoliante', 'exfoliantes': 'Esfoliantes',
  'extracto': 'Extrato', 'extractos': 'Extratos',
  // conectores SEGUROS (sem concordância de género). del/los/las/al/en/la
  // ficam DE FORA de propósito → nomes com eles são ignorados (género ambíguo).
  'con': 'Com', 'sin': 'Sem', 'y': 'E',
  // partes do corpo / alvos
  'piel': 'Pele', 'pieles': 'Peles',
  'cabello': 'Cabelo', 'cabellos': 'Cabelos',
  'rostro': 'Rosto', 'ojos': 'Olhos', 'cuerpo': 'Corpo',
  'manos': 'Mãos', 'pies': 'Pés', 'uñas': 'Unhas',
  'cejas': 'Sobrancelhas', 'rizos': 'Caracóis', 'mechas': 'Madeixas',
  'puntas': 'Pontas', 'cuero': 'Couro',
  // ingredientes
  'aguacate': 'Abacate', 'almendras': 'Amêndoas', 'almendra': 'Amêndoa',
  'zanahoria': 'Cenoura', 'cebolla': 'Cebola', 'cebada': 'Cevada',
  'miel': 'Mel', 'avena': 'Aveia', 'ricino': 'Rícino',
  'argán': 'Argão',   // só a forma ES acentuada; "argan" (EN/ingrediente) fica igual
  'granada': 'Romã', 'manzana': 'Maçã', 'fresa': 'Morango',
  // qualificadores / adjetivos (tradução inequívoca)
  'protector': 'Protetor', 'protectora': 'Protetora', 'protectores': 'Protetores',
  'protección': 'Proteção', 'proteccion': 'Proteção',
  'antiarrugas': 'Antirrugas', 'antiedad': 'Antienvelhecimento',
  'anticaída': 'Antiqueda', 'anticaida': 'Antiqueda',
  'suavizante': 'Amaciador', 'suavizantes': 'Amaciadores',
  'edad': 'Idade',
  // público-alvo
  'hombre': 'Homem', 'hombres': 'Homens', 'mujer': 'Mulher', 'mujeres': 'Mulheres',
  'niños': 'Crianças', 'niño': 'Criança', 'ninos': 'Crianças',
  // tempo
  'noche': 'Noite', 'día': 'Dia', 'dias': 'Dias',
  // embalagem / outros ES inequívocos
  'estuche': 'Estojo', 'estuches': 'Estojos',
  'fotoprotector': 'Fotoprotetor', 'fotoprotectores': 'Fotoprotetores',
  'desodorante': 'Desodorizante',
};

// ── SAFE: tokens alfabéticos que ficam INALTERADOS (já-PT, inglês, unidades,
//    abreviaturas, cognatos idênticos PT/ES). Tudo minúsculas. Se um token
//    não estiver aqui, nem no DICT, nem na marca, nem tiver dígito → o nome
//    é ignorado. ────────────────────────────────────────────────────────
const SAFE = new Set([
  // conectores / artigos PT
  'de','do','da','dos','das','e','o','a','com','sem','para','por','no','na','ao','à','em',
  // unidades / letras / abreviaturas (vit. etc.)
  'ml','g','l','x','c','b','d','k','q','un','uds','pcs','spf','fps','uv','ph','pa',
  'vit','nº','no','ref','gr','amp','pct',
  // tipos de produto já-PT
  'creme','cremes','sérum','serum','séruns','gel','géis','loção','loções','leite',
  'máscara','máscaras','soro','soros','spray','sprays','bruma','espuma','emulsão',
  'bálsamo','tónico','tónica','fluido','óleo','óleos','champô','champôs','pó','pós',
  'sabonete','sabonetes','condicionador','corretor','iluminador','iluminadora',
  'protetor','protetora','stick','pack','duplo','recarga','elixir','patches',
  'mousse','roll','bruma',
  // partes do corpo / alvos já-PT
  'contorno','olhos','olheiras','rosto','rostos','pele','peles','cabelo','cabelos',
  'lábios','labial','labiais','mãos','pés','unhas','corpo','corporal','capilar',
  'facial','faciais','couro','cabeludo',
  // adjetivos / qualificadores PT (ou cognatos idênticos PT/ES)
  'hidratante','hidratantes','nutritiva','nutritivo','nutritivas','nutritivos',
  'reparador','reparadora','reparadores','revitalizante','revitalizantes',
  'intensivo','intensiva','intensivos','intensivas','calmante','calmantes',
  'iluminadora','despigmentante','despigmentantes','antimanchas','antirrugas',
  'antienvelhecimento','antioxidante','antioxidantes','anticaspa','antiidade',
  'natural','naturais','solar','solares','suave','suaves','seco','seca','secos','secas',
  'sólido','sólida','sólidos','sólidas','rica','rico','ricas','ricos','alta','alto',
  'altas','altos','radiante','radiantes','micelar','micelares','concentrado',
  'concentrada','concentrados','ultra','intenso','intensa','rosa','rosas','aurora',
  'manchas','mancha','rugas','ruga','limpeza','cuidado','cuidados','colágeno',
  'colageno','ácido','hialurónico','hialuronico','vitamina','vitaminas','retinol',
  'niacinamida','karité','coco','vera','aloe','anti','pro','bio','duo',
  // mais PT (revelados pela análise de tokens desconhecidos)
  'dia','noite','água','aguas','águas','esfoliante','esfoliantes','antiqueda',
  'proteção','proteções','sensível','sensíveis','desodorizante','desodorizantes',
  'purificante','purificantes','tratamento','tratamentos','desmaquilhante',
  'desmaquilhantes','refirmante','refirmantes','cofre','cofres','invisível',
  'invisíveis','bebé','bebés','forte','fortes','cor','cores','banho','perfume',
  'perfumes','volume','volumes','mineral','minerais','antiidade','firmeza',
  'nutrição','regenerador','regeneradora','clareador','clareadora','clareamento',
  'unidades','solução','soluções','duche','ampolas','ampola','imperfeições',
  'hidratação','atópica','atópico','atópicas','tom','tons','idade','noturno',
  'noturna','oferta','fortificante','emoliente','diário','diária','lavante',
  'claro','clara','cápsulas','cápsula','efeito','oleosa','oleoso','extra',
  'normal','aclarante',
  // inglês (linhas/marketing comuns)
  'skin','lift','lifting','hydra','hydro','filler','age','eye','eyes','pigment','sun',
  'sunscreen','control','boost','sensitive','expert','cream','repair','collagen',
  'hyaluron','hyaluronic','hyalu','aqua','luminous','shampoo','beauty','super','fresh',
  'pure','peptide','glow','advanced','active','oil','bee','cellular','vitamin','vitamins',
  'express','secret','detox','nutri','color','colour','spot','prevent','night','day',
  'water','light','plus','renew','perfect','recovery','radiance','firming','intense',
  'cleansing','foam','mask','serum','booster','complex','daily','total','clear',
  // mais inglês / francês (linhas e marketing comuns)
  'body','hair','the','conditioner','protect','face','in','on','and','cleanser','care',
  'intensive','toner','lotion','fluid','scrub','acid','moisture','rose','men','lip',
  'moisturizing','dry','black','fusion','cica','soleil','eau','crème','coffret','all',
  'soft','kids','multi','action','double','correction','milk','renewing','soothing',
  'barrier','contour','deep','rich','smooth','matte','shine','volumizing','color',
  'white','gold','rich','silk','keratin','argan','collagen','vitamin','c','retinol',
  'spf','peptides','ceramide','squalane','spotless','brightening','correcting',
  'power','tea','hydrating','curl','leave','baby','after','protection','of','magic',
  'bb','cc','refill','green','primer','secure','for','mist','scalp','sublime',
  'peeling','essence','my','bronze','mini','gloss','invisible','infusion','split',
  'ends','scrub','nutritive','non','stop','high','potency','dark','clean','no','n',
]);

const LETTER = 'A-Za-zÀ-ÿ';
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function matchCase(original, replacement) {
  if (original === original.toUpperCase() && original !== original.toLowerCase())
    return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement;
  return replacement.toLowerCase();
}
const splitRe = new RegExp(`[^${LETTER}0-9]+`);
function tokens(name) { return name.split(splitRe).filter(Boolean); }
function isCode(tok) { return /\d/.test(tok); }      // Q10, SPF50, 30ml, C50…

// Termos AMBÍGUOS PT/EN que só traduzimos quando o nome é claramente espanhol
// (tem um conector ES como "con/sin/del/los/las"). Ex.: "color" é inglês em
// linhas como "Color Care", mas é espanhol em "Crema Con Color" → "Com Cor".
const CTX_DICT = { 'color': 'Cor', 'colores': 'Cores' };
const ES_CTX_RE = new RegExp(`(^|[^${LETTER}])(con|sin|del|los|las|una|uno)(?=$|[^${LETTER}])`, 'i');
function isSpanishContext(name) { return ES_CTX_RE.test(name); }

// Tradução TOKEN-A-TOKEN (preserva delimitadores). Nunca traduz um token que
// pertença à própria marca (evita "Axis-Y"→"Axis-E", "Y" da marca → "E", etc.)
const keepRe = new RegExp(`([^${LETTER}0-9]+)`);
function translateName(name, brandToks, esCtx) {
  const parts = name.split(keepRe);   // alternadamente: token, delim, token, …
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg || keepRe.test(seg)) continue;   // delimitador → mantém
    if (/\d/.test(seg)) continue;             // código → mantém
    const k = seg.toLowerCase();
    if (brandToks.has(k)) continue;           // token da marca → NUNCA traduzir
    if (DICT[k]) { parts[i] = matchCase(seg, DICT[k]); continue; }
    if (esCtx && CTX_DICT[k]) parts[i] = matchCase(seg, CTX_DICT[k]);
  }
  return parts.join('');
}

// ── NOME PT DE OUTRA LOJA (2026-10-02) ─────────────────────────────────────
// A passagem de cima só traduz quando reconhece TODAS as palavras; ficavam
// 2.139 nomes visíveis em espanhol/francês (druni, primor, pharma-gdd…). Mas o
// mesmo produto é vendido, muitas vezes, por lojas portuguesas — com o nome em
// português. Escolhe-se o nome PT mais PARECIDO com o original (depois de
// traduzido pelo DICT), para não herdar o nome de uma oferta mal ligada (ex.:
// "Aceite Extraordinario 6 Flores" tinha uma oferta de um condicionador).
//   • candidatos: nomes dos catálogos (data/catalog) das ofertas do produto;
//   • o candidato tem de ser PT e não ES/FR; entidades HTML e "- Farmácia X"
//     limpos; se o original não começa pela marca, tira-se a marca do início;
//   • semelhança (Jaccard de tokens, sem marca nem conectores) ≥ 0,34 e, se
//     ambos têm volume, o mesmo volume.
const _sa = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const RE_ES = /\b(crema|champu|leche|mascarilla|acondicionador|limpiador|aceite|jabon|locion|desmaquillante|cuerpo|piel|cabello|ojos|labios hidratante de|con|sin|y|del|los|las|para el|para la)\b/;
const RE_FR = /\b(soin|lait|nettoyant|demaquillant|visage|corps|peaux?|cheveux|shampooing|masque|huile|baume|levres|apaisant|hydratante?|pour|sans|et|nuit|jour|eau)\b/;
const RE_PT = /\b(creme|champo|leite|mascara|condicionador|limpeza|protetor|olhos|corpo|pele|cabelo|oleo|sabonete|locao|desmaquilhante|hidratante|para|com|sem|rosto|labios|gel|serum|agua|corporal|capilar|solar)\b/;
const RE_PT_FORTE = /\b(champo|oleo|locao|labios|cabelo|mascara|olhos|limpeza|com|sem)\b/;
function linguaDoNome(n) {
  const t = _sa(n);
  if (RE_ES.test(t) && !RE_PT_FORTE.test(t)) return 'es';
  if (RE_FR.test(t) && !RE_PT_FORTE.test(t)) return 'fr';
  return RE_PT.test(t) ? 'pt' : '?';
}
const FR_PT = { soin: 'cuidado', creme: 'creme', lait: 'leite', nettoyant: 'limpeza', demaquillant: 'desmaquilhante', visage: 'rosto', corps: 'corpo', cheveux: 'cabelo', shampooing: 'champo', masque: 'mascara', huile: 'oleo', baume: 'balsamo', levres: 'labios', hydratant: 'hidratante', hydratante: 'hidratante', apaisant: 'calmante', nuit: 'noite', jour: 'dia', eau: 'agua' };
const CONECT = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'com', 'sem', 'para', 'en', 'el', 'la', 'los', 'las', 'del', 'y', 'con', 'sin', 'pour', 'et', 'le', 'les', 'des', 'du', 'au', 'a', 'o', 'ml', 'g', 'gr']);
function tokensComparaveis(nome, marcaToks) {
  const out = new Set();
  for (const t0 of _sa(nome).split(/[^a-z0-9]+/)) {
    if (!t0 || /^\d/.test(t0) || CONECT.has(t0) || marcaToks.has(t0)) continue;
    const es = DICT[t0] ? _sa(DICT[t0]) : null;
    out.add(es || FR_PT[t0] || t0);
  }
  return out;
}
function decodificar(n) {
  return String(n || '').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+-\s+Farm[áa]cia\b.*$/i, '').replace(/\s*\.{3,}$|…$/, '').replace(/\s+/g, ' ').trim();
}
const _volNome = n => { const m = _sa(n).match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/); if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); return (m[2] === 'l' || m[2] === 'kg') ? v * 1000 : v; };
function nomesPtDeOutrasLojas(seed, jaTraduzidos, desta) {
  const CAT = path.join(ROOT, 'data', 'catalog');
  const nomePorUrl = new Map();
  for (const f of fs.readdirSync(CAT)) {
    if (!f.endsWith('-full.json')) continue;
    let c; try { c = JSON.parse(fs.readFileSync(path.join(CAT, f), 'utf8')); } catch { continue; }
    for (const p of c.products || []) if (p && p.url && p.name) nomePorUrl.set(p.url, p.name);
  }
  const cands = new Map();
  for (const g of seed.store_products) for (const it of g.items) {
    const n = nomePorUrl.get(it.url); if (n) (cands.get(it.ean) || cands.set(it.ean, []).get(it.ean)).push(n);
  }
  const emitir = {}; const amostra = []; let alvo = 0, semCandidato = 0, fracos = 0;
  for (const p of seed.products) {
    if (!p.name || !cands.has(p.ean) && !p.name) continue;
    const mostrado = desta[p.ean] || jaTraduzidos[p.ean] || p.name;
    const l = linguaDoNome(mostrado); if (l !== 'es' && l !== 'fr') continue;
    alvo++;
    const marca = decodificar(p.brand || '');
    const marcaToks = new Set(_sa(marca).split(/[^a-z0-9]+/).filter(Boolean));
    const base = tokensComparaveis(mostrado, marcaToks);
    const vp = _volNome(mostrado);
    let melhor = null, score = 0;
    for (const c0 of new Set(cands.get(p.ean) || [])) {
      let c = decodificar(c0);
      if (linguaDoNome(c) !== 'pt' || c === mostrado) continue;
      const vc = _volNome(c); if (vp && vc && Math.abs(vp - vc) / Math.max(vp, vc) > 0.06) continue;
      const ct = tokensComparaveis(c, marcaToks); let i = 0; for (const t of ct) if (base.has(t)) i++;
      const j = i / ((ct.size + base.size - i) || 1);
      if (j > score) { score = j; melhor = c; }
    }
    if (!melhor) { semCandidato++; continue; }
    if (score < 0.34) { fracos++; continue; }
    // o volume do nome decide o volume de referência da comparação: nunca
    // acrescentar um que o nome original não tinha
    if (!vp) melhor = melhor.replace(/\s*[,\-–]?\s*\d+(?:[.,]\d+)?\s*(ml|gr|g|kg|l)\b\.?/gi, '').replace(/[\s,\-–]+$/, '').trim();
    // estilo do original: se não começava pela marca, não a pôr
    if (marca && !_sa(mostrado).startsWith(_sa(marca)) && _sa(melhor).startsWith(_sa(marca) + ' ')) melhor = melhor.slice(marca.length).trim();
    emitir[p.ean] = melhor;
    if (amostra.length < 40) amostra.push(`${mostrado}  →  ${melhor}   (${score.toFixed(2)})`);
  }
  return { emitir, amostra, alvo, semCandidato, fracos };
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const overlay = JSON.parse(fs.readFileSync(TR, 'utf8'));
  overlay.names = overlay.names || {};

  // só produtos visíveis (com oferta) — espelha o que o front-end mostra
  const hasOffer = new Set();
  for (const sp of seed.store_products) for (const it of sp.items) hasOffer.add(it.ean);

  const clean = {}; let changedTotal = 0, skipUnknown = 0, skipNoChange = 0;
  const samplesClean = []; const samplesSkip = [];
  const unknownFreq = {};

  for (const p of seed.products) {
    if (!p.name || !hasOffer.has(p.ean)) continue;

    // tokens da própria marca → sempre seguros para este produto
    const brandToks = new Set(tokens((p.brand || '').toLowerCase()));

    // classifica cada token; recolhe os desconhecidos
    let recognised = true;
    const unknownsHere = [];
    for (const tok of tokens(p.name)) {
      if (isCode(tok)) continue;
      const k = tok.toLowerCase();
      if (DICT[k] || SAFE.has(k) || brandToks.has(k)) continue;
      recognised = false;
      unknownsHere.push(k);
    }

    if (!recognised) {
      for (const u of unknownsHere) unknownFreq[u] = (unknownFreq[u] || 0) + 1;
      if (samplesSkip.length < 30) samplesSkip.push(`${p.name}   ·desc: ${unknownsHere.slice(0, 4).join(',')}`);
      skipUnknown++;
      continue;
    }

    const tr = translateName(p.name, brandToks, isSpanishContext(p.name));
    if (tr === p.name) { skipNoChange++; continue; }  // 100% PT já / nada a mudar
    changedTotal++;
    clean[p.ean] = tr;
    if (samplesClean.length < 80) samplesClean.push(`${p.name}  →  ${tr}`);
  }

  console.log(`Visíveis analisados. EMITIR (limpos, traduzidos): ${Object.keys(clean).length}`);
  console.log(`  · ignorados por token desconhecido: ${skipUnknown}`);
  console.log(`  · reconhecidos mas sem mudança (já-PT): ${skipNoChange}`);

  console.log('\n── EMITIR (amostra 80) ──');
  for (const s of samplesClean) console.log('  ' + s);

  console.log('\n── IGNORADOS por token desconhecido (amostra 30) ──');
  for (const s of samplesSkip) console.log('  ' + s);

  const topUnknown = Object.entries(unknownFreq).sort((a, b) => b[1] - a[1]).slice(0, 60);
  console.log('\n── Top 60 tokens DESCONHECIDOS (candidatos a DICT/SAFE) ──');
  console.log(topUnknown.map(([t, c]) => `${t}:${c}`).join('  '));

  // ── 2.ª passagem (2026-10-02): NOME PT DE OUTRA LOJA ──────────────────────
  const outras = nomesPtDeOutrasLojas(seed, overlay.names, clean);
  console.log(`\n── Nome PT de outra loja do mesmo produto: ${Object.keys(outras.emitir).length} (de ${outras.alvo} nomes ES/FR; ${outras.semCandidato} sem nome PT noutra loja; ${outras.fracos} com candidatos pouco parecidos, ignorados) ──`);
  for (const s of outras.amostra) console.log('  ' + s);
  Object.assign(clean, outras.emitir);

  if (DRY_RUN) { console.log('\n[DRY-RUN] translations.json NÃO escrito.'); return; }
  let added = 0;
  for (const [ean, name] of Object.entries(clean)) { overlay.names[ean] = name; added++; }
  fs.writeFileSync(TR, JSON.stringify(overlay, null, 1), 'utf8');
  console.log(`\n✓ names: +${added} (total ${Object.keys(overlay.names).length}) em data/translations.json`);
})();
