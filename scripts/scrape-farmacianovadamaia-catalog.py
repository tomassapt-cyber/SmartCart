"""Recolha pública da categoria; não escreve no seed nem na BD."""
import re,html,json,pathlib,urllib.request,urllib.robotparser,time,datetime,sys,hashlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
RUN=ROOT/'data'/'catalog'/'farmacianovadamaia-evidence'; RUN.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'data'/'catalog'/'farmacianovadamaia-full.json'
UA='GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; price comparison)'
BASE='https://farmacianovadamaia.pt/pt/21-dermocosmetica'
def gtin_valid(s):
 return bool(re.fullmatch(r'(?:\d{8}|\d{12}|\d{13}|\d{14})',s)) and (sum(int(d)*(3 if i%2==0 else 1) for i,d in enumerate(s[-2::-1]))+int(s[-1]))%10==0
def text(s): return html.unescape(re.sub('<[^>]+>','',s)).strip()
def euro(s):
 t=text(s)
 if '€' not in t: raise ValueError('non-EUR display')
 m=re.fullmatch(r'\s*([\d ]+,\d{2})\s*€\s*',t)
 if not m: raise ValueError('ambiguous price '+t)
 return float(m[1].replace(' ','').replace(',','.'))
def extract_listing(src):
 rows=[]; rejected=[]
 for article in re.findall(r'<article\b.*?</article>',src,re.S):
  if 'product-miniature' not in article:continue
  try:
   title=re.search(r'<h2\b[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',article,re.S)
   if not title:raise ValueError('missing title/URL')
   url=html.unescape(title[1]); name=text(title[2]);ean=re.search(r'-(\d{8,14})\.html$',url)
   if not url.startswith('https://farmacianovadamaia.pt/pt/') or not ean or not gtin_valid(ean[1]):raise ValueError('missing/invalid GTIN in URL')
   if not re.search(r'data-id-product-attribute="0"',article):raise ValueError('unverified variant')
   prices=re.findall(r'<span\b[^>]*itemprop="price"[^>]*>(.*?)</span>',article,re.S)
   if len(prices)!=1:raise ValueError('ambiguous current price')
   price=euro(prices[0]);
   if price<=0:raise ValueError('nonpositive price')
   start=article.split('>')[0]
   instock='availability_in_stock' in start or 'availability_last_remaining_items' in start
   soldout='availability_unavailable' in start or 'availability_out_of_stock' in start or 'availability_out_stock' in start or bool(re.search(r'class="[^"]*pa-out_of_stock',article))
   if not instock and not soldout:raise ValueError('unknown stock')
   if instock and re.search(r'>\s*Esgotado\s*<',article):raise ValueError('contradictory stock')
   img=re.search(r'data-full-size-image-url\s*=\s*"([^"]+)"',article)
   row={'ean':ean[1],'name':name,'price':price,'in_stock':instock,'url':url,'image_url':html.unescape(img[1]) if img else None,'source':'category-html','status':'ok'}
   old=re.findall(r'<span[^>]*class="[^"]*regular-price[^"]*"[^>]*>(.*?)</span>',article,re.S)
   if len(old)==1:
    previous=euro(old[0])
    if previous>price:row['previous_price']=previous
   rows.append(row)
  except ValueError as e:rejected.append({'reason':str(e),'url':html.unescape(title[1]) if 'title' in locals() and title else None,'name':text(title[2]) if 'title' in locals() and title else None})
 return rows,rejected
def fetch(url):
 time.sleep(2)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25) as r:
  if r.url.split('/')[2]!='farmacianovadamaia.pt':raise ValueError('unexpected host redirect')
  src=r.read().decode('utf-8')
  if re.search(r'cf-chl-|<title>.*captcha',src,re.I):raise ValueError('challenge')
  return src
def deduplicate(rows):
 unique={};conflicts={}
 for row in rows:
  key=row['ean']
  if key in conflicts:conflicts[key].append(row);continue
  if key in unique and unique[key]!=row:
   conflicts[key]=[unique.pop(key),row];continue
  unique[key]=row
 return list(unique.values()),[{'reason':'conflicting duplicated GTIN','ean':k,'rows':v} for k,v in conflicts.items()]
def main():
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();rows=[];rejected=[];seen_pages=set();log=[]
 robots=fetch('https://farmacianovadamaia.pt/robots.txt');(RUN/'robots.txt').write_text(robots,encoding='utf-8')
 rules=urllib.robotparser.RobotFileParser();rules.parse(robots.splitlines())
 if not rules.can_fetch(UA,BASE):raise ValueError('robots disallow category')
 first=fetch(BASE);last=max([1]+[int(x) for x in re.findall(r'21-dermocosmetica\?page=(\d+)',first)])
 if not 1<=last<=200:raise ValueError('unexpected pagination')
 for page in range(1,last+1):
  url=BASE if page==1 else BASE+'?page='+str(page)
  if not rules.can_fetch(UA,url):raise ValueError('robots disallow page '+str(page))
  src=first if page==1 else fetch(url);(RUN/f'pagina-{page:03}.html').write_text(src,encoding='utf-8')
  items,bad=extract_listing(src)
  signature=hashlib.sha256('|'.join(x['url'] for x in items).encode()).hexdigest()
  if not items or signature in seen_pages:raise ValueError('empty or repeated discovery page '+str(page))
  seen_pages.add(signature);rows.extend(items);rejected.extend(bad);log.append({'page':page,'accepted':len(items),'rejected':len(bad),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()})
  (RUN/'progresso.json').write_text(json.dumps({'pages_done':page,'pages_total':last,'rows':len(rows),'rejected':len(rejected),'log':log},indent=2),encoding='utf-8')
  print(f'page {page}/{last}: {len(rows)} items; {len(rejected)} rejected',flush=True)
 unique,conflicts=deduplicate(rows);rejected.extend(conflicts)
 if len(unique)<500:raise ValueError('catalog unexpectedly small')
 payload={'scraped_at':started,'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':BASE,'in_progress':False,'pages':last,'products':unique,'rejected':rejected}
 OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
 print('COMPLETE',len(unique),flush=True)
if __name__=='__main__':main()
