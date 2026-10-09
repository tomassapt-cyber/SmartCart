"""Small public runner smoke test; no feed writes, checkout, or Maia requests."""
import importlib.util,pathlib,json,urllib.robotparser
root=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('luxo',root/'scripts/scrape-presencadeluxo-catalog.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
robots=m.fetch('https://presencadeluxo.pt/robots.txt');rules=urllib.robotparser.RobotFileParser();rules.parse(robots.splitlines())
feed=json.loads((root/'data/catalog/presencadeluxo-full.json').read_text(encoding='utf-8'))
for item in feed['products'][:3]:
 assert rules.can_fetch(m.UA,item['url'])
 row=m.extract(m.fetch(item['url']),item['url']);assert row['ean']==item['ean'] and row['tax_included'] is True
 print(json.dumps({'ean':row['ean'],'gross_price':row['price'],'tax_included':True,'verified_public_url':row['url']}),flush=True)
print('Runner public smoke test passed; no feed or seed write')
