import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SteamController } from './steam.controller';
import { SteamService } from './steam.service';

@Module({
  controllers: [SteamController],
  providers: [SteamService, AuthService],
  exports: [SteamService, AuthService],
})
export class AuthModule {}
