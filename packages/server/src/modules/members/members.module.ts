import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { MemberType } from './entities/member-type.entity';
import { MemberTypesController } from './member-types.controller';
import { MemberTypesService } from './member-types.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member, MemberType])],
  controllers: [MembersController, MemberTypesController],
  providers: [MembersService, MemberTypesService],
  exports: [MembersService, MemberTypesService],
})
export class MembersModule {}
