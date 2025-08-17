import { 
  channels, 
  programs, 
  customChannels,
  adminUsers,
  backendAccess,
  websiteStats,
  moderatorActivity,
  systemLogs,
  activeSessions,
  channelHistory,
  accessKeys,
  keyDevices,
  keyUsageLogs,
  type Channel, 
  type InsertChannel, 
  type Program, 
  type InsertProgram, 
  type CustomChannel, 
  type InsertCustomChannel,
  type AdminUser,
  type InsertAdminUser,
  type BackendAccess,
  type WebsiteStats,
  type InsertWebsiteStats,
  type ModeratorActivity,
  type InsertModeratorActivity,
  type SystemLog,
  type InsertSystemLog,
  type ActiveSession,
  type InsertActiveSession,
  type ChannelHistory,
  type InsertChannelHistory,
  type AccessKey,
  type InsertAccessKey,
  type KeyDevice,
  type InsertKeyDevice,
  type KeyUsageLog,
  type InsertKeyUsageLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  getChannels(): Promise<Channel[]>;
  getChannelsByCategory(category: string): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannelViewers(id: number, count: number): Promise<void>;
  getPrograms(channelId: number): Promise<Program[]>;
  getCurrentProgram(channelId: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  getCustomChannels(userId?: string): Promise<CustomChannel[]>;
  getCustomChannelsByCategory(category: string, userId?: string): Promise<CustomChannel[]>;
  createCustomChannel(channel: InsertCustomChannel): Promise<CustomChannel>;
  deleteCustomChannel(id: number, userId: string): Promise<void>;
  parseM3UPlaylist(content: string, playlistName: string, userId: string): Promise<CustomChannel[]>;
  
  // Admin management methods
  updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel>;
  deleteChannel(id: number): Promise<void>;
  reorderChannels(channelIds: number[]): Promise<void>;
  getWebsiteStats(days?: number): Promise<WebsiteStats[]>;
  updateWebsiteStats(stats: InsertWebsiteStats): Promise<WebsiteStats>;
  getModeratorActivity(moderatorId?: number, limit?: number): Promise<ModeratorActivity[]>;
  logModeratorActivity(activity: InsertModeratorActivity): Promise<ModeratorActivity>;
  getSystemLogs(level?: string, category?: string, limit?: number): Promise<SystemLog[]>;
  logSystemEvent(log: InsertSystemLog): Promise<SystemLog>;
  getActiveSessions(): Promise<ActiveSession[]>;
  createActiveSession(session: InsertActiveSession): Promise<ActiveSession>;
  updateActiveSession(sessionId: string, updates: Partial<InsertActiveSession>): Promise<void>;
  endActiveSession(sessionId: string): Promise<void>;
  getChannelHistory(channelId?: number, limit?: number): Promise<ChannelHistory[]>;
  logChannelHistory(history: InsertChannelHistory): Promise<ChannelHistory>;
  createModerator(moderator: InsertAdminUser): Promise<AdminUser>;
  getAllModerators(): Promise<AdminUser[]>;
  updateModerator(id: number, updates: Partial<InsertAdminUser>): Promise<AdminUser>;
  deleteModerator(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private channels: Map<number, Channel>;
  private programs: Map<number, Program>;
  private currentChannelId: number;
  private currentProgramId: number;

  constructor() {
    this.channels = new Map();
    this.programs = new Map();
    this.currentChannelId = 1;
    this.currentProgramId = 1;
    
    // Initialize with sample channels
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleChannels: Channel[] = [
      {
        id: 1,
        name: "News24 HD",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&h=60&fit=crop",
        category: "News",
        isLive: true,
        description: "24/7 Breaking News Coverage",
        viewerCount: 1200,
        quality: "HD"
      },
      {
        id: 2,
        name: "Star Sports 1 HD",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=100&h=60&fit=crop",
        category: "Sports", 
        isLive: true,
        description: "Live Cricket: IND vs AUS",
        viewerCount: 5800,
        quality: "HD"
      },
      {
        id: 3,
        name: "Zee TV HD",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=60&fit=crop",
        category: "Entertainment",
        isLive: true,
        description: "Kumkum Bhagya",
        viewerCount: 3200,
        quality: "HD"
      },
      {
        id: 4,
        name: "Star Movies HD",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1489599735225-1431bc1cc6e4?w=100&h=60&fit=crop",
        category: "Movies",
        isLive: true,
        description: "Avengers: Endgame",
        viewerCount: 7100,
        quality: "HD"
      },
      {
        id: 5,
        name: "MTV Beats HD",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=60&fit=crop",
        category: "Music",
        isLive: true,
        description: "Latest Hindi Hits",
        viewerCount: 2500,
        quality: "HD"
      },
      {
        id: 6,
        name: "Nick Jr.",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=100&h=60&fit=crop",
        category: "Kids",
        isLive: true,
        description: "Paw Patrol",
        viewerCount: 1800,
        quality: "HD"
      },
      {
        id: 7,
        name: "Star Bangla",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=100&h=60&fit=crop",
        category: "Regional",
        isLive: true,
        description: "Durga Durgatinashini",
        viewerCount: 4200,
        quality: "HD"
      },
      {
        id: 8,
        name: "Nat Geo Wild",
        streamUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        logo: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=100&h=60&fit=crop",
        category: "Documentary",
        isLive: true,
        description: "Africa's Deadliest",
        viewerCount: 892,
        quality: "HD"
      }
    ];

    sampleChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
      this.currentChannelId = Math.max(this.currentChannelId, channel.id + 1);
    });

    // Sample programs
    const samplePrograms: Program[] = [
      {
        id: 1,
        channelId: 2,
        title: "Live Cricket Match",
        description: "India vs Australia - 3rd Test Day 2",
        startTime: new Date("2025-01-19T14:30:00Z"),
        endTime: new Date("2025-01-19T18:00:00Z"),
        isLive: true
      },
      {
        id: 2,
        channelId: 1,
        title: "Evening News",
        description: "National and International Headlines",
        startTime: new Date("2025-01-19T18:00:00Z"),
        endTime: new Date("2025-01-19T19:00:00Z"),
        isLive: false
      },
      {
        id: 3,
        channelId: 4,
        title: "Bollywood Blockbuster",
        description: "3 Idiots (2009) - Comedy Drama",
        startTime: new Date("2025-01-19T19:30:00Z"),
        endTime: new Date("2025-01-19T22:30:00Z"),
        isLive: false
      }
    ];

    samplePrograms.forEach(program => {
      this.programs.set(program.id, program);
      this.currentProgramId = Math.max(this.currentProgramId, program.id + 1);
    });
  }

  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannelsByCategory(category: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(channel => 
      category === "All" || channel.category === category
    );
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = this.currentChannelId++;
    const channel: Channel = { 
      ...insertChannel, 
      id,
      viewerCount: 0,
      description: insertChannel.description ?? null,
      logo: insertChannel.logo ?? null,
      isLive: insertChannel.isLive ?? true,
      quality: insertChannel.quality ?? "HD"
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannelViewers(id: number, count: number): Promise<void> {
    const channel = this.channels.get(id);
    if (channel) {
      channel.viewerCount = count;
    }
  }

  async getPrograms(channelId: number): Promise<Program[]> {
    return Array.from(this.programs.values()).filter(program => 
      program.channelId === channelId
    );
  }

  async getCurrentProgram(channelId: number): Promise<Program | undefined> {
    const now = new Date();
    return Array.from(this.programs.values()).find(program => 
      program.channelId === channelId && 
      program.startTime <= now && 
      program.endTime >= now
    );
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const id = this.currentProgramId++;
    const program: Program = { 
      ...insertProgram, 
      id,
      description: insertProgram.description ?? null,
      isLive: insertProgram.isLive ?? false,
      channelId: insertProgram.channelId ?? null
    };
    this.programs.set(id, program);
    return program;
  }

  // Custom Channels methods - User-specific implementation
  private customChannels: Map<number, CustomChannel> = new Map();
  private currentCustomChannelId: number = 1;

  async getCustomChannels(userId?: string): Promise<CustomChannel[]> {
    if (!userId) return [];
    return Array.from(this.customChannels.values()).filter(channel => 
      channel.userId === userId
    );
  }

  async getCustomChannelsByCategory(category: string, userId?: string): Promise<CustomChannel[]> {
    if (!userId) return [];
    return Array.from(this.customChannels.values()).filter(channel => 
      channel.userId === userId && (category === "All" || channel.category === category)
    );
  }

  async createCustomChannel(channel: InsertCustomChannel): Promise<CustomChannel> {
    const id = this.currentCustomChannelId++;
    const customChannel: CustomChannel = {
      ...channel,
      id,
      createdAt: new Date(),
      isActive: channel.isActive ?? true,
      playlistName: channel.playlistName ?? null
    };
    this.customChannels.set(id, customChannel);
    return customChannel;
  }

  async deleteCustomChannel(id: number, userId: string): Promise<void> {
    const channel = this.customChannels.get(id);
    if (channel && channel.userId === userId) {
      this.customChannels.delete(id);
    }
  }

  async parseM3UPlaylist(content: string, playlistName: string, userId: string): Promise<CustomChannel[]> {
    const { parseM3UChannelInfo, categorizeChannel } = await import("@/lib/video-utils");
    
    const lines = content.split('\n').map(line => line.trim());
    const channels: CustomChannel[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        const channelInfo = parseM3UChannelInfo(line);
        if (channelInfo && i + 1 < lines.length) {
          const streamUrl = lines[i + 1].trim();
          
          if (streamUrl && !streamUrl.startsWith('#')) {
            const category = categorizeChannel(channelInfo.name, channelInfo.group);
            
            const customChannel = await this.createCustomChannel({
              userId: userId,
              name: channelInfo.name,
              streamUrl: streamUrl,
              logo: channelInfo.logo || null,
              category: category,
              quality: "HD",
              streamFormat: "M3U8",
              customName: channelInfo.name,
              playlistName: playlistName,
              isActive: true
            });
            
            channels.push(customChannel);
          }
        }
      }
    }
    
    return channels;
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(channels.sortOrder, channels.id);
  }

  async getChannelById(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async getChannelsByCategory(category: string): Promise<Channel[]> {
    if (category === "All") {
      return await this.getChannels();
    }
    return await db.select().from(channels)
      .where(eq(channels.category, category))
      .orderBy(channels.sortOrder, channels.id);
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db
      .insert(channels)
      .values({
        ...insertChannel,
        description: insertChannel.description ?? null,
        logo: insertChannel.logo ?? null,
        isLive: insertChannel.isLive ?? true,
        quality: insertChannel.quality ?? "HD"
      })
      .returning();
    return channel;
  }

  async updateChannelViewers(id: number, count: number): Promise<void> {
    await db
      .update(channels)
      .set({ viewerCount: count })
      .where(eq(channels.id, id));
  }

  async getPrograms(channelId: number): Promise<Program[]> {
    return await db.select().from(programs).where(eq(programs.channelId, channelId));
  }

  async getCurrentProgram(channelId: number): Promise<Program | undefined> {
    const now = new Date();
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.channelId, channelId))
      .limit(1);
    return program || undefined;
  }

  async createProgram(insertProgram: InsertProgram): Promise<Program> {
    const [program] = await db
      .insert(programs)
      .values({
        ...insertProgram,
        description: insertProgram.description ?? null,
        isLive: insertProgram.isLive ?? false,
        channelId: insertProgram.channelId ?? null
      })
      .returning();
    return program;
  }

  async getCustomChannels(): Promise<CustomChannel[]> {
    return await db.select().from(customChannels).where(eq(customChannels.isActive, true));
  }

  async getCustomChannelsByCategory(category: string): Promise<CustomChannel[]> {
    if (category === "All") {
      return await this.getCustomChannels();
    }
    return await db.select().from(customChannels)
      .where(eq(customChannels.category, category))
      .where(eq(customChannels.isActive, true));
  }

  async createCustomChannel(insertCustomChannel: InsertCustomChannel): Promise<CustomChannel> {
    const [customChannel] = await db
      .insert(customChannels)
      .values({
        ...insertCustomChannel,
        logo: insertCustomChannel.logo ?? null,
        playlistName: insertCustomChannel.playlistName ?? null,
      })
      .returning();
    return customChannel;
  }

  async deleteCustomChannel(id: number): Promise<void> {
    await db
      .update(customChannels)
      .set({ isActive: false })
      .where(eq(customChannels.id, id));
  }

  async parseM3UPlaylist(content: string, playlistName: string): Promise<CustomChannel[]> {
    const lines = content.split('\n');
    const channels: InsertCustomChannel[] = [];
    let currentChannel: Partial<InsertCustomChannel> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('#EXTINF:')) {
        // Parse channel info
        const infoMatch = trimmedLine.match(/#EXTINF:(-?\d+),(.+)/);
        if (infoMatch) {
          currentChannel.name = infoMatch[2].trim();
          currentChannel.customName = infoMatch[2].trim();
          
          // Extract logo from tvg-logo attribute
          const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) {
            currentChannel.logo = logoMatch[1];
          }
          
          // Extract category from group-title
          const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
          if (groupMatch) {
            currentChannel.category = groupMatch[1];
          } else {
            currentChannel.category = "Entertainment"; // Default category
          }
        }
      } else if (trimmedLine && !trimmedLine.startsWith('#') && currentChannel.name) {
        // This is a stream URL
        currentChannel.streamUrl = trimmedLine;
        
        // Detect stream format from URL extension
        if (trimmedLine.includes('.m3u8')) {
          currentChannel.streamFormat = 'M3U8';
        } else if (trimmedLine.includes('.mpd')) {
          currentChannel.streamFormat = 'DASH';
        } else if (trimmedLine.includes('.ts')) {
          currentChannel.streamFormat = 'TS';
        } else {
          currentChannel.streamFormat = 'M3U8'; // Default
        }
        
        currentChannel.playlistName = playlistName;
        currentChannel.quality = "HD";
        
        if (currentChannel.streamUrl && currentChannel.name && currentChannel.customName) {
          channels.push(currentChannel as InsertCustomChannel);
        }
        
        currentChannel = {}; // Reset for next channel
      }
    }
    
    // Insert all parsed channels
    const createdChannels: CustomChannel[] = [];
    for (const channel of channels) {
      try {
        const created = await this.createCustomChannel(channel);
        createdChannels.push(created);
      } catch (error) {
        console.error('Failed to create channel:', error);
      }
    }
    
    return createdChannels;
  }

  // Admin management methods implementation
  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel> {
    const [updated] = await db.update(channels).set(updates).where(eq(channels.id, id)).returning();
    return updated;
  }

  async deleteChannel(id: number): Promise<void> {
    await db.delete(channels).where(eq(channels.id, id));
  }

  async reorderChannels(channelIds: number[]): Promise<void> {
    console.log('Reordering channels - IDs received:', channelIds);
    
    try {
      // Update sortOrder for each channel based on its position in the array
      for (let i = 0; i < channelIds.length; i++) {
        const channelId = channelIds[i];
        const sortOrder = i; // 0-based ordering
        
        await db.update(channels)
          .set({ sortOrder: sortOrder })
          .where(eq(channels.id, channelId));
          
        console.log(`Updated channel ${channelId} with sortOrder ${sortOrder}`);
      }
      
      console.log('Channel reorder completed successfully');
    } catch (error) {
      console.error('Error reordering channels:', error);
      throw error;
    }
  }

  async getWebsiteStats(days: number = 7): Promise<WebsiteStats[]> {
    return await db.select().from(websiteStats).orderBy(desc(websiteStats.date)).limit(days);
  }

  async updateWebsiteStats(stats: InsertWebsiteStats): Promise<WebsiteStats> {
    const [updated] = await db.insert(websiteStats).values(stats).returning();
    return updated;
  }

  async getModeratorActivity(moderatorId?: number, limit: number = 50): Promise<ModeratorActivity[]> {
    let query = db.select().from(moderatorActivity).orderBy(desc(moderatorActivity.timestamp)).limit(limit);
    if (moderatorId) {
      query = query.where(eq(moderatorActivity.moderatorId, moderatorId)) as any;
    }
    return await query;
  }

  async logModeratorActivity(activity: InsertModeratorActivity): Promise<ModeratorActivity> {
    const [logged] = await db.insert(moderatorActivity).values(activity).returning();
    return logged;
  }

  async getSystemLogs(level?: string, category?: string, limit: number = 100): Promise<SystemLog[]> {
    let query = db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);
    if (level) {
      query = query.where(eq(systemLogs.level, level)) as any;
    }
    if (category) {
      query = query.where(eq(systemLogs.category, category)) as any;
    }
    return await query;
  }

  async logSystemEvent(log: InsertSystemLog): Promise<SystemLog> {
    const [logged] = await db.insert(systemLogs).values(log).returning();
    return logged;
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    return await db.select().from(activeSessions).where(eq(activeSessions.isActive, true));
  }

  async createActiveSession(session: InsertActiveSession): Promise<ActiveSession> {
    const [created] = await db.insert(activeSessions).values(session).returning();
    return created;
  }

  async updateActiveSession(sessionId: string, updates: Partial<InsertActiveSession>): Promise<void> {
    await db.update(activeSessions).set({...updates, lastActivity: new Date()}).where(eq(activeSessions.sessionId, sessionId));
  }

  async endActiveSession(sessionId: string): Promise<void> {
    await db.update(activeSessions).set({isActive: false}).where(eq(activeSessions.sessionId, sessionId));
  }

  async getChannelHistory(channelId?: number, limit: number = 50): Promise<ChannelHistory[]> {
    let query = db.select().from(channelHistory).orderBy(desc(channelHistory.timestamp)).limit(limit);
    if (channelId) {
      query = query.where(eq(channelHistory.channelId, channelId)) as any;
    }
    return await query;
  }

  async logChannelHistory(history: InsertChannelHistory): Promise<ChannelHistory> {
    const [logged] = await db.insert(channelHistory).values(history).returning();
    return logged;
  }

  async createModerator(moderator: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(moderator).returning();
    return created;
  }

  async getModerator(id: number): Promise<AdminUser | undefined> {
    const [moderator] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return moderator;
  }

  async getAllModerators(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).where(eq(adminUsers.role, 'moderator'));
  }

  async updateModerator(id: number, updates: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [updated] = await db.update(adminUsers).set({...updates, updatedAt: new Date()}).where(eq(adminUsers.id, id)).returning();
    return updated;
  }

  async deleteModerator(id: number): Promise<void> {
    await db.update(adminUsers).set({isActive: false}).where(eq(adminUsers.id, id));
  }

  // ========== ACCESS KEY MANAGEMENT ==========
  
  // Get all access keys with device count
  async getAllAccessKeys(): Promise<(AccessKey & { deviceCount: number })[]> {
    const result = await db
      .select({
        id: accessKeys.id,
        keyCode: accessKeys.keyCode,
        createdBy: accessKeys.createdBy,
        createdByUsername: accessKeys.createdByUsername,
        maxDevices: accessKeys.maxDevices,
        expiryDate: accessKeys.expiryDate,
        isActive: accessKeys.isActive,
        notes: accessKeys.notes,
        createdAt: accessKeys.createdAt,
        updatedAt: accessKeys.updatedAt,
        deviceCount: sql<number>`count(${keyDevices.id})::int`
      })
      .from(accessKeys)
      .leftJoin(keyDevices, and(
        eq(keyDevices.keyId, accessKeys.id),
        eq(keyDevices.isActive, true)
      ))
      .groupBy(accessKeys.id)
      .orderBy(desc(accessKeys.createdAt));
    
    return result.map(row => ({
      ...row,
      deviceCount: row.deviceCount || 0
    }));
  }

  // Create new access key
  async createAccessKey(data: InsertAccessKey): Promise<AccessKey> {
    const [newKey] = await db.insert(accessKeys).values(data).returning();
    return newKey;
  }

  // Get access key by code
  async getAccessKeyByCode(keyCode: string): Promise<AccessKey | undefined> {
    const [key] = await db
      .select()
      .from(accessKeys)
      .where(eq(accessKeys.keyCode, keyCode));
    return key;
  }

  // Update access key
  async updateAccessKey(id: number, data: Partial<InsertAccessKey>): Promise<AccessKey> {
    const [updatedKey] = await db
      .update(accessKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accessKeys.id, id))
      .returning();
    return updatedKey;
  }

  // Delete access key
  async deleteAccessKey(id: number): Promise<void> {
    await db.delete(accessKeys).where(eq(accessKeys.id, id));
  }

  // Get devices for a key
  async getKeyDevices(keyId: number): Promise<KeyDevice[]> {
    return await db
      .select()
      .from(keyDevices)
      .where(eq(keyDevices.keyId, keyId))
      .orderBy(desc(keyDevices.lastUsed));
  }

  // Add new device for key
  async addKeyDevice(data: InsertKeyDevice): Promise<KeyDevice> {
    const [device] = await db.insert(keyDevices).values(data).returning();
    return device;
  }

  // Update device last used time
  async updateKeyDeviceLastUsed(deviceId: number): Promise<void> {
    await db
      .update(keyDevices)
      .set({ lastUsed: new Date() })
      .where(eq(keyDevices.id, deviceId));
  }

  // Get key usage logs
  async getKeyUsageLogs(keyId: number, limit: number = 100): Promise<KeyUsageLog[]> {
    return await db
      .select()
      .from(keyUsageLogs)
      .where(eq(keyUsageLogs.keyId, keyId))
      .orderBy(desc(keyUsageLogs.timestamp))
      .limit(limit);
  }

  // Log key usage
  async logKeyUsage(data: InsertKeyUsageLog): Promise<KeyUsageLog> {
    const [log] = await db.insert(keyUsageLogs).values(data).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
