export interface IPOSchedule {
  event: string;
  date: string;
}

export interface IPO {
  id: string;
  source: string;
  status: string;
  slug: string;
  name: string;
  symbol: string;
  type: string;
  startDate: string;
  endDate: string;
  listingDate: string;
  priceRange: string;
  minQty: number;
  minAmount: number;
  issueSize: string;
  about: string;
  schedule?: IPOSchedule[];
}

export interface IPOResponse {
  meta: {
    count: number;
    countOnPage: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  ipos: IPO[];
}
