import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UsersRepository } from './users.repository';

/** Split out of `UsersModule` so auth can reuse it without a circular import. */
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersRepository],
  exports: [UsersRepository, MongooseModule],
})
export class UsersRepositoryModule {}
