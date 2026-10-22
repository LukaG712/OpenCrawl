/**
 * SSRF protection utilities for Trapper.
 *
 * Blocks requests to private IP ranges, loopback, link-local, and cloud
 * metadata endpoints to prevent Server-Side Request Forgery attacks.
 */

// Private and reserved IP ranges to block
const BLOCKED_RANGES: [string, number][] = [
  // Loopback
  ['127.0.0.0', 8],
  ['::1', 128],
  // Private ranges
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  // Link-local
  ['169.254.0.0', 16],
  ['fe80::', 10],
  // Additional reserved
  ['0.0.0.0', 8],
  ['100.64.0.0', 10], // Shared address space
  ['224.0.0.0', 4],   // Multicast
  ['240.0.0.0', 4],   // Reserved
];

// Cloud metadata endpoints to block
const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data.p.rackspacecloud.com',
  'metadata.service.consul',
  'localhost',
]);

function ipToNumber(ip: string): bigint | null {
  // Handle IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    try {
      let result = 0n;
      for (const part of parts) {
        result = (result << 8n) | BigInt(parseInt(part, 10));
      }
      return result;
    } catch {
      return null;
    }
  }
  // IPv6 — simplified check for common cases
  if (ip.includes(':')) {
    // For IPv6, just check if it's in the blocked ranges directly
    return null;
  }
  return null;
}

function isIpInRange(ip: string, networkStart: string, prefixLen: number): boolean {
  const ipNum = ipToNumber(ip);
  const netNum = ipToNumber(networkStart);
  if (ipNum === null || netNum === null) return false;

  const mask = (0xffffffffn << BigInt(32 - prefixLen)) & 0xffffffffn;
  return (ipNum & mask) === (netNum & mask);
}

/**
 * Check if a URL points to a blocked (private/reserved) address.
 *
 * Returns true if the URL should be blocked to prevent SSRF.
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (!hostname) {
      return true; // No hostname — block it
    }

    // Check against blocked hostnames
    const hostnameLower = hostname.toLowerCase().replace(/\.$/, '');
    if (BLOCKED_HOSTS.has(hostnameLower)) {
      return true;
    }

    // Check IP addresses against blocked ranges
    for (const [network, prefix] of BLOCKED_RANGES) {
      if (hostname === network || isIpInRange(hostname, network, prefix)) {
        return true;
      }
    }

    // Check for IPv6 loopback
    if (hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    return false;
  } catch {
    // If we can't parse the URL, block it for safety
    return true;
  }
}
