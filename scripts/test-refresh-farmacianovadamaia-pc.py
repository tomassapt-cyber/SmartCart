import importlib.util,pathlib,json,datetime,hashlib
spec=importlib.util.spec_from_file_location('pc',pathlib.Path(__file__).with_name('refresh-farmacianovadamaia-pc.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
feed={'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'in_progress':False,'source':'https://farmacianovadamaia.pt/pt/21-dermocosmetica','products':[{'status':'ok','price':4.5,'in_stock':True,'url':'https://farmacianovadamaia.pt/pt/product-5603927872412.html'}]*500};raw=json.dumps(feed).encode()
for case in ['race','failure','unchanged']:
 calls=[];head='head-1';failed=False
 def api(endpoint,body=None,method='POST'):
  global head,failed
  calls.append((endpoint,body,method))
  if endpoint.endswith('/git/blobs'):return {'sha':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()}
  if '/git/ref/heads/' in endpoint:return {'object':{'sha':head}}
  if '/git/commits/' in endpoint:return {'tree':{'sha':'tree-'+head}}
  if endpoint.endswith('/git/trees'):
   assert len(body['tree'])==1 and body['tree'][0]['path']=='data/catalog/farmacianovadamaia-full.json'
   return {'sha':body['base_tree'] if case=='unchanged' else 'new-'+head}
  if endpoint.endswith('/git/commits'):
   assert body['parents']==[head];return {'sha':'commit-'+head}
  if '/git/refs/heads/' in endpoint:
   assert body['force'] is False
   if case=='failure':raise RuntimeError('HTTP 500')
   if not failed:failed=True;head='head-2';raise RuntimeError('HTTP 422 non-fast-forward')
   return {}
  raise AssertionError(endpoint)
 m.api=api
 try:
  result=m.publish(raw,'main');assert case!='failure';assert result==('head-1' if case=='unchanged' else 'commit-head-2')
 except RuntimeError as error:assert case=='failure' and '500' in str(error)
 if case=='race':assert sum('/git/ref/heads/' in x[0] for x in calls)==2
 if case=='unchanged':assert not any('/git/refs/heads/' in x[0] for x in calls)
 print(case,'passed; no network')
for changed in [{'in_progress':True},{'completed_at':'2020-01-01T00:00:00+00:00'},{'source':'https://example.com'},{'products':[]}]:
 try:m.validate(json.dumps({**feed,**changed}));raise AssertionError('invalid feed accepted')
 except AssertionError as error:
  if str(error)=='invalid feed accepted':raise
print('PC publisher: fresh-tree race recovery, no force, unrelated paths preserved, hard failure, unchanged tree and invalid feeds passed')
