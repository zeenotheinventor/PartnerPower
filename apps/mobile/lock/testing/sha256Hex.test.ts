import { sha256Hex } from './sha256Hex';

describe('sha256Hex', () => {
  it('should hash the empty text', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should hash "abc", the standard test vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('should hash text longer than one block, the second standard test vector', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('should give a lowercase hex string of 64 characters', () => {
    expect(sha256Hex('0123456789abcdef0123456789abcdef:4821')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should refuse text that is not ASCII', () => {
    expect(() => sha256Hex('é')).toThrow('ASCII');
  });
});
