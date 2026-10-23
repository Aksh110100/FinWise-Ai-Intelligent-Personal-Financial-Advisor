import { apiClient } from './client';

export interface Investment {
  id: string;
  name: string;
  symbol?: string;
  type: string;
  investedAmount: number;
  currentValue?: number;
  quantity?: number;
  purchasePrice?: number;
  currentPrice?: number;
  purchaseDate?: string;
  notes?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  assetType: string;
  plannedAmount: number;
  targetDate?: string;
  contributionFreq?: string;
  notes?: string;
  status: string;
}

export const investmentApi = {
  getSummary: async () => {
    const { data } = await apiClient.get('/investments/summary');
    return data.data;
  },
  getAllocation: async () => {
    const { data } = await apiClient.get('/investments/allocation');
    return data.data;
  },
  getPerformance: async (range: string) => {
    const { data } = await apiClient.get(`/investments/performance?range=${range}`);
    return data.data;
  },
  getReview: async () => {
    const { data } = await apiClient.get('/investments/review');
    return data.data;
  },
  getInvestments: async () => {
    const { data } = await apiClient.get('/investments');
    return data.data;
  },
  createInvestment: async (payload: Partial<Investment>) => {
    const { data } = await apiClient.post('/investments', payload);
    return data.data;
  },
  updateInvestment: async (id: string, payload: Partial<Investment>) => {
    const { data } = await apiClient.patch(`/investments/${id}`, payload);
    return data.data;
  },
  deleteInvestment: async (id: string) => {
    const { data } = await apiClient.delete(`/investments/${id}`);
    return data;
  },
  getPlans: async () => {
    const { data } = await apiClient.get('/investments/plans');
    return data.data;
  },
  createPlan: async (payload: Partial<InvestmentPlan>) => {
    const { data } = await apiClient.post('/investments/plans', payload);
    return data.data;
  }
};
