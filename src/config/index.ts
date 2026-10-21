require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // API Key
  apiKey: process.env.API_KEY || 'Trapper-dev-key-change-me',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  // Scrape
  scrape: {
    timeout: parseInt(process.env.SCRAPE_TIMEOUT || '30000', 10),
    waitFor: parseInt(process.env.SCRAPE_WAIT_FOR || '0', 10),
    onlyMainContent: process.env.SCRAPE_ONLY_MAIN_CONTENT !== 'false',
    blockAds: process.env.SCRAPE_BLOCK_ADS !== 'false',
  },

  // Crawl
  crawl: {
    maxDepth: parseInt(process.env.CRAWL_MAX_DEPTH || '10', 10),
    maxPages: parseInt(process.env.CRAWL_MAX_PAGES || '100', 10),
    maxConcurrency: parseInt(process.env.CRAWL_MAX_CONCURRENCY || '5', 10),
    delay: parseInt(process.env.CRAWL_DELAY || '1000', 10),
  },

  // Browser
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    launchTimeout: parseInt(process.env.BROWSER_LAUNCH_TIMEOUT || '30000', 10),
  },

  // LLM (for JSON extraction)
  llm: {
    provider: process.env.LLM_PROVIDER || '',
  },

  // Search
  search: {
    provider: process.env.SEARCH_PROVIDER || 'google',
    searxngUrl: process.env.SEARXNG_URL || '',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Webhooks
  webhookSecret: process.env.WEBHOOK_SECRET || '',
};

export default config;
