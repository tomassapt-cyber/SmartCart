/**
 * Resolve a localização do utilizador (IP → distrito) sem persistir o IP.
 *
 * GDPR: o IP entra na função, mas só o distrito sai — não escrevemos o IP
 * em log nem em base de dados. O resultado é cacheado em Redis com chave
 * baseada no hash do IP (não reversível com facilidade).
 */

import * as crypto from 'crypto';
import { redis } from './redis';
import { District } from './postalCodes';

interface IpApiResponse {
  status: 'success' | 'fail';
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  message?: string;
}

const IP_API_URL = process.env.IP_API_URL ?? 'http://ip-api.com/json';
const TTL = Number(process.env.GEO_TTL_SECONDS ?? 86_400); // 24h

/**
 * Mapeia o `regionName` devolvido pelo IP-API para um distrito PT.
 * O IP-API devolve nomes em inglês ("Lisbon") ou em português ("Lisboa")
 * dependendo da versão — cobrimos ambos os casos.
 */
const REGION_TO_DISTRICT: Record<string, District> = {
  // Inglês
  Lisbon: 'Lisboa',
  Porto: 'Porto',
  Braga: 'Braga',
  Aveiro: 'Aveiro',
  Coimbra: 'Coimbra',
  Faro: 'Faro',
  Leiria: 'Leiria',
  Setubal: 'Setúbal',
  Santarem: 'Santarém',
  Viseu: 'Viseu',
  Evora: 'Évora',
  Beja: 'Beja',
  'Castelo Branco': 'Castelo Branco',
  Guarda: 'Guarda',
  'Vila Real': 'Vila Real',
  Braganca: 'Bragança',
  Portalegre: 'Portalegre',
  'Viana do Castelo': 'Viana do Castelo',
  Madeira: 'Madeira',
  Azores: 'Açores',

  // Português (já normalizado)
  Lisboa: 'Lisboa',
  Setúbal: 'Setúbal',
  Santarém: 'Santarém',
  Évora: 'Évora',
  Bragança: 'Bragança',
  Açores: 'Açores',
};

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Resolve um IP em distrito. Retorna null se o IP não estiver em PT
 * ou se o serviço falhar.
 */
export async function ipToDistrict(ip: string): Promise<District | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;

  const cacheKey = `geo:${hashIp(ip)}`;

  // 1) Cache Redis
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return cached as District;
  } catch {
    // Redis offline → segue para fetch
  }

  // 2) Fetch IP-API (free tier, sem token, 45 req/min por IP)
  try {
    const url = `${IP_API_URL}/${encodeURIComponent(ip)}?fields=status,countryCode,regionName,city,message`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    const data = (await res.json()) as IpApiResponse;
    if (data.status !== 'success' || data.countryCode !== 'PT') return null;

    const region = data.regionName ?? '';
    const district = REGION_TO_DISTRICT[region] ?? null;

    if (district) {
      try { await redis.set(cacheKey, district, 'EX', TTL); } catch { /* ok */ }
    }
    return district;
  } catch {
    return null;
  }
}

/**
 * Extrai o IP "real" do cliente a partir dos headers do Next.js.
 * Em produção com proxy (Vercel, Railway) usa-se `x-forwarded-for`.
 */
export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return null;
}
