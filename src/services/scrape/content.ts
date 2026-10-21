import { load } from 'cheerio';
import TurndownService from 'turndown';
import { ScrapeMetadata, BrandedData } from '../../utils/types';

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

export function extractMetadata(html: string, sourceUrl: string, headers?: Record<string, string>): ScrapeMetadata {
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

  // Open Graph metadata
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() || '';

  // Twitter Card metadata
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || '';
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || '';
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || '';
  const twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim() || '';

  // Canonical URL
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || '';

  // Robots
  const robots = $('meta[name="robots"]').attr('content')?.trim() || '';

  // Keywords
  const keywords = $('meta[name="keywords"]').attr('content')?.trim() || '';

  // Author
  const author =
    $('meta[name="author"]').attr('content')?.trim() ||
    $('meta[property="article:author"]').attr('content')?.trim() ||
    '';

  // Published/Modified times
  const publishedTime =
    $('meta[property="article:published_time"]').attr('content')?.trim() ||
    $('meta[name="publishDate"]').attr('content')?.trim() ||
    $('time[pubdate]').attr('datetime')?.trim() ||
    '';

  const modifiedTime =
    $('meta[property="article:modified_time"]').attr('content')?.trim() ||
    $('meta[name="modifiedDate"]').attr('content')?.trim() ||
    '';

  // Favicon
  const favicon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href') ||
    '';

  // Content type from response headers
  const contentType = headers?.['content-type'] || '';

  // Page size
  const pageSize = Buffer.byteLength(html, 'utf8');

  // Resolve relative URLs for metadata
  const resolveUrl = (url: string): string => {
    if (!url) return '';
    try {
      return new URL(url, sourceUrl).toString();
    } catch {
      return url;
    }
  };

  const metadata: ScrapeMetadata = {
    title,
    description,
    language,
    sourceURL: sourceUrl,
    createdAt: new Date().toISOString(),
    ogTitle: ogTitle || undefined,
    ogDescription: ogDescription || undefined,
    ogImage: ogImage ? resolveUrl(ogImage) : undefined,
    ogUrl: ogUrl ? resolveUrl(ogUrl) : undefined,
    twitterTitle: twitterTitle || undefined,
    twitterDescription: twitterDescription || undefined,
    twitterImage: twitterImage ? resolveUrl(twitterImage) : undefined,
    twitterCard: twitterCard || undefined,
    canonicalUrl: canonicalUrl ? resolveUrl(canonicalUrl) : undefined,
    robots: robots || undefined,
    contentType: contentType || undefined,
    pageSize,
    favicon: favicon ? resolveUrl(favicon) : undefined,
    keywords: keywords || undefined,
    author: author || undefined,
    publishedTime: publishedTime || undefined,
    modifiedTime: modifiedTime || undefined,
  };

  return metadata;
}

export function extractBranding(html: string): BrandedData {
  const $ = load(html);
  const branding: BrandedData = {};

  // Extract colors from inline styles and style tags
  const colors = new Set<string>();
  const colorPattern = /(?:rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|#[0-9a-fA-F]{3,8}|hsl\([^)]+\))/g;

  // Check computed styles from style tags
  $('style').each((_i, el) => {
    const text = $(el).text();
    const matches = text.match(colorPattern);
    if (matches) {
      for (const color of matches) {
        if (colors.size < 20) {
          colors.add(color);
        }
      }
    }
  });

  // Check inline styles
  $('[style]').each((_i, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.match(colorPattern);
    if (matches) {
      for (const color of matches) {
        if (colors.size < 20) {
          colors.add(color);
        }
      }
    }
  });

  if (colors.size > 0) {
    branding.colors = Array.from(colors);
  }

  // Extract fonts
  const fonts = new Set<string>();
  const fontFamilies = $('style').map((_i, el) => {
    const text = $(el).text();
    const fontMatches = text.match(/font-family:\s*([^;]+)/g);
    if (fontMatches) {
      fontMatches.forEach((m) => {
        const font = m.replace(/font-family:\s*/i, '').trim().split(',')[0].replace(/['"]/g, '').trim();
        if (font && fonts.size < 10) {
          fonts.add(font);
        }
      });
    }
  });

  // Also check inline font-family
  $('[style]').each((_i, el) => {
    const style = $(el).attr('style') || '';
    const fontMatch = style.match(/font-family:\s*([^;]+)/i);
    if (fontMatch) {
      const font = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '').trim();
      if (font && fonts.size < 10) {
        fonts.add(font);
      }
    }
  });

  if (fonts.size > 0) {
    branding.fonts = Array.from(fonts);
  }

  // Extract logo
  const logo =
    $('img[class*="logo"]').attr('src') ||
    $('img[id*="logo"]').attr('src') ||
    $('a[class*="logo"] img').attr('src') ||
    $('header img').first().attr('src') ||
    '';
  if (logo) {
    branding.logo = logo;
  }

  // Detect dark/light theme
  const hasDarkTheme =
    $('meta[name="theme-color"]').attr('content')?.includes('000') ||
    $('body').attr('data-theme') === 'dark' ||
    $('body').hasClass('dark');

  if (hasDarkTheme) {
    branding.theme = 'dark';
  } else {
    branding.theme = 'light';
  }

  return branding;
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
      '.social, .share, .comments, .comment, ' +
      '#nav, #header, #footer, #sidebar, #menu, #navigation, ' +
      '.sticky, .fixed, .floating, .tooltip, .dropdown, ' +
      '.lang-selector, .theme-toggle, .search-box, .search-form'
    ).remove();

    // Try to find main content area
    const mainSelectors = [
      'main', 'article', '[role="main"]', '.content', '.post-content',
      '.entry-content', '.article-body', '#content', '#main',
      '.markdown-body', '.prose', '.blog-post'
    ];

    let foundMain = false;
    for (const selector of mainSelectors) {
      const mainEl = $(selector);
      if (mainEl.length > 0) {
        // Keep only the main content
        const bodyContent = $('body').html() || '';
        $('body').empty();
        $('body').append(mainEl);
        foundMain = true;
        break;
      }
    }

    // If no main element found, try to identify by density
    if (!foundMain) {
      // Remove elements with very few text characters relative to HTML size
      $('div, section').each((_i, el) => {
        const $el = $(el);
        const text = $el.text().trim().length;
        const html = $el.html()?.length || 0;
        // If mostly markup with little text, likely navigation/boilerplate
        if (html > 500 && text < 50 && text / html < 0.1) {
          $el.remove();
        }
      });
    }
  }

  if (options.onlyCleanContent) {
    // More aggressive cleaning
    $(
      'script, style, noscript, iframe, object, embed, ' +
      '.nav, .header, .footer, .sidebar, .menu, .navigation, ' +
      '.breadcrumb, .cookie, .popup, .modal, .ad, .advertisement, ' +
      '.social, .share, .comments, .comment, .widget, .banner, ' +
      '.sticky, .fixed, .floating, .tooltip, .dropdown, ' +
      '.lang-selector, .theme-toggle, .search-box, .search-form, ' +
      '.related, .recommended, .suggested, .newsletter, .subscribe'
    ).remove();
  }

  return $.html();
}
