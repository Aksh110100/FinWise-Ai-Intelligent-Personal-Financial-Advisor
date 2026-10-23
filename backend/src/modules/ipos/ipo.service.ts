import { IPOClient } from './ipo.client';
import { IPO } from './ipo.types';

export class IPOService {
  private static cache: IPO[] | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  static async getOpenIPOs(bypassCache = false): Promise<IPO[]> {
    const now = Date.now();
    if (!bypassCache && this.cache && (now - this.cacheTimestamp < this.CACHE_TTL)) {
      return this.cache;
    }

    try {
      const ipos = await IPOClient.getOpenIPOs(5); // Fetch up to 5 pages/IPOs
      this.cache = ipos;
      this.cacheTimestamp = Date.now();
      return ipos;
    } catch (err: any) {
      // If we have a stale cache, use it as fallback
      if (this.cache) {
        console.warn('Using stale IPO cache due to API error:', err.message);
        return this.cache;
      }
      throw err;
    }
  }

  private static upcomingCache: IPO[] | null = null;
  private static upcomingCacheTimestamp: number = 0;

  static async getUpcomingIPOs(bypassCache = false): Promise<IPO[]> {
    const now = Date.now();
    if (!bypassCache && this.upcomingCache && (now - this.upcomingCacheTimestamp < this.CACHE_TTL)) {
      return this.upcomingCache;
    }

    try {
      const ipos = await IPOClient.getUpcomingIPOs(5);
      this.upcomingCache = ipos;
      this.upcomingCacheTimestamp = Date.now();
      return ipos;
    } catch (err: any) {
      if (this.upcomingCache) {
        console.warn('Using stale upcoming IPO cache due to API error:', err.message);
        return this.upcomingCache;
      }
      if (err.response?.status === 400) {
        console.warn('Upcoming IPOs not supported on free plan, returning empty array.');
        return [];
      }
      throw err;
    }
  }

  static async searchIPOs(query: string): Promise<IPO[]> {
    const openIpos = await this.getOpenIPOs();
    const upcomingIpos = await this.getUpcomingIPOs();
    const allIpos = [...openIpos, ...upcomingIpos];
    const q = query.toLowerCase().trim();
    return allIpos.filter(ipo => 
      ipo.name.toLowerCase().includes(q) || 
      ipo.symbol.toLowerCase().includes(q) ||
      ipo.slug.toLowerCase().includes(q)
    );
  }

  static async getIPODetails(id: string): Promise<IPO> {
    return await IPOClient.getIPODetails(id);
  }
}
