import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { nanoid } from 'nanoid';

export interface StreamConnection {
  id: string;
  cameraId: number;
  ws: WebSocket;
  startTime: Date;
  isActive: boolean;
}

export class StreamService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, StreamConnection> = new Map();
  private streamIntervals: Map<string, NodeJS.Timeout> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/stream' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      const connectionId = nanoid();
      
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(connectionId, ws, data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(connectionId);
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({ type: 'connected', connectionId }));
    });
  }

  private async handleMessage(connectionId: string, ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'start_stream':
        await this.startStream(connectionId, ws, message.cameraId);
        break;
      case 'stop_stream':
        await this.stopStream(connectionId);
        break;
      case 'get_camera_info':
        await this.sendCameraInfo(ws, message.cameraId);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  private async startStream(connectionId: string, ws: WebSocket, cameraId: number): Promise<void> {
    try {
      const camera = await storage.getCamera(cameraId);
      if (!camera) {
        ws.send(JSON.stringify({ type: 'error', message: 'Camera not found' }));
        return;
      }

      // Create stream session
      const session = await storage.createStreamSession({
        cameraId,
        sessionId: nanoid(),
        isActive: true,
      });

      // Create connection record
      const connection: StreamConnection = {
        id: connectionId,
        cameraId,
        ws,
        startTime: new Date(),
        isActive: true,
      };

      this.connections.set(connectionId, connection);

      // Send stream started confirmation
      ws.send(JSON.stringify({
        type: 'stream_started',
        cameraId,
        sessionId: session.sessionId,
        camera: {
          name: camera.name,
          ip: camera.ip,
          port: camera.port,
          rtspUrl: camera.rtspUrl,
        },
      }));

      // Start sending stream stats
      this.startStreamStatsInterval(connectionId, cameraId);

      // Simulate stream connection process
      setTimeout(() => {
        if (this.connections.has(connectionId)) {
          ws.send(JSON.stringify({
            type: 'stream_connected',
            status: 'connected',
          }));
        }
      }, 2000);

    } catch (error) {
      console.error('Error starting stream:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to start stream' }));
    }
  }

  private async stopStream(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Stop stats interval
    const interval = this.streamIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.streamIntervals.delete(connectionId);
    }

    // End stream session
    const activeSession = await storage.getActiveStreamSession(connection.cameraId);
    if (activeSession) {
      await storage.endStreamSession(activeSession.sessionId);
    }

    // Mark connection as inactive
    connection.isActive = false;
    this.connections.delete(connectionId);

    // Send stop confirmation
    connection.ws.send(JSON.stringify({ type: 'stream_stopped' }));
  }

  private handleDisconnection(connectionId: string): void {
    this.stopStream(connectionId);
  }

  private startStreamStatsInterval(connectionId: string, cameraId: number): void {
    const interval = setInterval(async () => {
      const connection = this.connections.get(connectionId);
      if (!connection || !connection.isActive) {
        clearInterval(interval);
        this.streamIntervals.delete(connectionId);
        return;
      }

      // Generate realistic stream stats
      const stats = {
        cameraId,
        bandwidth: (1.0 + Math.random() * 0.5).toFixed(1) + ' Mbps',
        fps: 24 + Math.floor(Math.random() * 3),
        latency: 10 + Math.floor(Math.random() * 10),
        droppedFrames: Math.floor(Math.random() * 3),
      };

      // Store stats
      await storage.addStreamStats(stats);

      // Calculate uptime
      const uptime = Math.floor((Date.now() - connection.startTime.getTime()) / 1000);
      const hours = Math.floor(uptime / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
      const seconds = (uptime % 60).toString().padStart(2, '0');

      // Send stats to client
      connection.ws.send(JSON.stringify({
        type: 'stream_stats',
        stats: {
          ...stats,
          uptime: `${hours}:${minutes}:${seconds}`,
          buffer: '2.1s',
        },
      }));
    }, 1000);

    this.streamIntervals.set(connectionId, interval);
  }

  private async sendCameraInfo(ws: WebSocket, cameraId: number): Promise<void> {
    try {
      const camera = await storage.getCamera(cameraId);
      if (!camera) {
        ws.send(JSON.stringify({ type: 'error', message: 'Camera not found' }));
        return;
      }

      ws.send(JSON.stringify({
        type: 'camera_info',
        camera: {
          id: camera.id,
          name: camera.name,
          ip: camera.ip,
          port: camera.port,
          username: camera.username,
          rtspUrl: camera.rtspUrl,
          isActive: camera.isActive,
        },
      }));
    } catch (error) {
      console.error('Error getting camera info:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to get camera info' }));
    }
  }
}

export const streamService = new StreamService();
