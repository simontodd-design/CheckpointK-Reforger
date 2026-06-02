/**
 * Agents WebSocket server (standalone — Bun-compatible).
 *
 * NestJS's WebSocket gateway adapters all rely on Node's
 * `http.Server.on('upgrade')` event, which Bun's HTTP server doesn't
 * expose. So we run a separate `ws.WebSocketServer` on its own port
 * (CK_WS_PORT, default 3002) alongside NestJS's HTTP on CK_CORE_PORT
 * (default 3001). Still a NestJS @Injectable so other modules can
 * push commands to connected agents.
 *
 * Protocol: JSON messages of the form { event: 'name', data: {...} }
 *
 * Each ck-manager-agent process maintains a persistent connection
 * here. Used to:
 *   - Receive agent status (host metrics, Reforger server states)
 *   - Push commands (spawn / kill / restart Reforger, steamcmd, mod sync)
 *   - Stream Reforger logs back to CK Manager UI
 */
import type { IncomingMessage } from 'node:http';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { WebSocket, WebSocketServer } from 'ws';

interface HelloPayload {
  hostId: string;
  version: string;
}

interface ConnectedAgent {
  hostId: string;
  socket: WebSocket;
  connectedAt: Date;
  version?: string;
}

@Injectable()
export class AgentsServer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentsServer.name);
  private readonly agents = new Map<WebSocket, ConnectedAgent>();
  private wss?: WebSocketServer;

  onModuleInit() {
    const port = Number(process.env.CK_WS_PORT ?? 3002);
    this.wss = new WebSocketServer({ port, path: '/agents' });

    this.wss.on('connection', (socket, req) => this.handleConnection(socket, req));
    this.wss.on('listening', () => {
      this.logger.log(`agents WebSocket server listening on ws://localhost:${port}/agents`);
    });
    this.wss.on('error', (err) => {
      this.logger.error({ err: err.message }, 'agents WebSocket server error');
    });
  }

  async onModuleDestroy() {
    if (!this.wss) return;
    this.logger.log('closing agents WebSocket server');
    for (const agent of this.agents.values()) {
      try {
        agent.socket.close(1001, 'server shutting down');
      } catch {}
    }
    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
  }

  private handleConnection(socket: WebSocket, req: IncomingMessage) {
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const hostId = String(req.headers['x-ck-host-id'] ?? 'unknown');

    if (!this.isValidAgentToken(token)) {
      this.logger.warn({ hostId }, 'agent rejected — invalid token');
      socket.close(4401, 'invalid token');
      return;
    }

    const agent: ConnectedAgent = { hostId, socket, connectedAt: new Date() };
    this.agents.set(socket, agent);
    this.logger.log({ hostId, total: this.agents.size }, 'agent connected');

    socket.on('message', (raw) => this.handleMessage(socket, raw.toString()));
    socket.on('close', () => this.handleDisconnect(socket));
    socket.on('error', (err) => {
      this.logger.error({ hostId, err: err.message }, 'agent socket error');
    });
  }

  private handleMessage(socket: WebSocket, raw: string) {
    let msg: { event: string; data: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      this.logger.warn({ raw }, 'agent sent non-JSON message');
      return;
    }

    const agent = this.agents.get(socket);
    if (!agent) {
      this.logger.warn('message from unknown agent');
      return;
    }

    switch (msg.event) {
      case 'hello':
        this.onHello(socket, agent, msg.data as HelloPayload);
        break;
      default:
        this.logger.warn({ event: msg.event, hostId: agent.hostId }, 'unhandled event');
    }
  }

  private onHello(socket: WebSocket, agent: ConnectedAgent, payload: HelloPayload) {
    agent.version = payload.version;
    this.logger.log({ hostId: payload.hostId, version: payload.version }, 'agent hello received');
    this.send(socket, 'hello-ack', { ok: true, message: `welcome, ${payload.hostId}` });
  }

  private handleDisconnect(socket: WebSocket) {
    const agent = this.agents.get(socket);
    if (agent) {
      this.agents.delete(socket);
      this.logger.log({ hostId: agent.hostId, total: this.agents.size }, 'agent disconnected');
    }
  }

  private send(socket: WebSocket, event: string, data: unknown) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ event, data }));
  }

  /**
   * Snapshot of connected agents — consumed by CK Manager UI.
   */
  listConnected(): Array<{ hostId: string; version?: string; connectedAt: Date }> {
    return Array.from(this.agents.values()).map(({ hostId, version, connectedAt }) => ({
      hostId,
      version,
      connectedAt,
    }));
  }

  /**
   * Push a command to a specific agent by hostId. Phase 1 will add
   * spawn / kill / restart / tail / steamcmd / modio-sync events.
   */
  pushTo(hostId: string, event: string, data: unknown): boolean {
    for (const agent of this.agents.values()) {
      if (agent.hostId === hostId) {
        this.send(agent.socket, event, data);
        return true;
      }
    }
    return false;
  }

  /**
   * Phase 1 token verification — accepts any non-empty token that
   * matches an env-configured shared secret. Phase 1 next step
   * replaces this with per-host tokens stored in the DB.
   */
  private isValidAgentToken(token: string): boolean {
    const expected = process.env.AGENT_TOKEN;
    if (!expected) {
      this.logger.warn('AGENT_TOKEN not set — accepting all agent connections (dev only)');
      return true;
    }
    return token === expected;
  }
}
