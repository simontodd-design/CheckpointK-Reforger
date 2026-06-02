/**
 * Maps controller — lists the worlds the launcher can show in the foyer.
 *
 * v1 maps are the three Reforger natives. Workshop maps come post-launch.
 * Status + player count will be real once the agent reports up to CK
 * Core via WebSocket; for now static.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';

interface MapInfo {
  id: string;
  name: string;
  area: string;
  description: string;
  difficulty: 'low' | 'medium' | 'high';
  players: number;
  capacity: number;
  status: 'online' | 'offline' | 'maintenance';
  unlocked: boolean;
}

@Controller('maps')
@UseGuards(JwtAuthGuard)
export class MapsController {
  @Get()
  list() {
    const maps: MapInfo[] = [
      {
        id: 'arland',
        name: 'Arland',
        area: '~50 km²',
        description:
          'Cold rocky island. Forests, fjords, abandoned NATO checkpoints. Lower threat — good for new survivors.',
        difficulty: 'low',
        players: 38,
        capacity: 80,
        status: 'online',
        unlocked: true,
      },
      {
        id: 'everon',
        name: 'Everon',
        area: '~150 km²',
        description:
          'The flagship. Sprawling Mediterranean island with dense towns, military bases, and contested airfields.',
        difficulty: 'medium',
        players: 117,
        capacity: 150,
        status: 'online',
        unlocked: true,
      },
      {
        id: 'kolguyev',
        name: 'Kolguyev',
        area: '~85 km²',
        description:
          'Frozen northern wilderness. Sparse loot, brutal weather, the wolves are the least of your problems.',
        difficulty: 'high',
        players: 24,
        capacity: 80,
        status: 'online',
        unlocked: true,
      },
    ];
    return { maps };
  }
}
