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
import { SubscriptionService } from '../services/subscription.service';
import { ReportingService } from '../services/reporting.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly subscription: SubscriptionService,
    private readonly service: ReportingService
  ) {}

  async handleConnection(client: Socket) {
    Logger.verbose(`Client #${client.id} connected!`);
    await this.subscription.subscribeToReportList(client);
  }

  handleDisconnect(client: Socket) {
    Logger.verbose(`Client #${client.id} disconnected!`);

    // Unsubscribe from all reports
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, @MessageBody() reportId: string) {
    Logger.verbose(`Client #${client.id} subscribed to report ${reportId}`);
    await this.subscription.subscribeToReport(client, reportId);
  }
}
