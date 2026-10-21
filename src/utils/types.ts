export interface JsonFormatOptions {
  type: 'json';
  schema?: Record<string, unknown>;
  prompt?: string;
}

export type ScrapeFormat = 'markdown' | 'html' | 'links' | 'screenshot' | 'raw' | 'branded' | 'extract' | JsonFormatOptions;

// Action types for page interaction
export interface WaitAction {
  type: 'wait';
  milliseconds?: number;
  selector?: string;
}

export interface ClickAction {
  type: 'click';
  selector: string;
  all?: boolean;
}

export interface WriteAction {
  type: 'write';
  text: string;
}

export interface PressAction {
  type: 'press';
  key: string;
}

export interface ScrollAction {
  type: 'scroll';
  direction?: 'up' | 'down';
  selector?: string;
}

export interface ScreenshotAction {
  type: 'screenshot';
  fullPage?: boolean;
  quality?: number;
}

export interface ScrapeAction {
  type: 'scrape';
}

export interface ExecuteJavascriptAction {
  type: 'executeJavascript';
  script: string;
}

export type Action =
  | WaitAction
  | ClickAction
  | WriteAction
  | PressAction
  | ScrollAction
  | ScreenshotAction
  | ScrapeAction
  | ExecuteJavascriptAction;

export interface ActionResult {
  actions?: {
    screenshots?: string[];
    scrapes?: string[];
    javascriptReturns?: unknown[];
  };
}

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
  actions?: Action[];
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
  actions?: {
    screenshots?: string[];
    scrapes?: string[];
    javascriptReturns?: unknown[];
  };
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

// Interact types
export interface InteractOptions {
  scrapeId?: string;
  prompt?: string;
  code?: string;
  actions?: Action[];
}

export interface InteractResult {
  success: boolean;
  data?: ScrapeData;
  error?: string;
  scrapeId?: string;
}

// Extract types (multi-page structured extraction)
export interface ExtractOptions {
  urls?: string[];
  prompt: string;
  schema?: Record<string, unknown>;
  allowExternalLinks?: boolean;
  includeSubdomains?: boolean;
}

export interface ExtractJob {
  jobId: string;
  status: 'extracting' | 'completed' | 'failed';
  options: ExtractOptions;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
  webhook?: string;
}

// Agent types
export interface AgentOptions {
  prompt: string;
  schema?: Record<string, unknown>;
  urls?: string[];
  search?: string;
  limit?: number;
}

export interface AgentJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  options: AgentOptions;
  result?: Record<string, unknown>;
  error?: string;
  sources?: string[];
  createdAt: string;
  completedAt?: string;
}
