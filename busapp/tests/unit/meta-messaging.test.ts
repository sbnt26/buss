import crypto from 'crypto';

describe('verifyMetaSignature', () => {
  const payload = JSON.stringify({ hello: 'world' });

  beforeEach(() => {
    jest.resetModules();
    process.env.WHATSAPP_APP_SECRET = 'secret-key';
  });

  it('returns true for valid signature', async () => {
    const signature =
      'sha256=' + crypto.createHmac('sha256', 'secret-key').update(payload, 'utf8').digest('hex');
    const { verifyMetaSignature } = await import('@/lib/meta-messaging');
    expect(verifyMetaSignature(signature, payload)).toBe(true);
  });

  it('returns false for invalid signature', async () => {
    const { verifyMetaSignature } = await import('@/lib/meta-messaging');
    expect(verifyMetaSignature('sha256=invalid', payload)).toBe(false);
  });

  it('returns false when secret missing', async () => {
    jest.resetModules();
    delete process.env.WHATSAPP_APP_SECRET;
    const { verifyMetaSignature } = await import('@/lib/meta-messaging');
    expect(verifyMetaSignature('sha256=whatever', payload)).toBe(false);
  });
});
