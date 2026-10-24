import { cameras, streamSessions, streamStats, type Camera, type InsertCamera, type StreamSession, type InsertStreamSession, type StreamStats, type InsertStreamStats } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Camera operations
  getCamera(id: number): Promise<Camera | undefined>;
  getCameraByIp(ip: string): Promise<Camera | undefined>;
  createCamera(camera: InsertCamera): Promise<Camera>;
  updateCamera(id: number, updates: Partial<InsertCamera>): Promise<Camera | undefined>;
  
  // Stream session operations
  createStreamSession(session: InsertStreamSession): Promise<StreamSession>;
  getActiveStreamSession(cameraId: number): Promise<StreamSession | undefined>;
  endStreamSession(sessionId: string): Promise<void>;
  
  // Stream stats operations
  addStreamStats(stats: InsertStreamStats): Promise<StreamStats>;
  getLatestStreamStats(cameraId: number): Promise<StreamStats | undefined>;
}

export class MemStorage implements IStorage {
  private cameras: Map<number, Camera>;
  private streamSessions: Map<number, StreamSession>;
  private streamStats: Map<number, StreamStats>;
  private currentCameraId: number;
  private currentSessionId: number;
  private currentStatsId: number;

  constructor() {
    this.cameras = new Map();
    this.streamSessions = new Map();
    this.streamStats = new Map();
    this.currentCameraId = 1;
    this.currentSessionId = 1;
    this.currentStatsId = 1;

    // Initialize with the default camera from the requirements - do it synchronously
    const id = this.currentCameraId++;
    const camera: Camera = {
      id,
      name: "Camera 01",
      ip: "10.10.10.146",
      port: 554,
      username: "admin",
      password: "admin123",
      rtspUrl: "rtsp://admin:admin123@10.10.10.146:554/cam/realmonitor?channel=1&subtype=0",
      isActive: true,
      createdAt: new Date(),
    };
    this.cameras.set(id, camera);
    console.log("Initialized camera with ID:", id, "Total cameras:", this.cameras.size);
  }

  async getCamera(id: number): Promise<Camera | undefined> {
    return this.cameras.get(id);
  }

  async getCameraByIp(ip: string): Promise<Camera | undefined> {
    return Array.from(this.cameras.values()).find(camera => camera.ip === ip);
  }

  async createCamera(insertCamera: InsertCamera): Promise<Camera> {
    const id = this.currentCameraId++;
    const camera: Camera = {
      id,
      name: insertCamera.name,
      ip: insertCamera.ip,
      port: insertCamera.port,
      username: insertCamera.username,
      password: insertCamera.password,
      rtspUrl: insertCamera.rtspUrl,
      isActive: insertCamera.isActive ?? true,
      createdAt: new Date(),
    };
    this.cameras.set(id, camera);
    return camera;
  }

  async updateCamera(id: number, updates: Partial<InsertCamera>): Promise<Camera | undefined> {
    const camera = this.cameras.get(id);
    if (!camera) return undefined;

    const updatedCamera = { ...camera, ...updates };
    this.cameras.set(id, updatedCamera);
    
    // Log the camera update for debugging
    console.log('Camera updated:', {
      id: updatedCamera.id,
      name: updatedCamera.name,
      ip: updatedCamera.ip,
      port: updatedCamera.port,
      rtspUrl: updatedCamera.rtspUrl
    });
    
    return updatedCamera;
  }

  async createStreamSession(insertSession: InsertStreamSession): Promise<StreamSession> {
    const id = this.currentSessionId++;
    const session: StreamSession = {
      id,
      cameraId: insertSession.cameraId ?? null,
      sessionId: insertSession.sessionId,
      isActive: insertSession.isActive ?? true,
      startedAt: new Date(),
      endedAt: null,
    };
    this.streamSessions.set(id, session);
    return session;
  }

  async getActiveStreamSession(cameraId: number): Promise<StreamSession | undefined> {
    return Array.from(this.streamSessions.values()).find(
      session => session.cameraId === cameraId && session.isActive
    );
  }

  async endStreamSession(sessionId: string): Promise<void> {
    const session = Array.from(this.streamSessions.values()).find(
      s => s.sessionId === sessionId
    );
    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
      this.streamSessions.set(session.id, session);
    }
  }

  async addStreamStats(insertStats: InsertStreamStats): Promise<StreamStats> {
    const id = this.currentStatsId++;
    const stats: StreamStats = {
      id,
      cameraId: insertStats.cameraId ?? null,
      bandwidth: insertStats.bandwidth || null,
      fps: insertStats.fps || null,
      latency: insertStats.latency || null,
      droppedFrames: insertStats.droppedFrames || 0,
      timestamp: new Date(),
    };
    this.streamStats.set(id, stats);
    return stats;
  }

  async getLatestStreamStats(cameraId: number): Promise<StreamStats | undefined> {
    const cameraStats = Array.from(this.streamStats.values())
      .filter(stats => stats.cameraId === cameraId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    return cameraStats[0];
  }
}

export const storage = new MemStorage();
