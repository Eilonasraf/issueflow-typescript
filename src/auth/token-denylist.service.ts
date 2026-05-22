import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenDenylistService {
  private readonly revoked = new Set<string>();

  add(token: string): void {
    this.revoked.add(token);
  }

  has(token: string): boolean {
    return this.revoked.has(token);
  }
}
