import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { Public } from '../auth/public.decorator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':userId')
  findOne(@Param('userId', ParseIntPipe) userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  @Public()
  @Post()
  @HttpCode(200)
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto, null);
  }

  @Post('update/:userId')
  @HttpCode(200)
  async update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.usersService.update(userId, dto, user.sub);
  }

  @Delete(':userId')
  @HttpCode(200)
  async remove(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.usersService.remove(userId, user.sub);
  }
}
