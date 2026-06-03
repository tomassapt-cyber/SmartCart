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

  if (DRY_RUN) { console.log('\n[DRY-RUN] translations.json NÃO escrito.'); return; }
  let added = 0;
  for (const [ean, name] of Object.entries(clean)) { overlay.names[ean] = name; added++; }
  fs.writeFileSync(TR, JSON.stringify(overlay, null, 1), 'utf8');
  console.log(`\n✓ names: +${added} (total ${Object.keys(overlay.names).length}) em data/translations.json`);
})();
