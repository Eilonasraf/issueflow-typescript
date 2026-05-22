import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

@Injectable()
export class PasswordService {
  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  verify(password: string, stored: string | null): boolean {
    if (!stored) {
      return false;
    }
    const [salt, key] = stored.split(':');
    if (!salt || !key) {
      return false;
    }
    const derived = scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, 'hex');
    return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
  }
}
