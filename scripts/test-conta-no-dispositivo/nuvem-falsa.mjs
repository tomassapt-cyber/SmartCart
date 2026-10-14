// Banca de ensaio: o demo.html num Chromium real (Playwright), com um Supabase
// FALSO no lugar do verdadeiro. Nada sai para a rede: só se serve o HTML e o
// /vendor do supabase nunca é pedido (window.supabase já existe).
//
// A "nuvem" vive no Node e é partilhada por todas as páginas, como dois
// dispositivos a falar com a mesma BD. Pode ser desligada (online=false): cada
// pedido devolve o erro que o supabase-js devolve sem rede.
//
// Precisa do Playwright e do Chromium, que o repositório não instala:
//   npm i --no-save playwright && npx playwright install chromium
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

export function novaNuvem() {
  return {
    online: true,
    user_state: {},        // uid → state
    routine_products: {},  // uid → { ean → linha }
    profiles: {},          // uid → linha
    pedidos: [],           // registo de escritas: {uid, tabela, acao, user_id}
  };
}

// Aplica um pedido do cliente falso. RLS mínima: só se escreve/lê a própria linha.
function atender(n, op) {
  if (!n.online) return { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } };
  const uid = op.uid;
  const filtro = Object.fromEntries(op.filters || []);
  const negado = { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
  const t = op.table;
  if (op.action === 'rpc') return { data: op.name === 'ganhar_pontos' ? { ganhos: 0, total: 0 } : null, error: null };
  if (t === 'user_state') {
    if (op.action === 'select') {
      if (!uid || filtro.user_id !== uid) return { data: null, error: null };
      const s = n.user_state[uid];
      return { data: s ? { state: structuredClone(s) } : null, error: null };
    }
    if (op.action === 'upsert') {
      if (!uid || op.payload.user_id !== uid) return negado;
      n.pedidos.push({ uid, tabela: t, acao: 'upsert', user_id: op.payload.user_id });
      n.user_state[uid] = structuredClone(op.payload.state);
      return { data: null, error: null };
    }
  }
  if (t === 'routine_products') {
    const meus = (n.routine_products[uid] ||= {});
    if (op.action === 'select') return { data: uid && filtro.user_id === uid ? Object.values(meus) : [], error: null };
    if (op.action === 'upsert') {
      if (!uid || op.payload.user_id !== uid) return negado;
      n.pedidos.push({ uid, tabela: t, acao: 'upsert', user_id: op.payload.user_id, ean: op.payload.ean });
      meus[op.payload.ean] = { ...(meus[op.payload.ean] || {}), ...op.payload };
      return { data: null, error: null };
    }
    if (op.action === 'delete') {
      if (!uid || filtro.user_id !== uid) return { data: null, error: null };
      delete meus[filtro.ean];
      return { data: null, error: null };
    }
  }
  if (t === 'profiles') {
    if (op.action === 'select') return { data: uid && filtro.id === uid ? (n.profiles[uid] || null) : null, error: null };
    if (op.action === 'upsert' || op.action === 'update') {
      if (!uid) return negado;
      n.profiles[uid] = { ...(n.profiles[uid] || {}), ...op.payload, id: uid, updated_at: new Date().toISOString() };
      return { data: null, error: null };
    }
  }
  // tudo o resto (catálogo, eventos, registos): vazio e sem erro
  return { data: op.single ? null : [], error: null };
}

