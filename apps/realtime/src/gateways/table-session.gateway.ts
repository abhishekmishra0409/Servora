import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { SocketAuthService } from '../auth/socket-auth.service';
import { RealtimeBusService } from '../realtime-bus.service';

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
    const user = this.socketAuthService.authenticate(token);
    const branchId = 'branchId' in user ? user.branchId : user.branchId;

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
