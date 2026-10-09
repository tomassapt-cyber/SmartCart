"""Public product details for identifiers already present in the current seed."""
import pathlib,json,re,html,time,datetime,urllib.request,urllib.error,urllib.robotparser,urllib.parse,xml.etree.ElementTree as ET,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parent.parent;RUN=ROOT/'data/catalog/presencadeluxo-evidence';RUN.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'data/catalog/presencadeluxo-full.json';UA='GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; price comparison)'
def valid(s):return bool(re.fullmatch(r'(?:\d{8}|\d{12}|\d{13}|\d{14})',s)) and (sum(int(d)*(3 if i%2==0 else 1) for i,d in enumerate(s[-2::-1]))+int(s[-1]))%10==0
def nodes(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from nodes(v)
 elif isinstance(x,list):
  for v in x:yield from nodes(v)
def extract(src,url):
 products=[]
 for raw in re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',src,re.S):
  try:products += [p for p in nodes(json.loads(raw)) if p.get('@type')=='Product']
  except json.JSONDecodeError:continue
 if len(products)!=1:raise ValueError('ambiguous/missing Product schema')
 p=products[0];ean=str(p.get('gtin13') or p.get('gtin') or p.get('gtin12') or '')
 if not valid(ean) or not url.endswith('-'+ean+'.html'):raise ValueError('GTIN schema and URL disagree')
 offer=p.get('offers')
 if not isinstance(offer,dict) or offer.get('@type')!='Offer' or offer.get('priceCurrency')!='EUR' or offer.get('url')!=url:raise ValueError('unverified price/currency/URL')
 price=float(offer['price']);stock=offer.get('availability','').rsplit('/',1)[-1]
 if not 0<price<5000 or stock not in ('InStock','OutOfStock','SoldOut'):raise ValueError('invalid price or stock')
 raw=re.search(r'<div\b[^>]*\bid="product-details"[^>]*\bdata-product="([^"]+)"',src)
 if not raw:raise ValueError('missing detailed product data')
 details=json.loads(html.unescape(raw[1]))
 visible_gtins=set(re.findall(r'<label[^>]*>\s*ean13\s*</label>\s*<span[^>]*>\s*(\d{8,14})\s*</span>',src,re.I))
 if visible_gtins!={ean} or float(details.get('price_amount',-1))!=price:raise ValueError('visible product data disagree with schema')
 if int(details.get('id_product_attribute',-1))!=0:raise ValueError('unverified attribute variant')
 surcharge=float(details.get('additional_shipping_cost',-1))
 if surcharge<0:raise ValueError('unknown additional shipping')
 if surcharge>0:raise ValueError('product carries additional shipping charge')
 if str(details.get('available_for_order'))!='1' and stock=='InStock':raise ValueError('stock/order contradiction')
 if html.unescape(str(p.get('name','')))!=str(details.get('name','')):raise ValueError('title mismatch')
 gross=re.findall(r'<p\b[^>]*class="[^"]*\bproduct-price-with-tax\b[^"]*"[^>]*>\s*<span[^>]*>(.*?)</span>\s*com IVA\s*</p>',src,re.S|re.I)
 if len(gross)!=1:raise ValueError('missing or ambiguous price including VAT')
 text=html.unescape(re.sub('<[^>]*>','',gross[0]));amount=re.fullmatch(r'\s*(\d+(?:[ .]\d{3})*,\d{2})\s*€\s*',text)
 if not amount:raise ValueError('ambiguous gross EUR price')
 net_price=price;price=float(amount[1].replace(' ','').replace('.','').replace(',','.'))
 if not 0<price<5000 or price<net_price:raise ValueError('invalid gross price')
 image=details.get('cover',{}).get('large',{}).get('url') or p.get('image');image=image[0] if isinstance(image,list) and image else image
 row={'ean':ean,'name':details['name'],'price':price,'net_price':net_price,'tax_included':True,'in_stock':stock=='InStock','url':url,'status':'ok','image_url':image,'source':'explicit-visible-price-with-VAT-and-product-schema','additional_shipping_cost':surcharge}
 return row
def fetch(url):
 if urllib.parse.urlparse(url).hostname!='presencadeluxo.pt':raise ValueError('unexpected host')
 time.sleep(2)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25) as response:
  if urllib.parse.urlparse(response.url).hostname!='presencadeluxo.pt':raise ValueError('external redirect')
  src=response.read().decode('utf-8')
  if re.search('cf-chl-|<title>[^<]*(?:captcha|Just a moment)',src,re.I):raise ValueError('challenge; stop')
  return src
