import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hash returns salt:derived format', () => {
    const stored = svc.hash('secret123');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('hash uses a new salt each call', () => {
    expect(svc.hash('same-password')).not.toBe(svc.hash('same-password'));
  });

  it('verify accepts the correct password', () => {
    const stored = svc.hash('correct-horse');
    expect(svc.verify('correct-horse', stored)).toBe(true);
  });

  it('verify rejects a wrong password', () => {
    const stored = svc.hash('correct-horse');
    expect(svc.verify('wrong', stored)).toBe(false);
  });

  it('verify rejects a null stored value', () => {
    expect(svc.verify('whatever', null)).toBe(false);
  });

  it('verify rejects a malformed stored value (no colon)', () => {
    expect(svc.verify('whatever', 'not-a-real-hash')).toBe(false);
  });

  it('verify rejects when one half is missing', () => {
    expect(svc.verify('whatever', 'abc:')).toBe(false);
    expect(svc.verify('whatever', ':abc')).toBe(false);
  });
});
