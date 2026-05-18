/**
 * Mapeamento de códigos postais portugueses (CP4) → distrito.
 *
 * Fonte: CTT — código postal de 4 dígitos identifica a "área de distribuição"
 * que mapeia para um (ou às vezes dois) distrito(s). Para o caso do SmartCart
 * basta granularidade ao distrito porque as regras de portes nas lojas PT
 * costumam dividir-se em: continente / Madeira / Açores.
 *
 * Esta tabela é uma aproximação suficiente para portes — não substitui
 * a base de dados oficial dos CTT.
 */

export type District =
  | 'Lisboa'
  | 'Porto'
  | 'Braga'
  | 'Aveiro'
  | 'Coimbra'
  | 'Faro'
  | 'Leiria'
  | 'Setúbal'
  | 'Santarém'
  | 'Viseu'
  | 'Évora'
  | 'Beja'
  | 'Castelo Branco'
  | 'Guarda'
  | 'Vila Real'
  | 'Bragança'
  | 'Portalegre'
  | 'Viana do Castelo'
  | 'Madeira'
  | 'Açores';

/** Zona usada para consulta em `shipping_rules` (alinhada com o seed). */
export type ShippingZone = 'nacional' | 'Madeira' | 'Açores';

/**
 * Resolve um CP4 numérico (ex: 4000, 9500) num distrito.
 * Os intervalos sobrepõem-se nas fronteiras administrativas — escolhemos
 * o distrito predominante de cada faixa.
 */
export function postalCodeToDistrict(cp4: number): District | null {
  if (!Number.isFinite(cp4) || cp4 < 1000 || cp4 > 9999) return null;

  // Lisboa e arredores (1xxx-2xxx)
  if (cp4 >= 1000 && cp4 <= 1999) return 'Lisboa';
  if (cp4 >= 2000 && cp4 <= 2499) return 'Lisboa';        // Sintra/Cascais/Mafra
  if (cp4 >= 2500 && cp4 <= 2599) return 'Leiria';        // Caldas/Óbidos/Bombarral
  if (cp4 >= 2600 && cp4 <= 2799) return 'Lisboa';        // Vila Franca, Loures
  if (cp4 >= 2800 && cp4 <= 2999) return 'Setúbal';

  // Centro (3xxx-4xxx até Aveiro/Coimbra/Leiria)
  if (cp4 >= 3000 && cp4 <= 3099) return 'Coimbra';
  if (cp4 >= 3100 && cp4 <= 3299) return 'Leiria';
  if (cp4 >= 3300 && cp4 <= 3399) return 'Coimbra';
  if (cp4 >= 3400 && cp4 <= 3499) return 'Coimbra';
  if (cp4 >= 3500 && cp4 <= 3599) return 'Viseu';
  if (cp4 >= 3600 && cp4 <= 3699) return 'Viseu';
  if (cp4 >= 3700 && cp4 <= 3899) return 'Aveiro';
  if (cp4 >= 3900 && cp4 <= 3999) return 'Viana do Castelo';

  // Norte (4xxx)
  if (cp4 >= 4000 && cp4 <= 4499) return 'Porto';
  if (cp4 >= 4500 && cp4 <= 4599) return 'Aveiro';        // Espinho/Feira
  if (cp4 >= 4600 && cp4 <= 4699) return 'Porto';
  if (cp4 >= 4700 && cp4 <= 4799) return 'Braga';
  if (cp4 >= 4800 && cp4 <= 4899) return 'Braga';         // Guimarães/V.N.Famalicão
  if (cp4 >= 4900 && cp4 <= 4999) return 'Viana do Castelo';

  // Trás-os-Montes (5xxx)
  if (cp4 >= 5000 && cp4 <= 5099) return 'Vila Real';
  if (cp4 >= 5100 && cp4 <= 5199) return 'Viseu';         // Lamego
  if (cp4 >= 5200 && cp4 <= 5399) return 'Bragança';
  if (cp4 >= 5400 && cp4 <= 5499) return 'Vila Real';
  if (cp4 >= 5500 && cp4 <= 5999) return 'Bragança';

  // Interior (6xxx)
  if (cp4 >= 6000 && cp4 <= 6299) return 'Castelo Branco';
  if (cp4 >= 6300 && cp4 <= 6399) return 'Guarda';
  if (cp4 >= 6400 && cp4 <= 6499) return 'Guarda';
  if (cp4 >= 6500 && cp4 <= 6599) return 'Castelo Branco';
  if (cp4 >= 6600 && cp4 <= 6999) return 'Castelo Branco';

  // Alentejo (7xxx)
  if (cp4 >= 7000 && cp4 <= 7099) return 'Évora';
  if (cp4 >= 7100 && cp4 <= 7299) return 'Évora';
  if (cp4 >= 7300 && cp4 <= 7499) return 'Portalegre';
  if (cp4 >= 7500 && cp4 <= 7599) return 'Setúbal';       // Alcácer/Sines
  if (cp4 >= 7600 && cp4 <= 7999) return 'Beja';

  // Algarve (8xxx)
  if (cp4 >= 8000 && cp4 <= 8999) return 'Faro';

  // Ilhas (9xxx)
  if (cp4 >= 9000 && cp4 <= 9499) return 'Madeira';
  if (cp4 >= 9500 && cp4 <= 9999) return 'Açores';

  return null;
}

/**
 * Mapeia um distrito para a zona de envio usada nas tabelas das lojas.
 * Em PT, o continente é flat-rate ("nacional") — só Madeira/Açores variam.
 */
export function districtToShippingZone(district: District): ShippingZone {
  if (district === 'Madeira') return 'Madeira';
  if (district === 'Açores') return 'Açores';
  return 'nacional';
}

/**
 * Aceita formatos comuns de CP português: "4000", "4000-100", "4000 100".
 * Retorna apenas os primeiros 4 dígitos como número, ou null se inválido.
 */
export function parsePostalCode(raw: string): number | null {
  if (!raw) return null;
  const match = raw.replace(/\s/g, '').match(/^(\d{4})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}
