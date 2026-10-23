export interface MFFundResult {
  scheme_code: number;
  scheme_name: string;
  fund_house: string;
  plan_type: string;
  option_type: string;
  isin: string | null;
  isin_reinvest: string | null;
  category: string;
  sub_category: string;
  latest_nav_date?: string;
  latest_nav?: number;
  is_dormant?: boolean;
}

export interface MFSearchResponse {
  results: MFFundResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface MFNavHistoryPoint {
  nav_date: string;
  nav: number;
  day_change_pct: number;
}

export interface MFNavHistoryResponse {
  fund_details: MFFundResult;
  data: MFNavHistoryPoint[];
  total: number;
  page: number;
  page_size: number;
}

export interface MFCategory {
  id: number;
  category: string;
  sub_category: string;
  slug: string;
  scheme_count: number;
  active_scheme_count: number;
}

export interface MFCategoryResponse {
  results: MFCategory[];
}
