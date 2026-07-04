import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';

import { TableSession } from '../../../database/schemas/table-session.schema';
import { RealtimePublisher } from '../realtime-publisher.service';
import { SocketAuthService } from '../socket-auth.service';
import { staffCanAccessRecord } from '../room-access';

@WebSocketGateway()
export class TableSessionGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly realtimePublisher: RealtimePublisher,
    @InjectModel(TableSession.name) private readonly tableSessionModel: Model<TableSession>,
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
  async joinTableSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tableSessionId: string },
  ): Promise<{ joined: boolean; room: string }> {
    const user = this.socketAuthService.authenticateClient(client);

    if (user.type === 'guest') {
      if (payload.tableSessionId !== user.tableSessionId) {
        throw new WsException('Session access denied');
      }
    } else {
      const session = await this.tableSessionModel
        .findById(payload.tableSessionId)
        .select('tenantId branchId')
        .lean()
        .exec();

      if (!session || !staffCanAccessRecord(user, session)) {
        throw new WsException('Session access denied');
      }
    }

    const room = `tableSession:${payload.tableSessionId}`;
    void client.join(room);
    return { joined: true, room };
  }
}
