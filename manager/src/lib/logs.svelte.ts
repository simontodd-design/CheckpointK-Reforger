/**
 * Live log streaming client.
 *
 * Opens a WebSocket to CK Core's manager gateway (:3003/manager),
 * authenticates with the admin Bearer JWT via the Sec-WebSocket-Protocol
 * header (the only browser-supported way to pass auth on a WS upgrade),
 * and exposes a reactive store keyed by serverId.
 *
 * Pages call `logStream.subscribe(serverId)` on mount and `.unsubscribe`
 * on unmount. Lines arrive as they happen; recent history is replayed
 * from the server-side buffer on subscribe.
 */
import { session } from './session.svelte';

const WS_URL = 'ws://localhost:3003/manager';
const MAX_LINES_PER_SERVER = 500;

export interface LogLine {
  serverId: string;
  ts: number;
  line: string;
}

type Status = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

class LogStream {
  status = $state<Status>('idle');
  lastError = $state<string | null>(null);
  /** serverId → reactive array of recent lines. */
  byServer = $state<Record<string, LogLine[]>>({});

  private socket: WebSocket | null = null;
  private wanted = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  ensureConnected(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) return;
    if (!session.token) {
      this.status = 'error';
      this.lastError = 'not signed in';
      return;
    }
    this.status = 'connecting';
    this.lastError = null;

    // Pass JWT as a subprotocol — Bearer.<token> (dots, since spaces
    // aren't allowed in subprotocols).
    const proto = `Bearer.${session.token}`;
    const socket = new WebSocket(WS_URL, [proto]);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.status = 'open';
      // Re-subscribe to anything we wanted before the (re)connect.
      if (this.wanted.size > 0) {
        socket.send(JSON.stringify({
          event: 'subscribe',
          data: { serverIds: [...this.wanted] },
        }));
      }
    });

    socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { event: string; data: unknown };
        if (msg.event === 'log:line') {
          const line = msg.data as LogLine;
          const existing = this.byServer[line.serverId] ?? [];
          const next = [...existing, line];
          if (next.length > MAX_LINES_PER_SERVER) next.shift();
          this.byServer = { ...this.byServer, [line.serverId]: next };
        } else if (msg.event === 'error') {
          this.lastError = (msg.data as { message?: string })?.message ?? 'unknown error';
        }
        // hello/pong are ignored on the client side
      } catch {
        /* malformed frame, ignore */
      }
    });

    socket.addEventListener('close', (ev) => {
      this.status = 'closed';
      this.socket = null;
      // 4401/4403 are auth failures — don't reconnect, the user needs to re-sign-in.
      if (ev.code === 4401 || ev.code === 4403) {
        this.lastError = ev.code === 4403 ? 'forbidden: not an admin' : 'unauthorized';
        return;
      }
      // Otherwise reconnect with backoff.
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      this.status = 'error';
      this.lastError = 'connection error';
    });
  }

  subscribe(serverId: string): void {
    this.wanted.add(serverId);
    this.ensureConnected();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        event: 'subscribe',
        data: { serverIds: [serverId] },
      }));
    }
  }

  unsubscribe(serverId: string): void {
    this.wanted.delete(serverId);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        event: 'unsubscribe',
        data: { serverIds: [serverId] },
      }));
    }
    // Clear the buffer for this server so re-opening the page starts fresh.
    const next = { ...this.byServer };
    delete next[serverId];
    this.byServer = next;
  }

  linesFor(serverId: string): LogLine[] {
    return this.byServer[serverId] ?? [];
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try { this.socket.close(1000, 'client disconnect'); } catch {
        /* already closed */
      }
      this.socket = null;
    }
    this.status = 'closed';
    this.wanted.clear();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, 2_000);
  }
}

export const logStream = new LogStream();
