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
        '--disable-software-rasterizer',
      ],
    });
    logger.info('Browser launched');
  }
  return browser;
}

export async function getContext(options?: { mobile?: boolean }): Promise<BrowserContext> {
  if (!browserContext) {
    const brow = await getBrowser();
    const viewport = options?.mobile
      ? { width: 375, height: 812 }
      : { width: 1280, height: 800 };

    browserContext = await brow.newContext({
      userAgent: options?.mobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport,
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
    screenshot?: boolean;
    mobile?: boolean;
  } = {}
): Promise<{ html: string; title: string; screenshot?: string; statusCode?: number }> {
  const context = await getContext({ mobile: options.mobile });
  const page: Page = await context.newPage();

  try {
    const timeout = options.timeout || config.scrape.timeout;

    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers);
    }

    if (options.mobile) {
      await page.setViewportSize({ width: 375, height: 812 });
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
          'facebook.com/tr',
          'connect.facebook.net',
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

    // Smart wait: wait for network to be idle if no explicit waitFor
    if (!options.waitFor || options.waitFor === 0) {
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch {
        // Network may never be fully idle; continue anyway
      }
    }

    // Wait for additional time if requested
    if (options.waitFor && options.waitFor > 0) {
      await page.waitForTimeout(options.waitFor);
    }

    const html = await page.content();
    const title = await page.title();

    let screenshot: string | undefined;
    if (options.screenshot) {
      const buf = await page.screenshot({
        type: 'png',
        fullPage: true,
      });
      // Convert to base64
      screenshot = buf.toString('base64');
    }

    const statusCode = response?.status();
    logger.info(`Browser scrape completed for ${url}, status: ${statusCode}`);

    return { html, title, screenshot, statusCode };
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
