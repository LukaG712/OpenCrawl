export interface ScrapeOptions {
  url: string;
  formats?: ('markdown' | 'html' | 'links' | 'screenshot')[];
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
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapeData;
  error?: string;
}

export interface ScrapeData {
  markdown?: string;
  html?: string;
  links?: string[];
  screenshot?: string;
  metadata: ScrapeMetadata;
}

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
  statusCode?: number;
  scrapeId?: string;
  createdAt?: string;
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
  scrapeOptions?: {
    formats?: ('markdown' | 'html' | 'links' | 'screenshot')[];
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
