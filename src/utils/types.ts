export interface JsonFormatOptions {
  type: 'json';
  schema?: Record<string, unknown>;
  prompt?: string;
}

export type ScrapeFormat = 'markdown' | 'html' | 'links' | 'screenshot' | 'raw' | 'branded' | JsonFormatOptions;

export interface ScrapeOptions {
  url: string;
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  onlyCleanContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
  timeout?: number;
  headers?: Record<string, string>;
  skipTlsVerification?: boolean;
  blockAds?: boolean;
  removeBase64Images?: boolean;
  mobile?: boolean;
  parsePDF?: boolean;
  skipBackupAgents?: boolean;
}

export interface ExtractOptions {
  url: string;
  schema?: Record<string, unknown>;
  prompt?: string;
  allowExternalLinks?: boolean;
  includeSubdomains?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapeData;
  error?: string;
}

export interface ScrapeData {
  markdown?: string;
  html?: string;
  raw?: string;
  links?: string[];
  screenshot?: string;
  branded?: BrandedData;
  json?: Record<string, unknown>;
  metadata: ScrapeMetadata;
}

export interface BrandedData {
  colors?: string[];
  fonts?: string[];
  logo?: string;
  theme?: string;
}

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
  statusCode?: number;
  scrapeId?: string;
  createdAt?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  robots?: string;
  contentType?: string;
  pageSize?: number;
  favicon?: string;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  dns?: string[];
}

export interface CrawlOptions {
  url: string;
  excludePaths?: string[];
  includePaths?: string[];
  maxDiscoveryDepth?: number;
  sitemap?: 'include' | 'exclude' | 'only';
  ignoreQueryParameters?: boolean;
  limit?: number;
  crawlEntireDomain?: boolean;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  ignoreRobotsTxt?: boolean;
  delay?: number;
  maxConcurrency?: number;
  webhook?: string;
  scrapeOptions?: {
    formats?: ScrapeFormat[];
    onlyMainContent?: boolean;
    onlyCleanContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
    timeout?: number;
  };
}

export interface CrawlJob {
  jobId: string;
  status: 'scraping' | 'completed' | 'failed';
  totalPages: number;
  scrapedPages: number;
  options: CrawlOptions;
  results: CrawlResult[];
  errors?: CrawlError[];
  nextPollMs?: number;
  createdAt: string;
  completedAt?: string;
  webhook?: string;
}

export interface CrawlResult {
  success: boolean;
  page?: number;
  url?: string;
  data?: ScrapeData;
  error?: string;
  metadata?: ScrapeMetadata;
}

export interface CrawlError {
  url: string;
  error: string;
  statusCode?: number;
}

export interface MapOptions {
  url: string;
  search?: string;
  ignoreSitemap?: boolean;
  limit?: number;
  includeSubdomains?: boolean;
}

export interface MapResult {
  success: boolean;
  links?: MapLink[];
  error?: string;
}

export interface MapLink {
  url: string;
  title?: string;
  description?: string;
}

// Batch Scrape types
export interface BatchScrapeOptions {
  urls: string[];
  scrapeOptions?: {
    formats?: ScrapeFormat[];
    onlyMainContent?: boolean;
    onlyCleanContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
    timeout?: number;
  };
  webhook?: string;
}

export interface BatchScrapeJob {
  jobId: string;
  status: 'scraping' | 'completed' | 'failed';
  totalUrls: number;
  scrapedUrls: number;
  options: BatchScrapeOptions;
  results: BatchScrapeResult[];
  errors?: CrawlError[];
  createdAt: string;
  completedAt?: string;
  webhook?: string;
}

export interface BatchScrapeResult {
  success: boolean;
  url?: string;
  data?: ScrapeData;
  error?: string;
  metadata?: ScrapeMetadata;
}

// Search types
export interface SearchOptions {
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ScrapeFormat[];
    onlyMainContent?: boolean;
  };
}

export interface SearchResult {
  url: string;
  title: string;
  description: string;
  data?: ScrapeData;
}

export interface SearchResponse {
  success: boolean;
  data?: SearchResult[];
  error?: string;
}
