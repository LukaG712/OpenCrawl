import { normalizeUrl, isSameDomain, matchesPathPatterns } from '../../src/services/crawl';

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

    it('normalizes multiple trailing slashes', () => {
      expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
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

    it('handles invalid URLs', () => {
      expect(isSameDomain('invalid', 'https://example.com')).toBe(false);
      expect(isSameDomain('https://example.com', 'invalid')).toBe(false);
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

    it('supports substring matching', () => {
      // Patterns match as substrings in the path
      expect(matchesPathPatterns('https://example.com/blog/2024/post', ['blog/'])).toBe(true);
      expect(matchesPathPatterns('https://example.com/blog/2024/post', undefined, ['admin/'])).toBe(true);
    });

    it('handles invalid URLs', () => {
      expect(matchesPathPatterns('not-a-url')).toBe(true);
    });
  });
});
