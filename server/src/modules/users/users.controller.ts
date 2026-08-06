import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ListResult } from '../../common/dto/list-request.dto';
import { ParseMongoIdPipe } from '../../common/mongo-id.pipe';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserResponse } from './user.mapper';
import { UsersService } from './users.service';
import { FetchUsersDto, UpdateUserDto } from './dto/users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('fetch/many')
  @HttpCode(HttpStatus.OK)
  fetchMany(@Body() dto: FetchUsersDto): Promise<ListResult<UserResponse>> {
    return this.users.fetchMany(dto);
  }

  @Get('fetch/one/:mongo_id')
  fetchOne(@Param('mongo_id', ParseMongoIdPipe) mongoId: string): Promise<UserResponse> {
    return this.users.fetchOne(mongoId);
  }

  @Put('update/:mongo_id')
  update(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.users.update(mongoId, dto);
  }

  @Post('activate/:mongo_id')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.users.setActive(mongoId, true, current.mongoId);
  }

  @Post('deactivate/:mongo_id')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<UserResponse> {
    return this.users.setActive(mongoId, false, current.mongoId);
  }
}
