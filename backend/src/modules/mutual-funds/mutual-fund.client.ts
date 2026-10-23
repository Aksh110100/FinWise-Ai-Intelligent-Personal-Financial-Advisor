import axios from 'axios';
import { MFSearchResponse, MFNavHistoryResponse, MFCategoryResponse } from './mutual-fund.types';

const BASE_URL = 'https://mfnav.in/api';

export class MutualFundClient {
  static async searchFunds(query: string, page = 1, pageSize = 5): Promise<MFSearchResponse> {
    const res = await axios.get(`${BASE_URL}/funds/search`, {
      params: { q: query, page, page_size: pageSize },
      timeout: 5000,
    });
    return res.data;
  }

  static async getFundDetails(schemeCode: string): Promise<any> {
    const res = await axios.get(`${BASE_URL}/funds/${schemeCode}`, {
      timeout: 5000,
    });
    return res.data;
  }

  static async getLatestNAV(schemeCode: string): Promise<MFNavHistoryResponse> {
    const res = await axios.get(`${BASE_URL}/nav/${schemeCode}`, {
      params: { page: 1, page_size: 1 },
      timeout: 5000,
    });
    return res.data;
  }

  static async getNAVHistory(schemeCode: string, startDate?: string, endDate?: string, pageSize = 30): Promise<MFNavHistoryResponse> {
    const params: any = { page: 1, page_size: pageSize };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const res = await axios.get(`${BASE_URL}/nav/${schemeCode}`, {
      params,
      timeout: 5000,
    });
    return res.data;
  }

  static async getCategories(): Promise<MFCategoryResponse> {
    const res = await axios.get(`${BASE_URL}/categories/`, {
      timeout: 5000,
    });
    return res.data;
  }
}
