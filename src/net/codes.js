const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export const CODE_LEN = 6;
export const PEER_PREFIX = 'sunjam-freefall-';

export function makeCode() {
  let c = '';
  for (let i = 0; i < CODE_LEN; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return c;
}

export function isValidCode(code) {
  if (typeof code !== 'string' || code.length !== CODE_LEN) return false;
  for (let i = 0; i < code.length; i++) {
    if (!CODE_CHARS.includes(code[i])) return false;
  }
  return true;
}
