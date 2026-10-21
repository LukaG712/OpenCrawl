import { load } from 'cheerio';
import { parseStringPromise } from 'xml2js';
import { MapOptions, MapResult, MapLink } from '../../utils/types';
import { discoverLinks, normalizeUrl } from '../crawl';
import { CrawlOptions } from '../../utils/types';
import logger from '../../utils/logger';

async function fetchSitemap(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapUrl = new URL('/sitemap.xml', baseUrl);

  try {
    logger.info(`Fetching sitemap: ${sitemapUrl.toString()}`);
    const response = await fetch(sitemapUrl.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try sitemap index
      logger.info(`Sitemap not found at ${sitemapUrl}, trying sitemap index`);
      return urls;
    }

    const text = await response.text();

    try {
      const result = await parseStringPromise(text);

      // Check if it's a sitemap index
      if (result.urlset && result.urlset.url) {
        for (const urlEntry of result.urlset.url) {
          if (urlEntry.loc && urlEntry.loc[0]) {
            urls.push(urlEntry.loc[0].trim());
          }
        }
      } else if (result.sitemapindex && result.sitemapindex.sitemap) {
        // It's a sitemap index - fetch each sitemap
        const sitemapUrls: string[] = [];
        for (const sitemap of result.sitemapindex.sitemap) {
          if (sitemap.loc && sitemap.loc[0]) {
            sitemapUrls.push(sitemap.loc[0].trim());
          }
        }

        // Fetch each sitemap concurrently
        const promises = sitemapUrls.map(async (sitemapUrl) => {
          try {
            const resp = await fetch(sitemapUrl, {
              signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok) return;
            const sitemapText = await resp.text();
            const sitemapResult = await parseStringPromise(sitemapText);
            if (sitemapResult.urlset && sitemapResult.urlset.url) {
              for (const urlEntry of sitemapResult.urlset.url) {
                if (urlEntry.loc && urlEntry.loc[0]) {
                  urls.push(urlEntry.loc[0].trim());
                }
              }
            }
          } catch {
            // Skip failed sitemaps
          }
        });

        await Promise.all(promises);
      }
    } catch {
      logger.warn(`Failed to parse sitemap: ${sitemapUrl}`);
    }
  } catch (err) {
    logger.warn(`Failed to fetch sitemap: ${(err as Error).message}`);
  }

  return urls;
}

async function discoverFromPage(
  baseUrl: string,
  limit: number
): Promise<string[]> {
  try {
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const crawlOpts: CrawlOptions = {
      url: baseUrl,
      allowExternalLinks: false,
      ignoreQueryParameters: true,
    };

    const links = await discoverLinks(baseUrl, html, crawlOpts);
    return links.slice(0, limit);
  } catch {
    return [];
  }
}

export async function mapUrl(options: MapOptions): Promise<MapResult> {
  const {
    url,
    ignoreSitemap = false,
    limit = 1000,
    includeSubdomains = false,
  } = options;

  logger.info(`Mapping URLs for: ${url}`);

  const seenUrls = new Set<string>();
  const links: MapLink[] = [];

  // Fetch from sitemap
  if (!ignoreSitemap) {
    const sitemapUrls = await fetchSitemap(url);
    for (const sitemapUrl of sitemapUrls) {
      const normalized = normalizeUrl(sitemapUrl, true);
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        links.push({ url: sitemapUrl });
        if (links.length >= limit) break;
      }
    }
  }

  // Discover from page
  const pageLinks = await discoverFromPage(url, limit - links.length);
  for (const pageLink of pageLinks) {
    const normalized = normalizeUrl(pageLink, true);
    if (!seenUrls.has(normalized)) {
      seenUrls.add(normalized);
      links.push({ url: pageLink });
    }
    if (links.length >= limit) break;
  }

  logger.info(`Map completed for ${url}: ${links.length} URLs found`);

  return {
    success: true,
    links,
  };
}
