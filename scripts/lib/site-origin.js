// Origem pública do site, num só sítio (2026-10-16).
//
// Ordem: a variável COSMATH_SITE (para testar um domínio no build sem mudar
// ficheiros) e, sem ela, config/site.json. Tem de ser só uma origem — esquema
// http(s) e anfitrião, sem utilizador, caminho, query nem fragmento —, porque é
// colada à frente de caminhos (/produto/…, /sitemap.xml) e a função das fichas
// recusa o manifesto se vier outra coisa. Falha alto em vez de publicar um
// domínio partido.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function validar(valor, deOnde) {
  let u;
  try { u = new URL(String(valor || '').trim()); } catch { throw new Error(`origem inválida em ${deOnde}: «${valor}»`); }
  if (!/^https?:$/.test(u.protocol)) throw new Error(`origem em ${deOnde} tem de ser http(s): «${valor}»`);
  if (u.username || u.password || (u.pathname && u.pathname !== '/') || u.search || u.hash) {
    throw new Error(`origem em ${deOnde} tem de ser só esquema e anfitrião (sem caminho, query ou credenciais): «${valor}»`);
  }
  return u.origin;   // sem barra no fim: https://exemplo.pt
}

function siteOrigin() {
  if (process.env.COSMATH_SITE) return validar(process.env.COSMATH_SITE, 'COSMATH_SITE');
  const f = path.join(ROOT, 'config', 'site.json');
  return validar(JSON.parse(fs.readFileSync(f, 'utf8')).origin, 'config/site.json');
}

module.exports = { siteOrigin, validar };
