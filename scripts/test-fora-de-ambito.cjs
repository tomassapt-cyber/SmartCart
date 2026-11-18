'use strict';
// Fora de âmbito (2026-11-17): o que não é cosmética sai do site; a cosmética parecida fica.
// Sem rede. Uso: node scripts/test-fora-de-ambito.cjs
const assert = require('node:assert/strict');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const sai = [
  'Optrex Colírio Água Hamamelis - 10ml', 'Systane Ultra Solução Oftálmica Lubrificante 10ml', 'Recugel Gel Oftálmico - 10g',
  'Parodontax Pasta Dentífrica Gengivas + Sensibilidade', 'Elgydium Kids Dentifrice enfant grenadine', 'Corega Super Creme 40g',
  'Curaprox Prime Escovilhão CPS 07 (x8 unidades)', 'Creme Dental Lacer Clorexidina, 75ml.',
  'Zumub Creatina Creapure Monohidratada pó 500g', 'Dulcogotas 7,5mg/ml Gotas Orais 30ml', 'Drenaslim Celulite Solução Oral 450mL',
  'Arkocápsulas Cannabis Sativa (x45 unidades)', 'Bioactivo ómega-7 Manutenção Das Mucosas 60cápsulas', 'AH THEAVIT solar 30 cápsulas',
  'Fresubin 2 kcal Creme Morango Silvestre 4x125g', 'Meritene Cereal Instant Cereais Cacau 520G', 'Bi-Oralsuero Solução Oral Morango 330ml',
  'Comforsil Palmilhas Anti-Impacto M', 'Veroval Compact Medidor de Tensão para Braço', 'Balança de Análise Corporal Medisana BS 850',
  'Massajador de olhos Foreo Iris 2', 'Braun Hair Clipper Aparador de Cabelo', 'Legend Lâmina para Máquina Corte de Cabelo',
  'Durex Sensilube Gel Lubrificante Íntimo 40ml', 'Ammo London Copo Menstrual Velvet M', 'OB Proconfort Normal (x64 tampões)',
  'Philips Avent Tetinas Natural Response T2', 'Chicco Babete Silicone Cinza 6M+', 'Suavinex Mordedor de Silicone',
  // o acento escrito como carácter à parte (NFD) não pode escapar
  'Optrex Colírio Hidratante'.normalize('NFD'),
  // 18/11 (comparação com o KuantoKusta): animais, leite de bebé, bebíveis, saúde, brinquedos
  'Amflee Combo 268/241,2 Pipetas Cão 20-40kg X3 Fipronil', 'Anima Strath Elixir 100 ml', 'Seresto Coleira Gato 1,25g+0,56g 38cm',
  'Wilda Siberica Oil-Plex Champô para animais de estimação 400 ml', 'Effitix Pipetas Antiparasitárias 10-20kg 4 Unidades',
  'Nestlé Nan Optipro Leite Casa 1 800 gr', 'NAN Optipro 1 Leite Lactentes - 800g', 'Nan Total 2 Leite Transicao 800g', 'Creme de arroz Almirón 225 g',
  'Arkoreal Geleia Real Vitaminas Laranja sem Açúcar - 20 Ampolas', 'Forte Pharma Geleia Real Bio 2500 mg, 20 ampolas',
  'Apisérum Geléia Real Vitalidade 18 Frascos', 'Diviten Infantil Geleia Real 300ml', 'Cerebrum Forte Ampolas Bebíveis (x30 unidades)',
  'Iraltone Hair Efflu Booster 30 doses únicas bebíveis', 'Win Fit Glucosamina Comp X 30 comps',
  'Lastotel Lidagura 6cm x 4m', 'Pic Irrigador Fullwash Enteroclisma 2L', 'Futuro Pulso Suporte Reversivel S',
  'Actimove Arthritis Care Suporte de Joelho Tam.XL', 'Termômetro de banho infantil Suavinex',
  'Chicco Brinquedo Coelhinho Doudou', 'Chicco Camaleão Doudou 0+ meses', 'CH.BRI11119000000 Roca Tartaruga Eco',
  'Doomoo Peluche Anti-cólicas Snoogy Cerejas', 'Saro Peluche Patudo "Jungle Party"',
  // 18/11, decisão do Tomás: os acessórios saem
  'Tangle Teezer Compact Escova de Cabelo Verde Azulado', 'Wells Escova de Cabelo Redonda Cerdas Mistas 42 mm', 'Denman D25 Pente de Cabelo Homem Fantail',
  'Invisibobble Everclaw Mola Cabelo (x1 unidade)', 'Mola para Cabelo Verde', 'slip Hair Care Elásticos para cabelo magro 4 x Skinny Navy / 1 un.',
  'Beter Tesoura de Unhas Ponta Arredondada Azul', 'Maf Pinça Depilatória Dourada', 'RickiParodi Corta-Unhas Médio em Níquel x1',
  'Beter Elite Lima de Unhas Cristal', 'Esponjas de Maquilhagem Doll Face Dozen', 'Beautyblender Original + Mini Solid Cleanser Kit',
  'Gift Set Acessório de Limpeza de Pincéis-Mermaid', 'Zoë Ayla Jade Facial Roller And Gua Sha Tool', 'Rolo facial Jade', 'Depilador facial',
];
const fica = [
  'Ziaja Creme Facial Hidratante Multivitamínico 50 ml', 'Flavo-c Melatonina Ampolas Reparadoras de Noite',
  'Creme Gordo Lubrificante Emoliente Original', 'Creme Gordo Emoliente Pele Seca Original Boião',
  'Sesderma Repaskin Aerossol Transparente SPF50 200ml', 'Theavit Sérum Renovador', 'Encapsulated Resveratrol',
  'Sérum Retinal Puro Multi-Encapsulado 0,1%', 'Bioderma Sensibio H2O 250ml', 'Avène Cicalfate Creme Reparador 40ml',
  'Klorane Bálsamo Após-Champô Leite de Aveia 200ml', 'La Roche-Posay Toleriane Dermallergo Olhos 20ml',
  'Uriage Eau Thermale Stick Labial 4g', 'Elmex Gel', // marca de higiene oral sem o termo: não se adivinha
  // 18/11: geleia real em cosmética, leite de limpeza/corporal, coffrets com peluche, piolhos de pessoas
  'Apivita Face Mask Máscara reafirmante com geleia real 50 ml', 'Fleurance Nature Creme Antirrugas Regenerador com Geleia Real Biológica 50ml',
  'Sabonete Líquido Mel E Geleia Real Feno De Portugal 300 ml', 'Th Pharma Champô de Leite de Aveia e Geleia Real - 1L',
  'Mizon Joyful Time Essência de Geleia Real, 23 g', 'Bioderma Atoderm Leite Corporal 500ml', 'Avène Leite de Limpeza 200ml',
  'La Roche Posay Lipikar AP+ Creme Duche 400 ml + Bálsamo 400 ml + Doudou', 'Mustela Love Welcome Baby Musti Eau De Soin Perfumee 50ml + Peluche',
  'Roger & Gallet Mandarine Doudou Água Perfumada Roll-On 15ml', 'Shampoo Antiparasitário Filvit-P, 100ml.',
  'Patches Imperfeições Facefacts Micro Agulhas 6un', 'Lierac Sunissime Leite Protetor SPF50',
  // acessórios que vêm com cosmética, e cosmética com nome parecido
  'Nuxe Super Sérum 10 30 ml + Contorno de Olhos 15 ml + Gua Sha', 'Lisse Crème Lissante Rides 30mL + Creme para Dormir 30mL + Gua Sha 1 Un.',
  'Soro Redensificante Atashi 50 ml + Contorno de Olhos Antirrugas 15 ml + Colher Gua Sha', 'Medicube PDRN Collagen Creme para Pescoço Anti-Rugas Gua Sha 90g',
  'Sebastian Professional Microweb Fiber Texturizador Elástico para Cabelo 45ml', 'Kérastase Elixir Ultime Óleo Original 100ml',
  'Tangle Teezer Champô Desembaraçante 250ml', 'Serpente Óleo de Cabelo',
];
for (const n of sai) assert.equal(isNonCosmetic(n), true, `devia sair: ${n}`);
for (const n of fica) assert.equal(isNonCosmetic(n), false, `devia ficar: ${n}`);
console.log('fora de âmbito: colírios, higiene oral, suplementos (também «Arkocápsulas» e «60cápsulas»), nutrição, aparelhos, íntimo, acessórios de bebé, animais, leite de bebé, bebíveis, ortopedia, brinquedos e acessórios (escovas, pentes, molas, pinças, gua sha…) saem; a cosmética parecida e os conjuntos com cosmética ficam — tudo passou');
