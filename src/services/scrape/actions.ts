import { Page } from 'playwright';
import {
  Action,
  WaitAction,
  ClickAction,
  WriteAction,
  PressAction,
  ScrollAction,
  ScreenshotAction,
  ScrapeAction,
  ExecuteJavascriptAction,
} from '../../utils/types';
import logger from '../../utils/logger';

export interface ActionsResult {
  screenshots?: string[];
  scrapes?: string[];
  javascriptReturns?: unknown[];
}

export async function executeActions(
  page: Page,
  actions: Action[]
): Promise<ActionsResult> {
  const result: ActionsResult = {
    screenshots: [],
    scrapes: [],
    javascriptReturns: [],
  };

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    logger.info(`Executing action ${i + 1}/${actions.length}: ${action.type}`);

    try {
      switch (action.type) {
        case 'wait':
          await executeWait(page, action);
          break;
        case 'click':
          await executeClick(page, action);
          break;
        case 'write':
          await executeWrite(page, action);
          break;
        case 'press':
          await executePress(page, action);
          break;
        case 'scroll':
          await executeScroll(page, action);
          break;
        case 'screenshot':
          await executeScreenshotAction(page, action, result);
          break;
        case 'scrape':
          await executeScrapeAction(page, result);
          break;
        case 'executeJavascript':
          await executeJavascriptAction(page, action, result);
          break;
        default:
          logger.warn(`Unknown action type: ${(action as any).type}`);
      }
    } catch (err) {
      logger.error(`Action ${action.type} failed: ${(err as Error).message}`);
      // Continue with next action instead of failing the whole scrape
    }
  }

  // Clean up empty arrays
  if (result.screenshots?.length === 0) delete result.screenshots;
  if (result.scrapes?.length === 0) delete result.scrapes;
  if (result.javascriptReturns?.length === 0) delete result.javascriptReturns;

  return result;
}

async function executeWait(page: Page, action: WaitAction): Promise<void> {
  if (action.selector) {
    // Wait for element to appear
    await page.waitForSelector(action.selector, { timeout: 30000 });
  } else if (action.milliseconds) {
    await page.waitForTimeout(action.milliseconds);
  } else {
    // Default wait
    await page.waitForTimeout(1000);
  }
}

async function executeClick(page: Page, action: ClickAction): Promise<void> {
  if (action.all) {
    // Click all matching elements
    const elements = await page.$$(action.selector);
    for (const el of elements) {
      try {
        await el.click();
      } catch {
        // Skip elements that can't be clicked
      }
    }
  } else {
    await page.click(action.selector);
  }
}

async function executeWrite(page: Page, action: WriteAction): Promise<void> {
  await page.keyboard.type(action.text);
}

async function executePress(page: Page, action: PressAction): Promise<void> {
  await page.keyboard.press(action.key);
}

async function executeScroll(page: Page, action: ScrollAction): Promise<void> {
  const direction = action.direction || 'down';

  if (action.selector) {
    // Scroll a specific element
    const selector = action.selector;
    const dir = direction;
    await page.evaluate(
      'const el = document.querySelector(arguments[0]); if (el) { el.scrollTop += arguments[1] === "down" ? 500 : -500; }',
      [selector, dir]
    );
  } else {
    // Scroll the page
    await page.evaluate(
      'window.scrollBy(0, arguments[0] === "down" ? window.innerHeight : -window.innerHeight)',
      [direction]
    );
  }
}

async function executeScreenshotAction(
  page: Page,
  action: ScreenshotAction,
  result: ActionsResult
): Promise<void> {
  const buf = await page.screenshot({
    type: 'png',
    fullPage: action.fullPage || false,
  });
  const base64 = buf.toString('base64');
  result.screenshots?.push(base64);
}

async function executeScrapeAction(page: Page, result: ActionsResult): Promise<void> {
  const html = await page.content();
  result.scrapes?.push(html);
}

async function executeJavascriptAction(
  page: Page,
  action: ExecuteJavascriptAction,
  result: ActionsResult
): Promise<void> {
  const returnValue = await page.evaluate((script) => {
    try {
      return eval(`(${script})`);
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, action.script);
  result.javascriptReturns?.push(returnValue);
}
