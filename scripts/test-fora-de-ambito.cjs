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
];
const fica = [
  'Ziaja Creme Facial Hidratante Multivitamínico 50 ml', 'Flavo-c Melatonina Ampolas Reparadoras de Noite',
  'Creme Gordo Lubrificante Emoliente Original', 'Creme Gordo Emoliente Pele Seca Original Boião',
  'Sesderma Repaskin Aerossol Transparente SPF50 200ml', 'Theavit Sérum Renovador', 'Encapsulated Resveratrol',
  'Sérum Retinal Puro Multi-Encapsulado 0,1%', 'Bioderma Sensibio H2O 250ml', 'Avène Cicalfate Creme Reparador 40ml',
  'Klorane Bálsamo Após-Champô Leite de Aveia 200ml', 'La Roche-Posay Toleriane Dermallergo Olhos 20ml',
  'Uriage Eau Thermale Stick Labial 4g', 'Elmex Gel', // marca de higiene oral sem o termo: não se adivinha
];
for (const n of sai) assert.equal(isNonCosmetic(n), true, `devia sair: ${n}`);
for (const n of fica) assert.equal(isNonCosmetic(n), false, `devia ficar: ${n}`);
console.log('fora de âmbito: colírios, higiene oral, suplementos (também «Arkocápsulas» e «60cápsulas»), nutrição, aparelhos, íntimo, acessórios de bebé saem; a cosmética parecida fica — tudo passou');
