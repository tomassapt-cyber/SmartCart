"""PC collection, raw-feed-only fast-forward publication, cloud integration."""
import pathlib,subprocess,json,sys,datetime,hashlib,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent.parent;FEED=ROOT/'data/catalog/farmacianovadamaia-full.json';REPO='tomassapt-cyber/SmartCart'
def api(endpoint,body=None,method='POST'):
 args=['gh','api',endpoint]
 if body is not None:args+=['--method',method,'--input','-']
 p=subprocess.run(args,input=json.dumps(body,ensure_ascii=False).encode('utf-8') if body is not None else None,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode('utf-8',errors='replace'))
 return json.loads(p.stdout)
def validate(raw):
 feed=json.loads(raw);age=datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.fromisoformat(feed['completed_at'])
 assert feed['in_progress'] is False and datetime.timedelta(0)<=age<=datetime.timedelta(hours=24) and len(feed['products'])>=500
 assert feed['source']=='https://farmacianovadamaia.pt/pt/21-dermocosmetica'
 for p in feed['products']:
  assert p['status']=='ok' and isinstance(p['in_stock'],bool) and isinstance(p['price'],(int,float)) and 0<p['price']<5000
  assert urllib.parse.urlparse(p['url']).hostname=='farmacianovadamaia.pt'
 return feed
def publish(raw,branch):
 validate(raw);blob=api(f'repos/{REPO}/git/blobs',{'content':raw.decode('utf-8'),'encoding':'utf-8'})
 assert blob['sha']==hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 for attempt in range(4):
  ref=api(f'repos/{REPO}/git/ref/heads/{branch}');head=ref['object']['sha'];commit=api(f'repos/{REPO}/git/commits/{head}')
  tree=api(f'repos/{REPO}/git/trees',{'base_tree':commit['tree']['sha'],'tree':[{'path':'data/catalog/farmacianovadamaia-full.json','mode':'100644','type':'blob','sha':blob['sha']}]})
  if tree['sha']==commit['tree']['sha']:return head
  created=api(f'repos/{REPO}/git/commits',{'message':'chore: publish Maia complete PC feed','tree':tree['sha'],'parents':[head]})
  try:
   api(f'repos/{REPO}/git/refs/heads/{branch}',{'sha':created['sha'],'force':False},'PATCH');return created['sha']
  except RuntimeError as error:
   if '422' not in str(error) or attempt==3:raise
 raise RuntimeError('publication failed')
def main():
 branch='main'
 if '--branch' in sys.argv:branch=sys.argv[sys.argv.index('--branch')+1]
 assert branch=='main' or branch=='codex/presencadeluxo-existing-only-01a11b41'
 if '--collected' not in sys.argv:
  state=ROOT/'data/catalog/farmacianovadamaia-evidence/pc-refresh-state.json';now=datetime.datetime.now(datetime.timezone.utc)
  attempts=json.loads(state.read_text()) if state.exists() else []
  attempts=[v for v in attempts if now-datetime.datetime.fromisoformat(v)<datetime.timedelta(hours=24)]
  if len(attempts)>=3:raise RuntimeError('Maximum three PC collection attempts per 24h reached')
  state.parent.mkdir(parents=True,exist_ok=True);attempts.append(now.isoformat());state.write_text(json.dumps(attempts))
  subprocess.run([sys.executable,str(ROOT/'scripts/scrape-farmacianovadamaia-catalog.py')],cwd=ROOT,check=True)
 sha=publish(FEED.read_bytes(),branch)
 subprocess.run(['gh','workflow','run','farmacianovadamaia-catalog.yml','--repo',REPO,'--ref',branch,'-f','so_integrar=sim'],check=True)
 print(json.dumps({'feed_commit':sha,'branch':branch,'cloud_integration_dispatched':True,'supabase_requests':0}))
if __name__=='__main__':main()
