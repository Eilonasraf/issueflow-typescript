import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { CurrentUser, JwtUser } from './current-user.decorator';
import { User } from '../users/user.entity';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() request: Request & { token?: string }): void {
    if (request.token) {
      this.authService.logout(request.token);
    }
  }

  @Get('me')
  me(@CurrentUser() user: JwtUser): Promise<User> {
    return this.authService.me(user.sub);
  }
}
