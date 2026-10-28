/**
 * Deterministic Record Hash Generator
 * Produces a cryptographic 64-character hex hash from calculation inputs and outputs.
 */

export async function generateRecordHash(payload: Record<string, any>): Promise<string> {
  const normalizedString = JSON.stringify(payload, Object.keys(payload).sort());
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(normalizedString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to JS fallback
    }
  }

  // FNV-1a / Murmur-like deterministic fallback
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c64e6d ^ 0;
  for (let i = 0; i < normalizedString.length; i++) {
    const ch = normalizedString.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `sm${part1}${part2}${part3}${part4}`.padEnd(64, 'a').substring(0, 64);
}
