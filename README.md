```
 ::::::::  :::::::::  :::::::::: ::::    :::  ::::::::  :::::::::      :::     :::       ::: :::        
:+:    :+: :+:    :+: :+:        :+:+:   :+: :+:    :+: :+:    :+:   :+: :+:   :+:       :+: :+:        
+:+    +:+ +:+    +:+ +:+        :+:+:+  +:+ +:+        +:+    +:+  +:+   +:+  +:+       +:+ +:+        
+#+    +:+ +#++:++#+  +#++:++#   +#+ +:+ +#+ +#+        +#++:++#:  +#++:++#++: +#+  +:+  +#+ +#+        
+#+    +#+ +#+        +#+        +#+  +#+#+# +#+        +#+    +#+ +#+     +#+ +#+ +#+#+ +#+ +#+        
#+#    #+# #+#        #+#        #+#   #+#+# #+#    #+# #+#    #+# #+#     #+#  #+#+# #+#+#  #+#        
 ########  ###        ########## ###    ####  ########  ###    ### ###     ###   ###   ###   ########## 
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

- **Scrape** - Fetch a single URL and return clean markdown, HTML, links, and metadata
- **Crawl** - Recursively discover and scrape subpages as an async job with polling
- **Map** - Quickly discover URLs on a site via sitemaps and link extraction
- **JavaScript rendering** - Headless browser fallback for SPA/JS-heavy pages
- **Content cleaning** - Strip navigation, ads, footers, and boilerplate
- **robots.txt respect** - Crawler honors robots.txt rules
- **URL deduplication** - Avoids scraping the same page twice
- **Configurable limits** - Depth, page count, include/exclude path patterns
- **API key authentication** - Bearer token auth on all endpoints
- **Rate limiting** - Per-key rate limiting to protect the service

---

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/LukaG712/OpenCrawl.git
cd OpenCrawl

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
  "formats": ["markdown", "html", "links"],
  "onlyMainContent": true,
  "waitFor": 0,
  "timeout": 30000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | _(required)_ | The URL to scrape |
| `formats` | string[] | `["markdown"]` | Output formats: `markdown`, `html`, `links` |
| `onlyMainContent` | boolean | `true` | Strip nav, footer, sidebar, etc. |
| `onlyCleanContent` | boolean | `false` | More aggressive content cleaning |
| `includeTags` | string[] | _(none)_ | Only keep these HTML tags |
| `excludeTags` | string[] | _(none)_ | Remove these HTML tags |
| `waitFor` | number | `0` | Milliseconds to wait after page load |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `headers` | object | _(none)_ | Custom HTTP headers |
| `blockAds` | boolean | `true` | Block ad-related requests |

**Response:**

```json
{
  "success": true,
  "data": {
    "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples...",
    "html": "<main>...</main>",
    "links": ["https://www.iana.org/domains/example"],
    "metadata": {
      "title": "Example Domain",
      "description": "Example Domain",
      "language": "en",
      "sourceURL": "https://example.com",
      "statusCode": 200,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**cURL example:**

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Authorization: Bearer opencrawl-dev-key-change-me" \
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
| `API_KEY` | `opencrawl-dev-key-change-me` | API authentication key |
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
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server  │────▶│    Redis    │
│  (curl/SDK) │◀────│  (Fastify)   │◀────│   (BullMQ)  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                           │ queues crawl jobs
                           ▼
                    ┌──────────────┐     ┌──────────────┐
                    │   Worker     │────▶│  Playwright  │
                    │  (BullMQ)    │     │  (Chromium)  │
                    └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Content Proc │
                    │ Cheerio +    │
                    │   Turndown   │
                    └──────────────┘
```

1. **API Server** - Handles HTTP requests, authentication, rate limiting, and synchronous operations (scrape, map)
2. **Worker** - Processes async crawl jobs from the Redis queue
3. **Redis** - Job queue (BullMQ) for crawl tasks and progress tracking
4. **Playwright** - Headless browser for JavaScript-rendered pages
5. **Content Processing** - Cheerio for HTML parsing, Turndown for markdown conversion

---

## Project Structure

```
opencrawl/
├── src/
│   ├── index.ts              # API server entry point
│   ├── worker.ts             # Background worker entry point
│   ├── api/
│   │   ├── server.ts         # Fastify app setup
│   │   ├── middleware/
│   │   │   └── auth.ts       # API key authentication
│   │   └── routes/
│   │       ├── scrape.ts     # POST /scrape
│   │       ├── crawl.ts      # POST /crawl, GET /crawl/:id, DELETE /crawl/:id
│   │       └── map.ts        # POST /map
│   ├── services/
│   │   ├── scrape/
│   │   │   ├── index.ts      # Main scrape logic (HTTP + browser fallback)
│   │   │   ├── browser.ts    # Playwright browser management
│   │   │   └── content.ts    # HTML to markdown, metadata, link extraction
│   │   ├── crawl/
│   │   │   └── index.ts      # Crawl engine (URL discovery, robots.txt, dedup)
│   │   └── map/
│   │       └── index.ts      # URL discovery via sitemap + links
│   ├── queue/
│   │   └── crawlQueue.ts     # BullMQ queue and worker setup
│   ├── database/
│   │   └── redis.ts          # Redis connection
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   └── utils/
│       ├── types.ts          # TypeScript interfaces
│       └── logger.ts         # Winston logger
├── tests/
│   └── services/
│       ├── content.test.ts   # Content processing tests
│       └── crawl.test.ts     # Crawl utility tests
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
├── jest.config.js
├── LICENSE
└── README.md
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
