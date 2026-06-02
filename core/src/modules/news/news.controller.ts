/**
 * News controller — patch notes, events, devlogs.
 *
 * Public (no JWT) so the launcher can show news even before sign-in
 * if we ever want that. Content is static for v1; a CMS-backed table
 * lands in Phase 2.
 */
import { Controller, Get } from '@nestjs/common';

interface NewsItem {
  id: string;
  title: string;
  body: string;
  tag: 'patch' | 'event' | 'announcement' | 'devlog';
  publishedAt: string;
}

@Controller('news')
export class NewsController {
  @Get()
  list() {
    const items: NewsItem[] = [
      {
        id: 'launcher-0-1',
        title: 'Launcher 0.1 is live',
        body: 'Sign-in flow, the foyer, the first three maps, and a Cinzel-headed brand. Take it for a walk — feedback in #launcher-feedback on Discord.',
        tag: 'patch',
        publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'devlog-cross-map',
        title: 'Devlog: how cross-map transfer works',
        body: 'When you walk through the airlock between Arland and Everon, your inventory rides a two-phase commit. Here\'s the architecture and why we picked a launcher-driven approach instead of in-game server hops.',
        tag: 'devlog',
        publishedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'event-kolguyev-blizzard',
        title: 'Event: 72-hour Kolguyev blizzard',
        body: 'Starting Friday 18:00 UTC: visibility cut to 80m, frostbite tick doubled, but Cold-Weather Cache drop rate triples. Survive 72 hours straight on Kolguyev for the exclusive Frost Mask.',
        tag: 'event',
        publishedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'announce-public-test',
        title: 'Public test starts in 6 weeks',
        body: 'We\'re inviting 200 testers in mid-July for a closed run before the August public test. Subscribe to any tier to lock a slot, or join the open lottery on Discord.',
        tag: 'announcement',
        publishedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      },
    ];
    return { items };
  }
}
