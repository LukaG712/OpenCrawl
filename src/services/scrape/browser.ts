import { chromium, Browser, BrowserContext, Page } from 'playwright';
import config from '../../config';
import logger from '../../utils/logger';

let browser: Browser | null = null;
let browserContext: BrowserContext | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: config.browser.headless,
      timeout: config.browser.launchTimeout,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    logger.info('Browser launched');
  }
  return browser;
}

export async function getContext(): Promise<BrowserContext> {
  if (!browserContext) {
    const brow = await getBrowser();
    browserContext = await brow.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
  }
  return browserContext;
}

export async function scrapeWithBrowser(
  url: string,
  options: {
    waitFor?: number;
    timeout?: number;
    headers?: Record<string, string>;
    blockAds?: boolean;
  } = {}
): Promise<{ html: string; title: string; screenshot?: string }> {
  const context = await getContext();
  const page: Page = await context.newPage();

  try {
    const timeout = options.timeout || config.scrape.timeout;

    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers);
    }

    if (options.blockAds) {
      await page.route('**/*', async (route) => {
        const reqUrl = route.request().url();
        const adPatterns = [
          '/ads/',
          '/ad/',
          'doubleclick',
          'adservice',
          'googlesyndication',
          'adsbygoogle',
          'facebook.com/plugins',
          'pixel.',
          'analytics.',
          'google-analytics',
        ];
        if (adPatterns.some((p) => reqUrl.toLowerCase().includes(p))) {
          await route.abort();
          return;
        }
        await route.continue();
      });
    }

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // Wait for additional time if requested
    if (options.waitFor && options.waitFor > 0) {
      await page.waitForTimeout(options.waitFor);
    }

    const html = await page.content();
    const title = await page.title();

    let screenshot: string | undefined;
    if (options.blockAds === false) {
      // Only capture screenshot if explicitly needed
    }

    const statusCode = response?.status();
    logger.info(`Browser scrape completed for ${url}, status: ${statusCode}`);

    return { html, title };
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
    logger.info('Browser closed');
  }
}