// O cliente falso, injetado antes de qualquer script da página.
const CLIENTE = `
(() => {
  // a sessão sobrevive a recarregar a página, como a do supabase-js
  let uid = sessionStorage.getItem('__uid') || null;
  const guardarUid = () => { if (uid) sessionStorage.setItem('__uid', uid); else sessionStorage.removeItem('__uid'); };
  const ouvintes = [];
  const sessao = () => uid ? { user: { id: uid, email: uid + '@exemplo.pt' } } : null;
  const pedir = op => window.__nuvem(JSON.stringify({ ...op, uid })).then(r => JSON.parse(r));
  function consulta(table) {
    const st = { table, action: 'select', filters: [], payload: null, single: false };
    const alvo = {
      select() { return p; },
      insert(x) { st.action = 'insert'; st.payload = x; return p; },
      upsert(x, o) { st.action = 'upsert'; st.payload = x; st.opts = o || null; return p; },
      update(x) { st.action = 'update'; st.payload = x; return p; },
      delete() { st.action = 'delete'; return p; },
      eq(c, v) { st.filters.push([c, v]); return p; },
      maybeSingle() { st.single = true; return p; },
      single() { st.single = true; return p; },
      then(ok, ko) { return pedir(st).then(ok, ko); },
      catch(ko) { return pedir(st).catch(ko); },
    };
    const p = new Proxy(alvo, { get: (o, k) => (k in o) ? o[k] : () => p });
    return p;
  }
  const client = {
    from: consulta,
    rpc: (name, args) => pedir({ action: 'rpc', name, args }),
    auth: {
      getSession: async () => ({ data: { session: sessao() }, error: null }),
      getUser: async () => ({ data: { user: sessao()?.user || null }, error: null }),
      onAuthStateChange(cb) { ouvintes.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      async signOut() { uid = null; guardarUid(); for (const cb of ouvintes) await cb('SIGNED_OUT', null); return { error: null }; },
      signInWithPassword: async () => ({ data: null, error: { message: 'n/a no ensaio' } }),
      signUp: async () => ({ data: null, error: { message: 'n/a no ensaio' } }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
    },
  };
  window.supabase = { createClient: () => client };
  // Entrar numa conta (o que o formulário faz, sem palavra-passe).
  window.__entrar = async id => { uid = id; guardarUid(); for (const cb of ouvintes) await cb('SIGNED_IN', sessao()); };
  // Sessão que acaba sem o botão «Terminar sessão» (token expirado/revogado).
  window.__expirar = async () => { uid = null; guardarUid(); for (const cb of ouvintes) await cb('SIGNED_OUT', null); };
  window.__uid = () => uid;
})();
`;

// Simula localStorage cheio/bloqueado para chaves escolhidas. Sobrevive a
// recarregar (vive no sessionStorage). n > 0: falha n vezes; n < 0: sempre;
// 'mudo': não dá erro mas também não grava.
const FALHAS = `
(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (this === window.localStorage) {
      let f = {};
      try { f = JSON.parse(sessionStorage.getItem('__falhas') || '{}'); } catch (e) {}
      if (f[k] === 'mudo') return;   // "grava" sem erro, mas não fica nada
      if (f[k]) {
        if (f[k] > 0) { f[k]--; orig.call(sessionStorage, '__falhas', JSON.stringify(f)); }
        throw new DOMException('O armazenamento está cheio (simulado)', 'QuotaExceededError');
      }
    }
    return orig.call(this, k, v);
  };
})();
`;

// Servidor estático mínimo: só o HTML do ensaio. Tudo o resto → 404.
export async function servir(html) {
  const corpo = readFileSync(html);
  const srv = createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(corpo); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, fechar: () => new Promise(r => srv.close(r)) };
}

export async function abrirBrowser() {
  return chromium.launch({ headless: true });
}

// Um "dispositivo": contexto de browser próprio (localStorage próprio).
export async function dispositivo(browser, url, nuvem, { localStorageInicial, scriptInicial } = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());
  await ctx.exposeFunction('__nuvem', s => JSON.stringify(atender(nuvem, JSON.parse(s))));
  await ctx.addInitScript(FALHAS);
  await ctx.addInitScript(CLIENTE);
  if (scriptInicial) await ctx.addInitScript(scriptInicial);   // ex.: emular outro browser
  if (localStorageInicial) await ctx.addInitScript(v => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, localStorageInicial);
  const page = await ctx.newPage();
  const prontoEToasts = async () => {
    await page.waitForFunction(() => typeof window.SUPABASE !== 'undefined' && window.SUPABASE, null, { timeout: 30000 });
    await page.evaluate(() => {
      window.__toasts = [];
      const o = window.toast;
      window.toast = function (m, ...r) { window.__toasts.push(String(m)); return o && o.call(this, m, ...r); };
    });
  };
  const dialogos = [];
  let resposta = true;
  page.on('dialog', d => { dialogos.push(d.message()); (resposta ? d.accept() : d.dismiss()).catch(() => {}); });
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(url);
  await prontoEToasts();   // regista os avisos (toast) para os testes os poderem ler
  return {
    falhar: (chave, n) => page.evaluate(([k, n]) => {
      const f = JSON.parse(sessionStorage.getItem('__falhas') || '{}'); f[k] = n;
      sessionStorage.setItem('__falhas', JSON.stringify(f));
    }, [chave, n]),
    async recarregar() { await page.reload(); await prontoEToasts(); },
    page, ctx, dialogos, erros,
    responderDialogos(v) { resposta = v; },
    ls: k => page.evaluate(k => localStorage.getItem(k), k),
    lsJson: k => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k),
    ev: (fn, arg) => page.evaluate(fn, arg),
    toasts: () => page.evaluate(() => window.__toasts.slice()),
  };
}
