import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapsController } from './maps.controller';

@Module({
  imports: [AuthModule],
  controllers: [MapsController],
})
export class MapsModule {}
