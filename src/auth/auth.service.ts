import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PasswordService } from './password.service';
import { TokenDenylistService } from './token-denylist.service';
import { LoginDto } from './dto/login.dto';

const EXPIRES_IN_SECONDS = 3600;

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly denylist: TokenDenylistService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (!user || !this.passwordService.verify(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { accessToken, tokenType: 'Bearer', expiresIn: EXPIRES_IN_SECONDS };
  }

  logout(token: string): void {
    this.denylist.add(token);
  }

  async me(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return user;
  }
}
