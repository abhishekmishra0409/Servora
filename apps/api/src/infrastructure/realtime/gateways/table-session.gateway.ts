import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { RealtimePublisher } from '../realtime-publisher.service';
import { SocketAuthService } from '../socket-auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TableSessionGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  afterInit(server: Server): void {
    this.realtimePublisher.bindServer(server);
  }

  handleConnection(client: Socket): void {
    const token = client.handshake.auth.token as string | undefined;
    let user: ReturnType<SocketAuthService['authenticate']>;

    try {
      user = this.socketAuthService.authenticate(token);
    } catch {
      client.emit('auth.error', { message: 'Socket token invalid' });
      client.disconnect(true);
      return;
    }

    if ('tableSessionId' in user) {
      void client.join(`tableSession:${user.tableSessionId}`);
      return;
    }

    const branchId = user.branchId;

    if (branchId) {
      void client.join(`branch:${branchId}`);
    }

    void client.join(`tenant:${user.tenantId}`);
  }

  @SubscribeMessage('join.table-session')
  joinTableSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tableSessionId: string },
  ): { joined: boolean; room: string } {
    const room = `tableSession:${payload.tableSessionId}`;
    void client.join(room);
    return { joined: true, room };
  }
}
