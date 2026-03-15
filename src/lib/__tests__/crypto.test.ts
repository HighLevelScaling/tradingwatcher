import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, isEncrypted } from '../crypto'

beforeAll(() => {
  // Set a test encryption key (32 bytes = 64 hex chars)
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('encrypt / decrypt', () => {
  it('round-trips a plaintext string', () => {
    const plaintext = 'my-secret-api-key-12345'
    const encrypted = encrypt(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it('round-trips an empty string', () => {
    const encrypted = encrypt('')
    expect(decrypt(encrypted)).toBe('')
  })

  it('round-trips unicode strings', () => {
    const plaintext = 'hello 🔑 世界'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-value'
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
    // Both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext)
    expect(decrypt(b)).toBe(plaintext)
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('secret')
    const parts = encrypted.split(':')
    // Corrupt the ciphertext
    parts[2] = 'AAAA' + parts[2].slice(4)
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('throws on invalid format', () => {
    expect(() => decrypt('not-encrypted')).toThrow('Invalid encrypted value format')
  })

  it('throws when ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY')
    process.env.ENCRYPTION_KEY = saved
  })

  it('throws when ENCRYPTION_KEY is wrong length', () => {
    const saved = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'tooshort'
    expect(() => encrypt('test')).toThrow('64-character hex string')
    process.env.ENCRYPTION_KEY = saved
  })
})

describe('isEncrypted', () => {
  it('returns true for encrypted values', () => {
    const encrypted = encrypt('test')
    expect(isEncrypted(encrypted)).toBe(true)
  })

  it('returns false for plaintext API keys', () => {
    expect(isEncrypted('sk_live_abc123')).toBe(false)
    expect(isEncrypted('myApiKey')).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  it('returns false for values with wrong number of parts', () => {
    expect(isEncrypted('a:b')).toBe(false)
    expect(isEncrypted('a:b:c:d')).toBe(false)
  })
})
