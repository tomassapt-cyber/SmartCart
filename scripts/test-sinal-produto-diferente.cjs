'use strict';
// sinalDeProdutoDiferente (2026-10-16): quando dois produtos com EANs verdadeiros
// diferentes têm o mesmo fingerprint, há prova de serem produtos diferentes?
// Sem rede. Uso: node scripts/test-sinal-produto-diferente.cjs
const assert = require('node:assert/strict');
const { sinalDeProdutoDiferente: sinal } = require('./lib/product-fingerprint');

// mini num lado e não no outro
assert.equal(sinal({ name: 'Keratin Smooth', brand: 'TRESEMMÉ', url: 'https://www.druni.pt/keratin-smooth-tresemme-mini-shampoo-cabelo-normal' },
  { name: 'Keratin Smooth', brand: 'Tresemmé' }), 'mini');
assert.equal(sinal({ name: 'Repair', url: 'https://x.pt/repair-moroccanoil-shampoo-tamanho-viagem' }, { name: 'Repair' }), 'mini');
assert.equal(sinal({ name: 'Repair', url: 'https://x.pt/repair-viagem' }, { name: 'Repair Tamanho Viagem' }), null, 'mini dos dois lados: nada');

// números diferentes nos dois nomes
assert.equal(sinal({ name: '3 Step The Feet Set', brand: 'DRN' }, { name: '1 Step The Feet Set', brand: 'DRN' }), 'números');
assert.equal(sinal({ name: '5% Glycolic Acid Tonic' }, { name: '2,5% Glycolic Acid Tonic' }), 'números');
assert.equal(sinal({ name: 'Cofre Light Blue 50ML' }, { name: 'Cofre Light Blue 100ML' }), 'números');

// ambíguo (um lado sem números) ou igual → sem sinal
assert.equal(sinal({ name: 'Cofre Light Blue' }, { name: 'Cofre Light Blue 100ML' }), null);
assert.equal(sinal({ name: 'Clásico' }, { name: 'Clásico 75ML' }), null);
assert.equal(sinal({ name: '10% Collagen Complex' }, { name: '10% Collagen Complex' }), null);
assert.equal(sinal({ name: '24K Gold Flash Glow' }, { name: '24K Gold Flash Glow' }), null);
// os números da marca não contam (3INA, 2B, 100% Pure…)
assert.equal(sinal({ name: '3INA The Lipstick', brand: '3INA' }, { name: 'The Lipstick', brand: '3INA' }), null);
// 2,5 = 2.5
assert.equal(sinal({ name: 'Ácido 2,5%' }, { name: 'Ácido 2.5%' }), null);
// «minimalist» não é mini
assert.equal(sinal({ name: 'Sérum', url: 'https://x.pt/serum-minimalist' }, { name: 'Sérum' }), null);
console.log('sinal-produto-diferente: mini de um lado, números diferentes nos dois; ambíguo, igual, marca e «minimalist» sem sinal — tudo passou');
