import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { SteamController } from './steam.controller';
import { SteamService } from './steam.service';

@Module({
  imports: [UsersModule],
  controllers: [SteamController],
  providers: [SteamService, AuthService],
  exports: [SteamService, AuthService],
})
export class AuthModule {}
