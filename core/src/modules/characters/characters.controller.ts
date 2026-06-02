import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type RequestWithUser } from '../../common/auth/jwt-auth.guard';
import { CharactersService } from './characters.service';

@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly chars: CharactersService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    const steamId = req.user.sub;
    const list = await this.chars.listForSteamId(steamId);
    return { characters: list };
  }
}
