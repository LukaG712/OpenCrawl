import { load } from 'cheerio';
import { SearchOptions, SearchResponse, SearchResult } from '../../utils/types';
import { scrapeUrl } from '../scrape/index';
import logger from '../../utils/logger';
import config from '../../config';

interface SearxngResult {
  url: string;
  title: string;
  content?: string;
}

async function searchWithSearxng(query: string, limit: number): Promise<SearxngResult[]> {
  const searxngUrl = config.search.searxngUrl;
  if (!searxngUrl) {
    throw new Error('SearXNG URL not configured. Set SEARXNG_URL environment variable.');
  }

  const searchUrl = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
  logger.info(`Searching via SearXNG: ${query}`);

  const response = await fetch(searchUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`SearXNG search failed: ${response.status}`);
  }

  const data = await response.json();
  const results: SearxngResult[] = ((data as any).results || []).slice(0, limit).map((r: any) => ({
    url: r.url,
    title: r.title || '',
    content: r.content || '',
  }));

  return results;
}

async function searchWithGoogle(query: string, limit: number): Promise<SearxngResult[]> {
  // Use a public search API or fallback
  // For self-hosted, we recommend using SearXNG
  logger.warn('Google search requires SearXNG or another search backend. Set SEARXNG_URL for search functionality.');

  // Fallback: try to use a simple DuckDuckGo lite search
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = load(html);
    const results: SearxngResult[] = [];

    $('.result').each((_i, el) => {
      if (results.length >= limit) return;

      const url = $(el).find('.result__a').attr('href') || '';
      const title = $(el).find('.result__a').text().trim() || '';
      const content = $(el).find('.result__snippet').text().trim() || '';

      if (url && !url.startsWith('http://duckduckgo.com')) {
        results.push({ url, title, content });
      }
    });

    return results;
  } catch (err) {
    logger.warn(`DuckDuckGo search failed: ${(err as Error).message}`);
    return [];
  }
}

export async function search(options: SearchOptions): Promise<SearchResponse> {
  return searchUrls(options);
}

export async function searchUrls(options: SearchOptions): Promise<SearchResponse> {
  const {
    query,
    limit = 5,
    scrapeOptions,
  } = options;

  if (!query) {
    return {
      success: false,
      error: 'Search query is required',
    };
  }

  logger.info(`Search for: "${query}" (limit: ${limit})`);

  try {
    // Get search results
    let searchResults: SearxngResult[];

    if (config.search.provider === 'searxng' && config.search.searxngUrl) {
      searchResults = await searchWithSearxng(query, limit);
    } else {
      searchResults = await searchWithGoogle(query, limit);
    }

    if (searchResults.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Scrape each result if requested
    const results: SearchResult[] = [];

    for (const searchResult of searchResults) {
      const result: SearchResult = {
        url: searchResult.url,
        title: searchResult.title,
        description: searchResult.content || '',
      };

      // Scrape the page if scrape options are provided
      if (scrapeOptions) {
        try {
          const scrapeResult = await scrapeUrl({
            url: searchResult.url,
            formats: scrapeOptions.formats || ['markdown'],
            onlyMainContent: scrapeOptions.onlyMainContent ?? true,
          });

          if (scrapeResult.success && scrapeResult.data) {
            result.data = scrapeResult.data;
          }
        } catch (err) {
          logger.warn(`Failed to scrape search result ${searchResult.url}: ${(err as Error).message}`);
        }
      }

      results.push(result);
    }

    return {
      success: true,
      data: results,
    };
  } catch (err) {
    logger.error(`Search failed: ${(err as Error).message}`);
    return {
      success: false,
      error: `Search failed: ${(err as Error).message}`,
    };
  }
}
