import https from 'https';
import http from 'http';
import { ScrapeOptions, ScrapeResult, ScrapeData, ScrapeMetadata } from '../../utils/types';
import { htmlToMarkdown, extractMetadata, extractLinks, cleanHtml } from './content';
import { scrapeWithBrowser } from './browser';
import logger from '../../utils/logger';
import config from '../../config';

function fetchHtml(
  url: string,
  options: { timeout?: number; headers?: Record<string, string>; skipTlsVerification?: boolean }
): Promise<{ html: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || config.scrape.timeout;

    const agentOptions = options.skipTlsVerification
      ? { rejectUnauthorized: false }
      : {};

    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';

    const agent = isHttps
      ? new https.Agent(agentOptions)
      : new http.Agent();

    const reqOptions = {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers,
      },
      agent,
      timeout,
    };

    const req = (isHttps ? https : http).request(url, reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf-8');
        resolve({ html, statusCode: res.statusCode || 200 });
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Fetch failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });

    req.end();
  });
}

export async function scrapeUrl(options: ScrapeOptions): Promise<ScrapeResult> {
  const {
    url,
    formats = ['markdown'],
    onlyMainContent = config.scrape.onlyMainContent,
    onlyCleanContent = false,
    includeTags,
    excludeTags,
    waitFor = config.scrape.waitFor,
    timeout = config.scrape.timeout,
    headers,
    skipTlsVerification = false,
    blockAds = config.scrape.blockAds,
    removeBase64Images = false,
  } = options;

  logger.info(`Scraping URL: ${url}`);

  let html: string;
  let statusCode: number;
  let titleFromBrowser = '';

  try {
    // Try simple HTTP fetch first
    const fetchResult = await fetchHtml(url, { timeout, headers, skipTlsVerification });
    html = fetchResult.html;
    statusCode = fetchResult.statusCode;

    // If the HTML looks empty or like a JS app shell, fall back to browser
    const hasContent = html.length > 500 && !html.includes('<div id="root"></div>');
    if (!hasContent && waitFor === 0) {
      logger.info(`HTML appears to be JS-rendered, falling back to browser for ${url}`);
      const browserResult = await scrapeWithBrowser(url, {
        waitFor,
        timeout,
        headers,
        blockAds,
      });
      html = browserResult.html;
      titleFromBrowser = browserResult.title;
    }
  } catch (err) {
    logger.warn(`HTTP fetch failed for ${url}, trying browser: ${(err as Error).message}`);
    try {
      const browserResult = await scrapeWithBrowser(url, {
        waitFor,
        timeout,
        headers,
        blockAds,
      });
      html = browserResult.html;
      titleFromBrowser = browserResult.title;
      statusCode = 200;
    } catch (browserErr) {
      return {
        success: false,
        error: `Failed to scrape URL: ${(browserErr as Error).message}`,
      };
    }
  }

  // Clean HTML if requested
  let processedHtml = html;
  if (onlyMainContent || onlyCleanContent || includeTags || excludeTags) {
    processedHtml = cleanHtml(html, {
      onlyMainContent,
      onlyCleanContent,
      includeTags,
      excludeTags,
    });
  }

  // Extract metadata
  const metadata: ScrapeMetadata = extractMetadata(html, url);
  if (titleFromBrowser && !metadata.title) {
    metadata.title = titleFromBrowser;
  }
  metadata.statusCode = statusCode;
  metadata.createdAt = new Date().toISOString();

  // Build result data
  const data: ScrapeData = {
    metadata,
  };

  if (formats.includes('markdown')) {
    data.markdown = htmlToMarkdown(processedHtml);
    if (removeBase64Images && data.markdown) {
      data.markdown = data.markdown.replace(/!\[.*?\]\(data:[^\)]+\)/g, '');
    }
  }

  if (formats.includes('html')) {
    data.html = processedHtml;
  }

  if (formats.includes('links')) {
    data.links = extractLinks(html, url);
  }

  logger.info(`Successfully scraped ${url}`);

  return {
    success: true,
    data,
  };
}
