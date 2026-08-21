import axios from 'axios';

export interface ViewerMarketLocation {
  readonly available: boolean;
  readonly city: string | null;
  readonly region: string | null;
  readonly regionCode: string | null;
  readonly countryCode: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly timezone: string | null;
}

interface IpApiResponse {
  readonly city?: unknown;
  readonly region?: unknown;
  readonly region_code?: unknown;
  readonly country_code?: unknown;
  readonly latitude?: unknown;
  readonly longitude?: unknown;
  readonly timezone?: unknown;
  readonly error?: unknown;
}

const unavailableLocation = (): ViewerMarketLocation => ({
  available: false,
  city: null,
  region: null,
  regionCode: null,
  countryCode: null,
  latitude: null,
  longitude: null,
  timezone: null,
});

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function normalizeIp(rawIp: string): string {
  const first = rawIp.split(',')[0]?.trim() ?? '';
  return first.startsWith('::ffff:') ? first.slice(7) : first;
}

function isPrivateOrLoopback(ip: string): boolean {
  return (
    ip === '' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export class ViewerMarketService {
  async resolve(rawIp: string): Promise<ViewerMarketLocation> {
    const configuredOverride = process.env.DPA_VIEWER_IP_OVERRIDE?.trim();
    const ip = normalizeIp(configuredOverride || rawIp);

    console.info('[ViewerMarketService] resolving viewer IP', {
      rawIp,
      overrideConfigured: Boolean(configuredOverride),
      normalizedIp: ip,
    });

    if (isPrivateOrLoopback(ip)) {
      console.info('[ViewerMarketService] IP is private/loopback; location unavailable', { normalizedIp: ip });
      return unavailableLocation();
    }

    try {
      const response = await axios.get<IpApiResponse>(
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        { timeout: 3500 },
      );

      if (response.data.error === true) {
        return unavailableLocation();
      }

      const latitude = numberOrNull(response.data.latitude);
      const longitude = numberOrNull(response.data.longitude);

      const resolved: ViewerMarketLocation = {
        available: latitude !== null && longitude !== null,
        city: stringOrNull(response.data.city),
        region: stringOrNull(response.data.region),
        regionCode: stringOrNull(response.data.region_code),
        countryCode: stringOrNull(response.data.country_code),
        latitude,
        longitude,
        timezone: stringOrNull(response.data.timezone),
      };

      console.info('[ViewerMarketService] geolocation result', resolved);
      return resolved;
    } catch (error: unknown) {
      console.warn('[ViewerMarketService] IP geolocation unavailable:', error instanceof Error ? error.message : error);
      return unavailableLocation();
    }
  }
}
