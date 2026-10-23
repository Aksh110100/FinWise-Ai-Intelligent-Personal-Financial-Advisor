import { MutualFundClient } from './mutual-fund.client';
import { MFSearchResponse, MFNavHistoryResponse, MFCategoryResponse } from './mutual-fund.types';

// Simple in-memory cache for college project
const cache: Record<string, { data: any; expiry: number }> = {};

function getCached<T>(key: string): T | null {
  const item = cache[key];
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: any, ttlSeconds: number) {
  cache[key] = {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  };
}

export class MutualFundService {
  static async searchFunds(query: string): Promise<MFSearchResponse> {
    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = getCached<MFSearchResponse>(cacheKey);
    if (cached) return cached;

    const data = await MutualFundClient.searchFunds(query, 1, 500);
    setCache(cacheKey, data, 3600); // cache search for 1 hour
    return data;
  }

  static async getMutualFundDetails(schemeCode: string): Promise<any> {
    const cacheKey = `details_${schemeCode}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const data = await MutualFundClient.getFundDetails(schemeCode);
    setCache(cacheKey, data, 86400); // Details don't change often, 1 day
    return data;
  }

  static async getLatestNAV(schemeCode: string): Promise<MFNavHistoryResponse> {
    const cacheKey = `latest_nav_${schemeCode}`;
    const cached = getCached<MFNavHistoryResponse>(cacheKey);
    if (cached) return cached;

    const data = await MutualFundClient.getLatestNAV(schemeCode);
    setCache(cacheKey, data, 14400); // cache NAV for 4 hours
    return data;
  }

  static async getNAVHistory(schemeCode: string, startDate?: string, endDate?: string): Promise<MFNavHistoryResponse> {
    // We don't strictly need caching here if it's dynamic, but let's cache recent 30 days
    const cacheKey = `nav_history_${schemeCode}_${startDate}_${endDate}`;
    const cached = getCached<MFNavHistoryResponse>(cacheKey);
    if (cached) return cached;

    const data = await MutualFundClient.getNAVHistory(schemeCode, startDate, endDate, 30);
    setCache(cacheKey, data, 14400);
    return data;
  }

  static async getMutualFundCategories(): Promise<MFCategoryResponse> {
    const cacheKey = `categories`;
    const cached = getCached<MFCategoryResponse>(cacheKey);
    if (cached) return cached;

    const data = await MutualFundClient.getCategories();
    setCache(cacheKey, data, 86400 * 7); // 7 days
    return data;
  }
}
