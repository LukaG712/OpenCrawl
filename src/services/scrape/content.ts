import { load } from 'cheerio';
import TurndownService from 'turndown';
import { ScrapeMetadata } from '../../utils/types';

let turndown: TurndownService;

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Remove data URLs (base64 images) to keep output clean
    turndown.addRule('removeBase64Images', {
      filter: (node) => {
        return (
          node.nodeName === 'IMG' &&
          node.getAttribute('src')?.startsWith('data:')
        );
      },
      replacement: () => '',
    });
  }
  return turndown;
}

export function htmlToMarkdown(html: string): string {
  const td = getTurndown();
  return td.turndown(html).trim();
}

export function extractMetadata(html: string, sourceUrl: string): ScrapeMetadata {
  const $ = load(html);

  const title = $('title').text().trim() || '';

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const language =
    $('html').attr('lang') ||
    $('html').attr('xml:lang') ||
    '';

  const metadata: ScrapeMetadata = {
    title,
    description,
    language,
    sourceURL: sourceUrl,
    createdAt: new Date().toISOString(),
  };

  return metadata;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links = new Set<string>();

  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol.startsWith('http')) {
        links.add(resolved.toString());
      }
    } catch {
      // Skip invalid URLs
    }
  });

  return Array.from(links).sort();
}

export function cleanHtml(html: string, options: {
  onlyMainContent?: boolean;
  onlyCleanContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
}): string {
  const $ = load(html);

  if (options.excludeTags && options.excludeTags.length > 0) {
    options.excludeTags.forEach((tag) => {
      $(tag).remove();
    });
  }

  if (options.includeTags && options.includeTags.length > 0) {
    const allContent = $('body').html() || '';
    $('body').empty();
    options.includeTags.forEach((tag) => {
      const elements = load(allContent)(tag);
      elements.each((_i, el) => {
        $('body').append(el);
      });
    });
  }

  if (options.onlyMainContent) {
    // Remove common non-content elements
    $(
      'nav, header, footer, aside, script, style, noscript, ' +
      '.nav, .header, .footer, .sidebar, .menu, .navigation, ' +
      '.breadcrumb, .cookie, .popup, .modal, .ad, .advertisement, ' +
      '.social, .share, .comments, .comment'
    ).remove();
  }

  if (options.onlyCleanContent) {
    // More aggressive cleaning
    $(
      'script, style, noscript, iframe, object, embed, ' +
      '.nav, .header, .footer, .sidebar, .menu, .navigation, ' +
      '.breadcrumb, .cookie, .popup, .modal, .ad, .advertisement, ' +
      '.social, .share, .comments, .comment, .widget, .banner'
    ).remove();
  }

  return $.html();
}
