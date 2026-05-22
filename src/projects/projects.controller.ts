import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './project.entity';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('projects')
@UseInterceptors(ClassSerializerInterceptor)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  @Get('deleted')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findDeleted(): Promise<Project[]> {
    return this.projectsService.findDeleted();
  }

  @Get(':projectId')
  findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<Project> {
    return this.projectsService.findOne(projectId);
  }

  @Post()
  @HttpCode(200)
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Project> {
    return this.projectsService.create(dto, user.sub);
  }

  @Patch(':projectId')
  @HttpCode(200)
  async update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.projectsService.update(projectId, dto, user.sub);
  }

  @Delete(':projectId')
  @HttpCode(200)
  async remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.projectsService.remove(projectId, user.sub);
  }

  @Post(':projectId/restore')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async restore(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.projectsService.restore(projectId, user.sub);
  }
}
