#!/usr/bin/env python3
"""
Corrige imagens MÁS (atida 'transform' com aspect partido — slivers) e EM FALTA.
Substituição por ordem: imagem doutra loja p/ o mesmo EAN (catálogos) -> OBF -> mantém.
Não-destrutivo no sentido sticky: escreve image_url no seed (integradores não
sobrescrevem image_url já presente).

Uso:
  python scripts/fix-bad-images.py             # dry-run (não escreve), reporta
  python scripts/fix-bad-images.py --limit 80  # amostra
  python scripts/fix-bad-images.py --apply      # escreve no seed
"""
import json, os, sys, io, glob, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, 'data', 'seed-bundle.json')
UA = {'User-Agent': 'Mozilla/5.0 (compatible; CosMath-ImageFix/1.0)'}
APPLY = '--apply' in sys.argv
LIMIT = int(sys.argv[sys.argv.index('--limit')+1]) if '--limit' in sys.argv else None

is_atida = lambda u: (u or '').startswith('https://assets.atida.com/transform')
is_real = lambda e: bool(e) and e.isdigit() and 12 <= len(e) <= 14

# Prioridade de lojas com imagens limpas (atida excluída de propósito)
STORE_PRIO = ['farmacia.pt', 'cdn.shopify.com', 'static.sweetcare.pt', 'www.druni.pt',
              'wells.pt', 'assets.farmacia365.pt', 'byfarma.pt', 'static.lojadafarmacia.com',
              'www.farmaciabarreiros.com', 'assets.asuafarmaciaonline.pt', 'aminhafarmaciaonline.pt']
def host(u):
    try: return urllib.parse.urlparse(u).hostname or ''
    except: return ''
def prio(u):
    h = host(u)
    return STORE_PRIO.index(h) if h in STORE_PRIO else 99

def img_aspect(url):
    """Devolve w/h ou None se falhar."""
    try:
        req = urllib.request.Request(url, headers=UA)
        data = urllib.request.urlopen(req, timeout=15).read()
        im = Image.open(io.BytesIO(data))
        w, h = im.size
        return w / h if h else None
    except Exception:
        return None

def good_aspect(a):
    return a is not None and 0.5 <= a <= 2.0

def obf_image(ean):
    try:
        url = f'https://world.openbeautyfacts.org/api/v2/product/{ean}.json?fields=image_front_url'
        req = urllib.request.Request(url, headers=UA)
        j = json.load(urllib.request.urlopen(req, timeout=15))
        return (j.get('product') or {}).get('image_front_url')
    except Exception:
        return None

def main():
    seed = json.load(open(SEED, encoding='utf-8'))

    # 1) indexar imagens limpas (não-atida) por EAN, a partir dos catálogos
    images_by_ean = {}
    for f in glob.glob(os.path.join(ROOT, 'data', 'catalog', '*-full.json')):
        try: cat = json.load(open(f, encoding='utf-8'))
        except: continue
        for p in cat.get('products', []):
            if not p: continue
            e, u = p.get('ean'), p.get('image_url')
            if is_real(e) and u and not is_atida(u):
                images_by_ean.setdefault(e, set()).add(u)

    # 2) candidatos: imagem atida OU em falta
    cands = [p for p in seed['products'] if (not p.get('image_url')) or is_atida(p.get('image_url'))]
    if LIMIT: cands = cands[:LIMIT]
    print(f'Candidatos (atida ou sem imagem): {len(cands)}  ·  EANs com imagem alternativa: {len(images_by_ean)}')

    # 3) para cada candidato: decidir se é "mau" e achar substituto
    fixed = {'by_store': 0, 'by_obf': 0}
    skipped_ok = 0
    no_replacement = 0

    def process(p):
        nonlocal skipped_ok, no_replacement
        cur = p.get('image_url')
        # atida → só corrige se o aspect for mau; em falta → corrige sempre
        if cur:
            a = img_aspect(cur)
            if good_aspect(a):
                return ('ok', None)
        ean = p.get('ean')
        # substituto: melhor imagem doutra loja (não-atida, confiável) -> OBF.
        repl = None
        store_imgs = sorted(images_by_ean.get(ean, []), key=prio)
        if store_imgs:
            repl = ('store', store_imgs[0])
        elif is_real(ean):
            ob = obf_image(ean)
            if ob:
                repl = ('obf', ob)
        return ('fix', repl) if repl else ('none', None)

    results = []
    with ThreadPoolExecutor(max_workers=16) as ex:
        for p, (kind, repl) in zip(cands, ex.map(process, cands)):
            if kind == 'ok': skipped_ok += 1
            elif kind == 'none': no_replacement += 1
            elif kind == 'fix':
                src, url = repl
                fixed['by_store' if src == 'store' else 'by_obf'] += 1
                results.append((p, url))
                if len(results) <= 12:
                    print(f'  FIX [{src}] {p.get("name","")[:34]:34} -> {host(url)}')

    print(f'\n── Resumo ──')
    print(f'  atida com aspect OK (deixar):  {skipped_ok}')
    print(f'  CORRIGIDOS:                    {fixed["by_store"]+fixed["by_obf"]}  (loja {fixed["by_store"]}, OBF {fixed["by_obf"]})')
    print(f'  Sem substituto disponível:     {no_replacement}')

    if APPLY and results:
        for p, url in results:
            p['image_url'] = url
        json.dump(seed, open(SEED, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'\n✓ Seed atualizado: {len(results)} imagens corrigidas.')
    elif not APPLY:
        print('\n[DRY-RUN] Nada escrito. --apply para gravar.')

if __name__ == '__main__':
    main()
