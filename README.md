```
     _______..______    _______   ______ .___________..______          ___      
    /       ||   _  \  |   ____| /      ||           ||   _  \        /   \     
   |   (----`|  |_)  | |  |__   |  ,----'`---|  |----`|  |_)  |      /  ^  \    
    \   \    |   ___/  |   __|  |  |         |  |     |      /      /  /_\  \   
.----)   |   |  |      |  |____ |  `----.    |  |     |  |\  \----./  _____  \  
|_______/    | _|      |_______| \______|    |__|     | _| `._____/__/     \__\ 
                                                                                
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![API](https://img.shields.io/badge/API-REST-orange.svg)](https://restfulapi.net/)

A self-hosted, open-source web scraping and crawling API that turns websites into clean, LLM-ready data.

Scrape single pages, recursively crawl entire sites, and discover URLs - all returning clean markdown, HTML, and structured metadata. Think of it as your own private, fully controllable scraping infrastructure.

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Language | TypeScript | Type safety, modern ecosystem, great tooling |
| Framework | Fastify | High-performance Node.js HTTP framework with built-in validation |
| Queue | BullMQ (Redis) | Reliable job queue for async crawl jobs with progress tracking |
| Browser | Playwright | Headless Chromium for JavaScript-rendered pages |
| HTML Parsing | Cheerio | Fast, jQuery-like DOM manipulation |
| Markdown | Turndown | Reliable HTML-to-markdown conversion |
| Container | Docker + Compose | Single-command deployment |

---

## Features

- **Scrape** - Fetch a single URL and return clean markdown, HTML, links, screenshots, and metadata
- **Crawl** - Recursively discover and scrape subpages as an async job with polling and webhooks
- **Batch Scrape** - Scrape multiple URLs simultaneously as an async job
- **Map** - Quickly discover URLs on a site via sitemaps and link extraction
- **Search** - Query the web and return scraped results
- **Interact** - Interact with pages after scraping: click, type, scroll, execute code in live browser sessions
- **Extract** - Multi-page structured data extraction across multiple URLs
- **Agent** - Prompt-driven research agent that searches, scrapes, and returns structured data
- **Actions** - Drive pages before scraping: click, scroll, write, press keys, wait, screenshot, execute JS
- **JSON Extraction** - Extract structured data using LLM-powered JSON schema extraction
- **Branding Extraction** - Extract colors, fonts, logo, and theme from any webpage
- **JavaScript rendering** - Headless browser fallback for SPA/JS-heavy pages
- **PDF support** - Render and extract text from PDF files via browser
- **Screenshots** - Capture full-page screenshots of any URL
- **Mobile mode** - Scrape pages with mobile viewport and user agent
- **Smart wait** - Automatic network-idle detection for dynamic content
- **Content cleaning** - Strip navigation, ads, footers, and boilerplate
- **Rich metadata** - Open Graph, Twitter Cards, canonical URL, author, dates, favicon
- **robots.txt respect** - Crawler honors robots.txt rules with caching
- **URL deduplication** - Avoids scraping the same page twice
- **Configurable limits** - Depth, page count, include/exclude path patterns
- **Retry with backoff** - Automatic retries with exponential backoff for failed requests
- **Webhooks** - Get notified when crawl or batch scrape jobs complete (with HMAC signatures)
- **API key authentication** - Bearer token auth on all endpoints
- **Rate limiting** - Per-key rate limiting to protect the service

---

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/LukaG712/Trapper.git
cd Trapper

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Check logs
docker compose logs -f api
```

The API is available at `http://localhost:3000`.

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Start Redis locally (or use Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Start the API server
npm run dev

# In another terminal, start the worker
npm run dev:worker
```

---

## API Reference

All endpoints require authentication via the `Authorization: Bearer <API_KEY>` header or the `?api-key=<API_KEY>` query parameter.

### Health Check

```
GET /health
```

No authentication required.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### Scrape

Scrape a single URL and return clean content.

```
POST /scrape
```

**Request:**

```json
{
  "url": "https://example.com",
  "formats": ["markdown", "html", "links", "screenshot"],
  "onlyMainContent": true,
  "waitFor": 0,
  "timeout": 30000,
  "mobile": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | _(required)_ | The URL to scrape |
| `formats` | string[] | `["markdown"]` | Output formats: `markdown`, `html`, `links`, `screenshot`, `raw`, `branded`, or `{type: "json", schema: {...}}` |
| `onlyMainContent` | boolean | `true` | Strip nav, footer, sidebar, etc. |
| `onlyCleanContent` | boolean | `false` | More aggressive content cleaning |
| `includeTags` | string[] | _(none)_ | Only keep these HTML tags |
| `excludeTags` | string[] | _(none)_ | Remove these HTML tags |
| `waitFor` | number | `0` | Milliseconds to wait after page load |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `headers` | object | _(none)_ | Custom HTTP headers |
| `blockAds` | boolean | `true` | Block ad-related requests |
| `removeBase64Images` | boolean | `false` | Strip base64-encoded images from markdown |
| `mobile` | boolean | `false` | Use mobile viewport and user agent |
| `parsePDF` | boolean | `false` | Force PDF parsing via browser |
| `skipTlsVerification` | boolean | `false` | Skip TLS certificate verification |
| `actions` | object[] | _(none)_ | Page interaction actions to run before scraping |

**Actions** - Interact with a page before scraping:

| Action | Parameters | Description |
|--------|------------|-------------|
| `wait` | `milliseconds?: number`, `selector?: string` | Wait for time or element |
| `click` | `selector: string`, `all?: boolean` | Click element(s) |
| `write` | `text: string` | Type text at cursor |
| `press` | `key: string` | Press a key (e.g. `"Enter"`) |
| `scroll` | `direction?: "up" \| "down"`, `selector?: string` | Scroll page or element |
| `screenshot` | `fullPage?: boolean` | Capture screenshot mid-flow |
| `scrape` | _(none)_ | Snapshot current DOM |
| `executeJavascript` | `script: string` | Run arbitrary JS |

**Actions example:**

```json
{
  "url": "https://example.com",
  "actions": [
    { "type": "wait", "milliseconds": 1000 },
    { "type": "click", "selector": "#accept-cookies" },
    { "type": "scroll", "direction": "down" },
    { "type": "wait", "milliseconds": 2000 }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples...",
    "html": "<main>...</main>",
    "links": ["https://www.iana.org/domains/example"],
    "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
    "metadata": {
      "title": "Example Domain",
      "description": "Example Domain",
      "language": "en",
      "sourceURL": "https://example.com",
      "statusCode": 200,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "ogTitle": "Example Domain",
      "ogImage": "https://example.com/image.png",
      "canonicalUrl": "https://example.com/",
      "favicon": "https://example.com/favicon.ico",
      "author": "John Doe",
      "pageSize": 12345
    }
  }
}
```

**JSON Extraction example:**

```json
{
  "url": "https://example.com",
  "formats": [
    {
      "type": "json",
      "schema": {
        "type": "object",
        "properties": {
          "company_mission": { "type": "string" },
          "supports_sso": { "type": "boolean" }
        }
      },
      "prompt": "Extract company information from the page"
    }
  ]
}
```

Requires `LLM_PROVIDER=openai` and `OPENAI_API_KEY` to be set.

**cURL example:**

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Authorization: Bearer Trapper-dev-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown", "html"]}'
```

### Crawl

Start an asynchronous crawl job that recursively discovers and scrapes pages.

```
POST /crawl
```

**Request:**

```json
{
  "url": "https://example.com",
  "excludePaths": ["/admin/*", "/api/*"],
  "includePaths": ["/blog/*"],
  "maxDiscoveryDepth": 3,
  "limit": 50,
  "ignoreQueryParameters": true,
  "ignoreRobotsTxt": false,
  "delay": 1000,
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | _(required)_ | Starting URL |
| `excludePaths` | string[] | _(none)_ | URL path patterns to exclude |
| `includePaths` | string[] | _(none)_ | Only crawl matching paths |
| `maxDiscoveryDepth` | number | `10` | Maximum crawl depth |
| `limit` | number | `100` | Maximum pages to scrape |
| `ignoreQueryParameters` | boolean | `false` | Treat URLs with different query params as same |
| `ignoreRobotsTxt` | boolean | `false` | Skip robots.txt checking |
| `allowExternalLinks` | boolean | `false` | Follow links to other domains |
| `allowSubdomains` | boolean | `false` | Include subdomains |
| `delay` | number | `1000` | Delay between requests (ms) |
| `maxConcurrency` | number | `5` | Concurrent scrape operations |
| `webhook` | string | _(none)_ | URL to notify when crawl completes |
| `scrapeOptions` | object | _(none)_ | Options passed to each scrape |

**Response:**

```json
{
  "success": true,
  "jobId": "abc-123-def",
  "url": "http://localhost:3000/crawl/abc-123-def",
  "message": "Crawl job created. Use the jobId to check status."
}
```

### Crawl Status

Poll for crawl job progress and results.

```
GET /crawl/:jobId
```

**Response:**

```json
{
  "success": true,
  "status": "scraping",
  "jobId": "abc-123-def",
  "totalPages": 50,
  "scrapedPages": 12,
  "data": [
    {
      "success": true,
      "page": 1,
      "url": "https://example.com",
      "data": {
        "markdown": "...",
        "metadata": { ... }
      }
    }
  ],
  "errors": [],
  "nextPollMs": 2000
}
```

**Status values:** `scraping`, `completed`, `failed`

### Cancel Crawl

```
DELETE /crawl/:jobId
```

**Response:**

```json
{ "success": true, "message": "Crawl job cancelled" }
```

### Map

Discover URLs on a website via sitemap and link extraction.

```
POST /map
```

**Request:**

```json
{
  "url": "https://example.com",
  "ignoreSitemap": false,
  "limit": 1000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | _(required)_ | The website URL |
| `ignoreSitemap` | boolean | `false` | Skip sitemap.xml parsing |
| `limit` | number | `1000` | Maximum URLs to return |

**Response:**

```json
{
  "success": true,
  "links": [
    { "url": "https://example.com/" },
    { "url": "https://example.com/about" },
    { "url": "https://example.com/blog" }
  ]
}
```

### Batch Scrape

Scrape multiple URLs simultaneously as an asynchronous job.

```
POST /batch_scrape
```

**Request:**

```json
{
  "urls": ["https://example.com", "https://example.com/about"],
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true
  },
  "webhook": "https://your-app.com/webhook"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `urls` | string[] | _(required)_ | List of URLs to scrape |
| `scrapeOptions` | object | _(none)_ | Options passed to each scrape |
| `webhook` | string | _(none)_ | URL to notify when job completes |

**Response:**

```json
{
  "success": true,
  "jobId": "abc-123-def",
  "url": "http://localhost:3000/batch_scrape/abc-123-def"
}
```

### Batch Scrape Status

```
GET /batch_scrape/:jobId
```

**Response:**

```json
{
  "success": true,
  "status": "scraping",
  "jobId": "abc-123-def",
  "totalUrls": 10,
  "scrapedUrls": 5,
  "data": [ ... ],
  "errors": []
}
```

### Cancel Batch Scrape

```
DELETE /batch_scrape/:jobId
```

### Search

Search the web and optionally scrape results.

```
POST /search
```

**Request:**

```json
{
  "query": "web scraping tools",
  "limit": 5,
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | _(required)_ | Search query |
| `limit` | number | `5` | Max results to return |
| `scrapeOptions` | object | _(none)_ | If set, each result is scraped |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "url": "https://example.com",
      "title": "Example Domain",
      "description": "This domain is for use in documentation...",
      "data": {
        "markdown": "...",
        "metadata": { ... }
      }
    }
  ]
}
```

Search uses DuckDuckGo by default. For better results, set up [SearXNG](https://github.com/searxng/searxng) and configure `SEARXNG_URL`.

### Interact

Interact with a page in a live browser session. Click, type, scroll, execute code, and extract the resulting page state.

```
POST /interact
```

**Request:**

```json
{
  "scrapeId": "session-uuid",
  "actions": [
    { "type": "click", "selector": "#login-btn" },
    { "type": "wait", "milliseconds": 1000 },
    { "type": "click", "selector": "#username" },
    { "type": "write", "text": "user@example.com" },
    { "type": "press", "key": "Tab" },
    { "type": "write", "text": "password123" },
    { "type": "press", "key": "Enter" },
    { "type": "wait", "milliseconds": 2000 }
  ]
}
```

Or use natural language prompts:

```json
{
  "scrapeId": "session-uuid",
  "prompt": "click #next-page and wait 2000"
}
```

Or execute Playwright code directly:

```json
{
  "scrapeId": "session-uuid",
  "code": "await page.click('#submit'); await page.waitForLoadState('networkidle');"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scrapeId` | string | _(auto-created)_ | Browser session ID (returned by previous interact call) |
| `actions` | object[] | _(none)_ | List of actions to execute |
| `prompt` | string | _(none)_ | Natural language instruction |
| `code` | string | _(none)_ | Playwright code to execute |

**Response:**

```json
{
  "success": true,
  "scrapeId": "session-uuid",
  "data": {
    "markdown": "...",
    "metadata": { ... }
  }
}
```

Sessions persist for 30 minutes and are automatically cleaned up.

### Extract

Extract structured data from multiple URLs in one async job.

```
POST /extract
```

**Request:**

```json
{
  "urls": ["https://example.com/pricing", "https://example.com/features"],
  "prompt": "Extract pricing plans and features",
  "schema": {
    "type": "object",
    "properties": {
      "plans": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "price": { "type": "string" },
            "features": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `urls` | string[] | _(required)_ | URLs to extract data from |
| `prompt` | string | _(required)_ | Extraction instruction |
| `schema` | object | _(none)_ | JSON Schema for structured output |

**Status:** `GET /extract/:jobId`

**Delete:** `DELETE /extract/:jobId`

Requires `LLM_PROVIDER=openai` and `OPENAI_API_KEY`.

### Agent

Prompt-driven research agent that autonomously searches, scrapes, and returns structured data.

```
POST /agent
```

**Request:**

```json
{
  "prompt": "Find the top 5 web scraping tools and their pricing",
  "search": "web scraping tools 2024",
  "limit": 10,
  "schema": {
    "type": "object",
    "properties": {
      "tools": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "pricing": { "type": "string" },
            "website": { "type": "string" }
          }
        }
      }
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt` | string | _(required)_ | What data you want |
| `search` | string | _(none)_ | Search query to find relevant pages |
| `urls` | string[] | _(none)_ | Specific URLs to analyze |
| `schema` | object | _(none)_ | JSON Schema for structured output |
| `limit` | number | `5` | Max search results |

**Status:** `GET /agent/:jobId`

**Delete:** `DELETE /agent/:jobId`

Requires `LLM_PROVIDER=openai` and `OPENAI_API_KEY`.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized (missing or invalid API key) |
| 404 | Not found (job ID does not exist) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Configuration

All configuration is via environment variables. See `.env.example` for all options:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `HOST` | `0.0.0.0` | Bind address |
| `API_KEY` | `Trapper-dev-key-change-me` | API authentication key |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `RATE_LIMIT_MAX` | `60` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `SCRAPE_TIMEOUT` | `30000` | Scrape timeout (ms) |
| `SCRAPE_ONLY_MAIN_CONTENT` | `true` | Default content cleaning |
| `SCRAPE_BLOCK_ADS` | `true` | Block ad requests by default |
| `CRAWL_MAX_DEPTH` | `10` | Default max crawl depth |
| `CRAWL_MAX_PAGES` | `100` | Default max pages per crawl |
| `CRAWL_MAX_CONCURRENCY` | `5` | Default concurrent scrapes |
| `CRAWL_DELAY` | `1000` | Default delay between requests (ms) |
| `BROWSER_HEADLESS` | `true` | Run browser in headless mode |
| `LLM_PROVIDER` | _(none)_ | LLM provider for JSON extraction (`openai`) |
| `OPENAI_API_KEY` | _(none)_ | OpenAI API key for JSON extraction |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `SEARCH_PROVIDER` | `google` | Search provider (`google`, `searxng`) |
| `SEARXNG_URL` | _(none)_ | SearXNG instance URL for search |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `WEBHOOK_SECRET` | _(none)_ | Secret for HMAC webhook signatures |

---

## Architecture

```
+-------------+     +--------------+     +-------------+
�   Client    �----?�  API Server  �----?�    Redis    �
�  (curl/SDK) �?----�  (Fastify)   �?----�   (BullMQ)  �
+-------------+     +--------------+     +-------------+
                           �
                           � queues crawl jobs
                           ?
                    +--------------+     +--------------+
                    �   Worker     �----?�  Playwright  �
                    �  (BullMQ)    �     �  (Chromium)  �
                    +--------------+     +--------------+
                           �
                           ?
                    +--------------+
                    � Content Proc �
                    � Cheerio +    �
                    �   Turndown   �
                    +--------------+
```

1. **API Server** - Handles HTTP requests, authentication, rate limiting, and synchronous operations (scrape, map)
2. **Worker** - Processes async crawl jobs from the Redis queue
3. **Redis** - Job queue (BullMQ) for crawl tasks and progress tracking
4. **Playwright** - Headless browser for JavaScript-rendered pages
5. **Content Processing** - Cheerio for HTML parsing, Turndown for markdown conversion

---

## Project Structure

```
Trapper/
+-- src/
�   +-- index.ts              # API server entry point
�   +-- worker.ts             # Background worker entry point (crawl, batch scrape, extract, agent)
�   +-- api/
�   �   +-- server.ts         # Fastify app setup
�   �   +-- middleware/
�   �   �   +-- auth.ts       # API key authentication
�   �   +-- routes/
�   �       +-- scrape.ts     # POST /scrape
�   �       +-- crawl.ts      # POST /crawl, GET /crawl/:id, DELETE /crawl/:id
�   �       +-- map.ts        # POST /map
�   �       +-- batchScrape.ts # POST /batch_scrape, GET/DELETE /batch_scrape/:id
�   �       +-- search.ts     # POST /search
�   �       +-- interact.ts   # POST /interact
�   �       +-- extract.ts    # POST /extract, GET/DELETE /extract/:id
�   �       +-- agent.ts      # POST /agent, GET/DELETE /agent/:id
�   +-- services/
�   �   +-- scrape/
�   �   �   +-- index.ts      # Main scrape logic (HTTP + browser fallback, retry)
�   �   �   +-- browser.ts    # Playwright browser management, sessions, screenshots
�   �   �   +-- content.ts    # HTML to markdown, metadata, branding, link extraction
�   �   �   +-- actions.ts    # Page interaction actions (click, scroll, write, etc.)
�   �   +-- crawl/
�   �   �   +-- index.ts      # Crawl engine (URL discovery, robots.txt with caching)
�   �   +-- map/
�   �   �   +-- index.ts      # URL discovery via sitemap + links
�   �   +-- search/
�   �   �   +-- index.ts      # Web search (DuckDuckGo / SearXNG)
�   �   +-- interact/
�   �   �   +-- index.ts      # Browser session interaction
�   �   +-- extract/
�   �   �   +-- index.ts      # Multi-page structured extraction
�   �   +-- agent/
�   �       +-- index.ts      # Prompt-driven research agent
�   +-- queue/
�   �   +-- crawlQueue.ts     # BullMQ crawl queue
�   �   +-- batchScrapeQueue.ts # BullMQ batch scrape queue
�   �   +-- extractQueue.ts   # BullMQ extract queue
�   �   +-- agentQueue.ts     # BullMQ agent queue
�   +-- database/
�   �   +-- redis.ts          # Redis connection
�   +-- config/
�   �   +-- index.ts          # Environment configuration
�   +-- utils/
�       +-- types.ts          # TypeScript interfaces
�       +-- logger.ts         # Winston logger
�       +-- webhook.ts        # Webhook notification utility
+-- tests/
�   +-- services/
�       +-- content.test.ts   # Content processing tests
�       +-- crawl.test.ts     # Crawl utility tests
+-- docker-compose.yml
+-- Dockerfile
+-- .env.example
+-- package.json
+-- tsconfig.json
+-- jest.config.js
+-- LICENSE
+-- README.md
```

---

## Running Tests

```bash
npm test
```

---

## License

MIT - see [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please open an issue or pull request.

---

## Contributors

| <img src="https://github.com/LukaG712.png" width="40" height="40" alt="LukaG712" /> | [LukaG712](https://github.com/LukaG712) |
|:---:|---|
| Creator & Maintainer | Original author, full implementation |
