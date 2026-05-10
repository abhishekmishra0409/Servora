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

import { RealtimeBusService } from '../realtime-bus.service';
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
    private readonly realtimeBus: RealtimeBusService,
  ) {}

  afterInit(server: Server): void {
    this.realtimeBus.bindServer(server);
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

    const branchId = user.branchId;

    if (branchId) {
      void client.join(`branch:${branchId}`);
    }

    if ('tableSessionId' in user) {
      void client.join(`tableSession:${user.tableSessionId}`);
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
