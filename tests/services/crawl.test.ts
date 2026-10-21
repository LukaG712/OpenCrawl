import { normalizeUrl, isSameDomain, matchesPathPatterns, discoverLinks } from '../../src/services/crawl';

describe('Crawl Utilities', () => {
  describe('normalizeUrl', () => {
    it('removes trailing slashes', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('removes query parameters when requested', () => {
      expect(normalizeUrl('https://example.com/?foo=bar', true)).toBe('https://example.com');
      expect(normalizeUrl('https://example.com/path?a=1&b=2', true)).toBe('https://example.com/path');
    });

    it('keeps query parameters by default', () => {
      expect(normalizeUrl('https://example.com/?foo=bar')).toBe('https://example.com/?foo=bar');
    });

    it('handles invalid URLs gracefully', () => {
      expect(normalizeUrl('not-a-url')).toBe('not-a-url');
    });
  });

  describe('isSameDomain', () => {
    it('returns true for same domain', () => {
      expect(isSameDomain('https://example.com/page', 'https://example.com')).toBe(true);
    });

    it('returns false for different domain', () => {
      expect(isSameDomain('https://other.com/page', 'https://example.com')).toBe(false);
    });

    it('returns true for subdomain when allowed', () => {
      expect(isSameDomain('https://blog.example.com/page', 'https://example.com', true)).toBe(true);
    });

    it('returns false for subdomain when not allowed', () => {
      expect(isSameDomain('https://blog.example.com/page', 'https://example.com', false)).toBe(false);
    });
  });

  describe('matchesPathPatterns', () => {
    it('matches include patterns', () => {
      expect(matchesPathPatterns('https://example.com/blog/post', ['blog/'])).toBe(true);
      expect(matchesPathPatterns('https://example.com/about', ['blog/'])).toBe(false);
    });

    it('excludes matching patterns', () => {
      expect(matchesPathPatterns('https://example.com/admin/settings', undefined, ['admin/'])).toBe(false);
      expect(matchesPathPatterns('https://example.com/blog/post', undefined, ['admin/'])).toBe(true);
    });

    it('returns true when no patterns', () => {
      expect(matchesPathPatterns('https://example.com/any/path')).toBe(true);
    });
  });

  describe('discoverLinks', () => {
    it('discovers links from HTML', async () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/page1">Page 1</a>
            <a href="https://example.com/page2">Page 2</a>
            <a href="https://other.com/external">External</a>
            <a href="/relative">Relative</a>
          </body>
        </html>
      `;

      const links = await discoverLinks('https://example.com', html, {
        url: 'https://example.com',
        allowExternalLinks: false,
      });

      expect(links).toContain('https://example.com/page1');
      expect(links).toContain('https://example.com/page2');
      expect(links).not.toContain('https://other.com/external');
    });

    it('allows external links when configured', async () => {
      const html = `
        <a href="https://other.com/external">External</a>
      `;

      const links = await discoverLinks('https://example.com', html, {
        url: 'https://example.com',
        allowExternalLinks: true,
      });

      expect(links).toContain('https://other.com/external');
    });
  });
});
