import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ReportingService, SubscriptionService } from '@/services';

@WebSocketGateway({ cors: { origin: '*' } })
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly subscription: SubscriptionService,
    private readonly service: ReportingService
  ) {}

  async handleConnection(client: Socket) {
    Logger.verbose(`Client #${client.id} connected!`);

    client.emit('message', 'Hallo manen');
    // Optionally, send active and inactive reports on connection
  }

  handleDisconnect(client: Socket) {
    Logger.verbose(`Client #${client.id} disconnected!`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, @MessageBody() reportId: string) {
    Logger.verbose(`Client #${client.id} subscribed to report ${reportId}`);
    await this.subscription.subscribeToReport(client, reportId);
  }
}
