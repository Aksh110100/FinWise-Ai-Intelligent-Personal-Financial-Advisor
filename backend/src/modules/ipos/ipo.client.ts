import axios from 'axios';
import { IPOResponse, IPO } from './ipo.types';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://api.ipoalerts.in';

export class IPOClient {
  private static getHeaders() {
    const key = process.env.IPOALERTS_API_KEY;
    if (!key) {
      throw new Error('IPOALERTS_API_KEY is missing from environment variables');
    }
    return { 'x-api-key': key };
  }

  static async getOpenIPOs(maxPages = 5): Promise<IPO[]> {
    const ipos: IPO[] = [];
    try {
      for (let p = 1; p <= maxPages; p++) {
        const res = await axios.get(`${BASE_URL}/ipos`, {
          params: { status: 'open', limit: 1, page: p },
          headers: this.getHeaders(),
          timeout: 5000,
        });
        
        if (res.data?.ipos?.length > 0) {
          ipos.push(...res.data.ipos);
        }
        
        const totalPages = res.data?.meta?.totalPages || 1;
        if (p >= totalPages) {
          break;
        }
      }
    } catch (err: any) {
      if (err.response) {
        console.error(`[IPOAlerts API Error] Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(`[IPOAlerts API Error] Message: ${err.message}`);
      }
      
      // If we hit rate limit on page 2+, just return what we have
      if (ipos.length > 0) return ipos;
      throw err;
    }
    
    // Remove duplicates by id
    const uniqueIpos = Array.from(new Map(ipos.map(item => [item.id, item])).values());
    return uniqueIpos;
  }

  static async getUpcomingIPOs(maxPages = 3): Promise<IPO[]> {
    const ipos: IPO[] = [];
    try {
      for (let p = 1; p <= maxPages; p++) {
        const res = await axios.get(`${BASE_URL}/ipos`, {
          params: { status: 'upcoming', limit: 1, page: p },
          headers: this.getHeaders(),
          timeout: 5000,
        });
        
        if (res.data?.ipos?.length > 0) {
          ipos.push(...res.data.ipos);
        }
        
        const totalPages = res.data?.meta?.totalPages || 1;
        if (p >= totalPages) {
          break;
        }
      }
    } catch (err: any) {
      if (err.response) {
        console.error(`[IPOAlerts API Error] (Upcoming) Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(`[IPOAlerts API Error] (Upcoming) Message: ${err.message}`);
      }
      
      // Free tier may not support upcoming, or rate limit hit
      if (err.response?.status === 403 || err.response?.status === 429) {
         return ipos; 
      }
      if (ipos.length > 0) return ipos;
      throw err;
    }
    
    // Remove duplicates by id
    return Array.from(new Map(ipos.map(item => [item.id, item])).values());
  }

  static async searchIPOs(query: string): Promise<IPO[]> {
    try {
      // Free tier only supports status=open, so we just fetch open IPOs and filter locally.
      // Doing a full fetch is hard with rate limits, so we'll fetch up to 5 and filter.
      const ipos: IPO[] = [];
      for (let p = 1; p <= 5; p++) {
        try {
          const res = await axios.get(`${BASE_URL}/ipos`, {
            params: { status: 'open', limit: 1, page: p },
            headers: this.getHeaders(),
            timeout: 5000,
          });
          if (res.data?.ipos?.length > 0) {
            ipos.push(...res.data.ipos);
          }
          if (p >= (res.data?.meta?.totalPages || 1)) {
            break;
          }
        } catch (err: any) {
          break; // Stop on rate limit or error
        }
      }
      
      const q = query.toLowerCase();
      return ipos.filter(ipo => 
        ipo.name.toLowerCase().includes(q) || 
        ipo.symbol.toLowerCase().includes(q) ||
        ipo.slug.toLowerCase().includes(q)
      );
    } catch (err) {
      throw err;
    }
  }

  static async getIPODetails(id: string): Promise<IPO> {
    const res = await axios.get(`${BASE_URL}/ipos/${id}`, {
      headers: this.getHeaders(),
      timeout: 5000,
    });
    return res.data.ipo || res.data;
  }
}
