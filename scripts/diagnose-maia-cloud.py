"""One declared-bot robots request; record the response and stop on denial."""
import json,pathlib,urllib.request,urllib.error,datetime,re,html
url='https://farmacianovadamaia.pt/robots.txt';ua='GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; price comparison)'
try:response=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':ua}),timeout=25)
except urllib.error.HTTPError as error:response=error
with response:
 body=response.read(65536).decode('utf-8',errors='replace');title=re.search(r'<title[^>]*>(.*?)</title>',body,re.S|re.I)
 challenge=bool(re.search(r'cf-chl-|captcha|Just a moment',body,re.I))
 result={'url':url,'status':response.code,'server':response.headers.get('server'),'cf_mitigated':response.headers.get('cf-mitigated'),'content_type':response.headers.get('content-type'),'title':html.unescape(title[1])[:200] if title else None,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requests':1,'cloud_access_verified':response.code==200 and not challenge and 'User-agent:' in body,'challenge':challenge,'no_bypass':True}
pathlib.Path('maia-cloud-access.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if result['status'] not in (200,403,429):raise RuntimeError('unexpected response; investigate artifact')
