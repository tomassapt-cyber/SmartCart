-- ============================================================
-- SmartCartCosmetics — seed-full.sql (gerado por build-seed-sql.js)
-- Lojas: 46 · Produtos: 162 · Preços: 3632
-- ============================================================
BEGIN;

-- ─── LOJAS ───
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('notino', 'Notino PT', 'https://www.notino.pt', 'especializada', 1, FALSE, TRUE, 'https://www.awin.com/merchant/notino', 'playwright', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('sephora', 'Sephora PT', 'https://www.sephora.pt', 'especializada', 1, TRUE, TRUE, 'https://partners.sephora.com/pt', 'api-interna', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('douglas', 'Douglas PT', 'https://www.douglas.pt', 'especializada', 1, FALSE, TRUE, 'https://www.awin.com/merchant/douglas', 'cheerio+jsonld', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('druni', 'Druni PT', 'https://www.druni.pt', 'especializada', 1, FALSE, FALSE, NULL, 'cheerio', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('perfumes-companhia', 'Perfumes & Companhia', 'https://www.perfumesecompanhia.pt', 'especializada', 1, FALSE, TRUE, 'https://www.awin.com/merchant/perfumesecompanhia', 'cheerio', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('kiko', 'KIKO Milano PT', 'https://www.kikocosmetics.com/pt-pt', 'marca-propria', 1, FALSE, TRUE, 'https://www.awin.com/merchant/kiko', 'playwright', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('parfois-beauty', 'Parfois Beauty', 'https://www.parfois.com/pt', 'marca-propria', 1, FALSE, FALSE, NULL, 'cheerio+jsonld', '12h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('elcorteingles', 'El Corte Inglés Beauty', 'https://www.elcorteingles.pt/beleza', 'generalista', 2, TRUE, TRUE, 'https://www.awin.com/merchant/elcorteingles', 'api-interna', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('worten', 'Worten', 'https://www.worten.pt/beleza-saude', 'generalista', 2, FALSE, TRUE, 'https://www.awin.com/merchant/worten', 'cheerio', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('continente', 'Continente Online', 'https://www.continente.pt', 'generalista', 2, FALSE, FALSE, NULL, 'cheerio', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('auchan', 'Auchan', 'https://www.auchan.pt', 'generalista', 2, FALSE, FALSE, NULL, 'cheerio', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('wook', 'Wook', 'https://www.wook.pt', 'generalista', 2, FALSE, FALSE, NULL, 'cheerio', '12h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('wells', 'Wells', 'https://www.wells.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '07h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmaciaonline', 'Farmácia Online', 'https://www.farmaciaonline.pt', 'farmacia', 3, FALSE, TRUE, 'https://www.awin.com/merchant/farmaciaonline', 'cheerio', '07h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('pharma2you', 'Pharma2you', 'https://pharma2you.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '07h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmaciasholon', 'Farmácias Holon', 'https://www.farmaciasholon.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('thebodyshop', 'The Body Shop PT', 'https://www.thebodyshop.pt', 'marca-propria', 4, FALSE, TRUE, 'https://www.awin.com/merchant/thebodyshop', 'cheerio+jsonld', '11h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('lush', 'Lush PT', 'https://www.lush.com/pt', 'marca-propria', 4, FALSE, FALSE, NULL, 'cheerio', '11h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('yvesrocher', 'Yves Rocher PT', 'https://www.yves-rocher.pt', 'marca-propria', 4, FALSE, TRUE, 'https://www.awin.com/merchant/yvesrocher', 'cheerio', '12h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('loccitane', 'L''Occitane PT', 'https://pt.loccitane.com', 'marca-propria', 4, FALSE, TRUE, 'https://www.awin.com/merchant/loccitane', 'cheerio+jsonld', '12h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('rituals', 'Rituals PT', 'https://www.rituals.com/pt-pt', 'marca-propria', 4, FALSE, TRUE, 'https://www.awin.com/merchant/rituals', 'cheerio+jsonld', '11h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('mac', 'MAC Cosmetics PT', 'https://www.maccosmetics.pt', 'marca-propria', 4, FALSE, FALSE, NULL, 'playwright', '13h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('nivea', 'Nivea Shop PT', 'https://www.nivea.pt/produtos', 'marca-propria', 4, FALSE, FALSE, NULL, 'cheerio', '13h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('brasty', 'Brasty PT', 'https://www.brasty.pt', 'nicho', 5, FALSE, TRUE, 'https://www.awin.com/merchant/brasty', 'cheerio+jsonld', '09h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('perfumesclub', 'Perfumes Club PT', 'https://www.perfumesclub.pt', 'nicho', 5, FALSE, TRUE, 'https://www.awin.com/merchant/perfumesclub', 'cheerio', '09h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('lookfantastic', 'Lookfantastic PT', 'https://www.lookfantastic.pt', 'especializada', 6, TRUE, TRUE, 'https://www.awin.com/merchant/lookfantastic', 'graphql', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('cultbeauty', 'Cult Beauty', 'https://www.cultbeauty.co.uk', 'nicho', 6, FALSE, TRUE, 'https://www.awin.com/merchant/cultbeauty', 'playwright', '14h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('primor', 'Primor PT', 'https://pt.primor.eu/pt_pt/', 'especializada', 7, FALSE, FALSE, NULL, 'cheerio', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('maquillalia', 'Maquillalia', 'https://www.maquillalia.com', 'nicho', 6, FALSE, TRUE, 'https://www.awin.com/merchant/maquillalia', 'cheerio', '14h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('atida', 'Atida | Mifarma PT', 'https://www.atida.com/pt-pt', 'farmacia', 1, FALSE, TRUE, 'https://www.awin.com/merchant/atida', 'cheerio+jsonld', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('fnac', 'Fnac PT — Beauty', 'https://www.fnac.pt', 'generalista', 2, FALSE, TRUE, 'https://www.awin.com/merchant/fnac', 'cheerio', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('miin', 'MiiN Cosmetics PT', 'https://miin-cosmetics.pt', 'nicho', 5, FALSE, FALSE, NULL, 'cheerio+jsonld', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmacia365', 'Farmácia 365', 'https://www.farmacia365.pt', 'farmacia', 3, FALSE, TRUE, 'https://www.awin.com/merchant/farmacia365', 'cheerio', '07h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('loja-farmacia', 'Loja da Farmácia', 'https://www.lojadafarmacia.com', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '07h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('afarmaciaonline', 'A Farmácia Online', 'https://www.afarmaciaonline.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio+jsonld', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('easyfarma', 'Easyfarma', 'https://easyfarma.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio+jsonld', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('bairro-saude', 'Bairro da Saúde', 'https://bairrodasaude.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio+jsonld', '09h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('haemiskin', 'HaemiSkin', 'https://www.haemiskin.pt', 'nicho', 5, FALSE, FALSE, NULL, 'cheerio+jsonld', '11h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmacia-saude', 'Farmácia Saúde', 'https://www.farmaciasaude.com.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '09h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmaciasdirect', 'Farmácias Direct', 'https://www.farmaciasdirect.eu', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio+jsonld', '10h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('korean-queens', 'Korean Queens', 'https://www.koreanqueens.com/pt', 'nicho', 5, FALSE, FALSE, NULL, 'cheerio', '12h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('cacau-chic', 'Cacau Chic Shop', 'https://www.cacauchicshop.pt', 'nicho', 6, FALSE, FALSE, NULL, 'cheerio', '13h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('sa-da-bandeira', 'Farmácia Sá da Bandeira', 'https://www.sadabandeira.com', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '13h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('sweetcare', 'SweetCare', 'https://sweetcare.pt', 'farmacia', 1, FALSE, TRUE, 'https://www.awin.com/merchant/sweetcare', 'cheerio+jsonld', '06h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('byfarma', 'byFarma', 'https://byfarma.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio+jsonld', '08h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;
INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES ('farmaciapt', 'Farmácia.pt', 'https://farmacia.pt', 'farmacia', 3, FALSE, FALSE, NULL, 'cheerio', '09h00 diária')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;

-- ─── MARCAS ───
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('chanel', 'Chanel', 'França', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('dior', 'Dior', 'França', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('yves-saint-laurent', 'Yves Saint Laurent', 'França', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('tom-ford', 'Tom Ford', 'EUA', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('giorgio-armani', 'Giorgio Armani', 'Itália', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('versace', 'Versace', 'Itália', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('carolina-herrera', 'Carolina Herrera', 'Venezuela', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('paco-rabanne', 'Paco Rabanne', 'França', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('dolce-gabbana', 'Dolce & Gabbana', 'Itália', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('lancome', 'Lancôme', 'França', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('hugo-boss', 'Hugo Boss', 'Alemanha', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('calvin-klein', 'Calvin Klein', 'EUA', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('mugler', 'Mugler', 'França', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('jean-paul-gaultier', 'Jean Paul Gaultier', 'França', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('estee-lauder', 'Estée Lauder', 'EUA', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('clarins', 'Clarins', 'França', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('clinique', 'Clinique', 'EUA', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('sisley', 'Sisley', 'França', 'luxe')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('vichy', 'Vichy', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('la-roche-posay', 'La Roche-Posay', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('cerave', 'CeraVe', 'EUA', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('bioderma', 'Bioderma', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('avene', 'Avène', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('eucerin', 'Eucerin', 'Alemanha', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('isdin', 'ISDIN', 'Espanha', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('caudalie', 'Caudalie', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('nuxe', 'Nuxe', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('filorga', 'Filorga', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('olay', 'Olay', 'EUA', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('neutrogena', 'Neutrogena', 'EUA', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('loreal-paris', 'L''Oréal Paris', 'França', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('garnier', 'Garnier', 'França', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('nivea', 'Nivea', 'Alemanha', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('nars', 'NARS', 'EUA', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('charlotte-tilbury', 'Charlotte Tilbury', 'Reino Unido', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('mac', 'MAC', 'Canadá', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('maybelline', 'Maybelline', 'EUA', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('nyx', 'NYX', 'EUA', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('kiko-milano', 'KIKO Milano', 'Itália', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('catrice', 'Catrice', 'Alemanha', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('kerastase', 'Kérastase', 'França', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('redken', 'Redken', 'EUA', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('olaplex', 'Olaplex', 'EUA', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('moroccanoil', 'Moroccanoil', 'Israel', 'prestige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('schwarzkopf', 'Schwarzkopf', 'Alemanha', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('pantene', 'Pantene', 'EUA', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('rituals', 'Rituals', 'Países Baixos', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('the-body-shop', 'The Body Shop', 'Reino Unido', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('loccitane', 'L''Occitane', 'França', 'masstige')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('yves-rocher', 'Yves Rocher', 'França', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('sanex', 'Sanex', 'Espanha', 'mass')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('cosrx', 'COSRX', 'Coreia do Sul', 'kbeauty')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('anua', 'Anua', 'Coreia do Sul', 'kbeauty')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('beauty-of-joseon', 'Beauty of Joseon', 'Coreia do Sul', 'kbeauty')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('heimish', 'Heimish', 'Coreia do Sul', 'kbeauty')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('numbuzin', 'Numbuzin', 'Coreia do Sul', 'kbeauty')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('sesderma', 'Sesderma', 'Espanha', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('topicrem', 'Topicrem', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('mustela', 'Mustela', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('aderma', 'Aderma', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;
INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES ('svr', 'SVR', 'França', 'derma')
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;

-- ─── PRODUTOS ───
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006391013009', 'No. 5 Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'No. 5 Eau de Parfum 50 ml da Chanel.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'chanel' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005014856306', 'Coco Mademoiselle Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Coco Mademoiselle Eau de Parfum 50 ml da Chanel.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'chanel' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007166187772', 'Bleu de Chanel Eau de Parfum 100 ml', m.id, c.id, 100, 'ml', 'Bleu de Chanel Eau de Parfum 100 ml da Chanel.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'chanel' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000185996547', 'Chance Eau Tendre 50 ml', m.id, c.id, 50, 'ml', 'Chance Eau Tendre 50 ml da Chanel.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'chanel' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008832426232', 'Rouge Coco Lipstick 3.5g', m.id, c.id, 5, 'g', 'Rouge Coco Lipstick 3.5g da Chanel.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'chanel' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001416572202', 'Sauvage Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', 'Sauvage Eau de Toilette 100 ml da Dior.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dior' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002371800546', 'J''adore Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'J''adore Eau de Parfum 50 ml da Dior.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dior' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003357636579', 'Miss Dior Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Miss Dior Eau de Parfum 50 ml da Dior.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dior' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004583732042', 'Capture Totale Super Potent Sérum 30 ml', m.id, c.id, 30, 'ml', 'Capture Totale Super Potent Sérum 30 ml da Dior.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dior' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000152469210', 'Rouge Dior Lipstick 3.5g', m.id, c.id, 5, 'g', 'Rouge Dior Lipstick 3.5g da Dior.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dior' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004936901965', 'Black Opium Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Black Opium Eau de Parfum 50 ml da Yves Saint Laurent.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-saint-laurent' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006565214881', 'Libre Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Libre Eau de Parfum 50 ml da Yves Saint Laurent.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-saint-laurent' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005397134947', 'Mon Paris Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Mon Paris Eau de Parfum 50 ml da Yves Saint Laurent.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-saint-laurent' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005961101139', 'Touche Éclat Highlighter 2.5 ml', m.id, c.id, 5, 'ml', 'Touche Éclat Highlighter 2.5 ml da Yves Saint Laurent.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-saint-laurent' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004837460981', 'Rouge Pur Couture Lipstick 3.8g', m.id, c.id, 8, 'g', 'Rouge Pur Couture Lipstick 3.8g da Yves Saint Laurent.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-saint-laurent' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001689443865', 'Black Orchid Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Black Orchid Eau de Parfum 50 ml da Tom Ford.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'tom-ford' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008807030334', 'Lost Cherry Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Lost Cherry Eau de Parfum 50 ml da Tom Ford.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'tom-ford' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001894225102', 'Oud Wood Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Oud Wood Eau de Parfum 50 ml da Tom Ford.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'tom-ford' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000438936429', 'Acqua di Giò Pour Homme EDT 100 ml', m.id, c.id, 100, 'ml', 'Acqua di Giò Pour Homme EDT 100 ml da Giorgio Armani.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'giorgio-armani' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001442204597', 'Code Homme Eau de Toilette 75 ml', m.id, c.id, 75, 'ml', 'Code Homme Eau de Toilette 75 ml da Giorgio Armani.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'giorgio-armani' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001369288663', 'My Way Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'My Way Eau de Parfum 50 ml da Giorgio Armani.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'giorgio-armani' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006250956133', 'Sì Passione Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Sì Passione Eau de Parfum 50 ml da Giorgio Armani.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'giorgio-armani' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009651714791', 'Bright Crystal Eau de Toilette 90 ml', m.id, c.id, 90, 'ml', 'Bright Crystal Eau de Toilette 90 ml da Versace.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'versace' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004261318346', 'Eros Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', 'Eros Eau de Toilette 100 ml da Versace.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'versace' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009343875700', 'Good Girl Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Good Girl Eau de Parfum 50 ml da Carolina Herrera.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'carolina-herrera' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006607239896', '212 Sexy Eau de Parfum 100 ml', m.id, c.id, 100, 'ml', '212 Sexy Eau de Parfum 100 ml da Carolina Herrera.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'carolina-herrera' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004300297359', '1 Million Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', '1 Million Eau de Toilette 100 ml da Paco Rabanne.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'paco-rabanne' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003620158340', 'Olympea Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Olympea Eau de Parfum 50 ml da Paco Rabanne.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'paco-rabanne' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008793171240', 'Lady Million Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Lady Million Eau de Parfum 50 ml da Paco Rabanne.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'paco-rabanne' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008513215421', 'Light Blue Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', 'Light Blue Eau de Toilette 100 ml da Dolce & Gabbana.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dolce-gabbana' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004337354667', 'The One for Women EDP 50 ml', m.id, c.id, 50, 'ml', 'The One for Women EDP 50 ml da Dolce & Gabbana.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'dolce-gabbana' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000496730274', 'La Vie Est Belle EDP 50 ml', m.id, c.id, 50, 'ml', 'La Vie Est Belle EDP 50 ml da Lancôme.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'lancome' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006724895593', 'Idôle Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Idôle Eau de Parfum 50 ml da Lancôme.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'lancome' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000216165027', 'Génifique Sérum Avançado 50 ml', m.id, c.id, 50, 'ml', 'Génifique Sérum Avançado 50 ml da Lancôme.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'lancome' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006042909873', 'Rénergie HCF Triple Sérum 30 ml', m.id, c.id, 30, 'ml', 'Rénergie HCF Triple Sérum 30 ml da Lancôme.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'lancome' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002941083577', 'Teint Idole Ultra Wear Foundation 30 ml', m.id, c.id, 30, 'ml', 'Teint Idole Ultra Wear Foundation 30 ml da Lancôme.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'lancome' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007377908722', 'Boss Bottled Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', 'Boss Bottled Eau de Toilette 100 ml da Hugo Boss.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'hugo-boss' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004652765698', 'Boss The Scent 100 ml', m.id, c.id, 100, 'ml', 'Boss The Scent 100 ml da Hugo Boss.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'hugo-boss' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002146932281', 'CK One Eau de Toilette 100 ml', m.id, c.id, 100, 'ml', 'CK One Eau de Toilette 100 ml da Calvin Klein.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'calvin-klein' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002981474854', 'Euphoria Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Euphoria Eau de Parfum 50 ml da Calvin Klein.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'calvin-klein' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001503303955', 'Alien Eau de Parfum 60 ml', m.id, c.id, 60, 'ml', 'Alien Eau de Parfum 60 ml da Mugler.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mugler' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003956262551', 'Angel Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'Angel Eau de Parfum 50 ml da Mugler.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mugler' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002941161305', 'Le Mâle Eau de Toilette 125 ml', m.id, c.id, 125, 'ml', 'Le Mâle Eau de Toilette 125 ml da Jean Paul Gaultier.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'jean-paul-gaultier' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006747515508', 'La Belle Eau de Parfum 50 ml', m.id, c.id, 50, 'ml', 'La Belle Eau de Parfum 50 ml da Jean Paul Gaultier.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'jean-paul-gaultier' AND c.slug = 'perfume'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000563037770', 'Advanced Night Repair Sérum 50 ml', m.id, c.id, 50, 'ml', 'Advanced Night Repair Sérum 50 ml da Estée Lauder.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'estee-lauder' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007937872531', 'Revitalizing Supreme+ Creme 50 ml', m.id, c.id, 50, 'ml', 'Revitalizing Supreme+ Creme 50 ml da Estée Lauder.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'estee-lauder' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002956241214', 'Double Wear Stay-in-Place Foundation 30 ml', m.id, c.id, 30, 'ml', 'Double Wear Stay-in-Place Foundation 30 ml da Estée Lauder.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'estee-lauder' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008316967442', 'Double Sérum Anti-Idade 50 ml', m.id, c.id, 50, 'ml', 'Double Sérum Anti-Idade 50 ml da Clarins.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clarins' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001915626796', 'Hydra-Essentiel Creme 50 ml', m.id, c.id, 50, 'ml', 'Hydra-Essentiel Creme 50 ml da Clarins.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clarins' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008012372175', 'Body Fit Anti-Cellulite 200 ml', m.id, c.id, 200, 'ml', 'Body Fit Anti-Cellulite 200 ml da Clarins.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clarins' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004624581349', 'Moisture Surge 100H Creme 50 ml', m.id, c.id, 50, 'ml', 'Moisture Surge 100H Creme 50 ml da Clinique.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clinique' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008295861649', 'Take The Day Off Cleansing Balm 125 ml', m.id, c.id, 125, 'ml', 'Take The Day Off Cleansing Balm 125 ml da Clinique.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clinique' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008457888897', 'Even Better Foundation SPF 15 30 ml', m.id, c.id, 30, 'ml', 'Even Better Foundation SPF 15 30 ml da Clinique.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'clinique' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006831244888', 'Black Rose Cream Mask 60 ml', m.id, c.id, 60, 'ml', 'Black Rose Cream Mask 60 ml da Sisley.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'sisley' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003850123439', 'Sisleÿa L''Intégral Anti-Âge 50 ml', m.id, c.id, 50, 'ml', 'Sisleÿa L''Intégral Anti-Âge 50 ml da Sisley.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'sisley' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004335644463', 'Minéral 89 Sérum Hidratante 50 ml', m.id, c.id, 50, 'ml', 'Minéral 89 Sérum Hidratante 50 ml da Vichy.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'vichy' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006107653345', 'Liftactiv Supreme Creme 50 ml', m.id, c.id, 50, 'ml', 'Liftactiv Supreme Creme 50 ml da Vichy.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'vichy' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003187045794', 'Capital Soleil SPF50+ Fluido 50 ml', m.id, c.id, 50, 'ml', 'Capital Soleil SPF50+ Fluido 50 ml da Vichy.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'vichy' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008122273171', 'Effaclar Duo+ 40 ml', m.id, c.id, 40, 'ml', 'Effaclar Duo+ 40 ml da La Roche-Posay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'la-roche-posay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000501056283', 'Anthelios UVMune 400 SPF50+ 50 ml', m.id, c.id, 50, 'ml', 'Anthelios UVMune 400 SPF50+ 50 ml da La Roche-Posay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'la-roche-posay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009738088142', 'Cicaplast Baume B5+ 100 ml', m.id, c.id, 100, 'ml', 'Cicaplast Baume B5+ 100 ml da La Roche-Posay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'la-roche-posay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008511988778', 'Toleriane Sensitive Creme 40 ml', m.id, c.id, 40, 'ml', 'Toleriane Sensitive Creme 40 ml da La Roche-Posay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'la-roche-posay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009710487680', 'Hyalu B5 Sérum 30 ml', m.id, c.id, 30, 'ml', 'Hyalu B5 Sérum 30 ml da La Roche-Posay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'la-roche-posay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007714380778', 'Creme Hidratante 250 ml', m.id, c.id, 250, 'ml', 'Creme Hidratante 250 ml da CeraVe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cerave' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005278535627', 'Gel de Limpeza Espumoso 236 ml', m.id, c.id, 236, 'ml', 'Gel de Limpeza Espumoso 236 ml da CeraVe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cerave' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008445431968', 'Loção Hidratante SA 236 ml', m.id, c.id, 236, 'ml', 'Loção Hidratante SA 236 ml da CeraVe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cerave' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000885555990', 'AM Facial Moisturizing SPF30 52 ml', m.id, c.id, 52, 'ml', 'AM Facial Moisturizing SPF30 52 ml da CeraVe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cerave' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001655213232', 'Sensibio H2O Água Micelar 500 ml', m.id, c.id, 500, 'ml', 'Sensibio H2O Água Micelar 500 ml da Bioderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'bioderma' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008300120846', 'Hydrabio Sérum 40 ml', m.id, c.id, 40, 'ml', 'Hydrabio Sérum 40 ml da Bioderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'bioderma' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005007543459', 'Photoderm Max SPF50+ 40 ml', m.id, c.id, 40, 'ml', 'Photoderm Max SPF50+ 40 ml da Bioderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'bioderma' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009804168389', 'Atoderm Creme 500 ml', m.id, c.id, 500, 'ml', 'Atoderm Creme 500 ml da Bioderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'bioderma' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007240584589', 'Eau Thermale Spray 300 ml', m.id, c.id, 300, 'ml', 'Eau Thermale Spray 300 ml da Avène.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'avene' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000216158661', 'Cleanance Comedomed 30 ml', m.id, c.id, 30, 'ml', 'Cleanance Comedomed 30 ml da Avène.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'avene' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006942309278', 'Hydrance Aqua-Creme 40 ml', m.id, c.id, 40, 'ml', 'Hydrance Aqua-Creme 40 ml da Avène.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'avene' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003071867471', 'Solar SPF50+ Sem Perfume 50 ml', m.id, c.id, 50, 'ml', 'Solar SPF50+ Sem Perfume 50 ml da Avène.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'avene' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000102501151', 'Hyaluron-Filler Sérum 30 ml', m.id, c.id, 30, 'ml', 'Hyaluron-Filler Sérum 30 ml da Eucerin.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'eucerin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006454281192', 'Sun Sensitive Protect SPF50+ 50 ml', m.id, c.id, 50, 'ml', 'Sun Sensitive Protect SPF50+ 50 ml da Eucerin.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'eucerin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006953082672', 'Aquaphor Soothing Skin Balm 198g', m.id, c.id, 198, 'g', 'Aquaphor Soothing Skin Balm 198g da Eucerin.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'eucerin' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003318723829', 'Fotoprotector Fusion Water SPF50+ 50 ml', m.id, c.id, 50, 'ml', 'Fotoprotector Fusion Water SPF50+ 50 ml da ISDIN.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'isdin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008200003027', 'Isdinceutics Flavo-C Ultraglican 30 amp', m.id, c.id, 30, 'amp', 'Isdinceutics Flavo-C Ultraglican 30 amp da ISDIN.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'isdin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009386837116', 'Hydration Plus SPF15 50 ml', m.id, c.id, 50, 'ml', 'Hydration Plus SPF15 50 ml da ISDIN.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'isdin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002667535503', 'Vinoperfect Sérum Luminosidade 30 ml', m.id, c.id, 30, 'ml', 'Vinoperfect Sérum Luminosidade 30 ml da Caudalie.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'caudalie' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002484860956', 'Premier Cru Creme 50 ml', m.id, c.id, 50, 'ml', 'Premier Cru Creme 50 ml da Caudalie.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'caudalie' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004198617727', 'Crème Mains et Ongles 75 ml', m.id, c.id, 75, 'ml', 'Crème Mains et Ongles 75 ml da Caudalie.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'caudalie' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002979924873', 'Huile Prodigieuse 100 ml', m.id, c.id, 100, 'ml', 'Huile Prodigieuse 100 ml da Nuxe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nuxe' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007590996414', 'Crème Fraîche de Beauté 48h 50 ml', m.id, c.id, 50, 'ml', 'Crème Fraîche de Beauté 48h 50 ml da Nuxe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nuxe' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005426955772', 'Rêve de Miel Stick Labial 4g', m.id, c.id, 4, 'g', 'Rêve de Miel Stick Labial 4g da Nuxe.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nuxe' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006355999394', 'NCEF-Reverse Creme 50 ml', m.id, c.id, 50, 'ml', 'NCEF-Reverse Creme 50 ml da Filorga.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'filorga' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006873801483', 'Time-Filler 5XP Sérum 30 ml', m.id, c.id, 30, 'ml', 'Time-Filler 5XP Sérum 30 ml da Filorga.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'filorga' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007132436965', 'Regenerist Retinol24 Creme 50 ml', m.id, c.id, 50, 'ml', 'Regenerist Retinol24 Creme 50 ml da Olay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'olay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004621779077', 'Total Effects 7-in-1 50 ml', m.id, c.id, 50, 'ml', 'Total Effects 7-in-1 50 ml da Olay.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'olay' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004975359161', 'Hydro Boost Gel-Creme 50 ml', m.id, c.id, 50, 'ml', 'Hydro Boost Gel-Creme 50 ml da Neutrogena.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'neutrogena' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009106160326', 'Visibly Clear Limpeza Espumosa 200 ml', m.id, c.id, 200, 'ml', 'Visibly Clear Limpeza Espumosa 200 ml da Neutrogena.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'neutrogena' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006862643254', 'Revitalift Filler Sérum 30 ml', m.id, c.id, 30, 'ml', 'Revitalift Filler Sérum 30 ml da L''Oréal Paris.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loreal-paris' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000397568723', 'Hyaluron Expert Creme 50 ml', m.id, c.id, 50, 'ml', 'Hyaluron Expert Creme 50 ml da L''Oréal Paris.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loreal-paris' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004919426430', 'Infallible 24H Foundation 30 ml', m.id, c.id, 30, 'ml', 'Infallible 24H Foundation 30 ml da L''Oréal Paris.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loreal-paris' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000720043675', 'Telescopic Mascara 8 ml', m.id, c.id, 8, 'ml', 'Telescopic Mascara 8 ml da L''Oréal Paris.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loreal-paris' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003666480627', 'Elvive Óleo Extraordinário 100 ml', m.id, c.id, 100, 'ml', 'Elvive Óleo Extraordinário 100 ml da L''Oréal Paris.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loreal-paris' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005104214580', 'Skinactive Vitamin C Sérum 30 ml', m.id, c.id, 30, 'ml', 'Skinactive Vitamin C Sérum 30 ml da Garnier.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'garnier' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008282165026', 'Ambre Solaire SPF50+ Spray 200 ml', m.id, c.id, 200, 'ml', 'Ambre Solaire SPF50+ Spray 200 ml da Garnier.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'garnier' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003164585572', 'Fructis Hair Food Banana 350 ml', m.id, c.id, 350, 'ml', 'Fructis Hair Food Banana 350 ml da Garnier.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'garnier' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008484479211', 'Soft Creme 200 ml', m.id, c.id, 200, 'ml', 'Soft Creme 200 ml da Nivea.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nivea' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009140279848', 'Q10 Power Anti-Rugas 50 ml', m.id, c.id, 50, 'ml', 'Q10 Power Anti-Rugas 50 ml da Nivea.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nivea' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009784241881', 'Sun Protect & Moisture SPF50 200 ml', m.id, c.id, 200, 'ml', 'Sun Protect & Moisture SPF50 200 ml da Nivea.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nivea' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007097046407', 'Radiant Creamy Concealer 6 ml', m.id, c.id, 6, 'ml', 'Radiant Creamy Concealer 6 ml da NARS.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nars' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003319134716', 'Sheer Glow Foundation 30 ml', m.id, c.id, 30, 'ml', 'Sheer Glow Foundation 30 ml da NARS.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nars' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007929321405', 'Blush Orgasm 4.8g', m.id, c.id, 8, 'g', 'Blush Orgasm 4.8g da NARS.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nars' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005636957320', 'Magic Cream Hidratante 50 ml', m.id, c.id, 50, 'ml', 'Magic Cream Hidratante 50 ml da Charlotte Tilbury.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'charlotte-tilbury' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003658976992', 'Pillow Talk Lipstick 3.5g', m.id, c.id, 5, 'g', 'Pillow Talk Lipstick 3.5g da Charlotte Tilbury.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'charlotte-tilbury' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005361248526', 'Hollywood Flawless Filter 30 ml', m.id, c.id, 30, 'ml', 'Hollywood Flawless Filter 30 ml da Charlotte Tilbury.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'charlotte-tilbury' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008366718940', 'Ruby Woo Retro Matte Lipstick 3g', m.id, c.id, 3, 'g', 'Ruby Woo Retro Matte Lipstick 3g da MAC.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mac' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004137012408', 'Studio Fix Fluid SPF15 30 ml', m.id, c.id, 30, 'ml', 'Studio Fix Fluid SPF15 30 ml da MAC.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mac' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006999714162', 'Mineralize Skinfinish 10g', m.id, c.id, 10, 'g', 'Mineralize Skinfinish 10g da MAC.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mac' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001371278034', 'Fit Me Foundation 30 ml', m.id, c.id, 30, 'ml', 'Fit Me Foundation 30 ml da Maybelline.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'maybelline' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007144409261', 'Sky High Mascara 7.2 ml', m.id, c.id, 2, 'ml', 'Sky High Mascara 7.2 ml da Maybelline.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'maybelline' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004693781725', 'Lash Sensational Mascara 9.5 ml', m.id, c.id, 5, 'ml', 'Lash Sensational Mascara 9.5 ml da Maybelline.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'maybelline' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003947829442', 'SuperStay Matte Ink Lipstick 5 ml', m.id, c.id, 5, 'ml', 'SuperStay Matte Ink Lipstick 5 ml da Maybelline.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'maybelline' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007743769612', 'Butter Gloss Lip Gloss 8 ml', m.id, c.id, 8, 'ml', 'Butter Gloss Lip Gloss 8 ml da NYX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nyx' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001960757940', 'Bare With Me Concealer 6.5 ml', m.id, c.id, 5, 'ml', 'Bare With Me Concealer 6.5 ml da NYX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nyx' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002913244227', 'Setting Spray Matte 60 ml', m.id, c.id, 60, 'ml', 'Setting Spray Matte 60 ml da NYX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'nyx' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003040901830', '3D Hydra Lipgloss 6.5 ml', m.id, c.id, 5, 'ml', '3D Hydra Lipgloss 6.5 ml da KIKO Milano.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kiko-milano' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000738787837', 'Smart Fusion Concealer 5 ml', m.id, c.id, 5, 'ml', 'Smart Fusion Concealer 5 ml da KIKO Milano.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kiko-milano' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001771644262', 'Ultratech Foundation 30 ml', m.id, c.id, 30, 'ml', 'Ultratech Foundation 30 ml da KIKO Milano.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kiko-milano' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005710971525', 'Powder Foundation 9g', m.id, c.id, 9, 'g', 'Powder Foundation 9g da Catrice.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'catrice' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005988680822', 'HD Liquid Coverage Foundation 30 ml', m.id, c.id, 30, 'ml', 'HD Liquid Coverage Foundation 30 ml da Catrice.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'catrice' AND c.slug = 'makeup'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008004370677', 'Elixir Ultime Óleo Original 100 ml', m.id, c.id, 100, 'ml', 'Elixir Ultime Óleo Original 100 ml da Kérastase.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kerastase' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005123966651', 'Nutritive Bain Satin 250 ml', m.id, c.id, 250, 'ml', 'Nutritive Bain Satin 250 ml da Kérastase.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kerastase' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000005503757', 'Resistance Ciment Anti-Usure 200 ml', m.id, c.id, 200, 'ml', 'Resistance Ciment Anti-Usure 200 ml da Kérastase.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'kerastase' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000948683912', 'All Soft Shampoo 300 ml', m.id, c.id, 300, 'ml', 'All Soft Shampoo 300 ml da Redken.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'redken' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003876855727', 'Extreme Conditioner 250 ml', m.id, c.id, 250, 'ml', 'Extreme Conditioner 250 ml da Redken.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'redken' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007183304244', 'No.3 Hair Perfector 100 ml', m.id, c.id, 100, 'ml', 'No.3 Hair Perfector 100 ml da Olaplex.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'olaplex' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001222826742', 'No.7 Bonding Oil 30 ml', m.id, c.id, 30, 'ml', 'No.7 Bonding Oil 30 ml da Olaplex.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'olaplex' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2004849016558', 'No.4 Bond Maintenance Shampoo 250 ml', m.id, c.id, 250, 'ml', 'No.4 Bond Maintenance Shampoo 250 ml da Olaplex.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'olaplex' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2000211734983', 'Treatment Original 100 ml', m.id, c.id, 100, 'ml', 'Treatment Original 100 ml da Moroccanoil.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'moroccanoil' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007922336086', 'Hydrating Shampoo 250 ml', m.id, c.id, 250, 'ml', 'Hydrating Shampoo 250 ml da Moroccanoil.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'moroccanoil' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005177739645', 'BC Bonacure Q10+ Time Restore 200 ml', m.id, c.id, 200, 'ml', 'BC Bonacure Q10+ Time Restore 200 ml da Schwarzkopf.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'schwarzkopf' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008569812261', 'Pro-V Repair & Protect Shampoo 400 ml', m.id, c.id, 400, 'ml', 'Pro-V Repair & Protect Shampoo 400 ml da Pantene.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'pantene' AND c.slug = 'hair'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003252438247', 'The Ritual of Sakura Body Cream 220 ml', m.id, c.id, 220, 'ml', 'The Ritual of Sakura Body Cream 220 ml da Rituals.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'rituals' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2005441047421', 'The Ritual of Karma Shower Foam 200 ml', m.id, c.id, 200, 'ml', 'The Ritual of Karma Shower Foam 200 ml da Rituals.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'rituals' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009261445320', 'Mehr Body Cream 220 ml', m.id, c.id, 220, 'ml', 'Mehr Body Cream 220 ml da Rituals.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'rituals' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2007080727788', 'Vitamin E Moisture Cream 50 ml', m.id, c.id, 50, 'ml', 'Vitamin E Moisture Cream 50 ml da The Body Shop.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'the-body-shop' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001052604855', 'British Rose Body Yogurt 200 ml', m.id, c.id, 200, 'ml', 'British Rose Body Yogurt 200 ml da The Body Shop.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'the-body-shop' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002070914452', 'Shea Butter Hand Cream 150 ml', m.id, c.id, 150, 'ml', 'Shea Butter Hand Cream 150 ml da L''Occitane.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loccitane' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002909036485', 'Amande Shower Oil 250 ml', m.id, c.id, 250, 'ml', 'Amande Shower Oil 250 ml da L''Occitane.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'loccitane' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003672522229', 'Hydra Vegetal Creme 50 ml', m.id, c.id, 50, 'ml', 'Hydra Vegetal Creme 50 ml da Yves Rocher.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-rocher' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008230783807', 'Monoï Sun Lover Body Lotion 200 ml', m.id, c.id, 200, 'ml', 'Monoï Sun Lover Body Lotion 200 ml da Yves Rocher.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'yves-rocher' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002201157871', 'Zero% Sensitive Gel Duche 600 ml', m.id, c.id, 600, 'ml', 'Zero% Sensitive Gel Duche 600 ml da Sanex.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'sanex' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006588619489', 'Snail 96 Mucin Power Essence 100 ml', m.id, c.id, 100, 'ml', 'Snail 96 Mucin Power Essence 100 ml da COSRX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cosrx' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003196877621', 'Advanced Snail 92 All in One Cream 100 ml', m.id, c.id, 100, 'ml', 'Advanced Snail 92 All in One Cream 100 ml da COSRX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cosrx' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002712535526', 'Salicylic Acid Daily Gentle Cleanser 150 ml', m.id, c.id, 150, 'ml', 'Salicylic Acid Daily Gentle Cleanser 150 ml da COSRX.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'cosrx' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2003144414496', 'Heartleaf 77% Soothing Toner 250 ml', m.id, c.id, 250, 'ml', 'Heartleaf 77% Soothing Toner 250 ml da Anua.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'anua' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002767765305', 'Heartleaf Quercetinol Pore Cleansing Foam 150 ml', m.id, c.id, 150, 'ml', 'Heartleaf Quercetinol Pore Cleansing Foam 150 ml da Anua.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'anua' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006774407029', 'Glow Serum Propolis + Niacinamide 30 ml', m.id, c.id, 30, 'ml', 'Glow Serum Propolis + Niacinamide 30 ml da Beauty of Joseon.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'beauty-of-joseon' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006102404539', 'Relief Sun: Rice + Probiotics SPF50+ 50 ml', m.id, c.id, 50, 'ml', 'Relief Sun: Rice + Probiotics SPF50+ 50 ml da Beauty of Joseon.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'beauty-of-joseon' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002407965584', 'All Clean Balm 120 ml', m.id, c.id, 120, 'ml', 'All Clean Balm 120 ml da Heimish.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'heimish' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009662221158', 'No. 3 Skin Softening Serum 50 ml', m.id, c.id, 50, 'ml', 'No. 3 Skin Softening Serum 50 ml da Numbuzin.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'numbuzin' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001367107027', 'Acglicolic Liposomal Sérum 30 ml', m.id, c.id, 30, 'ml', 'Acglicolic Liposomal Sérum 30 ml da Sesderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'sesderma' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2001600631852', 'Hidraderm TRX Sérum 30 ml', m.id, c.id, 30, 'ml', 'Hidraderm TRX Sérum 30 ml da Sesderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'sesderma' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2002327013983', 'Ultra-Hidratante Corpo 500 ml', m.id, c.id, 500, 'ml', 'Ultra-Hidratante Corpo 500 ml da Topicrem.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'topicrem' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2008454978348', 'Hydra Bebé Creme Facial 40 ml', m.id, c.id, 40, 'ml', 'Hydra Bebé Creme Facial 40 ml da Mustela.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'mustela' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2009662886098', 'Exomega Control Creme Emoliente 200 ml', m.id, c.id, 200, 'ml', 'Exomega Control Creme Emoliente 200 ml da Aderma.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'aderma' AND c.slug = 'body'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;
INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT '2006559351172', 'Sebiaclear Active 40 ml', m.id, c.id, 40, 'ml', 'Sebiaclear Active 40 ml da SVR.', NULL
  FROM marcas m, categorias c WHERE m.slug = 'svr' AND c.slug = 'skincare'
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;

-- ─── PRECOS (snapshot 2026-05-11 06h00) ───
INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2006391013009', 'notino', 107.76, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'sephora', 104.17, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'douglas', 117.71, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'druni', 102.72, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'perfumes-companhia', 116.22, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'brasty', 99.1, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'perfumesclub', 97.5, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'lookfantastic', 97.01, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'cultbeauty', 106.55, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'primor', 108.57, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006391013009', 'maquillalia', 106.05, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/no-5-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'notino', 118.71, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'sephora', 102.57, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'douglas', 102.6, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'druni', 103.96, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'perfumes-companhia', 105.47, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'brasty', 100.04, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'perfumesclub', 96.96, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'lookfantastic', 104.67, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'cultbeauty', 110.83, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'primor', 106.25, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005014856306', 'maquillalia', 96.48, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/coco-mademoiselle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'notino', 125.43, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'sephora', 126.81, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'douglas', 125.45, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'druni', 116.6, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'perfumes-companhia', 133.18, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'brasty', 114.57, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'perfumesclub', 109.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'lookfantastic', 126.8, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'cultbeauty', 125.16, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'primor', 120.86, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2007166187772', 'maquillalia', 103.84, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/bleu-de-chanel-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'notino', 103.8, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'sephora', 93.69, 114.45, 18.14, 'EUR', TRUE, 'https://www.sephora.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'douglas', 97.96, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'druni', 100.52, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'perfumes-companhia', 96.01, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'brasty', 84.25, 114.45, 26.39, 'EUR', TRUE, 'https://www.brasty.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'perfumesclub', 96.71, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'lookfantastic', 107.05, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'cultbeauty', 85.29, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'primor', 100.95, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2000185996547', 'maquillalia', 97.53, 114.45, 14.78, 'EUR', TRUE, 'https://www.maquillalia.com/produto/chance-eau-tendre-50-ml', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'notino', 37.12, 40.95, 9.35, 'EUR', TRUE, 'https://www.notino.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'sephora', 35.21, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'douglas', 34.87, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'druni', 33.25, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'perfumes-companhia', 33.53, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'brasty', 30.28, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'lookfantastic', 34.62, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'cultbeauty', 35.87, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'primor', 34.79, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2008832426232', 'maquillalia', 38.21, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/rouge-coco-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'notino', 106.59, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'sephora', 108.74, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'douglas', 108.08, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'druni', 98.56, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'perfumes-companhia', 93.26, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'brasty', 89.51, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'perfumesclub', 95.84, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'lookfantastic', 93.44, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'cultbeauty', 87.98, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'primor', 98.07, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2001416572202', 'maquillalia', 96.53, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sauvage-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'notino', 107.59, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'sephora', 111.64, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'douglas', 106.96, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'druni', 104.03, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'perfumes-companhia', 105.88, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'brasty', 91.01, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'perfumesclub', 97.56, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'lookfantastic', 96.91, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'cultbeauty', 93.06, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'primor', 116.09, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002371800546', 'maquillalia', 87.48, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/jadore-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'notino', 104.16, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'sephora', 97.16, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'douglas', 103.09, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'druni', 89.68, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'perfumes-companhia', 104.77, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'brasty', 87.62, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'perfumesclub', 94.38, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'lookfantastic', 96.5, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'cultbeauty', 96.96, 110.25, 12.05, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'primor', 105.49, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003357636579', 'maquillalia', 80.75, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/miss-dior-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'notino', 123.66, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'sephora', 128.94, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'douglas', 124.21, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'druni', 128.22, 152.25, 15.78, 'EUR', TRUE, 'https://www.druni.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'perfumes-companhia', 126.8, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'brasty', 118, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'lookfantastic', 140.83, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'cultbeauty', 116.96, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'primor', 145.92, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2004583732042', 'maquillalia', 135.86, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/capture-totale-super-potent-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'notino', 39.41, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'sephora', 43.5, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'douglas', 38.36, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'druni', 41.94, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'perfumes-companhia', 40.73, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'brasty', 36.15, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'lookfantastic', 40.57, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'cultbeauty', 43.92, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'primor', 40.94, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2000152469210', 'maquillalia', 36.28, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/rouge-dior-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'notino', 89.93, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'sephora', 90.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'douglas', 94.19, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'druni', 93.26, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'perfumes-companhia', 98.7, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'brasty', 79.43, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'perfumesclub', 80.06, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'lookfantastic', 93.56, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'cultbeauty', 82.73, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'primor', 94.65, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2004936901965', 'maquillalia', 93.84, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/black-opium-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'notino', 107.08, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'sephora', 107.08, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'douglas', 105.7, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'druni', 94.82, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'perfumes-companhia', 96.26, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'brasty', 90.3, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'perfumesclub', 89.69, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'lookfantastic', 108.87, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'cultbeauty', 100.84, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'primor', 98.34, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006565214881', 'maquillalia', 100.54, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/libre-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'notino', 90.05, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'sephora', 83.68, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'douglas', 86.97, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'druni', 87.82, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'perfumes-companhia', 81.68, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'brasty', 79.89, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'perfumesclub', 81.68, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'lookfantastic', 76.88, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'cultbeauty', 79.34, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'primor', 87.49, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005397134947', 'maquillalia', 71.6, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/mon-paris-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'notino', 35.18, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'sephora', 38.44, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'douglas', 34.2, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'druni', 37.91, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'perfumes-companhia', 36.81, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'brasty', 35.74, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'lookfantastic', 38.52, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'cultbeauty', 33.78, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'primor', 36.4, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2005961101139', 'maquillalia', 31.53, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/touche-eclat-highlighter-2-5-ml', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'notino', 39.85, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'sephora', 40.96, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'douglas', 36.96, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'druni', 39.43, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'perfumes-companhia', 36.39, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'brasty', 38.92, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'lookfantastic', 37.86, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'cultbeauty', 38.23, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'primor', 41.25, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2004837460981', 'maquillalia', 36.7, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/rouge-pur-couture-lipstick-3-8g', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'notino', 133.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'sephora', 134.44, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'douglas', 132.33, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'druni', 122.39, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'perfumes-companhia', 120.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'brasty', 120.56, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'perfumesclub', 98.63, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'lookfantastic', 124.48, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'cultbeauty', 111.59, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'primor', 123.19, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001689443865', 'maquillalia', 106.78, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/black-orchid-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'notino', 242.53, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'sephora', 282.51, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'douglas', 257.69, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'druni', 266.71, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'perfumes-companhia', 280.16, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'brasty', 219.69, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'perfumesclub', 246.82, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'lookfantastic', 269.16, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'cultbeauty', 217.34, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'primor', 284.96, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008807030334', 'maquillalia', 215.65, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/lost-cherry-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'notino', 210.94, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'sephora', 189.84, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'douglas', 192.56, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'druni', 185.52, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'perfumes-companhia', 210.53, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'brasty', 186.54, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'perfumesclub', 152.74, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'lookfantastic', 180.71, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'cultbeauty', 202.04, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'primor', 218.51, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001894225102', 'maquillalia', 180.7, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/oud-wood-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'notino', 86.25, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'sephora', 78.22, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'douglas', 83.57, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'druni', 86.13, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'perfumes-companhia', 76.39, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'brasty', 75.76, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'perfumesclub', 74.22, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'lookfantastic', 77.03, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'cultbeauty', 67.69, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'primor', 84.21, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2000438936429', 'maquillalia', 82.35, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/acqua-di-gio-pour-homme-edt-100-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'notino', 76.32, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'sephora', 78.22, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'douglas', 75.06, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'druni', 76.42, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'perfumes-companhia', 69.51, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'brasty', 63.77, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'perfumesclub', 62.83, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'lookfantastic', 77.26, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'cultbeauty', 63.23, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'primor', 70.35, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001442204597', 'maquillalia', 72.29, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/code-homme-eau-de-toilette-75-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'notino', 94.38, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'sephora', 94.1, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'douglas', 84.77, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'druni', 91.87, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'perfumes-companhia', 89.93, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'brasty', 70.97, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'perfumesclub', 73.25, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'lookfantastic', 87, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'cultbeauty', 82.95, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'primor', 93.79, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001369288663', 'maquillalia', 85.42, 99.75, 14.37, 'EUR', TRUE, 'https://www.maquillalia.com/produto/my-way-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'notino', 87.48, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'sephora', 92.46, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'douglas', 89.31, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'druni', 96.81, 103.95, 6.87, 'EUR', TRUE, 'https://www.druni.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'perfumes-companhia', 91.44, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'brasty', 87.4, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'perfumesclub', 84.86, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'lookfantastic', 94.75, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'cultbeauty', 78.75, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'primor', 96.82, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006250956133', 'maquillalia', 79.43, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/si-passione-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'notino', 69.07, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'sephora', 73.1, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'douglas', 74.63, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'druni', 73.77, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'perfumes-companhia', 68.06, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'brasty', 65.31, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'perfumesclub', 53.11, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'lookfantastic', 61.03, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'cultbeauty', 58.43, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'primor', 67.19, 78.75, 14.68, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'maquillalia', 61.84, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'atida', 69.82, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2009651714791', 'fnac', 75.97, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/bright-crystal-eau-de-toilette-90-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'notino', 70.54, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'sephora', 67.66, 82.95, 18.43, 'EUR', TRUE, 'https://www.sephora.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'douglas', 70.17, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'druni', 70.91, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'perfumes-companhia', 69.11, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'brasty', 68.51, 82.95, 17.41, 'EUR', TRUE, 'https://www.brasty.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'perfumesclub', 67.7, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'lookfantastic', 73.06, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'cultbeauty', 68.04, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'primor', 69.84, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'maquillalia', 72.44, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'atida', 78.79, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004261318346', 'fnac', 78.72, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/eros-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'notino', 80.73, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'sephora', 87.01, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'douglas', 77.86, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'druni', 79.77, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'perfumes-companhia', 83.98, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'brasty', 77.26, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'perfumesclub', 65.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'lookfantastic', 85.63, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'cultbeauty', 70.88, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'primor', 84.77, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'maquillalia', 73.66, 93.45, 21.18, 'EUR', TRUE, 'https://www.maquillalia.com/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'atida', 87.54, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009343875700', 'fnac', 85.72, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/good-girl-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'notino', 94.19, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'sephora', 88.26, 103.95, 15.09, 'EUR', TRUE, 'https://www.sephora.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'douglas', 92.38, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'druni', 90.63, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'perfumes-companhia', 95.37, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'brasty', 78.93, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'perfumesclub', 72.23, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'lookfantastic', 82.42, 103.95, 20.71, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'cultbeauty', 84.58, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'primor', 93.99, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'maquillalia', 81.52, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'atida', 86.99, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2006607239896', 'fnac', 97.02, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/212-sexy-eau-de-parfum-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'notino', 84.74, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'sephora', 75.95, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'douglas', 81.75, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'druni', 80.25, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'perfumes-companhia', 79.4, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'brasty', 72.48, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'perfumesclub', 69.03, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'lookfantastic', 82.67, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'cultbeauty', 72.04, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'primor', 76.62, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'maquillalia', 66.33, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'atida', 80.02, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004300297359', 'fnac', 86.81, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/1-million-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'notino', 73.75, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'sephora', 71.17, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'douglas', 72.11, 82.95, 13.07, 'EUR', TRUE, 'https://www.douglas.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'druni', 70.1, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'perfumes-companhia', 73.61, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'brasty', 61.71, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'perfumesclub', 62.34, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'lookfantastic', 75.18, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'cultbeauty', 68.87, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'primor', 74.02, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'maquillalia', 74.26, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'atida', 71.99, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003620158340', 'fnac', 76.11, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/olympea-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'notino', 74.44, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'sephora', 73.61, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'douglas', 76.16, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'druni', 77.85, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'perfumes-companhia', 70.66, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'brasty', 65.08, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'perfumesclub', 66.35, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'lookfantastic', 73.52, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'cultbeauty', 70.85, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'primor', 75.89, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'maquillalia', 71.13, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'atida', 74.98, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008793171240', 'fnac', 77.04, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/lady-million-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'notino', 73.87, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'sephora', 71.02, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'douglas', 69.12, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'druni', 77.2, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'perfumes-companhia', 78.96, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'brasty', 62.72, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'perfumesclub', 61.16, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'lookfantastic', 72.03, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'cultbeauty', 60.32, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'primor', 73.05, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'maquillalia', 73.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'atida', 68.73, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2008513215421', 'fnac', 79.37, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/light-blue-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'notino', 83.8, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'sephora', 83.18, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'douglas', 81.31, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'druni', 76.95, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'perfumes-companhia', 79.61, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'brasty', 72.57, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'perfumesclub', 74.85, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'lookfantastic', 78.41, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'cultbeauty', 70.33, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'primor', 85.91, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'maquillalia', 66.44, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'atida', 77.22, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2004337354667', 'fnac', 82.28, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/the-one-for-women-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'notino', 85.7, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'sephora', 91.05, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'douglas', 85.99, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'druni', 92.59, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'perfumes-companhia', 93.55, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'brasty', 74.58, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'perfumesclub', 87.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'lookfantastic', 98.12, 103.95, 5.61, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'cultbeauty', 74.51, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'primor', 90.21, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'maquillalia', 87.22, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'atida', 86.79, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2000496730274', 'fnac', 98.56, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/la-vie-est-belle-edp-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'notino', 81.06, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'sephora', 80.24, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'douglas', 82.7, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'druni', 86.45, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'perfumes-companhia', 78.2, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'brasty', 76.04, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'perfumesclub', 73.66, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'lookfantastic', 75.2, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'cultbeauty', 73.05, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'primor', 80.5, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'maquillalia', 73.71, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'atida', 81.24, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006724895593', 'fnac', 84.71, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/idole-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'notino', 84.61, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'sephora', 88.52, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'douglas', 87.54, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'druni', 78.12, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'perfumes-companhia', 88.68, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'brasty', 75.67, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'lookfantastic', 79.8, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'cultbeauty', 81.25, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'primor', 81.83, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'maquillalia', 72.9, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'atida', 84.12, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2000216165027', 'fnac', 90.46, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/genifique-serum-avancado-50-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'notino', 114.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'sephora', 102.59, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'douglas', 114.91, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'druni', 107.33, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'perfumes-companhia', 114.09, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'brasty', 101.29, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'lookfantastic', 94.4, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'cultbeauty', 101.1, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'primor', 110.44, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'maquillalia', 109.51, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'atida', 101.91, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006042909873', 'fnac', 107.5, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/renergie-hcf-triple-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'notino', 40.77, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'sephora', 40.66, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'douglas', 39.79, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'druni', 39.44, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'perfumes-companhia', 44.46, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'brasty', 34.02, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'lookfantastic', 39.06, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'cultbeauty', 42.95, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'primor', 40.59, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'maquillalia', 38.83, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'atida', 38.39, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002941083577', 'fnac', 43.84, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/teint-idole-ultra-wear-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'notino', 74.53, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'sephora', 70.12, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'douglas', 71.77, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'druni', 67.62, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'perfumes-companhia', 71.4, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'elcorteingles', 75.16, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'worten', 69.56, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'continente', 78.22, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'auchan', 69.65, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'wook', 73.26, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'wells', 68.06, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmaciaonline', 74.6, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'pharma2you', 76.31, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmaciasholon', 72.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'brasty', 54.08, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'perfumesclub', 62.99, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'lookfantastic', 73.92, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'cultbeauty', 58.43, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'primor', 74.89, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'maquillalia', 59.85, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'atida', 69.39, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'fnac', 73.48, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmacia365', 69.32, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'loja-farmacia', 73.61, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'afarmaciaonline', 73.97, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'easyfarma', 75.86, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'bairro-saude', 70.1, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmacia-saude', 70.84, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmaciasdirect', 75.65, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'sa-da-bandeira', 67.52, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'sweetcare', 63.87, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'byfarma', 69.25, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2007377908722', 'farmaciapt', 75.34, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/boss-bottled-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'notino', 70.53, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'sephora', 68.66, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'douglas', 72.87, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'druni', 78.44, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'perfumes-companhia', 69.37, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'elcorteingles', 74.71, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'worten', 82.13, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'continente', 81.15, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'auchan', 75.75, 82.95, 8.68, 'EUR', TRUE, 'https://www.auchan.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'wook', 82.23, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'wells', 79.3, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmaciaonline', 77.24, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'pharma2you', 76.39, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmaciasholon', 77.48, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'brasty', 59.66, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'perfumesclub', 70.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'lookfantastic', 70.28, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'cultbeauty', 65.1, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'primor', 70.53, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'maquillalia', 72.3, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'atida', 71.7, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'fnac', 74.38, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmacia365', 74.35, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'loja-farmacia', 74.27, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'afarmaciaonline', 76.56, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'easyfarma', 74.2, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'bairro-saude', 73.81, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmacia-saude', 79.99, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmaciasdirect', 75.04, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'sa-da-bandeira', 74.16, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'sweetcare', 73.08, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'byfarma', 71.36, 82.95, 13.97, 'EUR', TRUE, 'https://byfarma.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2004652765698', 'farmaciapt', 77.44, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/boss-the-scent-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'notino', 43.53, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'sephora', 43.64, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'douglas', 45.59, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'druni', 47.72, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'perfumes-companhia', 44.39, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'elcorteingles', 46.35, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'worten', 47.77, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'continente', 47.1, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'auchan', 47.23, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'wook', 51.08, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'wells', 47.64, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmaciaonline', 46.1, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'pharma2you', 47.11, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmaciasholon', 44.45, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'brasty', 43.61, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'perfumesclub', 40.59, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'lookfantastic', 46.99, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'cultbeauty', 45.35, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2002146932281', 'primor', 46.9, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'maquillalia', 43.34, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'atida', 41.83, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'fnac', 48.93, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmacia365', 49.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'loja-farmacia', 48.33, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'afarmaciaonline', 45.1, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'easyfarma', 45.96, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'bairro-saude', 47.98, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmacia-saude', 49.4, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmaciasdirect', 46.71, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'sa-da-bandeira', 49.61, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'sweetcare', 42.1, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'byfarma', 44.62, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002146932281', 'farmaciapt', 47.81, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/ck-one-eau-de-toilette-100-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'notino', 55.6, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'sephora', 64.68, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'douglas', 55.65, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'druni', 60.25, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'perfumes-companhia', 59.21, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'elcorteingles', 61.6, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'worten', 65.77, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'continente', 63.39, 68.25, 7.12, 'EUR', TRUE, 'https://www.continente.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'auchan', 65.56, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'wook', 66.17, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'wells', 60.45, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmaciaonline', 60.17, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'pharma2you', 60.68, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmaciasholon', 65.44, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'brasty', 49.88, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'perfumesclub', 56.43, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'lookfantastic', 63.62, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'cultbeauty', 55.24, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'primor', 57.75, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'maquillalia', 54.16, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'atida', 64.45, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'fnac', 60.16, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmacia365', 60.71, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'loja-farmacia', 64.94, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'afarmaciaonline', 65.9, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'easyfarma', 60.61, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'bairro-saude', 62, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmacia-saude', 63.31, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmaciasdirect', 64.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'sa-da-bandeira', 62.94, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'sweetcare', 60.92, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'byfarma', 61.63, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002981474854', 'farmaciapt', 62.51, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/euphoria-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'notino', 101.32, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'sephora', 106.91, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'douglas', 101.42, 114.45, 11.38, 'EUR', TRUE, 'https://www.douglas.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'druni', 97.28, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'perfumes-companhia', 107.64, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'elcorteingles', 108.97, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'worten', 100.82, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'continente', 112.34, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'auchan', 114.03, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'wook', 101.28, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'wells', 104.91, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmaciaonline', 99.87, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'pharma2you', 102.7, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmaciasholon', 104.36, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'brasty', 80.57, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'perfumesclub', 85.71, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'lookfantastic', 88.92, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'cultbeauty', 89.6, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'primor', 102.66, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'maquillalia', 83.57, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'atida', 108.59, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'fnac', 102.76, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmacia365', 110.45, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'loja-farmacia', 109.7, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'afarmaciaonline', 106.33, 114.45, 7.09, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'easyfarma', 104.64, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'bairro-saude', 102.58, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmacia-saude', 101.21, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmaciasdirect', 103.32, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'sa-da-bandeira', 108.59, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'sweetcare', 93.04, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'byfarma', 105.22, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2001503303955', 'farmaciapt', 100.13, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/alien-eau-de-parfum-60-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'notino', 86.05, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'sephora', 89.49, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'douglas', 94.06, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'druni', 93.14, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'perfumes-companhia', 90.81, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'elcorteingles', 99.09, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'worten', 103.34, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'continente', 101.23, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'auchan', 96.15, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'wook', 92.19, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'wells', 99.91, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmaciaonline', 92.86, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'pharma2you', 92.38, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmaciasholon', 97.52, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'brasty', 85.28, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'perfumesclub', 74.74, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'lookfantastic', 94.52, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'cultbeauty', 85.3, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'primor', 87.88, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'maquillalia', 78.8, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'atida', 92.23, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'fnac', 97.95, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmacia365', 98.16, 103.95, 5.57, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'loja-farmacia', 89.87, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'afarmaciaonline', 99.37, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'easyfarma', 96.18, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'bairro-saude', 89.7, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmacia-saude', 92.3, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmaciasdirect', 92.16, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'sa-da-bandeira', 89.43, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'sweetcare', 94.09, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'byfarma', 96.28, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2003956262551', 'farmaciapt', 100.64, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/angel-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'notino', 79.15, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'sephora', 85, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'douglas', 79.12, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'druni', 83.14, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'perfumes-companhia', 80.97, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'elcorteingles', 81.5, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'worten', 82.09, 89.25, 8.02, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'continente', 84.04, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'auchan', 88.98, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'wook', 83.31, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'wells', 79.64, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmaciaonline', 86.18, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'pharma2you', 86.33, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmaciasholon', 85.61, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'brasty', 75.57, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'perfumesclub', 75.56, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesclub.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'lookfantastic', 83.15, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'cultbeauty', 68.77, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'primor', 79.96, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'maquillalia', 72.61, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'atida', 78.11, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'fnac', 85.29, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmacia365', 78.01, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'loja-farmacia', 84.8, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'afarmaciaonline', 78.08, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'easyfarma', 85.38, 89.25, 4.34, 'EUR', TRUE, 'https://easyfarma.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'bairro-saude', 82.2, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmacia-saude', 77.89, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmaciasdirect', 82.51, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'sa-da-bandeira', 81.63, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'sweetcare', 75.95, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'byfarma', 84.33, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2002941161305', 'farmaciapt', 85.88, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/le-male-eau-de-toilette-125-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'notino', 75.11, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'sephora', 73.35, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'douglas', 73.05, 82.95, 11.93, 'EUR', TRUE, 'https://www.douglas.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'druni', 71.78, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'perfumes-companhia', 76.24, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'elcorteingles', 81.44, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'worten', 74.27, 82.95, 10.46, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'continente', 76.75, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'auchan', 77.66, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'wook', 81.72, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'wells', 76.23, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmaciaonline', 72.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'pharma2you', 77.92, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmaciasholon', 74.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'brasty', 58.76, 82.95, 29.16, 'EUR', TRUE, 'https://www.brasty.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'perfumesclub', 57.37, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesclub.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'lookfantastic', 72.94, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'cultbeauty', 70.38, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'primor', 80.31, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'maquillalia', 59.76, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'atida', 70.71, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'fnac', 77.44, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmacia365', 72.48, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'loja-farmacia', 79.59, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'afarmaciaonline', 76.66, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'easyfarma', 71.58, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'bairro-saude', 74.85, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmacia-saude', 79.92, 82.95, 3.65, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmaciasdirect', 74.9, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'sa-da-bandeira', 73.64, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'sweetcare', 68.98, 82.95, 16.84, 'EUR', TRUE, 'https://sweetcare.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'byfarma', 73.98, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2006747515508', 'farmaciapt', 72.74, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/la-belle-eau-de-parfum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'notino', 100.13, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'sephora', 97.73, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'douglas', 96.63, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'druni', 92.96, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'perfumes-companhia', 104.21, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'brasty', 101.38, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'lookfantastic', 91.62, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'cultbeauty', 102.61, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'primor', 108.38, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'maquillalia', 93.86, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'atida', 104.48, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2000563037770', 'fnac', 105.03, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/advanced-night-repair-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'notino', 79.14, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'sephora', 84.56, 89.25, 5.25, 'EUR', TRUE, 'https://www.sephora.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'douglas', 75.95, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'druni', 74.5, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'perfumes-companhia', 80.77, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'brasty', 69.14, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'lookfantastic', 77.98, 89.25, 12.63, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'cultbeauty', 74.56, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'primor', 82.16, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'maquillalia', 83.49, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'atida', 73.91, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007937872531', 'fnac', 87.24, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/revitalizing-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'notino', 39.03, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'sephora', 40.23, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'douglas', 36.73, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'druni', 41.89, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'perfumes-companhia', 35.97, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'brasty', 34.52, 44.1, 21.72, 'EUR', TRUE, 'https://www.brasty.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'lookfantastic', 40.08, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'cultbeauty', 38.65, 44.1, 12.36, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'primor', 39.44, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'maquillalia', 41.57, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'atida', 36.49, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2002956241214', 'fnac', 39.06, 44.1, 11.43, 'EUR', TRUE, 'https://www.fnac.pt/produto/double-wear-stay-in-place-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'notino', 93.28, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'sephora', 94.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'douglas', 95.59, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'druni', 96.33, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'perfumes-companhia', 90.46, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'brasty', 91.48, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'lookfantastic', 96.63, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'cultbeauty', 88.37, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'primor', 100.82, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'maquillalia', 83.7, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'atida', 95.3, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2008316967442', 'fnac', 92.85, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/double-serum-anti-idade-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'notino', 50.41, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'sephora', 48.03, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'douglas', 47.74, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'druni', 46.86, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'perfumes-companhia', 48.85, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'brasty', 48.06, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'lookfantastic', 46.32, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'cultbeauty', 47.35, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'primor', 50.98, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'maquillalia', 51.16, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'atida', 52.38, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2001915626796', 'fnac', 51.87, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydra-essentiel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'notino', 42.43, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'sephora', 47.77, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'douglas', 45.13, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'druni', 44, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'perfumes-companhia', 43.36, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'brasty', 40.41, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'lookfantastic', 44.56, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'cultbeauty', 42.67, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'primor', 48.39, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'maquillalia', 41.44, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'atida', 44.55, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2008012372175', 'fnac', 46.21, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/body-fit-anti-cellulite-200-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'notino', 47.58, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'sephora', 43.36, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'douglas', 48.89, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'druni', 45.6, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'perfumes-companhia', 43.23, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'brasty', 39.61, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'lookfantastic', 42.66, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'cultbeauty', 48.16, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'primor', 47.79, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'maquillalia', 41.43, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'atida', 48.24, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004624581349', 'fnac', 50.96, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/moisture-surge-100h-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'notino', 33.78, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'sephora', 33.33, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'douglas', 36.32, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'druni', 36.72, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'perfumes-companhia', 35.3, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'brasty', 32.14, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'lookfantastic', 33.87, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'cultbeauty', 37.43, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'primor', 37.47, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'maquillalia', 35.04, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'atida', 35.19, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008295861649', 'fnac', 39.32, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/take-the-day-off-cleansing-balm-125-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'notino', 38.6, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'sephora', 33.3, 40.95, 18.68, 'EUR', TRUE, 'https://www.sephora.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'douglas', 35.54, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'druni', 34.7, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'perfumes-companhia', 37.77, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'brasty', 32.03, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'lookfantastic', 33.55, 40.95, 18.07, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'cultbeauty', 31.61, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'primor', 38.86, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'maquillalia', 34.09, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'atida', 33.75, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2008457888897', 'fnac', 39.74, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/even-better-foundation-spf-15-30-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'notino', 137.75, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'sephora', 139.8, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'douglas', 149.85, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'druni', 137.08, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'perfumes-companhia', 133.83, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'brasty', 145.88, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'lookfantastic', 124.99, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'cultbeauty', 152.68, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'primor', 154.01, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2006831244888', 'maquillalia', 152.04, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/black-rose-cream-mask-60-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'notino', 405.56, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'sephora', 407.59, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'douglas', 420.73, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'druni', 396.41, 446.25, 11.17, 'EUR', TRUE, 'https://www.druni.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'perfumes-companhia', 367.91, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'brasty', 324.24, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'lookfantastic', 367.62, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'cultbeauty', 389.79, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'primor', 420.85, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2003850123439', 'maquillalia', 371.07, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sisleya-lintegral-anti-age-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'notino', 28.23, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'sephora', 27.54, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'douglas', 28.04, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'druni', 29.5, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'perfumes-companhia', 31.72, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'elcorteingles', 31.85, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'worten', 33.47, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'continente', 31.7, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'auchan', 32.04, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'wook', 30.17, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'wells', 29.06, 33.6, 13.51, 'EUR', TRUE, 'https://www.wells.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmaciaonline', 31.04, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'pharma2you', 28.96, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmaciasholon', 28.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'brasty', 25.77, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'lookfantastic', 31.2, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'cultbeauty', 28.33, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'primor', 31.5, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'maquillalia', 28.4, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'atida', 28.08, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'fnac', 32.49, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmacia365', 28.71, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'loja-farmacia', 29.55, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'afarmaciaonline', 29.55, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'easyfarma', 29.46, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'bairro-saude', 28.36, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmacia-saude', 31.1, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmaciasdirect', 28.15, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'sa-da-bandeira', 31.01, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'sweetcare', 28.37, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'byfarma', 28.86, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2004335644463', 'farmaciapt', 28.68, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/mineral-89-serum-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'notino', 34.14, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'sephora', 33.8, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'douglas', 35.51, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'druni', 34.94, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'perfumes-companhia', 37.65, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'elcorteingles', 35.93, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'worten', 35.06, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'continente', 36, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'auchan', 37.3, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'wook', 38.14, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'wells', 35.23, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmaciaonline', 34.68, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'pharma2you', 35.59, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmaciasholon', 33.61, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'brasty', 35.39, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'lookfantastic', 33.25, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'cultbeauty', 34.04, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'primor', 36.32, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'maquillalia', 33.56, 39.9, 15.89, 'EUR', TRUE, 'https://www.maquillalia.com/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'atida', 34.91, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'fnac', 38.96, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmacia365', 37.31, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'loja-farmacia', 34.37, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'afarmaciaonline', 35.28, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'easyfarma', 34.11, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'bairro-saude', 33.93, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmacia-saude', 33.18, 39.9, 16.84, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmaciasdirect', 37.28, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'sa-da-bandeira', 33.65, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'sweetcare', 32.31, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'byfarma', 33.79, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006107653345', 'farmaciapt', 36.39, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/liftactiv-supreme-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'notino', 21.14, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'sephora', 21.45, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'douglas', 21.8, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'druni', 19.4, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'perfumes-companhia', 20.9, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'elcorteingles', 22.57, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'worten', 20.52, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'continente', 20.31, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'auchan', 20.31, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'wook', 21.99, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'wells', 21.02, 23.1, 9, 'EUR', TRUE, 'https://www.wells.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmaciaonline', 21.17, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'pharma2you', 19.77, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmaciasholon', 21.35, 23.1, 7.58, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'brasty', 18.73, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'lookfantastic', 19.1, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'cultbeauty', 18.88, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'primor', 21.86, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'maquillalia', 19.18, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'atida', 20.58, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'fnac', 20.72, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmacia365', 20.12, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'loja-farmacia', 19.98, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'afarmaciaonline', 19.31, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'easyfarma', 20.59, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'bairro-saude', 20.99, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmacia-saude', 20.52, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmaciasdirect', 20.55, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'sa-da-bandeira', 20.71, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'sweetcare', 19.35, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'byfarma', 19.4, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2003187045794', 'farmaciapt', 19.56, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/capital-soleil-spf50-fluido-50-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'notino', 17.09, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'sephora', 18.24, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'douglas', 16.18, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'druni', 16.16, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'perfumes-companhia', 17.81, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'elcorteingles', 19.1, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'worten', 18.58, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'continente', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'auchan', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'wook', 17.95, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'wells', 18.76, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmaciaonline', 17.55, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'pharma2you', 17.55, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmaciasholon', 18.63, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'brasty', 15.43, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'lookfantastic', 18.57, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'cultbeauty', 18.64, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'primor', 17.36, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'maquillalia', 18.68, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'atida', 17.29, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'fnac', 19.65, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmacia365', 17.88, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'loja-farmacia', 18.44, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'afarmaciaonline', 17.99, 19.95, 9.82, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'easyfarma', 18.65, 19.95, 6.52, 'EUR', TRUE, 'https://easyfarma.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'bairro-saude', 18.33, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmacia-saude', 16.69, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmaciasdirect', 18.22, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'sa-da-bandeira', 17.36, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'sweetcare', 16.97, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'byfarma', 18.6, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2008122273171', 'farmaciapt', 17.71, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/effaclar-duo-40-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'notino', 20.53, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'sephora', 20.76, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'douglas', 21.36, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'druni', 22.32, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'perfumes-companhia', 22.09, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'elcorteingles', 24.23, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'worten', 23.88, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'continente', 22.14, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'auchan', 24.15, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'wook', 24.94, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'wells', 21.77, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmaciaonline', 21.27, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'pharma2you', 21.33, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmaciasholon', 21.88, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'brasty', 20.01, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'lookfantastic', 21.12, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'cultbeauty', 20.75, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'primor', 22.37, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'maquillalia', 20.49, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'atida', 21.91, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'fnac', 25.12, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmacia365', 23.34, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'loja-farmacia', 21, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'afarmaciaonline', 22.57, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'easyfarma', 21.68, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'bairro-saude', 22.13, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmacia-saude', 21.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmaciasdirect', 22.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'sa-da-bandeira', 23.37, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'sweetcare', 20.59, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'byfarma', 21.49, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2000501056283', 'farmaciapt', 21.93, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/anthelios-uvmune-400-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'notino', 13.23, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'sephora', 13.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'douglas', 11.93, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'druni', 13.59, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'perfumes-companhia', 12.25, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'elcorteingles', 13.66, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'worten', 14.11, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'continente', 13.45, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'auchan', 12.9, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'wook', 14.24, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'wells', 13.72, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmaciaonline', 13.28, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'pharma2you', 12.77, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmaciasholon', 12.57, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'brasty', 11.51, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'lookfantastic', 13.28, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'cultbeauty', 13.78, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'primor', 13.7, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'maquillalia', 13.22, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'atida', 13.02, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'fnac', 13.09, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmacia365', 13.6, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'loja-farmacia', 13.41, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'afarmaciaonline', 13.72, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'easyfarma', 13.5, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'bairro-saude', 12.66, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmacia-saude', 13.4, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmaciasdirect', 12.65, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'sa-da-bandeira', 13, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'sweetcare', 13.24, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'byfarma', 12.72, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z'),
  ('2009738088142', 'farmaciapt', 13.08, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/cicaplast-baume-b5-100-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2008511988778', 'notino', 15.82, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'sephora', 15.45, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'douglas', 15.75, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'druni', 15.42, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'perfumes-companhia', 17.16, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'elcorteingles', 18.8, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'worten', 17.02, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'continente', 18.73, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'auchan', 18.75, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'wook', 18.17, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'wells', 17.36, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmaciaonline', 17.6, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'pharma2you', 17.06, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmaciasholon', 16.33, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'brasty', 16.08, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'lookfantastic', 14.96, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'cultbeauty', 15.65, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'primor', 16.36, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'maquillalia', 15.25, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'atida', 15.2, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'fnac', 17.89, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmacia365', 17.37, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'loja-farmacia', 15.76, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'afarmaciaonline', 17.59, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'easyfarma', 17.36, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'bairro-saude', 17.3, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmacia-saude', 16.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmaciasdirect', 15.94, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'sa-da-bandeira', 16.86, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'sweetcare', 16.49, 18.9, 12.75, 'EUR', TRUE, 'https://sweetcare.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'byfarma', 17.32, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2008511988778', 'farmaciapt', 17.05, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/toleriane-sensitive-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'notino', 34.8, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'sephora', 37.73, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'douglas', 37.1, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'druni', 38.86, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'perfumes-companhia', 35.27, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'elcorteingles', 37.7, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'worten', 40.39, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'continente', 37.42, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'auchan', 40.22, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'wook', 37.1, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'wells', 35.17, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmaciaonline', 33.99, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'pharma2you', 35.96, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmaciasholon', 38.07, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'brasty', 31.12, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'lookfantastic', 34.03, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'cultbeauty', 33.4, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'primor', 36.06, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'maquillalia', 34.18, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'atida', 34.33, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'fnac', 36.91, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmacia365', 36.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'loja-farmacia', 38.15, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'afarmaciaonline', 35.82, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'easyfarma', 38.44, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'bairro-saude', 34.92, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmacia-saude', 38.32, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmaciasdirect', 38.35, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'sa-da-bandeira', 35.33, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'sweetcare', 34.48, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'byfarma', 38.47, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2009710487680', 'farmaciapt', 38.5, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hyalu-b5-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'notino', 14.89, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'sephora', 14.77, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'douglas', 13.94, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'druni', 14.2, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'perfumes-companhia', 15.26, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'elcorteingles', 15.78, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'worten', 15.9, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'continente', 14.93, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'auchan', 16.08, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'wook', 16.31, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'wells', 14.95, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmaciaonline', 15.65, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'pharma2you', 15.46, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmaciasholon', 15.45, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'brasty', 14.98, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'lookfantastic', 12.97, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'cultbeauty', 14.04, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'primor', 15.86, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'maquillalia', 14.22, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'atida', 14.82, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'fnac', 16.32, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmacia365', 15.62, 16.8, 7.02, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'loja-farmacia', 15.14, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'afarmaciaonline', 15.28, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'easyfarma', 15.11, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'bairro-saude', 14.87, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmacia-saude', 13.98, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmaciasdirect', 15.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'sa-da-bandeira', 14.57, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'sweetcare', 15.14, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'byfarma', 14.93, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2007714380778', 'farmaciapt', 13.93, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/creme-hidratante-250-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'notino', 11.2, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'sephora', 10.45, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'douglas', 11.52, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'druni', 11.38, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'perfumes-companhia', 10.82, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'elcorteingles', 12.22, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'worten', 11.85, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'continente', 11.61, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'auchan', 11.34, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'wook', 11.6, 12.6, 7.94, 'EUR', TRUE, 'https://www.wook.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'wells', 11.81, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmaciaonline', 10.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'pharma2you', 11.47, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmaciasholon', 11.15, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'brasty', 11.13, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'lookfantastic', 11.33, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'cultbeauty', 10.31, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'primor', 11.34, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'maquillalia', 10.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'atida', 10.05, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'fnac', 12.21, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmacia365', 10.73, 12.6, 14.84, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'loja-farmacia', 10.89, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'afarmaciaonline', 11.16, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'easyfarma', 11.21, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'bairro-saude', 10.58, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmacia-saude', 10.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmaciasdirect', 11.88, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'sa-da-bandeira', 10.65, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'sweetcare', 11.59, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'byfarma', 10.65, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2005278535627', 'farmaciapt', 11.39, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/gel-de-limpeza-espumoso-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'notino', 13.22, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'sephora', 13.09, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'douglas', 13.29, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'druni', 12.02, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'perfumes-companhia', 12.58, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'elcorteingles', 14.08, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'worten', 14.54, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'continente', 13.72, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'auchan', 13.2, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'wook', 13.02, 14.7, 11.43, 'EUR', TRUE, 'https://www.wook.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'wells', 12.58, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmaciaonline', 13.5, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'pharma2you', 13.14, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmaciasholon', 13.56, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'brasty', 13.23, 14.7, 10, 'EUR', TRUE, 'https://www.brasty.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'lookfantastic', 12.23, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'cultbeauty', 13.73, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'primor', 12.63, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'maquillalia', 12.96, 14.7, 11.84, 'EUR', TRUE, 'https://www.maquillalia.com/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'atida', 11.86, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'fnac', 14.19, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmacia365', 13.62, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'loja-farmacia', 13.5, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'afarmaciaonline', 12.66, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'easyfarma', 13.48, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'bairro-saude', 12.47, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmacia-saude', 13.19, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmaciasdirect', 12.74, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'sa-da-bandeira', 12.44, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'sweetcare', 12.44, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'byfarma', 13.22, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2008445431968', 'farmaciapt', 13.25, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/locao-hidratante-sa-236-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'notino', 16.47, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'sephora', 15.44, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'douglas', 16.54, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'druni', 16.57, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'perfumes-companhia', 16.31, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'elcorteingles', 16.99, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'worten', 18.57, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'continente', 17.5, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'auchan', 17.22, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'wook', 18.28, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'wells', 16.42, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmaciaonline', 16.7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'pharma2you', 16.26, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmaciasholon', 15.9, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'brasty', 15.55, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'lookfantastic', 17.25, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'cultbeauty', 15.72, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'primor', 17.45, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'maquillalia', 14.4, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'atida', 14.81, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'fnac', 16.61, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmacia365', 16.34, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'loja-farmacia', 16.79, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'afarmaciaonline', 16.5, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'easyfarma', 17.53, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'bairro-saude', 16.15, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmacia-saude', 17.72, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmaciasdirect', 15.77, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'sa-da-bandeira', 17.32, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'sweetcare', 15.77, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'byfarma', 16.07, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2000885555990', 'farmaciapt', 17.39, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/am-facial-moisturizing-spf30-52-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'notino', 14.88, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'sephora', 14.07, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'douglas', 14.04, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'druni', 12.76, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'perfumes-companhia', 13.85, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'elcorteingles', 13.92, 15.75, 11.62, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'worten', 13.85, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'continente', 15.62, 15.75, 0.83, 'EUR', TRUE, 'https://www.continente.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'auchan', 14.15, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'wook', 15.18, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'wells', 13.46, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmaciaonline', 13.31, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'pharma2you', 13.68, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmaciasholon', 13.89, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'brasty', 11.91, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'lookfantastic', 13.01, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'cultbeauty', 13.72, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'primor', 14.4, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'maquillalia', 13.94, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'atida', 12.69, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'fnac', 13.9, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmacia365', 13.3, 15.75, 15.56, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'loja-farmacia', 13.53, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'afarmaciaonline', 14.37, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'easyfarma', 13.52, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'bairro-saude', 13.99, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmacia-saude', 14.02, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmaciasdirect', 13.99, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'sa-da-bandeira', 13.79, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'sweetcare', 13.9, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'byfarma', 13.5, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2001655213232', 'farmaciapt', 13.48, 15.75, 14.41, 'EUR', TRUE, 'https://farmacia.pt/produto/sensibio-h2o-agua-micelar-500-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'notino', 20.2, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'sephora', 20.84, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'douglas', 21.1, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'druni', 20.03, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'perfumes-companhia', 20.45, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'elcorteingles', 22.08, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'worten', 22.93, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'continente', 20.81, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'auchan', 20.87, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'wook', 21.49, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'wells', 20.26, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmaciaonline', 21.33, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'pharma2you', 20.2, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmaciasholon', 20.36, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'brasty', 17.37, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'lookfantastic', 20.41, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'cultbeauty', 18.67, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'primor', 20.9, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'maquillalia', 19.05, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'atida', 20.54, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'fnac', 21.1, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmacia365', 20.12, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'loja-farmacia', 19.35, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'afarmaciaonline', 19.58, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'easyfarma', 19.71, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'bairro-saude', 19.49, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmacia-saude', 21.55, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmaciasdirect', 20.61, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'sa-da-bandeira', 19.69, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'sweetcare', 21.17, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'byfarma', 20.34, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2008300120846', 'farmaciapt', 21.33, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydrabio-serum-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'notino', 18.09, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'sephora', 16.82, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'douglas', 17.61, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'druni', 17.99, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'perfumes-companhia', 18.91, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'elcorteingles', 18.51, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'worten', 19.43, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'continente', 18.03, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'auchan', 19.86, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'wook', 19.31, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'wells', 17.82, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmaciaonline', 16.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'pharma2you', 17.58, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmaciasholon', 16.64, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'brasty', 16.14, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'lookfantastic', 16.83, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'cultbeauty', 16.89, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'primor', 17.8, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'maquillalia', 17.39, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'atida', 16.46, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'fnac', 18.51, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmacia365', 18.23, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'loja-farmacia', 17.06, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'afarmaciaonline', 17, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'easyfarma', 17.36, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'bairro-saude', 17.34, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmacia-saude', 16.65, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmaciasdirect', 18.36, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'sa-da-bandeira', 17.36, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'sweetcare', 16.92, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'byfarma', 17.76, 19.95, 10.98, 'EUR', TRUE, 'https://byfarma.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2005007543459', 'farmaciapt', 17.43, 19.95, 12.63, 'EUR', TRUE, 'https://farmacia.pt/produto/photoderm-max-spf50-40-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'notino', 14.56, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'sephora', 14.94, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'douglas', 16.18, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'druni', 15.78, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'perfumes-companhia', 15.5, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'elcorteingles', 15.69, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'worten', 17.19, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'continente', 16.43, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'auchan', 17.08, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'wook', 17.09, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'wells', 14.79, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmaciaonline', 16.75, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'pharma2you', 16.58, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmaciasholon', 16.41, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'brasty', 15.42, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'lookfantastic', 14.19, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'cultbeauty', 13.82, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'primor', 15.57, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'maquillalia', 16.41, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'atida', 16.44, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'fnac', 16.65, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmacia365', 16.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'loja-farmacia', 15.42, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'afarmaciaonline', 15.62, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'easyfarma', 14.89, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'bairro-saude', 16.78, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmacia-saude', 16.46, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmaciasdirect', 16.08, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'sa-da-bandeira', 15.91, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'sweetcare', 15.94, 17.85, 10.7, 'EUR', TRUE, 'https://sweetcare.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'byfarma', 15.01, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2009804168389', 'farmaciapt', 15.65, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/atoderm-creme-500-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'notino', 10.69, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'sephora', 10.78, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'douglas', 11.52, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'druni', 11.98, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'perfumes-companhia', 10.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'elcorteingles', 12.28, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'worten', 12.54, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'continente', 12.58, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'auchan', 11.16, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'wook', 11.45, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'wells', 11.6, 12.6, 7.94, 'EUR', TRUE, 'https://www.wells.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmaciaonline', 11.67, 12.6, 7.38, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'pharma2you', 11.84, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmaciasholon', 11.28, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'brasty', 10.72, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'lookfantastic', 10.23, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'cultbeauty', 11.23, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'primor', 11.69, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'maquillalia', 11.19, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'atida', 11.39, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'fnac', 12.04, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmacia365', 10.94, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'loja-farmacia', 10.59, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'afarmaciaonline', 10.49, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'easyfarma', 11.07, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'bairro-saude', 11.28, 12.6, 10.48, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmacia-saude', 10.57, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmaciasdirect', 10.66, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'sa-da-bandeira', 11.88, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'sweetcare', 11.2, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'byfarma', 11.54, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2007240584589', 'farmaciapt', 11.7, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/eau-thermale-spray-300-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'notino', 16.33, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'sephora', 16.14, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'douglas', 14.77, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'druni', 16.82, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'perfumes-companhia', 16.92, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'elcorteingles', 16.5, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'worten', 16.93, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'continente', 17.14, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'auchan', 17.25, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'wook', 17.83, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'wells', 16.76, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmaciaonline', 15.19, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'pharma2you', 15.81, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmaciasholon', 15.62, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'brasty', 14.14, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'lookfantastic', 15.25, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'cultbeauty', 16.76, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'primor', 17.27, 17.85, 3.25, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'maquillalia', 14.46, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'atida', 14.93, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'fnac', 16.22, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmacia365', 16.13, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'loja-farmacia', 15.64, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'afarmaciaonline', 16.62, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'easyfarma', 15.72, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'bairro-saude', 16.46, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmacia-saude', 16.22, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmaciasdirect', 15.7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'sa-da-bandeira', 15.02, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'sweetcare', 15.28, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'byfarma', 14.98, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2000216158661', 'farmaciapt', 16.02, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/cleanance-comedomed-30-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'notino', 20.28, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'sephora', 21.8, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'douglas', 21.74, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'druni', 19.9, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'perfumes-companhia', 20.06, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'elcorteingles', 20.72, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'worten', 20.26, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'continente', 22.57, 23.1, 2.29, 'EUR', TRUE, 'https://www.continente.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'auchan', 22.2, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'wook', 22.92, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'wells', 20.57, 23.1, 10.95, 'EUR', TRUE, 'https://www.wells.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmaciaonline', 19.51, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'pharma2you', 19.2, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmaciasholon', 20.08, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'brasty', 19.64, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'lookfantastic', 19.52, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'cultbeauty', 17.74, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'primor', 22.12, 23.1, 4.24, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'maquillalia', 19.27, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'atida', 19.06, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'fnac', 20.93, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmacia365', 21.7, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'loja-farmacia', 20.38, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'afarmaciaonline', 20.33, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'easyfarma', 21.66, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'bairro-saude', 20.95, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmacia-saude', 21.1, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmaciasdirect', 21.39, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'sa-da-bandeira', 19.24, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'sweetcare', 18.35, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'byfarma', 20.69, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2006942309278', 'farmaciapt', 20.9, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydrance-aqua-creme-40-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'notino', 17.61, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'sephora', 17.2, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'douglas', 18.85, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'druni', 16.75, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'perfumes-companhia', 16.23, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'elcorteingles', 18.29, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'worten', 19.84, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'continente', 19.62, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'auchan', 17.53, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'wook', 18.41, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'wells', 16.78, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmaciaonline', 18.39, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'pharma2you', 17.17, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmaciasholon', 17.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'brasty', 17.45, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'lookfantastic', 18.23, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'cultbeauty', 17.8, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'primor', 17.12, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'maquillalia', 15.28, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'atida', 17.71, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'fnac', 18.69, 19.95, 6.32, 'EUR', TRUE, 'https://www.fnac.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmacia365', 17.96, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'loja-farmacia', 17.5, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'afarmaciaonline', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'easyfarma', 16.9, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'bairro-saude', 16.6, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmacia-saude', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmaciasdirect', 17.32, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'sa-da-bandeira', 18.68, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'sweetcare', 18.42, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'byfarma', 17.59, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2003071867471', 'farmaciapt', 16.79, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/solar-spf50-sem-perfume-50-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'notino', 27.24, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'sephora', 28.33, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'douglas', 31.22, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'druni', 30.69, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'perfumes-companhia', 29.09, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'elcorteingles', 31.14, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'worten', 31.92, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'continente', 29.82, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'auchan', 31.64, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'wook', 31.93, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'wells', 31.56, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmaciaonline', 30.91, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'pharma2you', 28.41, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmaciasholon', 31.37, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'brasty', 29.08, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'lookfantastic', 25.91, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'cultbeauty', 28.73, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'primor', 31.04, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'maquillalia', 27.45, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'atida', 27.56, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'fnac', 30.99, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmacia365', 31.36, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'loja-farmacia', 30.09, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'afarmaciaonline', 28.76, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'easyfarma', 28.28, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'bairro-saude', 31.27, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmacia-saude', 31.62, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmaciasdirect', 29.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'sa-da-bandeira', 30.14, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'sweetcare', 28.15, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'byfarma', 30.31, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000102501151', 'farmaciapt', 31.44, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hyaluron-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'notino', 17.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'sephora', 16.35, 18.9, 13.49, 'EUR', TRUE, 'https://www.sephora.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'douglas', 16.3, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'druni', 17.55, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'perfumes-companhia', 15.56, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'elcorteingles', 16.6, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'worten', 18.33, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'continente', 18.79, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'auchan', 18.71, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'wook', 16.97, 18.9, 10.21, 'EUR', TRUE, 'https://www.wook.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'wells', 15.95, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmaciaonline', 17.07, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'pharma2you', 17.23, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmaciasholon', 16.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'brasty', 16.89, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'lookfantastic', 14.85, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'cultbeauty', 16.15, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'primor', 17.08, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'maquillalia', 14.84, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'atida', 16.54, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2006454281192', 'fnac', 17.47, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmacia365', 17.01, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'loja-farmacia', 17.11, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'afarmaciaonline', 17.05, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'easyfarma', 15.68, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'bairro-saude', 15.69, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmacia-saude', 16.03, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmaciasdirect', 15.92, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'sa-da-bandeira', 17.16, 18.9, 9.21, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'sweetcare', 16.7, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'byfarma', 16.25, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006454281192', 'farmaciapt', 17.78, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/sun-sensitive-protect-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'notino', 13.83, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'sephora', 12.39, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'douglas', 12.92, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'druni', 12.34, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'perfumes-companhia', 12.34, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'elcorteingles', 13.03, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'worten', 14.23, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'continente', 13.25, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'auchan', 14.37, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'wook', 13.88, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'wells', 13.33, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmaciaonline', 13.3, 14.7, 9.52, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'pharma2you', 13.82, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmaciasholon', 13.33, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'brasty', 11.86, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'lookfantastic', 11.51, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'cultbeauty', 12.77, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'primor', 12.71, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'maquillalia', 13.1, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'atida', 11.63, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'fnac', 14.36, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmacia365', 13.55, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'loja-farmacia', 12.95, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'afarmaciaonline', 12.99, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'easyfarma', 12.52, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'bairro-saude', 13.3, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmacia-saude', 12.9, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmaciasdirect', 12.91, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'sa-da-bandeira', 12.47, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'sweetcare', 12.02, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'byfarma', 13.23, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2006953082672', 'farmaciapt', 12.7, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/aquaphor-soothing-skin-balm-198g', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'notino', 19.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'sephora', 21.53, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'douglas', 21.83, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'druni', 21.92, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'perfumes-companhia', 22.21, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'elcorteingles', 21.74, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'worten', 23.98, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'continente', 22.3, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'auchan', 23.28, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'wook', 23.94, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'wells', 21.81, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmaciaonline', 21.04, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'pharma2you', 21.49, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmaciasholon', 21.37, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'brasty', 18.75, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'lookfantastic', 18.82, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'cultbeauty', 21.44, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'primor', 22.79, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'maquillalia', 18.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'atida', 19.87, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'fnac', 23.8, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmacia365', 20.45, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'loja-farmacia', 21.14, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'afarmaciaonline', 21.71, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'easyfarma', 20.77, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'bairro-saude', 22.06, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmacia-saude', 21.3, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmaciasdirect', 20.59, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'sa-da-bandeira', 21.15, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'sweetcare', 20.17, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'byfarma', 20.67, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2003318723829', 'farmaciapt', 21.51, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/fotoprotector-fusion-water-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'notino', 42.91, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'sephora', 44.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'douglas', 46.36, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'druni', 46.15, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'perfumes-companhia', 48.55, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'elcorteingles', 48.54, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'worten', 48.31, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'continente', 46.75, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'auchan', 51.37, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'wook', 49.97, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'wells', 43.32, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmaciaonline', 47.93, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'pharma2you', 47.89, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmaciasholon', 45.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'brasty', 37.14, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'lookfantastic', 41.55, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'cultbeauty', 47.52, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'primor', 47.57, 51.45, 7.54, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'maquillalia', 40.93, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'atida', 44.51, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'fnac', 51.12, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmacia365', 44.44, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'loja-farmacia', 46.95, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'afarmaciaonline', 44.65, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'easyfarma', 45.21, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'bairro-saude', 48.23, 51.45, 6.26, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmacia-saude', 44.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmaciasdirect', 47.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'sa-da-bandeira', 44.26, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'sweetcare', 44.35, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'byfarma', 47.89, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2008200003027', 'farmaciapt', 43, 51.45, 16.42, 'EUR', TRUE, 'https://farmacia.pt/produto/isdinceutics-flavo-c-ultraglican-30-amp', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'notino', 27.12, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'sephora', 26.6, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'douglas', 24.71, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'druni', 27.54, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'perfumes-companhia', 24.43, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'elcorteingles', 25.89, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'worten', 28.08, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'continente', 28.47, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'auchan', 26.46, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'wook', 28.53, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'wells', 25.67, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmaciaonline', 26.17, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'pharma2you', 24.98, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmaciasholon', 26.41, 29.4, 10.17, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'brasty', 23.78, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'lookfantastic', 25.37, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'cultbeauty', 25.86, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'primor', 26.79, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'maquillalia', 26.05, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'atida', 24.58, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'fnac', 28.7, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmacia365', 25.86, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'loja-farmacia', 26.72, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'afarmaciaonline', 26.03, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'easyfarma', 26.64, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'bairro-saude', 27.02, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmacia-saude', 24.39, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmaciasdirect', 26.9, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'sa-da-bandeira', 26.75, 29.4, 9.01, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'sweetcare', 23.37, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'byfarma', 26.54, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2009386837116', 'farmaciapt', 26.38, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydration-plus-spf15-50-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'notino', 48.18, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'sephora', 47.03, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'douglas', 43.88, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'druni', 44.17, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'perfumes-companhia', 45.35, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'elcorteingles', 48.51, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'worten', 49.13, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'continente', 45.57, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'auchan', 48.75, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'wook', 49.32, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'wells', 45.63, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmaciaonline', 47.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'pharma2you', 44.32, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmaciasholon', 43.5, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'brasty', 42.37, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'lookfantastic', 44.9, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'cultbeauty', 42.53, 51.45, 17.34, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'primor', 45.36, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'maquillalia', 44.16, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'atida', 47, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'fnac', 50.46, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmacia365', 46.61, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'loja-farmacia', 46.18, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'afarmaciaonline', 47.92, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'easyfarma', 44.74, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'bairro-saude', 43.84, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmacia-saude', 48.22, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmaciasdirect', 45.79, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'sa-da-bandeira', 45.59, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'sweetcare', 44.54, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'byfarma', 44.27, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002667535503', 'farmaciapt', 43.14, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/vinoperfect-serum-luminosidade-30-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'notino', 68.08, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'sephora', 72.7, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'douglas', 67.29, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'druni', 70.86, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'perfumes-companhia', 74.13, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'elcorteingles', 73.88, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'worten', 73.38, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'continente', 82.66, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'auchan', 79.95, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'wook', 73.02, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'wells', 72.99, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmaciaonline', 69.41, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'pharma2you', 76.4, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmaciasholon', 75.57, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'brasty', 59.86, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'lookfantastic', 76.41, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'cultbeauty', 73.88, 82.95, 10.93, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'primor', 71.67, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'maquillalia', 69.66, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'atida', 73.53, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'fnac', 76.91, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmacia365', 73.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'loja-farmacia', 73.1, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'afarmaciaonline', 69.35, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'easyfarma', 71.72, 82.95, 13.54, 'EUR', TRUE, 'https://easyfarma.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'bairro-saude', 73.18, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmacia-saude', 76.47, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmaciasdirect', 75.4, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'sa-da-bandeira', 74.94, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'sweetcare', 69.72, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'byfarma', 73.86, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2002484860956', 'farmaciapt', 74.5, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/premier-cru-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'notino', 11.82, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'sephora', 11.92, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'douglas', 11.09, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'druni', 10.33, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'perfumes-companhia', 11.85, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'elcorteingles', 12.45, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'worten', 11.23, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'continente', 11.18, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'auchan', 11.33, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'wook', 11.33, 12.6, 10.08, 'EUR', TRUE, 'https://www.wook.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'wells', 11.76, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmaciaonline', 11.32, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'pharma2you', 11.03, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmaciasholon', 11.31, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'brasty', 10.92, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'lookfantastic', 10, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'cultbeauty', 11.3, 12.6, 10.32, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'primor', 11.89, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'maquillalia', 11.1, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'atida', 11.43, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'fnac', 11.67, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmacia365', 10.63, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'loja-farmacia', 11.25, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'afarmaciaonline', 11.68, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'easyfarma', 11.69, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'bairro-saude', 11.51, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmacia-saude', 11.57, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmaciasdirect', 11.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'sa-da-bandeira', 10.8, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'sweetcare', 10.54, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'byfarma', 11.07, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2004198617727', 'farmaciapt', 11.37, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/creme-mains-et-ongles-75-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'notino', 30.33, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'sephora', 31.49, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'douglas', 32.37, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'druni', 29.45, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'perfumes-companhia', 30.64, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'elcorteingles', 34.45, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'worten', 32.37, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'continente', 31.59, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'auchan', 31.68, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'wook', 32.86, 35.7, 7.96, 'EUR', TRUE, 'https://www.wook.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'wells', 29.88, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmaciaonline', 32.36, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'pharma2you', 30.48, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmaciasholon', 31.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'brasty', 28.45, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'lookfantastic', 29.47, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'cultbeauty', 29.16, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'primor', 33.17, 35.7, 7.09, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'maquillalia', 31.95, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'atida', 30.13, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'fnac', 34.21, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmacia365', 29.68, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'loja-farmacia', 30.83, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'afarmaciaonline', 30.7, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'easyfarma', 30.19, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'bairro-saude', 30.63, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmacia-saude', 31.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmaciasdirect', 32.41, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'sa-da-bandeira', 30.08, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'sweetcare', 32.61, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'byfarma', 30.66, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2002979924873', 'farmaciapt', 33.19, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/huile-prodigieuse-100-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'notino', 31.05, 33.6, 7.59, 'EUR', TRUE, 'https://www.notino.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'sephora', 28.15, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'douglas', 28.23, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'druni', 31.31, 33.6, 6.82, 'EUR', TRUE, 'https://www.druni.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'perfumes-companhia', 28.02, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'elcorteingles', 32.09, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'worten', 32.39, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'continente', 30.21, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'auchan', 30.04, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'wook', 33.57, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'wells', 30.88, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmaciaonline', 29.6, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'pharma2you', 31.13, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmaciasholon', 28.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'brasty', 28.7, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'lookfantastic', 26.6, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'cultbeauty', 31.03, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'primor', 29.34, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'maquillalia', 31.15, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'atida', 26.92, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'fnac', 32.81, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmacia365', 31.43, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'loja-farmacia', 29.3, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'afarmaciaonline', 28.84, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'easyfarma', 30.87, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'bairro-saude', 31.23, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmacia-saude', 29.23, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmaciasdirect', 30.25, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'sa-da-bandeira', 29.89, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'sweetcare', 26.74, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'byfarma', 29.37, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2007590996414', 'farmaciapt', 31.44, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/creme-fraiche-de-beaute-48h-50-ml', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'notino', 5.96, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'sephora', 5.91, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'douglas', 5.85, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'druni', 5.77, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'perfumes-companhia', 5.75, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'elcorteingles', 5.68, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'worten', 6.03, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'continente', 5.92, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'auchan', 5.81, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'wook', 5.64, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'wells', 5.48, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmaciaonline', 5.25, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'pharma2you', 5.81, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmaciasholon', 5.73, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'brasty', 4.84, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'lookfantastic', 5.62, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'cultbeauty', 5.27, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'primor', 5.72, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'maquillalia', 5.75, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'atida', 4.96, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'fnac', 5.94, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmacia365', 5.83, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'loja-farmacia', 5.48, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'afarmaciaonline', 5.63, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'easyfarma', 5.76, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'bairro-saude', 5.68, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmacia-saude', 5.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmaciasdirect', 5.48, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'sa-da-bandeira', 5.47, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'sweetcare', 4.96, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'byfarma', 5.44, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2005426955772', 'farmaciapt', 5.69, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/reve-de-miel-stick-labial-4g', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'notino', 76.08, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'sephora', 87.82, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'douglas', 78.85, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'druni', 84.64, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'perfumes-companhia', 84.14, 93.45, 9.96, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'elcorteingles', 89.87, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'worten', 92.9, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'continente', 84.29, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'auchan', 90.86, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'wook', 90.71, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'wells', 80.58, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmaciaonline', 84.08, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'pharma2you', 78.7, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmaciasholon', 83.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'brasty', 67.39, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'lookfantastic', 72.51, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'cultbeauty', 83.59, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'primor', 88.48, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'maquillalia', 75.13, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'atida', 85.08, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'fnac', 87.39, 93.45, 6.48, 'EUR', TRUE, 'https://www.fnac.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmacia365', 87.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'loja-farmacia', 86.36, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'afarmaciaonline', 78.52, 93.45, 15.98, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'easyfarma', 83.7, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'bairro-saude', 86.71, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmacia-saude', 87.24, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmaciasdirect', 83.68, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'sa-da-bandeira', 81.19, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'sweetcare', 81.53, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'byfarma', 79.07, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006355999394', 'farmaciapt', 77.86, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/ncef-reverse-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'notino', 56.88, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'sephora', 55.62, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'douglas', 56.63, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'druni', 58.46, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'perfumes-companhia', 63.49, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'elcorteingles', 65.71, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'worten', 59.82, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'continente', 64.23, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'auchan', 60.23, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'wook', 67.44, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'wells', 56.96, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmaciaonline', 57.2, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'pharma2you', 60.1, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmaciasholon', 60.72, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'brasty', 56.33, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'lookfantastic', 63.77, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'cultbeauty', 53.6, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'primor', 59.14, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'maquillalia', 58.97, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'atida', 54.53, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'fnac', 63.24, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmacia365', 63.55, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'loja-farmacia', 57.57, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'afarmaciaonline', 59.37, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'easyfarma', 61.87, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'bairro-saude', 60.84, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmacia-saude', 58.9, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmaciasdirect', 60.03, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'sa-da-bandeira', 63.76, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'sweetcare', 56.13, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'byfarma', 60.86, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006873801483', 'farmaciapt', 58.96, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/time-filler-5xp-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'notino', 26.41, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'sephora', 25.49, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'douglas', 25, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'druni', 28.46, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'perfumes-companhia', 27.23, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'elcorteingles', 29.43, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'worten', 26.76, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'continente', 29.24, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'auchan', 28.55, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'wook', 30.28, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'wells', 29.06, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmaciaonline', 27.97, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'pharma2you', 28.37, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmaciasholon', 28.26, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'brasty', 25.5, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'lookfantastic', 28.63, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'cultbeauty', 28.02, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'primor', 26.17, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'maquillalia', 27.42, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'atida', 26.84, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'fnac', 30.14, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmacia365', 26.72, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'loja-farmacia', 27.38, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'afarmaciaonline', 28.21, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'easyfarma', 28.54, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'bairro-saude', 29.31, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmacia-saude', 26.93, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmaciasdirect', 28.7, 30.45, 5.75, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'sa-da-bandeira', 26.93, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'sweetcare', 26.04, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'byfarma', 29.43, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2007132436965', 'farmaciapt', 29.26, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/regenerist-retinol24-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'notino', 16.82, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'sephora', 16.84, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'douglas', 17.59, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'druni', 17.8, 19.95, 10.78, 'EUR', TRUE, 'https://www.druni.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'perfumes-companhia', 17.27, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'elcorteingles', 18.05, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'worten', 19.12, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'continente', 18.71, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'auchan', 18.7, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'wook', 19.59, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'wells', 19.26, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmaciaonline', 18.8, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'pharma2you', 19.31, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmaciasholon', 18.07, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'brasty', 14.29, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'lookfantastic', 18.45, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'cultbeauty', 18.13, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'primor', 18.61, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'maquillalia', 16.35, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'atida', 17.4, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'fnac', 18.26, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmacia365', 17.44, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'loja-farmacia', 19.12, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'afarmaciaonline', 18.79, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'easyfarma', 18.08, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'bairro-saude', 17.8, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmacia-saude', 18.64, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmaciasdirect', 17.37, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'sa-da-bandeira', 19.33, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'sweetcare', 18.47, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'byfarma', 18.18, 19.95, 8.87, 'EUR', TRUE, 'https://byfarma.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004621779077', 'farmaciapt', 18.35, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/total-effects-7-in-1-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'notino', 12.83, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'sephora', 12.19, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'douglas', 12, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'druni', 13.74, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'perfumes-companhia', 12.03, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'elcorteingles', 14.03, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'worten', 13.88, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'continente', 13.55, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'auchan', 14.65, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'wook', 14.31, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'wells', 12.97, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmaciaonline', 14.18, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'pharma2you', 13.24, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmaciasholon', 12.69, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'brasty', 11.82, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'lookfantastic', 13.5, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'cultbeauty', 12.05, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'primor', 13.24, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'maquillalia', 13.52, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'atida', 13.8, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'fnac', 14.25, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmacia365', 13.95, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'loja-farmacia', 13.43, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'afarmaciaonline', 14.24, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'easyfarma', 12.64, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'bairro-saude', 12.64, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmacia-saude', 13.43, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmaciasdirect', 13.11, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'sa-da-bandeira', 12.7, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'sweetcare', 13.76, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'byfarma', 13.94, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004975359161', 'farmaciapt', 13.33, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydro-boost-gel-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'notino', 7.87, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'sephora', 8.35, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'douglas', 8.37, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'druni', 8.27, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'perfumes-companhia', 8.74, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'elcorteingles', 9.41, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'worten', 9.11, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'continente', 8.87, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2009106160326', 'auchan', 9.25, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'wook', 9.11, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'wells', 8.9, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmaciaonline', 8.61, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'pharma2you', 8.48, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmaciasholon', 8.6, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'brasty', 8.34, 9.45, 11.75, 'EUR', TRUE, 'https://www.brasty.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'lookfantastic', 8.7, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'cultbeauty', 7.54, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'primor', 8.12, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'maquillalia', 7.68, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'atida', 7.96, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'fnac', 8.4, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmacia365', 9, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'loja-farmacia', 8.3, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'afarmaciaonline', 9.18, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'easyfarma', 8.23, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'bairro-saude', 8.17, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmacia-saude', 8.88, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmaciasdirect', 8.44, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'sa-da-bandeira', 9.06, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'sweetcare', 7.75, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'byfarma', 8.33, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2009106160326', 'farmaciapt', 9.15, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/visibly-clear-limpeza-espumosa-200-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'notino', 21.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'sephora', 20.86, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'douglas', 21.14, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'druni', 20.56, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'perfumes-companhia', 21.91, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'elcorteingles', 24.83, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'worten', 22.93, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'continente', 23.77, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'auchan', 23.1, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'wook', 24.14, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'wells', 23.67, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmaciaonline', 22.01, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'pharma2you', 22.02, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmaciasholon', 22.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'brasty', 22.18, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'lookfantastic', 20.46, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'cultbeauty', 19.66, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'primor', 22.33, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'maquillalia', 21.27, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'atida', 23.51, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'fnac', 22.31, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmacia365', 23.47, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'loja-farmacia', 23.18, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'afarmaciaonline', 23.51, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'easyfarma', 23.89, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'bairro-saude', 21.68, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmacia-saude', 22.7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmaciasdirect', 22.99, 25.2, 8.77, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'sa-da-bandeira', 21.77, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'sweetcare', 22.65, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'byfarma', 22.73, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2006862643254', 'farmaciapt', 23.32, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/revitalift-filler-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'notino', 17.14, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'sephora', 16.8, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'douglas', 16.14, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'druni', 16.49, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'perfumes-companhia', 17.51, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'elcorteingles', 18.8, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'worten', 18.23, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'continente', 17.68, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'auchan', 18.13, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'wook', 16.58, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'wells', 17.22, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmaciaonline', 18.28, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'pharma2you', 17.48, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmaciasholon', 17.69, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'brasty', 14.03, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'lookfantastic', 17.83, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'cultbeauty', 14.62, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'primor', 16.79, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'maquillalia', 16.75, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'atida', 16.8, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'fnac', 18.63, 18.9, 1.43, 'EUR', TRUE, 'https://www.fnac.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmacia365', 16.48, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'loja-farmacia', 17.68, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'afarmaciaonline', 16.46, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'easyfarma', 16.22, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'bairro-saude', 16.47, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmacia-saude', 16.62, 18.9, 12.06, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmaciasdirect', 17.08, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'sa-da-bandeira', 17.07, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'sweetcare', 15.8, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'byfarma', 18.08, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2000397568723', 'farmaciapt', 16.54, 18.9, 12.49, 'EUR', TRUE, 'https://farmacia.pt/produto/hyaluron-expert-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'notino', 12.07, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'sephora', 11.43, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'douglas', 11.45, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'druni', 12.42, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'perfumes-companhia', 11.13, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'elcorteingles', 13.07, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'worten', 13.17, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'continente', 12.39, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'auchan', 13.51, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'wook', 12.48, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'wells', 12.34, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmaciaonline', 12.41, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'pharma2you', 12.24, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmaciasholon', 11.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'brasty', 11.63, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'lookfantastic', 12.47, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'cultbeauty', 11.83, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'primor', 11.51, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'maquillalia', 12.24, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'atida', 12.98, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'fnac', 13.04, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmacia365', 11.9, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'loja-farmacia', 12.72, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'afarmaciaonline', 13.17, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'easyfarma', 13.26, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'bairro-saude', 12.22, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmacia-saude', 12.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmaciasdirect', 11.7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'sa-da-bandeira', 12.48, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'sweetcare', 11.56, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'byfarma', 12.24, 13.65, 10.33, 'EUR', TRUE, 'https://byfarma.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2004919426430', 'farmaciapt', 12.83, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/infallible-24h-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'notino', 10.76, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'sephora', 9.7, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'douglas', 10.26, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'druni', 9.64, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'perfumes-companhia', 10.09, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'elcorteingles', 10.59, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'worten', 10.68, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'continente', 10.8, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'auchan', 10.45, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'wook', 10.66, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'wells', 10.97, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmaciaonline', 10.5, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'pharma2you', 10.78, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmaciasholon', 9.96, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'brasty', 9.62, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'lookfantastic', 9.54, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'cultbeauty', 10.65, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'primor', 9.92, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'maquillalia', 10.37, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'atida', 9.96, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'fnac', 10.96, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmacia365', 10.02, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'loja-farmacia', 11.09, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'afarmaciaonline', 11.16, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'easyfarma', 10.75, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'bairro-saude', 10.68, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmacia-saude', 10.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmaciasdirect', 11.1, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'sa-da-bandeira', 9.97, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'sweetcare', 10.45, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'byfarma', 10.5, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2000720043675', 'farmaciapt', 10.4, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/telescopic-mascara-8-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'notino', 8.03, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'sephora', 8.41, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'douglas', 7.84, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'druni', 7.92, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'perfumes-companhia', 8.47, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'elcorteingles', 8.36, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'worten', 9.44, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'continente', 9.35, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'auchan', 8.96, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'wook', 9.41, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'wells', 9.11, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmaciaonline', 8.94, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'pharma2you', 8.75, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmaciasholon', 9.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'brasty', 8.49, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'lookfantastic', 8.09, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'cultbeauty', 8.44, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'primor', 8.93, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'maquillalia', 8.91, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'atida', 8.78, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'fnac', 8.59, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmacia365', 8.44, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'loja-farmacia', 9.15, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'afarmaciaonline', 8.89, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'easyfarma', 8.67, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'bairro-saude', 8.29, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmacia-saude', 8.8, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmaciasdirect', 9.07, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'sa-da-bandeira', 8.67, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'sweetcare', 7.74, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'byfarma', 9, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2003666480627', 'farmaciapt', 8.49, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/elvive-oleo-extraordinario-100-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'notino', 11.47, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'sephora', 11.75, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'douglas', 11.53, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'druni', 11.33, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'perfumes-companhia', 10.41, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'elcorteingles', 11.95, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'worten', 11.66, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'continente', 12.09, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'auchan', 12.29, 12.6, 2.46, 'EUR', TRUE, 'https://www.auchan.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'wook', 12.02, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'wells', 11.42, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmaciaonline', 11.02, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'pharma2you', 11.22, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmaciasholon', 11.66, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'brasty', 10.29, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'lookfantastic', 10.94, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'cultbeauty', 10.25, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'primor', 11.6, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'maquillalia', 10.3, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'atida', 10.81, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'fnac', 11.46, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmacia365', 11.8, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'loja-farmacia', 11.26, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'afarmaciaonline', 11.18, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'easyfarma', 11.08, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'bairro-saude', 11.15, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmacia-saude', 12.03, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmaciasdirect', 11.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'sa-da-bandeira', 12.15, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'sweetcare', 11.94, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'byfarma', 10.99, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2005104214580', 'farmaciapt', 11.22, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/skinactive-vitamin-c-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'notino', 14.5, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'sephora', 14.54, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'douglas', 13.92, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'druni', 15.77, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'perfumes-companhia', 14.04, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'elcorteingles', 16.61, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'worten', 15.36, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'continente', 16.63, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'auchan', 15.69, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'wook', 16.78, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'wells', 15.03, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmaciaonline', 16.06, 16.8, 4.4, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'pharma2you', 14.44, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmaciasholon', 15.12, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'brasty', 12.12, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'lookfantastic', 14.52, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'cultbeauty', 13.4, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'primor', 14.6, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'maquillalia', 15.97, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'atida', 14.67, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'fnac', 15.9, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmacia365', 14.76, 16.8, 12.14, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'loja-farmacia', 14.9, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'afarmaciaonline', 15.55, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'easyfarma', 15.21, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'bairro-saude', 15.92, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmacia-saude', 14.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmaciasdirect', 16.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'sa-da-bandeira', 14.69, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'sweetcare', 13.9, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'byfarma', 15.28, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2008282165026', 'farmaciapt', 15.62, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/ambre-solaire-spf50-spray-200-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'notino', 4.74, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'sephora', 4.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'douglas', 4.7, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'druni', 4.86, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'perfumes-companhia', 4.93, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'elcorteingles', 4.8, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'worten', 4.73, 5.25, 9.9, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'continente', 4.99, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'auchan', 5, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'wook', 4.67, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'wells', 4.91, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmaciaonline', 4.98, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'pharma2you', 4.75, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmaciasholon', 4.64, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'brasty', 4.34, 5.25, 17.33, 'EUR', TRUE, 'https://www.brasty.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'lookfantastic', 4.48, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'cultbeauty', 4.63, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'primor', 4.62, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'maquillalia', 4.16, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'atida', 4.76, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'fnac', 5.06, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmacia365', 4.77, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'loja-farmacia', 5.06, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'afarmaciaonline', 4.8, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'easyfarma', 4.94, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'bairro-saude', 4.67, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmacia-saude', 4.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmaciasdirect', 4.94, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'sa-da-bandeira', 4.66, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'sweetcare', 4.74, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'byfarma', 4.72, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2003164585572', 'farmaciapt', 4.78, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/fructis-hair-food-banana-350-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'notino', 4.36, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'sephora', 4.35, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'douglas', 4.45, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'druni', 4.83, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'perfumes-companhia', 4.39, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'elcorteingles', 4.91, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'worten', 4.89, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'continente', 5.2, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'auchan', 5.23, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'wook', 4.98, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'wells', 4.78, 5.25, 8.95, 'EUR', TRUE, 'https://www.wells.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmaciaonline', 4.86, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'pharma2you', 4.55, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmaciasholon', 5.1, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'nivea', 5.22, NULL, NULL, 'EUR', TRUE, 'https://www.nivea.pt/produtos/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'brasty', 3.86, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'lookfantastic', 4.32, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'cultbeauty', 4.89, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'primor', 4.46, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'maquillalia', 4.82, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'atida', 4.88, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'fnac', 5.06, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmacia365', 5.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'loja-farmacia', 4.61, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'afarmaciaonline', 4.52, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'easyfarma', 4.7, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'bairro-saude', 4.66, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmacia-saude', 4.7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmaciasdirect', 4.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'sa-da-bandeira', 4.54, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'sweetcare', 4.36, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'byfarma', 4.6, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2008484479211', 'farmaciapt', 4.59, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/soft-creme-200-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'notino', 11.62, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'sephora', 10.76, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'douglas', 10.29, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'druni', 11.32, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'perfumes-companhia', 11.02, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'elcorteingles', 11.35, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'worten', 11.47, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'continente', 11.8, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'auchan', 11.41, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'wook', 11.53, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'wells', 12.18, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmaciaonline', 10.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'pharma2you', 10.89, 12.6, 13.57, 'EUR', TRUE, 'https://pharma2you.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmaciasholon', 12.03, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'nivea', 13.08, NULL, NULL, 'EUR', FALSE, 'https://www.nivea.pt/produtos/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'brasty', 9.54, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'lookfantastic', 11.7, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'cultbeauty', 10.2, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'primor', 11.93, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'maquillalia', 9.98, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'atida', 11.97, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'fnac', 11.9, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmacia365', 11.69, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'loja-farmacia', 11.73, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'afarmaciaonline', 10.82, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'easyfarma', 12.02, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'bairro-saude', 11.09, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmacia-saude', 11.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmaciasdirect', 12.1, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'sa-da-bandeira', 11.29, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'sweetcare', 10.32, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'byfarma', 10.85, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009140279848', 'farmaciapt', 12.08, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/q10-power-anti-rugas-50-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'notino', 11.07, 13.65, 18.9, 'EUR', TRUE, 'https://www.notino.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'sephora', 11.29, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'douglas', 11.36, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'druni', 11.14, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'perfumes-companhia', 11.63, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'elcorteingles', 12.21, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'worten', 13.32, 13.65, 2.42, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'continente', 13.42, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'auchan', 12.31, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'wook', 13.24, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'wells', 12.78, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmaciaonline', 13.07, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'pharma2you', 12.58, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmaciasholon', 12.26, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'nivea', 14.03, NULL, NULL, 'EUR', TRUE, 'https://www.nivea.pt/produtos/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'brasty', 12.06, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'lookfantastic', 12.22, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'cultbeauty', 11.8, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'primor', 11.72, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'maquillalia', 11.45, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'atida', 11.28, 13.65, 17.36, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'fnac', 12.36, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmacia365', 12.67, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'loja-farmacia', 11.9, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'afarmaciaonline', 12.37, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'easyfarma', 12.64, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'bairro-saude', 12.95, 13.65, 5.13, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmacia-saude', 12.24, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmaciasdirect', 13.19, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'sa-da-bandeira', 12.63, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'sweetcare', 12.55, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'byfarma', 11.72, NULL, NULL, 'EUR', FALSE, 'https://byfarma.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2009784241881', 'farmaciapt', 12.91, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/sun-protect-moisture-spf50-200-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'notino', 29.51, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'sephora', 31.13, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'douglas', 31.57, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'druni', 32.9, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'perfumes-companhia', 28.34, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'brasty', 30.71, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'lookfantastic', 29.67, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'cultbeauty', 31.99, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'primor', 32.8, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'maquillalia', 26.82, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'atida', 28.09, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2007097046407', 'fnac', 32.68, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/radiant-creamy-concealer-6-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'notino', 46.94, 51.45, 8.77, 'EUR', TRUE, 'https://www.notino.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'sephora', 43.35, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'douglas', 43.28, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'druni', 47.58, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'perfumes-companhia', 43.81, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'brasty', 37.2, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'lookfantastic', 45.28, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'cultbeauty', 44.37, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'primor', 47.76, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'maquillalia', 47.66, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'atida', 45.41, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2003319134716', 'fnac', 47.48, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/sheer-glow-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'notino', 34.19, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'sephora', 32.18, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'douglas', 33.91, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'druni', 33.44, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'perfumes-companhia', 33.45, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'brasty', 28.86, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'lookfantastic', 31.91, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'cultbeauty', 34.98, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'primor', 31.59, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'maquillalia', 34.43, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'atida', 32.49, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2007929321405', 'fnac', 34.43, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/blush-orgasm-4-8g', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'notino', 78.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'sephora', 80.89, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'douglas', 80.97, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'druni', 77.03, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'perfumes-companhia', 81.62, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'brasty', 73.4, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'lookfantastic', 82.76, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'cultbeauty', 77.31, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'primor', 90.43, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'maquillalia', 84.47, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'atida', 86.62, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2005636957320', 'fnac', 92.12, 93.45, 1.42, 'EUR', TRUE, 'https://www.fnac.pt/produto/magic-cream-hidratante-50-ml', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'notino', 30.01, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'sephora', 29.75, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'douglas', 29.75, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'druni', 28.84, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'perfumes-companhia', 30.05, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'brasty', 27.92, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'lookfantastic', 28.27, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'cultbeauty', 27.51, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'primor', 30.08, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'maquillalia', 31.61, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'atida', 28.42, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2003658976992', 'fnac', 31.8, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/pillow-talk-lipstick-3-5g', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'notino', 42.64, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'sephora', 42.35, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'douglas', 40.3, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'druni', 38.6, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'perfumes-companhia', 38.33, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'brasty', 40.8, 47.25, 13.65, 'EUR', TRUE, 'https://www.brasty.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'lookfantastic', 38.04, 47.25, 19.49, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'cultbeauty', 38.61, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'primor', 44.02, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'maquillalia', 40.5, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'atida', 41.1, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2005361248526', 'fnac', 41.57, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hollywood-flawless-filter-30-ml', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'notino', 19.77, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'sephora', 20, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'douglas', 19.31, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'druni', 19.47, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'perfumes-companhia', 21.25, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'mac', 22.14, NULL, NULL, 'EUR', FALSE, 'https://www.maccosmetics.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'brasty', 18.75, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'lookfantastic', 21, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'cultbeauty', 18.6, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'primor', 22.31, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'maquillalia', 18.84, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'atida', 20.55, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2008366718940', 'fnac', 22.6, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/ruby-woo-retro-matte-lipstick-3g', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'notino', 28.25, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'sephora', 31.26, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'douglas', 30.3, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'druni', 31.06, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'perfumes-companhia', 30.87, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'mac', 33.71, NULL, NULL, 'EUR', TRUE, 'https://www.maccosmetics.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'brasty', 29.51, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'lookfantastic', 29.7, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'cultbeauty', 30.7, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'primor', 31.74, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'maquillalia', 26.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'atida', 31.15, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2004137012408', 'fnac', 34.53, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/studio-fix-fluid-spf15-30-ml', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'notino', 28.85, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'sephora', 29.74, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'douglas', 30.49, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'druni', 31.72, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'perfumes-companhia', 28.19, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'mac', 34.13, NULL, NULL, 'EUR', TRUE, 'https://www.maccosmetics.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'brasty', 24.78, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'lookfantastic', 27.54, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'cultbeauty', 28.08, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'primor', 29.4, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'maquillalia', 30.22, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'atida', 28.29, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2006999714162', 'fnac', 30.3, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/mineralize-skinfinish-10g', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'notino', 9.98, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'sephora', 10.76, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'douglas', 9.41, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'druni', 9.9, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'perfumes-companhia', 9.59, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'elcorteingles', 11.38, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'worten', 11.24, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'continente', 11.24, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'auchan', 10.3, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'wook', 10.61, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2001371278034', 'wells', 10.12, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmaciaonline', 10.19, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'pharma2you', 10.73, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmaciasholon', 10.21, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'brasty', 9.8, 11.55, 15.15, 'EUR', TRUE, 'https://www.brasty.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'lookfantastic', 9.28, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'cultbeauty', 9.03, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'primor', 10.41, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'maquillalia', 10.3, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'atida', 10.05, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'fnac', 10.75, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmacia365', 10.06, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'loja-farmacia', 11.17, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'afarmaciaonline', 10.07, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'easyfarma', 11.18, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'bairro-saude', 10.6, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmacia-saude', 10.65, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmaciasdirect', 10.4, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'sa-da-bandeira', 11.12, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'sweetcare', 10.22, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'byfarma', 10.72, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001371278034', 'farmaciapt', 11.01, 11.55, 4.68, 'EUR', TRUE, 'https://farmacia.pt/produto/fit-me-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'notino', 10.42, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'sephora', 10.93, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'douglas', 10.64, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'druni', 10.53, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'perfumes-companhia', 10.47, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'elcorteingles', 12.46, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'worten', 12.29, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'continente', 11.53, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'auchan', 11.87, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'wook', 11.64, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'wells', 11.07, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmaciaonline', 11.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'pharma2you', 11.67, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmaciasholon', 11.97, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'brasty', 9.26, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'lookfantastic', 9.98, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'cultbeauty', 10.98, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'primor', 11.97, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'maquillalia', 11.2, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'atida', 10.6, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'fnac', 12.17, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmacia365', 11.44, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'loja-farmacia', 11.75, 12.6, 6.75, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'afarmaciaonline', 11.75, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'easyfarma', 10.95, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'bairro-saude', 11.65, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmacia-saude', 11.43, 12.6, 9.29, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmaciasdirect', 11.47, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'sa-da-bandeira', 11.68, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'sweetcare', 11.7, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'byfarma', 11.45, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2007144409261', 'farmaciapt', 11.58, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/sky-high-mascara-7-2-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'notino', 10.35, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'sephora', 10.43, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'douglas', 10.47, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'druni', 10.85, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'perfumes-companhia', 10.68, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'elcorteingles', 10.47, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'worten', 10.18, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'continente', 10.14, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'auchan', 11.54, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'wook', 10.4, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'wells', 10.64, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmaciaonline', 10.89, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'pharma2you', 11.22, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmaciasholon', 11.19, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'brasty', 10.07, 11.55, 12.81, 'EUR', TRUE, 'https://www.brasty.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'lookfantastic', 10.71, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'cultbeauty', 9.66, 11.55, 16.36, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'primor', 10.6, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'maquillalia', 9.5, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'atida', 10.35, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'fnac', 10.24, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmacia365', 10.32, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'loja-farmacia', 10.3, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'afarmaciaonline', 10.74, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'easyfarma', 11.03, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'bairro-saude', 11.05, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmacia-saude', 10.34, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmaciasdirect', 10.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'sa-da-bandeira', 11.05, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'sweetcare', 10.62, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'byfarma', 11.07, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2004693781725', 'farmaciapt', 10.11, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/lash-sensational-mascara-9-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'notino', 10.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'sephora', 10.3, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'douglas', 10.71, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'druni', 10.22, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'perfumes-companhia', 10.53, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'elcorteingles', 11.51, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'worten', 10.69, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'continente', 10.65, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'auchan', 11.3, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'wook', 10.96, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'wells', 10.83, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmaciaonline', 10.55, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'pharma2you', 10.26, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmaciasholon', 10.78, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'brasty', 8.26, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'lookfantastic', 10.82, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'cultbeauty', 10.79, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'primor', 10.8, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'maquillalia', 8.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'atida', 10.07, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'fnac', 11.37, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmacia365', 10.99, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'loja-farmacia', 10.95, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'afarmaciaonline', 10.23, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'easyfarma', 10.28, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'bairro-saude', 10.91, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmacia-saude', 10.53, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmaciasdirect', 10.87, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'sa-da-bandeira', 11.03, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'sweetcare', 9.5, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'byfarma', 11.17, 11.55, 3.29, 'EUR', TRUE, 'https://byfarma.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2003947829442', 'farmaciapt', 10.96, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/superstay-matte-ink-lipstick-5-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'notino', 5.98, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'sephora', 5.22, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'douglas', 5.88, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'druni', 5.91, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'perfumes-companhia', 5.18, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'elcorteingles', 6.18, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'worten', 6.18, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'continente', 5.95, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'auchan', 5.87, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'wook', 6.21, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'wells', 5.82, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmaciaonline', 6.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'pharma2you', 5.86, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmaciasholon', 5.53, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'brasty', 4.9, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'lookfantastic', 5.93, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'cultbeauty', 5.51, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'primor', 5.89, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'maquillalia', 6, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'atida', 5.29, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'fnac', 6.29, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmacia365', 6.08, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'loja-farmacia', 5.49, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'afarmaciaonline', 5.96, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'easyfarma', 5.4, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'bairro-saude', 5.85, 6.3, 7.14, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmacia-saude', 5.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmaciasdirect', 5.66, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'sa-da-bandeira', 6.09, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'sweetcare', 5.88, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'byfarma', 5.84, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2007743769612', 'farmaciapt', 6.02, 6.3, 4.44, 'EUR', TRUE, 'https://farmacia.pt/produto/butter-gloss-lip-gloss-8-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'notino', 8.68, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'sephora', 7.95, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'douglas', 8.13, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'druni', 8.9, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'perfumes-companhia', 7.75, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'elcorteingles', 8.39, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'worten', 8.98, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'continente', 8.62, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'auchan', 8.49, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'wook', 8.88, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'wells', 9.16, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmaciaonline', 9.1, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'pharma2you', 8.34, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmaciasholon', 8.25, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'brasty', 7.47, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'lookfantastic', 8.44, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'cultbeauty', 7.43, 9.45, 21.38, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'primor', 8.86, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'maquillalia', 7.57, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'atida', 8.01, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'fnac', 8.85, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmacia365', 8.15, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'loja-farmacia', 8.79, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'afarmaciaonline', 8.87, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'easyfarma', 8.18, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'bairro-saude', 8.92, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmacia-saude', 8.28, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmaciasdirect', 8.49, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'sa-da-bandeira', 8.94, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'sweetcare', 8.04, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'byfarma', 8.37, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2001960757940', 'farmaciapt', 9.13, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/bare-with-me-concealer-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'notino', 7.87, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'sephora', 8.56, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'douglas', 7.65, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'druni', 8.83, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'perfumes-companhia', 8.56, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'elcorteingles', 8.59, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'worten', 9.43, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'continente', 8.54, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'auchan', 8.68, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'wook', 8.57, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'wells', 8.62, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmaciaonline', 8.66, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'pharma2you', 8.13, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmaciasholon', 8.12, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'brasty', 7.93, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'lookfantastic', 8.64, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'cultbeauty', 7.58, 9.45, 19.79, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'primor', 8.45, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'maquillalia', 7.42, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'atida', 7.8, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'fnac', 8.34, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmacia365', 8.35, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'loja-farmacia', 8.85, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'afarmaciaonline', 8.65, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'easyfarma', 8.98, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'bairro-saude', 8.15, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmacia-saude', 8.69, 9.45, 8.04, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmaciasdirect', 9.17, 9.45, 2.96, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'sa-da-bandeira', 8.35, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'sweetcare', 8.29, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'byfarma', 8.98, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2002913244227', 'farmaciapt', 9.12, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/setting-spray-matte-60-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'notino', 7.98, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'sephora', 7.93, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'douglas', 8.32, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'druni', 8.43, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'perfumes-companhia', 7.75, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'kiko', 8.28, NULL, NULL, 'EUR', FALSE, 'https://www.kikocosmetics.com/pt-pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'elcorteingles', 8.51, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'worten', 8.87, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'continente', 8.33, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'auchan', 9.3, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'wook', 8.42, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'wells', 8.2, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmaciaonline', 8.13, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'pharma2you', 8.22, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmaciasholon', 9.18, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'brasty', 6.89, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'lookfantastic', 7.85, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'cultbeauty', 7.96, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'primor', 9.03, 9.45, 4.44, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'maquillalia', 7.95, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'atida', 8.7, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'fnac', 8.29, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmacia365', 8.58, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'loja-farmacia', 8.82, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'afarmaciaonline', 8.96, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'easyfarma', 8.93, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'bairro-saude', 8.94, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmacia-saude', 8.86, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmaciasdirect', 8.55, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'sa-da-bandeira', 8.46, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'sweetcare', 7.85, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'byfarma', 9.15, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2003040901830', 'farmaciapt', 8.32, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/3d-hydra-lipgloss-6-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'notino', 6.21, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'sephora', 6.24, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'douglas', 6.86, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'druni', 6.35, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'perfumes-companhia', 6.56, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'kiko', 6.94, NULL, NULL, 'EUR', TRUE, 'https://www.kikocosmetics.com/pt-pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'elcorteingles', 6.99, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'worten', 7.26, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'continente', 6.52, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'auchan', 6.88, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'wook', 7.1, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'wells', 6.61, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmaciaonline', 6.47, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'pharma2you', 6.81, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmaciasholon', 6.54, 7.35, 11.02, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'brasty', 5.61, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'lookfantastic', 5.71, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'cultbeauty', 6.31, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'primor', 6.38, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'maquillalia', 5.69, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'atida', 6.64, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'fnac', 6.8, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmacia365', 6.62, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'loja-farmacia', 6.55, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'afarmaciaonline', 6.98, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'easyfarma', 7.03, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'bairro-saude', 6.36, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmacia-saude', 6.78, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmaciasdirect', 7, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'sa-da-bandeira', 6.42, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'sweetcare', 6.68, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'byfarma', 6.31, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2000738787837', 'farmaciapt', 6.38, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/smart-fusion-concealer-5-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'notino', 12.52, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'sephora', 11.23, 13.65, 17.73, 'EUR', TRUE, 'https://www.sephora.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'douglas', 12.55, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'druni', 12.16, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'perfumes-companhia', 11.88, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'kiko', 12.51, NULL, NULL, 'EUR', TRUE, 'https://www.kikocosmetics.com/pt-pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'elcorteingles', 13.05, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'worten', 12.62, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'continente', 12.88, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'auchan', 12.34, 13.65, 9.6, 'EUR', TRUE, 'https://www.auchan.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'wook', 12.03, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'wells', 13.03, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmaciaonline', 12.94, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'pharma2you', 12.33, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmaciasholon', 12.87, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'brasty', 10.36, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'lookfantastic', 10.98, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'cultbeauty', 12.89, 13.65, 5.57, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'primor', 13.19, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'maquillalia', 12.15, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'atida', 12.36, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'fnac', 12.89, 13.65, 5.57, 'EUR', TRUE, 'https://www.fnac.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmacia365', 13.04, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'loja-farmacia', 12.13, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'afarmaciaonline', 12.56, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'easyfarma', 12.2, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'bairro-saude', 12.18, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmacia-saude', 12.1, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmaciasdirect', 12.95, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'sa-da-bandeira', 12.53, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'sweetcare', 12.2, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'byfarma', 12.08, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2001771644262', 'farmaciapt', 12.7, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/ultratech-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'notino', 5.35, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'sephora', 5.75, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'douglas', 5.48, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'druni', 5.23, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'perfumes-companhia', 5.43, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'elcorteingles', 6.26, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'worten', 6.21, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'continente', 5.83, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'auchan', 6.27, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'wook', 5.89, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'wells', 5.8, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmaciaonline', 5.78, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'pharma2you', 5.45, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmaciasholon', 6.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'brasty', 5.26, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'lookfantastic', 5.15, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'cultbeauty', 5.73, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'primor', 5.76, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'maquillalia', 5.31, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'atida', 5.6, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'fnac', 6.21, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmacia365', 5.94, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'loja-farmacia', 5.58, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'afarmaciaonline', 5.66, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'easyfarma', 5.81, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'bairro-saude', 5.43, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmacia-saude', 5.93, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmaciasdirect', 6.02, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'sa-da-bandeira', 5.79, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'sweetcare', 5.2, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'byfarma', 5.77, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005710971525', 'farmaciapt', 5.86, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/powder-foundation-9g', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'notino', 5.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'sephora', 5.45, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'douglas', 5.43, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'druni', 5.71, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'perfumes-companhia', 5.37, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'elcorteingles', 5.79, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'worten', 6.08, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'continente', 6.19, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'auchan', 5.67, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'wook', 6.25, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'wells', 5.88, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmaciaonline', 6.04, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'pharma2you', 5.76, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmaciasholon', 6.07, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'brasty', 4.83, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'lookfantastic', 5.29, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'cultbeauty', 5.7, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'primor', 6.08, 6.3, 3.49, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'maquillalia', 5.95, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'atida', 5.7, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'fnac', 5.85, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmacia365', 5.84, 6.3, 7.3, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'loja-farmacia', 5.68, 6.3, 9.84, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'afarmaciaonline', 6, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'easyfarma', 6.04, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'bairro-saude', 5.41, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmacia-saude', 5.78, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmaciasdirect', 5.75, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'sa-da-bandeira', 5.96, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'sweetcare', 5.23, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'byfarma', 5.7, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2005988680822', 'farmaciapt', 5.6, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hd-liquid-coverage-foundation-30-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'notino', 34.81, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'sephora', 33.26, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'douglas', 37.59, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'druni', 37.41, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'perfumes-companhia', 37.79, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'brasty', 30.57, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'lookfantastic', 33.63, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'cultbeauty', 34.13, 39.9, 14.46, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'primor', 33.55, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'maquillalia', 32.89, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'atida', 33.13, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2008004370677', 'fnac', 36.12, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/elixir-ultime-oleo-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'notino', 25.09, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'sephora', 25.76, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'douglas', 26.42, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'druni', 23.98, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'perfumes-companhia', 23.4, 28.35, 17.46, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'brasty', 24.28, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'lookfantastic', 26.54, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'cultbeauty', 24.16, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'primor', 25.95, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'maquillalia', 22.83, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'atida', 24.66, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2005123966651', 'fnac', 28.15, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/nutritive-bain-satin-250-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'notino', 22.83, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'sephora', 22.9, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'douglas', 24.26, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'druni', 24.43, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'perfumes-companhia', 22.69, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'brasty', 19.9, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'lookfantastic', 24.4, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'cultbeauty', 20.81, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'primor', 22.44, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'maquillalia', 24.29, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'atida', 22.31, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000005503757', 'fnac', 23.61, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/resistance-ciment-anti-usure-200-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'notino', 17.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'sephora', 16.83, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'douglas', 16.64, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'druni', 18.46, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'perfumes-companhia', 16.63, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'brasty', 16.98, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'lookfantastic', 18.25, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'cultbeauty', 16.64, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'primor', 17.97, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'maquillalia', 16.58, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'atida', 17.66, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2000948683912', 'fnac', 18.49, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/all-soft-shampoo-300-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'notino', 18.58, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'sephora', 20.52, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'douglas', 20.25, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'druni', 20.48, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'perfumes-companhia', 18.44, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'brasty', 17.16, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'lookfantastic', 20.57, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'cultbeauty', 18.18, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'primor', 20.67, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'maquillalia', 19.03, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'atida', 20, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003876855727', 'fnac', 19.71, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/extreme-conditioner-250-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'notino', 25.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'sephora', 25.28, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'douglas', 27.98, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'druni', 26, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'perfumes-companhia', 27.02, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'brasty', 25.65, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'lookfantastic', 24.56, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'cultbeauty', 24.06, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'primor', 27.39, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'maquillalia', 25.65, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'atida', 26.41, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2007183304244', 'fnac', 27.19, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/no-3-hair-perfector-100-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'notino', 27.67, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'sephora', 25.15, 30.45, 17.41, 'EUR', TRUE, 'https://www.sephora.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'douglas', 27.65, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'druni', 28.81, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'perfumes-companhia', 28.81, 30.45, 5.39, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'brasty', 24.15, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'lookfantastic', 24.35, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'cultbeauty', 27.99, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'primor', 25.57, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'maquillalia', 27.88, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'atida', 26.77, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2001222826742', 'fnac', 30.08, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/no-7-bonding-oil-30-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'notino', 27.44, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'sephora', 24.45, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'douglas', 27.42, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'druni', 26.12, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'perfumes-companhia', 27.32, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'brasty', 23.36, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'lookfantastic', 24.12, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'cultbeauty', 26.83, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'primor', 28.05, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'maquillalia', 24.14, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'atida', 27.08, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2004849016558', 'fnac', 27.61, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/no-4-bond-maintenance-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'notino', 33.41, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'sephora', 34.9, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'douglas', 35.24, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'druni', 36.16, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'perfumes-companhia', 33.47, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'brasty', 35.31, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'lookfantastic', 38.6, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'cultbeauty', 35.87, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'primor', 35.05, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'maquillalia', 34.91, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'atida', 38.35, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2000211734983', 'fnac', 38.67, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/treatment-original-100-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'notino', 21.28, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'sephora', 22.48, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'douglas', 21.6, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'druni', 23.01, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'perfumes-companhia', 22.04, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'brasty', 18.45, 25.2, 26.79, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'lookfantastic', 22.53, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'cultbeauty', 23.22, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'primor', 23.6, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'maquillalia', 22.72, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'atida', 22.33, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2007922336086', 'fnac', 23.29, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydrating-shampoo-250-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'notino', 15.49, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'sephora', 14.06, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'douglas', 14.75, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2005177739645', 'druni', 14.19, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'perfumes-companhia', 15.87, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'elcorteingles', 14.77, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'worten', 16.71, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'continente', 15.96, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'auchan', 15.43, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'wook', 15.94, NULL, NULL, 'EUR', FALSE, 'https://www.wook.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'wells', 15.52, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmaciaonline', 15.91, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'pharma2you', 16.2, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmaciasholon', 14.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'brasty', 13.03, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'lookfantastic', 13.63, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'cultbeauty', 14.24, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'primor', 15.99, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'maquillalia', 15.68, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'atida', 15.09, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'fnac', 15.78, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmacia365', 14.62, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'loja-farmacia', 15.61, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'afarmaciaonline', 14.8, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'easyfarma', 15.07, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'bairro-saude', 16.06, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmacia-saude', 14.98, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmaciasdirect', 15.19, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'sa-da-bandeira', 14.71, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'sweetcare', 14.29, 16.8, 14.94, 'EUR', TRUE, 'https://sweetcare.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'byfarma', 15.34, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2005177739645', 'farmaciapt', 14.7, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/bc-bonacure-q10-time-restore-200-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'notino', 4.44, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'sephora', 4.78, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'douglas', 4.65, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'druni', 4.68, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'perfumes-companhia', 4.48, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'elcorteingles', 4.66, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'worten', 4.76, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'continente', 4.87, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'auchan', 4.88, 5.25, 7.05, 'EUR', TRUE, 'https://www.auchan.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'wook', 4.81, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'wells', 5.09, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmaciaonline', 5.09, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'pharma2you', 4.59, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmaciasholon', 4.99, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'brasty', 4.39, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'lookfantastic', 4.61, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'cultbeauty', 4.73, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'primor', 4.89, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'maquillalia', 4.85, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'atida', 4.96, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'fnac', 5.03, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmacia365', 4.54, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'loja-farmacia', 5.04, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'afarmaciaonline', 5.08, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'easyfarma', 4.96, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'bairro-saude', 4.52, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmacia-saude', 4.54, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmaciasdirect', 5.01, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'sa-da-bandeira', 4.51, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'sweetcare', 4.77, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'byfarma', 4.83, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2008569812261', 'farmaciapt', 4.85, 5.25, 7.62, 'EUR', TRUE, 'https://farmacia.pt/produto/pro-v-repair-protect-shampoo-400-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'notino', 18.86, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'sephora', 21.35, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'douglas', 20.18, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'druni', 20.04, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'perfumes-companhia', 20.33, 23.1, 11.99, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'elcorteingles', 21.9, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'worten', 22.75, NULL, NULL, 'EUR', FALSE, 'https://www.worten.pt/beleza-saude/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'continente', 22.87, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'auchan', 22.39, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'wook', 20.46, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'wells', 21.57, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmaciaonline', 21.18, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'pharma2you', 22.35, 23.1, 3.25, 'EUR', TRUE, 'https://pharma2you.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmaciasholon', 21.83, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasholon.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'rituals', 22.84, NULL, NULL, 'EUR', TRUE, 'https://www.rituals.com/pt-pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'brasty', 17.73, 23.1, 23.25, 'EUR', TRUE, 'https://www.brasty.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'lookfantastic', 21.7, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'cultbeauty', 20.76, 23.1, 10.13, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'primor', 20.76, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'maquillalia', 20.21, NULL, NULL, 'EUR', FALSE, 'https://www.maquillalia.com/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'atida', 19.1, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'fnac', 21.46, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmacia365', 22.12, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'loja-farmacia', 20.47, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'afarmaciaonline', 20.75, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'easyfarma', 22.07, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'bairro-saude', 19.91, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmacia-saude', 21.91, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmaciasdirect', 20.85, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'sa-da-bandeira', 22.18, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'sweetcare', 20.73, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'byfarma', 21.26, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2003252438247', 'farmaciapt', 19.9, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/the-ritual-of-sakura-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'notino', 10.97, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'sephora', 9.93, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'douglas', 10.13, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'druni', 10.89, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'perfumes-companhia', 10.27, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'elcorteingles', 11.1, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'worten', 10.57, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'continente', 11.52, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'auchan', 10.24, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'wook', 10.37, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'wells', 11, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmaciaonline', 10.65, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'pharma2you', 9.96, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmaciasholon', 10.74, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'rituals', 11.78, NULL, NULL, 'EUR', FALSE, 'https://www.rituals.com/pt-pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'brasty', 9.06, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'lookfantastic', 9.35, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'cultbeauty', 9.17, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'primor', 11.12, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'maquillalia', 8.85, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'atida', 9.66, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'fnac', 10.95, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmacia365', 10.68, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'loja-farmacia', 10.84, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'afarmaciaonline', 10.08, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'easyfarma', 10.76, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'bairro-saude', 10.57, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmacia-saude', 10.6, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmaciasdirect', 10.45, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'sa-da-bandeira', 10.98, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'sweetcare', 10.16, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'byfarma', 10.74, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2005441047421', 'farmaciapt', 11.22, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/the-ritual-of-karma-shower-foam-200-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'notino', 21.44, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'sephora', 21.71, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'douglas', 19.85, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'druni', 20.26, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'perfumes-companhia', 21.01, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'elcorteingles', 20.55, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'worten', 20.35, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'continente', 21.07, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'auchan', 21.55, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'wook', 22.18, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'wells', 20.84, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmaciaonline', 20.51, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'pharma2you', 20.39, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmaciasholon', 20, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'rituals', 22.21, NULL, NULL, 'EUR', TRUE, 'https://www.rituals.com/pt-pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'brasty', 16.87, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'lookfantastic', 19.76, 23.1, 14.46, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'cultbeauty', 21.83, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'primor', 20.1, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'maquillalia', 17.79, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'atida', 19.61, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'fnac', 21.4, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmacia365', 20.77, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'loja-farmacia', 22.38, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'afarmaciaonline', 21.85, 23.1, 5.41, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'easyfarma', 21.69, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'bairro-saude', 21, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmacia-saude', 21.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmaciasdirect', 20.74, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasdirect.eu/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'sa-da-bandeira', 20.47, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'sweetcare', 21.66, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'byfarma', 21.77, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2009261445320', 'farmaciapt', 21.62, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/mehr-body-cream-220-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'notino', 17.84, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'sephora', 18.35, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'douglas', 18.02, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'druni', 16.8, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'perfumes-companhia', 16.86, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'elcorteingles', 19.69, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'worten', 19.83, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'continente', 18.4, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'auchan', 18.36, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'wook', 18.56, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'wells', 18.34, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmaciaonline', 18.63, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'pharma2you', 17.54, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmaciasholon', 18.47, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'brasty', 15.13, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'lookfantastic', 17.08, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'cultbeauty', 15.55, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'primor', 18.39, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'maquillalia', 15.39, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'atida', 18.79, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'fnac', 18.3, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmacia365', 18.79, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'loja-farmacia', 18.32, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'afarmaciaonline', 17.91, 19.95, 10.23, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'easyfarma', 18.3, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'bairro-saude', 18.56, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmacia-saude', 18.63, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmaciasdirect', 19.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'sa-da-bandeira', 17.6, 19.95, 11.78, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'sweetcare', 17.37, NULL, NULL, 'EUR', FALSE, 'https://sweetcare.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'byfarma', 18.2, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2007080727788', 'farmaciapt', 17.68, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/vitamin-e-moisture-cream-50-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'notino', 15.62, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'sephora', 15.21, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'douglas', 14.79, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'druni', 13.87, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'perfumes-companhia', 15.51, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'elcorteingles', 15.53, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'worten', 16.63, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'continente', 16.36, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'auchan', 16.52, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'wook', 15.66, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'wells', 15.79, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmaciaonline', 14.67, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'pharma2you', 15.04, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmaciasholon', 15.63, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'brasty', 15.15, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'lookfantastic', 13.31, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'cultbeauty', 15, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'primor', 15.16, 16.8, 9.76, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'maquillalia', 15.17, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'atida', 14.68, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'fnac', 15.77, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmacia365', 15.92, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'loja-farmacia', 14.51, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'afarmaciaonline', 14.55, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'easyfarma', 16.17, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'bairro-saude', 15.45, 16.8, 8.04, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmacia-saude', 14.52, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciasaude.com.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmaciasdirect', 15.76, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'sa-da-bandeira', 14.68, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'sweetcare', 15.79, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'byfarma', 15.54, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2001052604855', 'farmaciapt', 15.47, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/british-rose-body-yogurt-200-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'notino', 24.92, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'sephora', 26.86, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'douglas', 25.38, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'druni', 27.68, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'perfumes-companhia', 24.43, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'elcorteingles', 25.96, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'worten', 28.53, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'continente', 25.78, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'auchan', 28.26, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'wook', 29.32, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'wells', 27.13, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmaciaonline', 28.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'pharma2you', 27.82, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmaciasholon', 28.05, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'loccitane', 28.76, NULL, NULL, 'EUR', TRUE, 'https://pt.loccitane.com/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'brasty', 21.96, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'lookfantastic', 27, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'cultbeauty', 23.34, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'primor', 27.29, 29.4, 7.18, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'maquillalia', 26.71, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'atida', 25.89, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'fnac', 28.79, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmacia365', 27.92, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'loja-farmacia', 25.89, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'afarmaciaonline', 26.47, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'easyfarma', 25.33, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'bairro-saude', 27.48, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmacia-saude', 27.47, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmaciasdirect', 27.59, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'sa-da-bandeira', 26.71, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'sweetcare', 26.25, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'byfarma', 27.74, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002070914452', 'farmaciapt', 28.32, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/shea-butter-hand-cream-150-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'notino', 22.85, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'sephora', 21.36, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'douglas', 23.27, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'druni', 21.84, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'perfumes-companhia', 21.07, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'elcorteingles', 23.59, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'worten', 23.2, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'continente', 24.25, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'auchan', 22.12, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'wook', 22.56, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'wells', 23.98, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmaciaonline', 24.3, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'pharma2you', 23.34, 25.2, 7.38, 'EUR', TRUE, 'https://pharma2you.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmaciasholon', 24.18, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'loccitane', 24.37, NULL, NULL, 'EUR', TRUE, 'https://pt.loccitane.com/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'brasty', 20.11, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'lookfantastic', 21.6, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'cultbeauty', 19.65, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'primor', 23.3, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'maquillalia', 19.87, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'atida', 20.41, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'fnac', 23.38, 25.2, 7.22, 'EUR', TRUE, 'https://www.fnac.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmacia365', 21.8, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'loja-farmacia', 23.75, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'afarmaciaonline', 23.18, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'easyfarma', 22.64, NULL, NULL, 'EUR', FALSE, 'https://easyfarma.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'bairro-saude', 22.74, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmacia-saude', 23.69, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmaciasdirect', 22.98, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'sa-da-bandeira', 23.41, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'sweetcare', 23.25, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'byfarma', 22.07, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2002909036485', 'farmaciapt', 21.87, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/amande-shower-oil-250-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'notino', 18.28, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'sephora', 16.87, NULL, NULL, 'EUR', FALSE, 'https://www.sephora.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'douglas', 16.18, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'druni', 18.44, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'perfumes-companhia', 17.69, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'elcorteingles', 18.55, 19.95, 7.02, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'worten', 18.19, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'continente', 17.65, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'auchan', 17.82, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'wook', 19.87, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'wells', 17.87, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmaciaonline', 17.13, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'pharma2you', 17.89, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmaciasholon', 17.96, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'brasty', 16.65, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'lookfantastic', 15.44, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'cultbeauty', 18.97, 19.95, 4.91, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'primor', 18.41, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'maquillalia', 18.62, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'atida', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'fnac', 19.68, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmacia365', 18.06, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'loja-farmacia', 17.61, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'afarmaciaonline', 17.73, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'easyfarma', 19.32, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'bairro-saude', 18.69, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmacia-saude', 19.36, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmaciasdirect', 17.25, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'sa-da-bandeira', 18.59, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'sweetcare', 17.45, 19.95, 12.53, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'byfarma', 19.32, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2003672522229', 'farmaciapt', 19.13, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydra-vegetal-creme-50-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'notino', 14.88, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'sephora', 14.94, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'douglas', 14.97, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'druni', 12.76, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'perfumes-companhia', 13.57, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'elcorteingles', 14.67, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'worten', 13.81, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'continente', 14.42, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'auchan', 15.43, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'wook', 15.03, 15.75, 4.57, 'EUR', TRUE, 'https://www.wook.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'wells', 14.24, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmaciaonline', 14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'pharma2you', 13.92, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmaciasholon', 14.88, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'brasty', 13.98, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'lookfantastic', 13.23, NULL, NULL, 'EUR', FALSE, 'https://www.lookfantastic.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'cultbeauty', 13.65, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'primor', 14.83, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'maquillalia', 12, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'atida', 13.91, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'fnac', 15.52, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmacia365', 14.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'loja-farmacia', 14.82, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'afarmaciaonline', 14.06, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'easyfarma', 13.55, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'bairro-saude', 13.79, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmacia-saude', 14.78, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmaciasdirect', 13.84, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'sa-da-bandeira', 14.86, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'sweetcare', 13.15, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'byfarma', 14.13, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2008230783807', 'farmaciapt', 13.96, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/monoi-sun-lover-body-lotion-200-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'notino', 3.93, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'sephora', 3.68, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'douglas', 3.99, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'druni', 3.94, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'perfumes-companhia', 3.63, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'elcorteingles', 3.7, NULL, NULL, 'EUR', FALSE, 'https://www.elcorteingles.pt/beleza/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'worten', 4.05, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'continente', 3.97, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'auchan', 3.87, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'wook', 3.91, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'wells', 3.73, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmaciaonline', 3.93, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'pharma2you', 4.02, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmaciasholon', 3.91, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'brasty', 3.21, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'lookfantastic', 3.84, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'cultbeauty', 3.69, NULL, NULL, 'EUR', FALSE, 'https://www.cultbeauty.co.uk/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'primor', 3.85, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'maquillalia', 3.41, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'atida', 3.65, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'fnac', 3.94, NULL, NULL, 'EUR', FALSE, 'https://www.fnac.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmacia365', 4, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'loja-farmacia', 3.91, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'afarmaciaonline', 4.06, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'easyfarma', 3.98, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'bairro-saude', 3.89, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmacia-saude', 3.78, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmaciasdirect', 3.81, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'sa-da-bandeira', 4.01, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'sweetcare', 3.7, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'byfarma', 3.65, 4.2, 13.1, 'EUR', TRUE, 'https://byfarma.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2002201157871', 'farmaciapt', 3.75, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/zero-sensitive-gel-duche-600-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'notino', 19.86, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'druni', 19.89, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'miin', 17.26, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'haemiskin', 18.25, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'korean-queens', 18.51, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2006588619489', 'cacau-chic', 17.67, NULL, NULL, 'EUR', FALSE, 'https://www.cacauchicshop.pt/produto/snail-96-mucin-power-essence-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'notino', 19.13, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'druni', 20.09, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'miin', 18.51, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'haemiskin', 20.69, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'korean-queens', 16.77, NULL, NULL, 'EUR', FALSE, 'https://www.koreanqueens.com/pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2003196877621', 'cacau-chic', 20.57, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/advanced-snail-92-all-in-one-cream-100-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'notino', 9.92, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'druni', 9.62, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'miin', 10.39, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'haemiskin', 8.52, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'korean-queens', 9.48, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2002712535526', 'cacau-chic', 10.49, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/salicylic-acid-daily-gentle-cleanser-150-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'notino', 21.42, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'druni', 20.81, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'miin', 16.73, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'haemiskin', 19.57, NULL, NULL, 'EUR', FALSE, 'https://www.haemiskin.pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'korean-queens', 16.89, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2003144414496', 'cacau-chic', 20.85, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/heartleaf-77-soothing-toner-250-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'notino', 15.81, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'druni', 14.95, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'miin', 13.48, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'haemiskin', 12.1, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'korean-queens', 12.12, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2002767765305', 'cacau-chic', 12.83, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/heartleaf-quercetinol-pore-cleansing-foam-150-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'notino', 16.55, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'druni', 15.71, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'miin', 16, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'haemiskin', 13.77, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'korean-queens', 14.94, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006774407029', 'cacau-chic', 14.82, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/glow-serum-propolis-niacinamide-30-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'notino', 16.52, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'druni', 16.39, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'miin', 17.4, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'haemiskin', 17.29, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'korean-queens', 14.64, NULL, NULL, 'EUR', FALSE, 'https://www.koreanqueens.com/pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2006102404539', 'cacau-chic', 18.92, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/relief-sun-rice-probiotics-spf50-50-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'notino', 22.94, 27.3, 15.97, 'EUR', TRUE, 'https://www.notino.pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'druni', 22.67, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'miin', 22.32, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'haemiskin', 22.97, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'korean-queens', 21.5, NULL, NULL, 'EUR', TRUE, 'https://www.koreanqueens.com/pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2002407965584', 'cacau-chic', 22.69, NULL, NULL, 'EUR', TRUE, 'https://www.cacauchicshop.pt/produto/all-clean-balm-120-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'notino', 24.13, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'druni', 25.83, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'miin', 22.49, NULL, NULL, 'EUR', TRUE, 'https://miin-cosmetics.pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'haemiskin', 26.25, NULL, NULL, 'EUR', TRUE, 'https://www.haemiskin.pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'korean-queens', 25.08, NULL, NULL, 'EUR', FALSE, 'https://www.koreanqueens.com/pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2009662221158', 'cacau-chic', 22.48, NULL, NULL, 'EUR', FALSE, 'https://www.cacauchicshop.pt/produto/no-3-skin-softening-serum-50-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'notino', 31.03, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'sephora', 29.59, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'douglas', 28.87, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'druni', 29.21, NULL, NULL, 'EUR', FALSE, 'https://www.druni.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'perfumes-companhia', 28.52, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'elcorteingles', 31.39, 33.6, 6.58, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'worten', 32.51, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'continente', 32.29, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'auchan', 30.89, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'wook', 32.42, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'wells', 31.64, NULL, NULL, 'EUR', FALSE, 'https://www.wells.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmaciaonline', 28.71, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'pharma2you', 30.2, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmaciasholon', 28.38, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'brasty', 29.65, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'lookfantastic', 31.56, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'cultbeauty', 26.44, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'primor', 29.94, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'maquillalia', 27.07, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'atida', 29.91, NULL, NULL, 'EUR', FALSE, 'https://www.atida.com/pt-pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'fnac', 32.09, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmacia365', 28.05, 33.6, 16.52, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'loja-farmacia', 30.41, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'afarmaciaonline', 31.58, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'easyfarma', 31.48, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'bairro-saude', 29.91, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmacia-saude', 29.96, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmaciasdirect', 31.67, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'sa-da-bandeira', 27.93, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'sweetcare', 30.5, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'byfarma', 31.14, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001367107027', 'farmaciapt', 28.09, NULL, NULL, 'EUR', FALSE, 'https://farmacia.pt/produto/acglicolic-liposomal-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'notino', 34.92, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'sephora', 38.52, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'douglas', 38.09, NULL, NULL, 'EUR', FALSE, 'https://www.douglas.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'druni', 33.51, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'perfumes-companhia', 38.38, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'elcorteingles', 40, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'worten', 38.24, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'continente', 36.57, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'auchan', 38.76, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'wook', 39.35, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'wells', 34.2, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmaciaonline', 36.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'pharma2you', 34.27, NULL, NULL, 'EUR', FALSE, 'https://pharma2you.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmaciasholon', 35.54, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'brasty', 37.04, 40.95, 9.55, 'EUR', TRUE, 'https://www.brasty.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'lookfantastic', 31.5, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'cultbeauty', 38.47, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'primor', 37.06, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'maquillalia', 35.36, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'atida', 37.28, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'fnac', 37.32, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmacia365', 38.5, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'loja-farmacia', 37.88, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'afarmaciaonline', 34.05, 40.95, 16.85, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'easyfarma', 35.44, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'bairro-saude', 35.25, NULL, NULL, 'EUR', FALSE, 'https://bairrodasaude.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmacia-saude', 35.69, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmaciasdirect', 37.16, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz
FROM (VALUES
  ('2001600631852', 'sa-da-bandeira', 35.94, NULL, NULL, 'EUR', FALSE, 'https://www.sadabandeira.com/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'sweetcare', 32.21, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'byfarma', 35.82, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2001600631852', 'farmaciapt', 38.19, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hidraderm-trx-serum-30-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'notino', 12.74, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'sephora', 12.02, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'douglas', 13.8, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'druni', 13.22, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'perfumes-companhia', 12.66, NULL, NULL, 'EUR', FALSE, 'https://www.perfumesecompanhia.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'elcorteingles', 14.06, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'worten', 13.88, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'continente', 14.38, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'auchan', 13.19, NULL, NULL, 'EUR', TRUE, 'https://www.auchan.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'wook', 14.17, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'wells', 12.75, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmaciaonline', 12.82, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'pharma2you', 13.86, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmaciasholon', 12.24, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'brasty', 11.34, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'lookfantastic', 12.55, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'cultbeauty', 13.19, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'primor', 14.05, NULL, NULL, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'maquillalia', 11.48, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'atida', 11.88, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'fnac', 13.85, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmacia365', 13.35, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'loja-farmacia', 12.52, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'afarmaciaonline', 12.96, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'easyfarma', 12.94, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'bairro-saude', 12.36, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmacia-saude', 13.09, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmaciasdirect', 13.46, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'sa-da-bandeira', 12.9, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'sweetcare', 11.59, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'byfarma', 12.55, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2002327013983', 'farmaciapt', 13.44, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/ultra-hidratante-corpo-500-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'notino', 10.75, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'sephora', 10.2, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'douglas', 9.54, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'druni', 9.49, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'perfumes-companhia', 10.77, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'elcorteingles', 10.49, 11.55, 9.18, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'worten', 11.3, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'continente', 10.89, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'auchan', 11.41, NULL, NULL, 'EUR', FALSE, 'https://www.auchan.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'wook', 10.22, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'wells', 10.19, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmaciaonline', 10.58, NULL, NULL, 'EUR', FALSE, 'https://www.farmaciaonline.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'pharma2you', 9.72, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmaciasholon', 10.14, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'brasty', 9.75, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'lookfantastic', 10.31, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'cultbeauty', 9.55, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'primor', 11.02, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'maquillalia', 9.43, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'atida', 10.51, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'fnac', 11.53, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmacia365', 9.95, NULL, NULL, 'EUR', FALSE, 'https://www.farmacia365.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'loja-farmacia', 10.36, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'afarmaciaonline', 10.15, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'easyfarma', 10.7, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'bairro-saude', 10.67, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmacia-saude', 9.74, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmaciasdirect', 10.18, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'sa-da-bandeira', 10.28, 11.55, 11, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'sweetcare', 9.73, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'byfarma', 10.59, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2008454978348', 'farmaciapt', 10.77, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/hydra-bebe-creme-facial-40-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'notino', 16.2, NULL, NULL, 'EUR', FALSE, 'https://www.notino.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'sephora', 15.69, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'douglas', 14.98, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'druni', 14.79, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'perfumes-companhia', 16.86, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'elcorteingles', 17.56, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'worten', 16.04, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'continente', 16.34, NULL, NULL, 'EUR', TRUE, 'https://www.continente.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'auchan', 16.5, 17.85, 7.56, 'EUR', TRUE, 'https://www.auchan.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'wook', 15.76, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'wells', 16.01, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmaciaonline', 16.4, 17.85, 8.12, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'pharma2you', 16.7, 17.85, 6.44, 'EUR', TRUE, 'https://pharma2you.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmaciasholon', 15.04, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'brasty', 15.68, NULL, NULL, 'EUR', FALSE, 'https://www.brasty.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'lookfantastic', 15.91, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'cultbeauty', 13.88, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'primor', 15.19, 17.85, 14.9, 'EUR', TRUE, 'https://pt.primor.eu/pt_pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'maquillalia', 14.5, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'atida', 14.94, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'fnac', 16.71, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmacia365', 16.17, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'loja-farmacia', 16.23, NULL, NULL, 'EUR', FALSE, 'https://www.lojadafarmacia.com/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'afarmaciaonline', 15.71, NULL, NULL, 'EUR', FALSE, 'https://www.afarmaciaonline.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'easyfarma', 15.94, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'bairro-saude', 16.63, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmacia-saude', 15.34, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmaciasdirect', 15.36, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'sa-da-bandeira', 15.94, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'sweetcare', 13.99, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'byfarma', 15.82, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2009662886098', 'farmaciapt', 15.1, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/exomega-control-creme-emoliente-200-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'notino', 16.18, NULL, NULL, 'EUR', TRUE, 'https://www.notino.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'sephora', 17.65, NULL, NULL, 'EUR', TRUE, 'https://www.sephora.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'douglas', 17.02, NULL, NULL, 'EUR', TRUE, 'https://www.douglas.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'druni', 16.27, NULL, NULL, 'EUR', TRUE, 'https://www.druni.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'perfumes-companhia', 17.17, NULL, NULL, 'EUR', TRUE, 'https://www.perfumesecompanhia.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'elcorteingles', 19.1, NULL, NULL, 'EUR', TRUE, 'https://www.elcorteingles.pt/beleza/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'worten', 19.06, NULL, NULL, 'EUR', TRUE, 'https://www.worten.pt/beleza-saude/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'continente', 18.17, NULL, NULL, 'EUR', FALSE, 'https://www.continente.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'auchan', 18.89, 19.95, 5.31, 'EUR', TRUE, 'https://www.auchan.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'wook', 18.3, NULL, NULL, 'EUR', TRUE, 'https://www.wook.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'wells', 17.77, NULL, NULL, 'EUR', TRUE, 'https://www.wells.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmaciaonline', 16.92, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciaonline.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'pharma2you', 17.28, NULL, NULL, 'EUR', TRUE, 'https://pharma2you.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmaciasholon', 17.66, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasholon.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'brasty', 14.59, NULL, NULL, 'EUR', TRUE, 'https://www.brasty.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'lookfantastic', 16.56, NULL, NULL, 'EUR', TRUE, 'https://www.lookfantastic.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'cultbeauty', 18.77, NULL, NULL, 'EUR', TRUE, 'https://www.cultbeauty.co.uk/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'primor', 18.37, NULL, NULL, 'EUR', FALSE, 'https://pt.primor.eu/pt_pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'maquillalia', 17.21, NULL, NULL, 'EUR', TRUE, 'https://www.maquillalia.com/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'atida', 18.24, NULL, NULL, 'EUR', TRUE, 'https://www.atida.com/pt-pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'fnac', 19.2, NULL, NULL, 'EUR', TRUE, 'https://www.fnac.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmacia365', 17.96, NULL, NULL, 'EUR', TRUE, 'https://www.farmacia365.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'loja-farmacia', 18.68, NULL, NULL, 'EUR', TRUE, 'https://www.lojadafarmacia.com/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'afarmaciaonline', 18.5, NULL, NULL, 'EUR', TRUE, 'https://www.afarmaciaonline.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'easyfarma', 17.09, NULL, NULL, 'EUR', TRUE, 'https://easyfarma.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'bairro-saude', 18.27, NULL, NULL, 'EUR', TRUE, 'https://bairrodasaude.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmacia-saude', 18.01, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasaude.com.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmaciasdirect', 18.59, NULL, NULL, 'EUR', TRUE, 'https://www.farmaciasdirect.eu/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'sa-da-bandeira', 16.98, NULL, NULL, 'EUR', TRUE, 'https://www.sadabandeira.com/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'sweetcare', 16.85, NULL, NULL, 'EUR', TRUE, 'https://sweetcare.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'byfarma', 17.06, NULL, NULL, 'EUR', TRUE, 'https://byfarma.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z'),
  ('2006559351172', 'farmaciapt', 17.32, NULL, NULL, 'EUR', TRUE, 'https://farmacia.pt/produto/sebiaclear-active-40-ml', '2026-05-11T06:00:00Z')
) AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
JOIN produtos p ON p.ean = v.ean
JOIN lojas l ON l.slug = v.loja_slug;

-- atualizar ultima_coleta de cada loja
UPDATE lojas SET ultima_coleta = '2026-05-11T06:00:00Z' WHERE slug IN (SELECT DISTINCT slug FROM lojas);

COMMIT;
