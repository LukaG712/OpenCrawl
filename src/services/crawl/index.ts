import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { CrawlOptions } from '../../utils/types';
import { scrapeUrl } from '../scrape';
import logger from '../../utils/logger';
import config from '../../config';

export interface CrawlUrlEntry {
  url: string;
  depth: number;
}

// Robots.txt cache
const robotsCache = new Map<string, { parser: any; expiry: number }>();
const ROBOTS_CACHE_TTL = 3600000; // 1 hour

export function normalizeUrl(url: string, ignoreQueryParams: boolean = false): string {
  try {
    const parsed = new URL(url);
    if (ignoreQueryParams) {
      parsed.search = '';
    }
    // Remove trailing slash for consistency, except for root
    let href = parsed.href.replace(/\/+$/, '');
    if (!href) href = '/';
    return href;
  } catch {
    return url;
  }
}

export function isSameDomain(url: string, baseUrl: string, allowSubdomains: boolean = false): boolean {
  try {
    const parsedUrl = new URL(url);
    const parsedBase = new URL(baseUrl);

    if (parsedUrl.hostname === parsedBase.hostname) {
      return true;
    }

    if (allowSubdomains) {
      const baseDomain = parsedBase.hostname.split('.').slice(-2).join('.');
      const urlDomain = parsedUrl.hostname.split('.').slice(-2).join('.');
      return urlDomain === baseDomain;
    }

    return false;
  } catch {
    return false;
  }
}

export function matchesPathPatterns(
  url: string,
  includePaths?: string[],
  excludePaths?: string[]
): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    if (excludePaths && excludePaths.length > 0) {
      for (const pattern of excludePaths) {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped.replace(/\*/g, '.*'));
        if (regex.test(path)) {
          return false;
        }
      }
    }

    if (includePaths && includePaths.length > 0) {
      for (const pattern of includePaths) {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped.replace(/\*/g, '.*'));
        if (regex.test(path)) {
          return true;
        }
      }
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function fetchRobotsTxt(baseUrl: string): Promise<any | null> {
  try {
    const parsedUrl = new URL(baseUrl);
    const domainKey = parsedUrl.origin;

    // Check cache
    const cached = robotsCache.get(domainKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.parser;
    }

    const robotsUrl = new URL('/robots.txt', baseUrl);
    const response = await fetch(robotsUrl.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const text = await response.text();
    const robot = robotsParser(robotsUrl.toString(), text);

    // Cache the result
    robotsCache.set(domainKey, {
      parser: robot,
      expiry: Date.now() + ROBOTS_CACHE_TTL,
    });

    return robot;
  } catch {
    logger.warn(`Could not fetch robots.txt for ${baseUrl}`);
    return null;
  }
}

export async function discoverLinks(
  url: string,
  html: string,
  options: CrawlOptions
): Promise<string[]> {
  const $ = load(html);
  const links = new Set<string>();
  const baseUrl = url;

  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (!resolved.protocol.startsWith('http')) return;

      // Skip anchor-only links
      if (resolved.hash && resolved.pathname === baseUrl.split('/').slice(0, 3).join('/') + '/') return;

      const resolvedStr = resolved.toString();

      // Check domain
      if (!options.allowExternalLinks && !isSameDomain(resolvedStr, baseUrl, options.allowSubdomains)) {
        return;
      }

      // Check path patterns
      if (!matchesPathPatterns(resolvedStr, options.includePaths, options.excludePaths)) {
        return;
      }

      // Normalize
      const normalized = normalizeUrl(resolvedStr, options.ignoreQueryParameters);
      links.add(normalized);
    } catch {
      // Skip invalid URLs
    }
  });

  return Array.from(links);
}

export async function crawl(
  options: CrawlOptions,
  onProgress?: (result: any) => void
): Promise<any> {
  const {
    url,
    excludePaths,
    includePaths,
    maxDiscoveryDepth = config.crawl.maxDepth,
    limit = config.crawl.maxPages,
    delay = config.crawl.delay,
    maxConcurrency = config.crawl.maxConcurrency,
    ignoreRobotsTxt = false,
    scrapeOptions,
  } = options;

  logger.info(`Starting crawl from ${url}`);

  const visited = new Set<string>();
  const queue: CrawlUrlEntry[] = [{ url: normalizeUrl(url, options.ignoreQueryParameters), depth: 0 }];
  const results: any[] = [];
  const errors: any[] = [];
  let currentPage = 0;

  // Check robots.txt
  let robots: any | null = null;
  if (!ignoreRobotsTxt) {
    robots = await fetchRobotsTxt(url);
  }

  // Semaphore for concurrency control
  const semaphore = {
    count: maxConcurrency,
    wait: () => new Promise<void>((resolve) => {
      const check = () => {
        if (semaphore.count > 0) {
          semaphore.count--;
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    }),
    release: () => { semaphore.count++; },
  };

  while (queue.length > 0 && currentPage < limit) {
    const entry = queue.shift()!;
    const normalized = normalizeUrl(entry.url, options.ignoreQueryParameters);

    if (visited.has(normalized)) continue;

    // Check robots.txt
    if (robots && !ignoreRobotsTxt) {
      try {
        if (!robots.isAllowed(entry.url, 'TrapperBot')) {
          logger.info(`Blocked by robots.txt: ${entry.url}`);
          continue;
        }
      } catch {
        // Skip
      }
    }

    visited.add(normalized);
    currentPage++;

    logger.info(`Crawling page ${currentPage}/${limit}: ${entry.url}`);

    // Acquire semaphore slot
    await semaphore.wait();

    try {
      const scrapeOpts = {
        url: entry.url,
        formats: scrapeOptions?.formats || ['markdown'],
        onlyMainContent: scrapeOptions?.onlyMainContent ?? config.scrape.onlyMainContent,
        timeout: scrapeOptions?.timeout || config.scrape.timeout,
        waitFor: scrapeOptions?.waitFor || 0,
      };

      const result = await scrapeUrl(scrapeOpts);

      if (result.success && result.data) {
        const crawlResult = {
          success: true,
          page: currentPage,
          url: entry.url,
          data: result.data,
          metadata: result.data.metadata,
        };
        results.push(crawlResult);
        onProgress?.(crawlResult);

        // Discover new links if within depth limit
        if (entry.depth < maxDiscoveryDepth) {
          // Try to get HTML for link discovery - use raw HTML if available
          const htmlToSearch = result.data.html || result.data.markdown
            ? (result.data.html || '')
            : '';

          if (htmlToSearch) {
            const newLinks = await discoverLinks(entry.url, htmlToSearch, options);

            for (const link of newLinks) {
              const linkNormalized = normalizeUrl(link, options.ignoreQueryParameters);
              if (!visited.has(linkNormalized) && queue.length < limit * 2) {
                queue.push({ url: linkNormalized, depth: entry.depth + 1 });
              }
            }
          }
        }
      } else {
        errors.push({
          url: entry.url,
          error: result.error || 'Unknown error',
        });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      logger.error(`Error crawling ${entry.url}: ${errorMsg}`);
      errors.push({
        url: entry.url,
        error: errorMsg,
      });
    } finally {
      semaphore.release();
      // Delay between requests
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.info(`Crawl completed: ${results.length} pages scraped, ${errors.length} errors`);

  return {
    results,
    errors,
    totalPages: visited.size,
    scrapedPages: results.length,
  };
}