def locs(src):return [p.text for p in ET.fromstring(src).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
def deduplicate(rows):
 unique={};conflicts={}
 for row in rows:
  ean=row['ean']
  if ean in conflicts:conflicts[ean].append(row)
  elif ean in unique and unique[ean]!=row:conflicts[ean]=[unique.pop(ean),row]
  else:unique[ean]=row
 return list(unique.values()),[{'reason':'conflicting duplicate GTIN','ean':k,'rows':v} for k,v in conflicts.items()]
def main():
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();resume='--resume' in sys.argv
 previous_selection=json.loads((RUN/'selection.json').read_text(encoding='utf-8')) if resume and (RUN/'selection.json').exists() else None
 robots=fetch('https://presencadeluxo.pt/robots.txt');(RUN/'robots.txt').write_text(robots,encoding='utf-8');rules=urllib.robotparser.RobotFileParser();rules.parse(robots.splitlines())
 sitemap=re.search(r'Sitemap:\s*(\S+)',robots)[1]
 if not rules.can_fetch(UA,sitemap):raise ValueError('robots disallows sitemap')
 src=fetch(sitemap);(RUN/'sitemap.xml').write_text(src,encoding='utf-8');urls=locs(src)
 if urls and all(u.endswith('.xml') for u in urls):raise ValueError('sitemap index requires validated expansion')
 (RUN/'urls.json').write_text(json.dumps(urls));subprocess.run(['node',str(ROOT/'scripts/discover-presencadeluxo-existing.js'),str(RUN/'urls.json'),str(RUN/'selection.json')],check=True)
 selection=json.loads((RUN/'selection.json').read_text(encoding='utf-8'));targets=selection['selected']
 if resume and previous_selection!=selection:raise ValueError('resume selection changed; do not reuse cached pages')
 (RUN/'started.json').write_text(json.dumps({'started_at':started,'targets':len(targets)}))
 if not targets:raise ValueError('no existing identifiers discovered; preserve previous feed')
 rows=[];rejected=[]
 for i,target in enumerate(targets):
  url=target['url']
  if not rules.can_fetch(UA,url):raise ValueError('robots disallows product')
  try:
   cached=RUN/f'product-{i:04}.html'
   if resume and cached.exists() and 0<=time.time()-cached.stat().st_mtime<6*3600:src=cached.read_text(encoding='utf-8')
   else:src=fetch(url);cached.write_text(src,encoding='utf-8')
  except urllib.error.HTTPError as error:
   if error.code not in (404,410):raise
   rejected.append({**target,'reason':'HTTP '+str(error.code)})
  else:
   try:rows.append(extract(src,url))
   except (ValueError,KeyError,TypeError) as error:rejected.append({**target,'reason':str(error)})
  progress={'attempted':i+1,'targets':len(targets),'eligible':len(rows),'rejected':len(rejected),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()};(RUN/'progress.json').write_text(json.dumps(progress,indent=2))
  if (i+1)%25==0:print(json.dumps(progress),flush=True)
 unique,conflicts=deduplicate(rows);rejected.extend(conflicts)
 if len(unique)<max(1,len(targets)*.5):raise ValueError('low validated coverage; preserve previous feed')
 evidence=[RUN/f'product-{i:04}.html' for i in range(len(targets))]
 earliest=min([datetime.datetime.fromisoformat(started).timestamp()]+[p.stat().st_mtime for p in evidence if p.exists()])
 payload={'scraped_at':datetime.datetime.fromtimestamp(earliest,datetime.timezone.utc).isoformat(),'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':sitemap,'scope':'existing-products-only','in_progress':False,'targets':len(targets),'products':unique,'rejected':rejected}
 OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8');print('COMPLETE',len(unique),flush=True)
if __name__=='__main__':main()
