import { describe, it, expect } from 'vitest'

describe('crypto', () => {
  it('encrypts and decrypts a string', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const original = 'fr_supersecretapikey123'
    const ciphertext = encrypt(original)
    expect(ciphertext).not.toBe(original)
    expect(ciphertext).toContain(':')
    expect(decrypt(ciphertext)).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const { encrypt } = await import('@/lib/crypto')
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })
})
