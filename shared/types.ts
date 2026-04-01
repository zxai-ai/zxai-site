// Shared types for AI Visibility Audit Tool

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  FIRECRAWL_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
}

export interface Order {
  id: string;
  email: string;
  url: string;
  stripe_payment_id: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "scraping"
  | "analyzing"
  | "delivering"
  | "delivered"
  | "failed";

export interface RawData {
  order_id: string;
  firecrawl_data: string | null;
  places_data: string | null;
  scraped_at: string;
}

export interface FirecrawlResult {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    language?: string;
    statusCode?: number;
    [key: string]: unknown;
  };
}

export interface PlacesResult {
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  phone: string | null;
  hours: string[] | null;
  categories: string[] | null;
  website: string | null;
}

export interface DimensionScore {
  score: number;
  summary: string;
  findings: string[];
}

export interface Recommendation {
  action: string;
  impact: string;
  difficulty: "easy" | "medium" | "hard";
  dimension: string;
}

export interface ReportData {
  order_id: string;
  url: string;
  practice_name: string;
  audit_date: string;
  scores: {
    overall: number;
    seo: DimensionScore;
    geo_ai: DimensionScore;
    local: DimensionScore;
    content: DimensionScore;
    competitor_gap: DimensionScore;
  };
  recommendations: Recommendation[];
}

export interface ReportRow {
  order_id: string;
  report_json: string;
  score_overall: number;
  delivered_at: string | null;
}
