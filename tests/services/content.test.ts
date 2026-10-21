import { htmlToMarkdown, extractMetadata, extractLinks, cleanHtml } from '../../src/services/scrape/content';

describe('Content Processing', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Test Page</title>
      <meta name="description" content="A test page for scraping">
      <meta property="og:title" content="OG Test Page">
      <meta property="og:description" content="OG description">
      <style>body { color: red; }</style>
    </head>
    <body>
      <nav class="nav"><a href="/about">About</a></nav>
      <header><h1>Site Header</h1></header>
      <main>
        <article>
          <h2>Main Content</h2>
          <p>This is the <strong>main</strong> content of the page.</p>
          <a href="https://example.com/link1">Link 1</a>
          <a href="https://example.com/link2">Link 2</a>
          <a href="/relative">Relative Link</a>
        </article>
      </main>
      <footer><p>Footer content</p></footer>
      <aside class="sidebar">Sidebar</aside>
    </body>
    </html>
  `;

  describe('htmlToMarkdown', () => {
    it('converts HTML to markdown', () => {
      const md = htmlToMarkdown(sampleHtml);
      expect(md).toContain('Test Page');
      expect(md).toContain('Main Content');
      expect(md).toContain('main');
    });

    it('produces clean markdown without HTML tags', () => {
      const md = htmlToMarkdown(sampleHtml);
      expect(md).not.toContain('<');
      expect(md).not.toContain('>');
    });
  });

  describe('extractMetadata', () => {
    it('extracts title', () => {
      const meta = extractMetadata(sampleHtml, 'https://example.com');
      expect(meta.title).toBe('Test Page');
    });

    it('extracts description', () => {
      const meta = extractMetadata(sampleHtml, 'https://example.com');
      expect(meta.description).toBe('A test page for scraping');
    });

    it('extracts language', () => {
      const meta = extractMetadata(sampleHtml, 'https://example.com');
      expect(meta.language).toBe('en');
    });

    it('sets source URL', () => {
      const meta = extractMetadata(sampleHtml, 'https://example.com');
      expect(meta.sourceURL).toBe('https://example.com');
    });
  });

  describe('extractLinks', () => {
    it('extracts absolute links', () => {
      const links = extractLinks(sampleHtml, 'https://example.com');
      expect(links).toContain('https://example.com/link1');
      expect(links).toContain('https://example.com/link2');
    });

    it('resolves relative links', () => {
      const links = extractLinks(sampleHtml, 'https://example.com');
      expect(links).toContain('https://example.com/relative');
    });

    it('deduplicates links', () => {
      const htmlWithDupes = `
        <a href="https://example.com/link1">Link 1</a>
        <a href="https://example.com/link1">Link 1 again</a>
      `;
      const links = extractLinks(htmlWithDupes, 'https://example.com');
      const count = links.filter((l) => l === 'https://example.com/link1').length;
      expect(count).toBe(1);
    });
  });

  describe('cleanHtml', () => {
    it('removes navigation and footer when onlyMainContent is true', () => {
      const cleaned = cleanHtml(sampleHtml, { onlyMainContent: true });
      expect(cleaned).not.toContain('<nav');
      expect(cleaned).not.toContain('<footer');
      expect(cleaned).not.toContain('<aside');
    });

    it('removes excluded tags', () => {
      const cleaned = cleanHtml(sampleHtml, { excludeTags: ['header', 'footer'] });
      expect(cleaned).not.toContain('<header');
      expect(cleaned).not.toContain('<footer');
    });

    it('keeps content when no cleaning options', () => {
      const cleaned = cleanHtml(sampleHtml, {});
      expect(cleaned).toContain('<nav');
      expect(cleaned).toContain('<footer');
    });
  });
});
