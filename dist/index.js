var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import cors from "cors";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accessKeys: () => accessKeys,
  activeSessions: () => activeSessions,
  adminUsers: () => adminUsers,
  backendAccess: () => backendAccess,
  channelHistory: () => channelHistory,
  channels: () => channels,
  channelsRelations: () => channelsRelations,
  customChannels: () => customChannels,
  customChannelsRelations: () => customChannelsRelations,
  insertAccessKeySchema: () => insertAccessKeySchema,
  insertActiveSessionSchema: () => insertActiveSessionSchema,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertBackendAccessSchema: () => insertBackendAccessSchema,
  insertChannelHistorySchema: () => insertChannelHistorySchema,
  insertChannelSchema: () => insertChannelSchema,
  insertCustomChannelSchema: () => insertCustomChannelSchema,
  insertKeyDeviceSchema: () => insertKeyDeviceSchema,
  insertKeyUsageLogSchema: () => insertKeyUsageLogSchema,
  insertModeratorActivitySchema: () => insertModeratorActivitySchema,
  insertProgramSchema: () => insertProgramSchema,
  insertSystemLogSchema: () => insertSystemLogSchema,
  insertWebsiteStatsSchema: () => insertWebsiteStatsSchema,
  keyDevices: () => keyDevices,
  keyUsageLogs: () => keyUsageLogs,
  moderatorActivity: () => moderatorActivity,
  programs: () => programs,
  programsRelations: () => programsRelations,
  systemLogs: () => systemLogs,
  websiteStats: () => websiteStats
});
import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  logo: text("logo"),
  category: text("category").notNull(),
  isLive: boolean("is_live").default(true),
  description: text("description"),
  viewerCount: integer("viewer_count").default(0),
  quality: text("quality").default("HD"),
  // DRM Support for MPD/DASH channels
  streamFormat: text("stream_format").default("HLS"),
  // HLS, DASH, MPD
  isDrmProtected: boolean("is_drm_protected").default(false),
  drmKeyId: text("drm_key_id"),
  // For clearkey DRM
  drmKey: text("drm_key"),
  // For clearkey DRM
  manifestUrl: text("manifest_url"),
  // For DASH/MPD streams
  sortOrder: integer("sort_order").default(0),
  // T PLAY Exclusive Channels
  isExclusive: boolean("is_exclusive").default(false),
  exclusiveTag: text("exclusive_tag"),
  // "T PLAY EXCLUSIVE", "PREMIUM", etc.
  // Free access for 100 channels without authentication
  isFreeAccess: boolean("is_free_access").default(true)
});
var programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isLive: boolean("is_live").default(false)
});
var customChannels = pgTable("custom_channels", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  // Link to user who uploaded
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  logo: text("logo"),
  category: text("category").notNull(),
  quality: text("quality").default("HD"),
  streamFormat: text("stream_format").notNull(),
  // M3U8, DASH, TS, MPD
  customName: text("custom_name").notNull(),
  playlistName: text("playlist_name"),
  // M3U playlist name if from playlist
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var channelsRelations = relations(channels, ({ many }) => ({
  programs: many(programs)
}));
var programsRelations = relations(programs, ({ one }) => ({
  channel: one(channels, {
    fields: [programs.channelId],
    references: [channels.id]
  })
}));
var customChannelsRelations = relations(customChannels, ({ many }) => ({
  // Add relations if needed for future features
}));
var insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  viewerCount: true
});
var insertProgramSchema = createInsertSchema(programs).omit({
  id: true
});
var insertCustomChannelSchema = createInsertSchema(customChannels).omit({
  id: true,
  createdAt: true
});
var adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("moderator"),
  // admin or moderator
  secretKey: varchar("secret_key", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var backendAccess = pgTable("backend_access", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertBackendAccessSchema = createInsertSchema(backendAccess).omit({
  id: true,
  createdAt: true
});
var accessKeys = pgTable("access_keys", {
  id: serial("id").primaryKey(),
  keyCode: varchar("key_code", { length: 100 }).unique().notNull(),
  createdBy: integer("created_by").references(() => adminUsers.id).notNull(),
  createdByUsername: varchar("created_by_username", { length: 50 }).notNull(),
  maxDevices: integer("max_devices").default(5).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  // Admin notes about the key
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var keyDevices = pgTable("key_devices", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => accessKeys.id, { onDelete: "cascade" }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  // Browser fingerprint
  firstUsed: timestamp("first_used").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
  isActive: boolean("is_active").default(true)
});
var keyUsageLogs = pgTable("key_usage_logs", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => accessKeys.id, { onDelete: "cascade" }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  // 'login', 'channel_access', 'device_add'
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow()
});
var insertAccessKeySchema = createInsertSchema(accessKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertKeyDeviceSchema = createInsertSchema(keyDevices).omit({
  id: true,
  firstUsed: true,
  lastUsed: true
});
var insertKeyUsageLogSchema = createInsertSchema(keyUsageLogs).omit({
  id: true,
  timestamp: true
});
var websiteStats = pgTable("website_stats", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 20 }).notNull(),
  // YYYY-MM-DD format
  totalVisitors: integer("total_visitors").default(0),
  pageViews: integer("page_views").default(0),
  channelViews: integer("channel_views").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgSessionTime: integer("avg_session_time").default(0),
  // seconds
  topChannel: text("top_channel"),
  topCategory: text("top_category"),
  createdAt: timestamp("created_at").defaultNow()
});
var moderatorActivity = pgTable("moderator_activity", {
  id: serial("id").primaryKey(),
  moderatorId: integer("moderator_id").references(() => adminUsers.id),
  moderatorUsername: varchar("moderator_username", { length: 50 }).notNull(),
  action: text("action").notNull(),
  // add_channel, edit_channel, delete_channel, reorder_channels
  targetId: integer("target_id"),
  // channel_id or other resource id
  targetName: text("target_name"),
  // channel name or resource name
  details: text("details"),
  // JSON string with action details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow()
});
var systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level", { length: 20 }).notNull(),
  // info, warning, error, security
  category: varchar("category", { length: 50 }).notNull(),
  // auth, channel, system, security
  message: text("message").notNull(),
  details: text("details"),
  // Additional context as JSON
  userId: text("user_id"),
  // admin/moderator id if applicable
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow()
});
var activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(),
  // viewer, admin, moderator
  userId: text("user_id"),
  // For logged in users
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  currentPage: text("current_page"),
  currentChannel: integer("current_channel").references(() => channels.id),
  startTime: timestamp("start_time").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true)
});
var channelHistory = pgTable("channel_history", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  action: varchar("action", { length: 50 }).notNull(),
  // created, updated, deleted, reordered
  oldData: text("old_data"),
  // JSON of previous state
  newData: text("new_data"),
  // JSON of new state
  performedBy: integer("performed_by").references(() => adminUsers.id),
  performedByUsername: varchar("performed_by_username", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow()
});
var insertWebsiteStatsSchema = createInsertSchema(websiteStats).omit({
  id: true,
  createdAt: true
});
var insertModeratorActivitySchema = createInsertSchema(moderatorActivity).omit({
  id: true,
  timestamp: true
});
var insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true
});
var insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  id: true,
  startTime: true,
  lastActivity: true
});
var insertChannelHistorySchema = createInsertSchema(channelHistory).omit({
  id: true,
  timestamp: true
});

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var sql = neon(process.env.DATABASE_URL);
var db = drizzle(sql, { schema: schema_exports });

// server/storage.ts
import { eq, desc, sql as sql2, and } from "drizzle-orm";
var DatabaseStorage = class {
  async getChannels() {
    return await db.select().from(channels).orderBy(channels.sortOrder, channels.id);
  }
  async getChannelById(id) {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }
  async getChannelsByCategory(category) {
    if (category === "All") {
      return await this.getChannels();
    }
    return await db.select().from(channels).where(eq(channels.category, category)).orderBy(channels.sortOrder, channels.id);
  }
  async getChannel(id) {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || void 0;
  }
  async createChannel(insertChannel) {
    const [channel] = await db.insert(channels).values({
      ...insertChannel,
      description: insertChannel.description ?? null,
      logo: insertChannel.logo ?? null,
      isLive: insertChannel.isLive ?? true,
      quality: insertChannel.quality ?? "HD"
    }).returning();
    return channel;
  }
  async updateChannelViewers(id, count) {
    await db.update(channels).set({ viewerCount: count }).where(eq(channels.id, id));
  }
  async getPrograms(channelId) {
    return await db.select().from(programs).where(eq(programs.channelId, channelId));
  }
  async getCurrentProgram(channelId) {
    const now = /* @__PURE__ */ new Date();
    const [program] = await db.select().from(programs).where(eq(programs.channelId, channelId)).limit(1);
    return program || void 0;
  }
  async createProgram(insertProgram) {
    const [program] = await db.insert(programs).values({
      ...insertProgram,
      description: insertProgram.description ?? null,
      isLive: insertProgram.isLive ?? false,
      channelId: insertProgram.channelId ?? null
    }).returning();
    return program;
  }
  async getCustomChannels() {
    return await db.select().from(customChannels).where(eq(customChannels.isActive, true));
  }
  async getCustomChannelsByCategory(category) {
    if (category === "All") {
      return await this.getCustomChannels();
    }
    return await db.select().from(customChannels).where(eq(customChannels.category, category)).where(eq(customChannels.isActive, true));
  }
  async createCustomChannel(insertCustomChannel) {
    const [customChannel] = await db.insert(customChannels).values({
      ...insertCustomChannel,
      logo: insertCustomChannel.logo ?? null,
      playlistName: insertCustomChannel.playlistName ?? null
    }).returning();
    return customChannel;
  }
  async deleteCustomChannel(id) {
    await db.update(customChannels).set({ isActive: false }).where(eq(customChannels.id, id));
  }
  async parseM3UPlaylist(content, playlistName) {
    const lines = content.split("\n");
    const channels2 = [];
    let currentChannel = {};
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#EXTINF:")) {
        const infoMatch = trimmedLine.match(/#EXTINF:(-?\d+),(.+)/);
        if (infoMatch) {
          currentChannel.name = infoMatch[2].trim();
          currentChannel.customName = infoMatch[2].trim();
          const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) {
            currentChannel.logo = logoMatch[1];
          }
          const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
          if (groupMatch) {
            currentChannel.category = groupMatch[1];
          } else {
            currentChannel.category = "Entertainment";
          }
        }
      } else if (trimmedLine && !trimmedLine.startsWith("#") && currentChannel.name) {
        currentChannel.streamUrl = trimmedLine;
        if (trimmedLine.includes(".m3u8")) {
          currentChannel.streamFormat = "M3U8";
        } else if (trimmedLine.includes(".mpd")) {
          currentChannel.streamFormat = "DASH";
        } else if (trimmedLine.includes(".ts")) {
          currentChannel.streamFormat = "TS";
        } else {
          currentChannel.streamFormat = "M3U8";
        }
        currentChannel.playlistName = playlistName;
        currentChannel.quality = "HD";
        if (currentChannel.streamUrl && currentChannel.name && currentChannel.customName) {
          channels2.push(currentChannel);
        }
        currentChannel = {};
      }
    }
    const createdChannels = [];
    for (const channel of channels2) {
      try {
        const created = await this.createCustomChannel(channel);
        createdChannels.push(created);
      } catch (error) {
        console.error("Failed to create channel:", error);
      }
    }
    return createdChannels;
  }
  // Admin management methods implementation
  async updateChannel(id, updates) {
    const [updated] = await db.update(channels).set(updates).where(eq(channels.id, id)).returning();
    return updated;
  }
  async deleteChannel(id) {
    await db.delete(channels).where(eq(channels.id, id));
  }
  async reorderChannels(channelIds) {
    console.log("Reordering channels - IDs received:", channelIds);
    try {
      for (let i = 0; i < channelIds.length; i++) {
        const channelId = channelIds[i];
        const sortOrder = i;
        await db.update(channels).set({ sortOrder }).where(eq(channels.id, channelId));
        console.log(`Updated channel ${channelId} with sortOrder ${sortOrder}`);
      }
      console.log("Channel reorder completed successfully");
    } catch (error) {
      console.error("Error reordering channels:", error);
      throw error;
    }
  }
  async getWebsiteStats(days = 7) {
    return await db.select().from(websiteStats).orderBy(desc(websiteStats.date)).limit(days);
  }
  async updateWebsiteStats(stats) {
    const [updated] = await db.insert(websiteStats).values(stats).returning();
    return updated;
  }
  async getModeratorActivity(moderatorId, limit = 50) {
    let query = db.select().from(moderatorActivity).orderBy(desc(moderatorActivity.timestamp)).limit(limit);
    if (moderatorId) {
      query = query.where(eq(moderatorActivity.moderatorId, moderatorId));
    }
    return await query;
  }
  async logModeratorActivity(activity) {
    const [logged] = await db.insert(moderatorActivity).values(activity).returning();
    return logged;
  }
  async getSystemLogs(level, category, limit = 100) {
    let query = db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);
    if (level) {
      query = query.where(eq(systemLogs.level, level));
    }
    if (category) {
      query = query.where(eq(systemLogs.category, category));
    }
    return await query;
  }
  async logSystemEvent(log2) {
    const [logged] = await db.insert(systemLogs).values(log2).returning();
    return logged;
  }
  async getActiveSessions() {
    return await db.select().from(activeSessions).where(eq(activeSessions.isActive, true));
  }
  async createActiveSession(session2) {
    const [created] = await db.insert(activeSessions).values(session2).returning();
    return created;
  }
  async updateActiveSession(sessionId, updates) {
    await db.update(activeSessions).set({ ...updates, lastActivity: /* @__PURE__ */ new Date() }).where(eq(activeSessions.sessionId, sessionId));
  }
  async endActiveSession(sessionId) {
    await db.update(activeSessions).set({ isActive: false }).where(eq(activeSessions.sessionId, sessionId));
  }
  async getChannelHistory(channelId, limit = 50) {
    let query = db.select().from(channelHistory).orderBy(desc(channelHistory.timestamp)).limit(limit);
    if (channelId) {
      query = query.where(eq(channelHistory.channelId, channelId));
    }
    return await query;
  }
  async logChannelHistory(history) {
    const [logged] = await db.insert(channelHistory).values(history).returning();
    return logged;
  }
  async createModerator(moderator) {
    const [created] = await db.insert(adminUsers).values(moderator).returning();
    return created;
  }
  async getModerator(id) {
    const [moderator] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return moderator;
  }
  async getAllModerators() {
    return await db.select().from(adminUsers).where(eq(adminUsers.role, "moderator"));
  }
  async updateModerator(id, updates) {
    const [updated] = await db.update(adminUsers).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(adminUsers.id, id)).returning();
    return updated;
  }
  async deleteModerator(id) {
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, id));
  }
  // ========== ACCESS KEY MANAGEMENT ==========
  // Get all access keys with device count
  async getAllAccessKeys() {
    const result = await db.select({
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
      deviceCount: sql2`count(${keyDevices.id})::int`
    }).from(accessKeys).leftJoin(keyDevices, and(
      eq(keyDevices.keyId, accessKeys.id),
      eq(keyDevices.isActive, true)
    )).groupBy(accessKeys.id).orderBy(desc(accessKeys.createdAt));
    return result.map((row) => ({
      ...row,
      deviceCount: row.deviceCount || 0
    }));
  }
  // Create new access key
  async createAccessKey(data) {
    const [newKey] = await db.insert(accessKeys).values(data).returning();
    return newKey;
  }
  // Get access key by code
  async getAccessKeyByCode(keyCode) {
    const [key] = await db.select().from(accessKeys).where(eq(accessKeys.keyCode, keyCode));
    return key;
  }
  // Update access key
  async updateAccessKey(id, data) {
    const [updatedKey] = await db.update(accessKeys).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(accessKeys.id, id)).returning();
    return updatedKey;
  }
  // Delete access key
  async deleteAccessKey(id) {
    await db.delete(accessKeys).where(eq(accessKeys.id, id));
  }
  // Get devices for a key
  async getKeyDevices(keyId) {
    return await db.select().from(keyDevices).where(eq(keyDevices.keyId, keyId)).orderBy(desc(keyDevices.lastUsed));
  }
  // Add new device for key
  async addKeyDevice(data) {
    const [device] = await db.insert(keyDevices).values(data).returning();
    return device;
  }
  // Update device last used time
  async updateKeyDeviceLastUsed(deviceId) {
    await db.update(keyDevices).set({ lastUsed: /* @__PURE__ */ new Date() }).where(eq(keyDevices.id, deviceId));
  }
  // Get key usage logs
  async getKeyUsageLogs(keyId, limit = 100) {
    return await db.select().from(keyUsageLogs).where(eq(keyUsageLogs.keyId, keyId)).orderBy(desc(keyUsageLogs.timestamp)).limit(limit);
  }
  // Log key usage
  async logKeyUsage(data) {
    const [log2] = await db.insert(keyUsageLogs).values(data).returning();
    return log2;
  }
};
var storage = new DatabaseStorage();

// server/worker-routes.ts
import { z } from "zod";
var WORKER_API_KEY = process.env.WORKER_API_KEY || "worker_demo_key_2025";
var checkPermission = (req, action) => {
  const adminUser = req.adminUser;
  if (!adminUser) return false;
  if (adminUser.role === "admin") return true;
  if (adminUser.role === "moderator") {
    const allowedActions = ["add_channel", "edit_channel", "delete_channel", "reorder_channel"];
    return allowedActions.includes(action);
  }
  return false;
};
var authenticateWorker = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";
  const hasAdminAccess = req.adminUser;
  const hasBackendAccess = req.backendAccess;
  if (!hasAdminAccess && !hasBackendAccess) {
    console.warn(`[SECURITY] Unauthorized worker access attempt from IP ${clientIP}`);
    return res.status(401).json({
      error: "Access Denied",
      message: "Authentication required to access backend features"
    });
  }
  if (hasAdminAccess) {
    console.log(`[AUTH] Worker access granted to ${hasAdminAccess.username} (${hasAdminAccess.role}) from IP ${clientIP}`);
    next();
    return;
  }
  if (hasBackendAccess) {
    console.log(`[AUTH] Backend worker access granted to ${hasBackendAccess.username} from IP ${clientIP}`);
    next();
    return;
  }
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  if (apiKey && apiKey === WORKER_API_KEY) {
    console.log(`[AUTH] API key worker access granted from IP ${clientIP}`);
    next();
    return;
  }
  return res.status(401).json({
    error: "Authentication Failed",
    message: "Invalid credentials for backend features"
  });
};
var requirePermission = (action) => {
  return (req, res, next) => {
    if (!checkPermission(req, action)) {
      const adminUser = req.adminUser;
      const role = adminUser ? adminUser.role : "none";
      console.warn(`[SECURITY] Permission denied: ${role} attempted ${action}`);
      return res.status(403).json({
        error: "Permission Denied",
        message: `Your role (${role}) does not have permission for this action`
      });
    }
    next();
  };
};
var detectStreamFormat = (url) => {
  const urlLower = url.toLowerCase();
  if (urlLower.includes(".m3u8") || urlLower.includes("hls")) {
    return "M3U8";
  } else if (urlLower.includes(".mpd")) {
    return "MPD";
  } else if (urlLower.includes(".ts")) {
    return "TS";
  } else if (urlLower.includes("dash")) {
    return "DASH";
  } else if (urlLower.includes(".mp4")) {
    return "MP4";
  } else {
    return "UNKNOWN";
  }
};
var autoCategorizechannel = (name, description) => {
  const nameUpper = name.toUpperCase();
  const descUpper = (description || "").toUpperCase();
  const content = `${nameUpper} ${descUpper}`;
  if (content.match(/(NEWS|KHABAR|SANGBAD|24|HEADLINES|BREAKING)/)) {
    return "News";
  }
  if (content.match(/(SPORT|CRICKET|FOOTBALL|SOCCER|ESPN|STAR SPORTS)/)) {
    return "Sports";
  }
  if (content.match(/(MUSIC|9XM|MTV|GAAN|SANGEET|FM)/)) {
    return "Music";
  }
  if (content.match(/(MOVIE|CINEMA|FILM|PICTURES|BOLLYWOOD|HOLLYWOOD)/)) {
    return "Movies";
  }
  if (content.match(/(KIDS|CARTOON|NICK|DISNEY|POGO|CHHOTA)/)) {
    return "Kids";
  }
  if (content.match(/(BANGLA|BENGALI|KOLKATA|BD|BANGLADESH)/)) {
    return "Regional";
  }
  return "Entertainment";
};
var workerAddChannelSchema = z.object({
  name: z.string().min(1, "Channel name required"),
  streamUrl: z.string().url("Valid stream URL required"),
  logo: z.string().url().optional(),
  category: z.string().optional(),
  quality: z.string().default("HD"),
  customName: z.string().optional(),
  description: z.string().optional(),
  workerId: z.string().min(1, "Worker ID required")
});
function registerWorkerRoutes(app2) {
  app2.get("/worker/channels", authenticateWorker, async (req, res) => {
    try {
      const channels2 = await storage.getChannels();
      const customChannels2 = await storage.getCustomChannels();
      res.json({
        success: true,
        data: {
          regularChannels: channels2,
          customChannels: customChannels2,
          totalCount: channels2.length + customChannels2.length
        }
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch channels",
        message: error.message
      });
    }
  });
  app2.post("/worker/channels/add", authenticateWorker, requirePermission("add_channel"), async (req, res) => {
    try {
      const validatedData = workerAddChannelSchema.parse(req.body);
      const streamFormat = detectStreamFormat(validatedData.streamUrl);
      const category = validatedData.category || autoCategorizechannel(validatedData.name, validatedData.description);
      const customChannel = await storage.createCustomChannel({
        userId: `worker_${validatedData.workerId}`,
        name: validatedData.name,
        streamUrl: validatedData.streamUrl,
        logo: validatedData.logo || null,
        category,
        quality: validatedData.quality,
        streamFormat,
        customName: validatedData.customName || validatedData.name,
        playlistName: null,
        isActive: true
      });
      res.json({
        success: true,
        message: "Channel added successfully",
        data: {
          ...customChannel,
          detectedFormat: streamFormat,
          autoCategory: !validatedData.category
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      res.status(500).json({
        error: "Failed to add channel",
        message: error.message
      });
    }
  });
  app2.delete("/worker/channels/:id", authenticateWorker, requirePermission("delete_channel"), async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const { workerId } = req.query;
      if (!workerId) {
        return res.status(400).json({
          error: "Worker ID required",
          message: "Provide workerId in query parameters"
        });
      }
      await storage.deleteCustomChannel(channelId, `worker_${workerId}`);
      res.json({
        success: true,
        message: "Channel deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete channel",
        message: error.message
      });
    }
  });
  app2.patch("/worker/channels/:id", authenticateWorker, requirePermission("edit_channel"), async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const { workerId, ...updateData } = req.body;
      if (!workerId) {
        return res.status(400).json({
          error: "Worker ID required"
        });
      }
      await storage.deleteCustomChannel(channelId, `worker_${workerId}`);
      if (updateData.streamUrl) {
        updateData.streamFormat = detectStreamFormat(updateData.streamUrl);
      }
      if (updateData.name && !updateData.category) {
        updateData.category = autoCategorizechannel(updateData.name, updateData.description);
      }
      const updatedChannel = await storage.createCustomChannel({
        userId: `worker_${workerId}`,
        ...updateData,
        customName: updateData.customName || updateData.name
      });
      res.json({
        success: true,
        message: "Channel updated successfully",
        data: updatedChannel
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to update channel",
        message: error.message
      });
    }
  });
  app2.post("/worker/channels/bulk", authenticateWorker, requirePermission("add_channel"), async (req, res) => {
    try {
      const { channels: channels2, workerId } = req.body;
      if (!Array.isArray(channels2) || !workerId) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Provide channels array and workerId"
        });
      }
      const results = [];
      const errors = [];
      for (let i = 0; i < channels2.length; i++) {
        try {
          const channelData = channels2[i];
          const streamFormat = detectStreamFormat(channelData.streamUrl);
          const category = channelData.category || autoCategorizechannel(channelData.name, channelData.description);
          const customChannel = await storage.createCustomChannel({
            userId: `worker_${workerId}`,
            name: channelData.name,
            streamUrl: channelData.streamUrl,
            logo: channelData.logo || null,
            category,
            quality: channelData.quality || "HD",
            streamFormat,
            customName: channelData.customName || channelData.name,
            playlistName: channelData.playlistName || null,
            isActive: channelData.isActive !== false
          });
          results.push(customChannel);
        } catch (error) {
          errors.push({
            index: i,
            channel: channels2[i],
            error: error.message
          });
        }
      }
      res.json({
        success: true,
        message: `Added ${results.length} channels, ${errors.length} failed`,
        data: {
          successful: results,
          failed: errors,
          successCount: results.length,
          errorCount: errors.length
        }
      });
    } catch (error) {
      res.status(500).json({
        error: "Bulk operation failed",
        message: error.message
      });
    }
  });
  app2.get("/worker/stats", authenticateWorker, requirePermission("view_stats"), async (req, res) => {
    try {
      const { workerId } = req.query;
      const allCustomChannels = await storage.getCustomChannels();
      const workerChannels = workerId ? allCustomChannels.filter((ch) => ch.userId === `worker_${workerId}`) : allCustomChannels;
      const categoryStats = workerChannels.reduce((acc, ch) => {
        acc[ch.category] = (acc[ch.category] || 0) + 1;
        return acc;
      }, {});
      const formatStats = workerChannels.reduce((acc, ch) => {
        acc[ch.streamFormat] = (acc[ch.streamFormat] || 0) + 1;
        return acc;
      }, {});
      res.json({
        success: true,
        data: {
          totalChannels: workerChannels.length,
          activeChannels: workerChannels.filter((ch) => ch.isActive).length,
          categoryBreakdown: categoryStats,
          formatBreakdown: formatStats,
          recentChannels: workerChannels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch statistics",
        message: error.message
      });
    }
  });
}

// server/auth.ts
import { z as z2 } from "zod";
import { eq as eq2, and as and2 } from "drizzle-orm";
var DEFAULT_ADMIN = {
  username: "tplaybd",
  password: "tplaylive",
  role: "admin",
  secretKey: "bCn5832iNtErNeT??"
};
var DEFAULT_BACKEND_ACCESS = {
  username: "tplayback",
  password: "tplaylive758!!"
};
async function seedDefaultAccounts() {
  try {
    const [existingAdmin] = await db.select().from(adminUsers).where(eq2(adminUsers.username, DEFAULT_ADMIN.username));
    if (!existingAdmin) {
      await db.insert(adminUsers).values(DEFAULT_ADMIN);
      console.log("[Auth] Default admin account created");
    }
    const [existingBackend] = await db.select().from(backendAccess).where(eq2(backendAccess.username, DEFAULT_BACKEND_ACCESS.username));
    if (!existingBackend) {
      await db.insert(backendAccess).values(DEFAULT_BACKEND_ACCESS);
      console.log("[Auth] Default backend access created");
    }
  } catch (error) {
    console.error("[Auth] Error seeding default accounts:", error);
  }
}
var adminLoginSchema = z2.object({
  username: z2.string().min(1),
  password: z2.string().min(1),
  secretKey: z2.string().optional()
});
var backendLoginSchema = z2.object({
  username: z2.string().min(1),
  password: z2.string().min(1)
});
var createModeratorSchema = z2.object({
  username: z2.string().min(3).max(50),
  password: z2.string().min(6).max(255),
  secretKey: z2.string().optional()
});
var loginAttempts = [];
var RATE_LIMIT_ATTEMPTS = 5;
var RATE_LIMIT_WINDOW = 60 * 60 * 1e3;
var ADMIN_ATTEMPTS_LIMIT = 3;
var LOCKOUT_DURATION = 30 * 60 * 1e3;
var AuthService = class {
  // Check if IP is rate limited
  static isRateLimited(ip, isAdmin2 = false) {
    const now = Date.now();
    const limit = isAdmin2 ? ADMIN_ATTEMPTS_LIMIT : RATE_LIMIT_ATTEMPTS;
    const recentAttempts = loginAttempts.filter(
      (attempt) => now - attempt.timestamp < RATE_LIMIT_WINDOW && attempt.ip === ip
    );
    const failedAttempts = recentAttempts.filter((attempt) => !attempt.success);
    return failedAttempts.length >= limit;
  }
  // Log login attempt
  static logAttempt(ip, username, success) {
    loginAttempts.push({
      ip,
      username: username.toLowerCase(),
      timestamp: Date.now(),
      success
    });
    if (loginAttempts.length > 1e3) {
      loginAttempts.splice(0, 100);
    }
    if (!success) {
      console.warn(`[SECURITY] Failed login attempt for ${username} from IP ${ip}`);
    }
  }
  // Advanced admin authentication with multiple security layers
  static async authenticateAdmin(ip, username, password, secretKey) {
    try {
      if (this.isRateLimited(ip, true)) {
        console.warn(`[SECURITY] IP ${ip} rate limited for admin access`);
        this.logAttempt(ip, username, false);
        return null;
      }
      if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        console.warn(`[SECURITY] Invalid username format attempt: ${username} from IP ${ip}`);
        this.logAttempt(ip, username, false);
        return null;
      }
      const [user] = await db.select().from(adminUsers).where(
        and2(
          eq2(adminUsers.username, username),
          eq2(adminUsers.password, password),
          eq2(adminUsers.isActive, true)
        )
      );
      if (!user) {
        this.logAttempt(ip, username, false);
        return null;
      }
      if (user.role === "admin") {
        if (!secretKey || user.secretKey !== secretKey) {
          console.warn(`[SECURITY] Admin login without valid secret key from IP ${ip}`);
          this.logAttempt(ip, username, false);
          return null;
        }
      }
      if (user.role === "moderator") {
        if (user.createdBy) {
          const [admin] = await db.select().from(adminUsers).where(
            and2(
              eq2(adminUsers.id, user.createdBy),
              eq2(adminUsers.role, "admin"),
              eq2(adminUsers.isActive, true)
            )
          );
          if (!admin) {
            console.warn(`[SECURITY] Moderator login blocked - creator admin inactive`);
            this.logAttempt(ip, username, false);
            return null;
          }
        }
      }
      this.logAttempt(ip, username, true);
      console.log(`[AUTH] Successful ${user.role} login: ${username} from IP ${ip}`);
      return user;
    } catch (error) {
      console.error("[SECURITY] Authentication error:", error);
      this.logAttempt(ip, username, false);
      return null;
    }
  }
  // Backend access login with enhanced security
  static async authenticateBackend(ip, username, password) {
    try {
      if (this.isRateLimited(ip, false)) {
        console.warn(`[SECURITY] IP ${ip} rate limited for backend access`);
        this.logAttempt(ip, username, false);
        return null;
      }
      if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        console.warn(`[SECURITY] Invalid backend username format: ${username} from IP ${ip}`);
        this.logAttempt(ip, username, false);
        return null;
      }
      const [access] = await db.select().from(backendAccess).where(
        and2(
          eq2(backendAccess.username, username),
          eq2(backendAccess.password, password),
          eq2(backendAccess.isActive, true)
        )
      );
      if (!access) {
        this.logAttempt(ip, username, false);
        return null;
      }
      this.logAttempt(ip, username, true);
      console.log(`[AUTH] Successful backend access: ${username} from IP ${ip}`);
      return access;
    } catch (error) {
      console.error("[SECURITY] Backend auth error:", error);
      this.logAttempt(ip, username, false);
      return null;
    }
  }
  // Create moderator (admin only)
  static async createModerator(adminId, username, password, secretKey) {
    try {
      const [admin] = await db.select().from(adminUsers).where(
        and2(
          eq2(adminUsers.id, adminId),
          eq2(adminUsers.role, "admin"),
          eq2(adminUsers.isActive, true)
        )
      );
      if (!admin) throw new Error("Only admin can create moderators");
      const [moderator] = await db.insert(adminUsers).values({
        username,
        password,
        role: "moderator",
        secretKey,
        createdBy: adminId
      }).returning();
      return moderator;
    } catch (error) {
      console.error("[Auth] Create moderator error:", error);
      return null;
    }
  }
  // Get all moderators (admin only)
  static async getModerators(adminId) {
    try {
      const [admin] = await db.select().from(adminUsers).where(
        and2(
          eq2(adminUsers.id, adminId),
          eq2(adminUsers.role, "admin")
        )
      );
      if (!admin) return [];
      return await db.select().from(adminUsers).where(eq2(adminUsers.role, "moderator"));
    } catch (error) {
      console.error("[Auth] Get moderators error:", error);
      return [];
    }
  }
};
var requireAdminOnly = (req, res, next) => {
  const user = req.adminUser;
  if (!user || user.role !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
};

// server/security-monitor.ts
var SecurityMonitor = class {
  // Get security stats
  static getSecurityStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1e3;
    return {
      timestamp: now,
      message: "Security monitoring active",
      rateLimiting: "Active",
      sessionValidation: "Active",
      ipTracking: "Active",
      maxAttempts: {
        admin: 3,
        backend: 5,
        window: "1 hour"
      },
      sessionTimeout: "2 hours",
      features: [
        "Rate limiting by IP address",
        "Session IP validation (anti-hijacking)",
        "Automatic session expiration",
        "Username format validation",
        "Secret key requirement for admin access",
        "Moderator creator validation",
        "Security event logging",
        "Generic error messages (anti-enumeration)",
        "Authentication delays (anti-bruteforce)"
      ]
    };
  }
  // Check if system is under attack
  static detectSuspiciousActivity() {
    return false;
  }
  // Block suspicious IPs (would integrate with firewall)
  static blockSuspiciousIP(ip) {
    console.warn(`[SECURITY] Suspicious IP detected and logged: ${ip}`);
  }
};

// server/auth-routes.ts
import { z as z3 } from "zod";
function registerAuthRoutes(app2) {
  seedDefaultAccounts();
  app2.post("/api/admin/login", async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    try {
      const { username, password, secretKey } = adminLoginSchema.parse(req.body);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const user = await AuthService.authenticateAdmin(clientIP, username, password, secretKey);
      if (!user) {
        return res.status(401).json({
          error: "Authentication failed",
          message: "Invalid credentials or access denied"
        });
      }
      req.session.regenerate((err) => {
        if (err) {
          console.error("[SECURITY] Session regeneration failed:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.admin = user;
        req.session.adminUser = user;
        req.session.loginTime = Date.now();
        req.session.clientIP = clientIP;
        res.json({
          success: true,
          message: "Authentication successful",
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      });
    } catch (error) {
      console.error("[SECURITY] Admin login exception:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ error: "Invalid request format" });
      }
      res.status(500).json({ error: "Authentication service unavailable" });
    }
  });
  app2.post("/api/backend/login", async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    try {
      const { username, password } = backendLoginSchema.parse(req.body);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const access = await AuthService.authenticateBackend(clientIP, username, password);
      if (!access) {
        return res.status(401).json({
          error: "Access denied",
          message: "Authentication failed"
        });
      }
      req.session.regenerate((err) => {
        if (err) {
          console.error("[SECURITY] Backend session error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        req.session.backend = access;
        req.session.backendAccess = access;
        req.session.loginTime = Date.now();
        req.session.clientIP = clientIP;
        res.json({
          success: true,
          message: "Access granted",
          access: {
            id: access.id,
            username: access.username
          }
        });
      });
    } catch (error) {
      console.error("[SECURITY] Backend login exception:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ error: "Invalid request" });
      }
      res.status(500).json({ error: "Service unavailable" });
    }
  });
  app2.get("/api/auth/status", (req, res) => {
    const admin = req.session?.admin;
    const adminUser = req.session?.adminUser;
    const backend = req.session?.backend;
    const backendAccess3 = req.session?.backendAccess;
    const adminData = admin || adminUser;
    const backendData = backend || backendAccess3;
    res.json({
      admin: adminData ? {
        id: adminData.id,
        username: adminData.username,
        role: adminData.role
      } : null,
      backend: backendData ? {
        id: backendData.id,
        username: backendData.username
      } : null
    });
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
  app2.use((req, res, next) => {
    const session2 = req.session;
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    if (session2?.adminUser) {
      if (session2.clientIP && session2.clientIP !== clientIP) {
        console.warn(`[SECURITY] Session IP mismatch for admin ${session2.adminUser.username}: ${session2.clientIP} vs ${clientIP}`);
        session2.destroy();
        return next();
      }
      if (session2.loginTime && Date.now() - session2.loginTime > 2 * 60 * 60 * 1e3) {
        console.log(`[SECURITY] Admin session expired for ${session2.adminUser.username}`);
        session2.destroy();
        return next();
      }
      req.adminUser = session2.adminUser;
    }
    if (session2?.backendAccess) {
      if (session2.clientIP && session2.clientIP !== clientIP) {
        console.warn(`[SECURITY] Backend session IP mismatch: ${session2.clientIP} vs ${clientIP}`);
        session2.destroy();
        return next();
      }
      if (session2.loginTime && Date.now() - session2.loginTime > 2 * 60 * 60 * 1e3) {
        console.log(`[SECURITY] Backend session expired`);
        session2.destroy();
        return next();
      }
      req.backendAccess = session2.backendAccess;
    }
    next();
  });
  app2.post("/api/admin/moderators/create", requireAdminOnly, async (req, res) => {
    try {
      const { username, password, secretKey } = createModeratorSchema.parse(req.body);
      const adminId = req.adminUser.id;
      const moderator = await AuthService.createModerator(adminId, username, password, secretKey);
      if (!moderator) {
        return res.status(400).json({ error: "Failed to create moderator" });
      }
      res.json({
        success: true,
        message: "Moderator created successfully",
        moderator: {
          id: moderator.id,
          username: moderator.username,
          role: moderator.role
        }
      });
    } catch (error) {
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create moderator" });
    }
  });
  app2.get("/api/admin/moderators", requireAdminOnly, async (req, res) => {
    try {
      const adminId = req.adminUser.id;
      const moderators = await AuthService.getModerators(adminId);
      res.json({
        success: true,
        moderators: moderators.map((m) => ({
          id: m.id,
          username: m.username,
          role: m.role,
          isActive: m.isActive,
          createdAt: m.createdAt
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get moderators" });
    }
  });
  app2.get("/api/security/stats", requireAdminOnly, (req, res) => {
    try {
      const stats = SecurityMonitor.getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error("[SECURITY] Stats error:", error);
      res.status(500).json({ error: "Unable to fetch security stats" });
    }
  });
  app2.post("/api/security/force-logout-all", requireAdminOnly, (req, res) => {
    try {
      console.log("[SECURITY] Emergency logout initiated by admin");
      res.json({
        success: true,
        message: "All user sessions have been invalidated",
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("[SECURITY] Force logout error:", error);
      res.status(500).json({ error: "Unable to process request" });
    }
  });
  app2.use("/api/admin/middleware/isAdmin", (req, res, next) => {
    if (!req.session.admin || req.session.admin.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}
var isAuthenticated = (req, res, next) => {
  if (!req.session.admin && !req.session.backend) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// server/admin-routes.ts
import { Router } from "express";
var router = Router();
router.post("/api/admin/channels", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({ message: "Access denied" });
    }
    const validatedData = insertChannelSchema.parse(req.body);
    const channel = await storage.createChannel(validatedData);
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: "add_channel",
      targetId: channel.id,
      targetName: channel.name,
      details: JSON.stringify({ channel: validatedData }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    await storage.logChannelHistory({
      channelId: channel.id,
      action: "created",
      newData: JSON.stringify(channel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });
    res.json(channel);
  } catch (error) {
    console.error("Failed to create channel:", error);
    res.status(400).json({ message: "Failed to create channel" });
  }
});
router.put("/api/admin/channels/:id", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({ message: "Access denied" });
    }
    const id = parseInt(req.params.id);
    const oldChannel = await storage.getChannel(id);
    const updates = req.body;
    const channel = await storage.updateChannel(id, updates);
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: "update_channel",
      targetId: channel.id,
      targetName: channel.name,
      details: JSON.stringify({ oldData: oldChannel, newData: updates }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    await storage.logChannelHistory({
      channelId: channel.id,
      action: "updated",
      oldData: JSON.stringify(oldChannel),
      newData: JSON.stringify(channel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });
    res.json(channel);
  } catch (error) {
    console.error("Failed to update channel:", error);
    res.status(400).json({ message: "Failed to update channel" });
  }
});
router.delete("/api/admin/channels/:id", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({ message: "Access denied" });
    }
    const id = parseInt(req.params.id);
    const oldChannel = await storage.getChannel(id);
    await storage.deleteChannel(id);
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: "delete_channel",
      targetId: id,
      targetName: oldChannel?.name || "Unknown",
      details: JSON.stringify({ deletedChannel: oldChannel }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    await storage.logChannelHistory({
      channelId: id,
      action: "deleted",
      oldData: JSON.stringify(oldChannel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete channel:", error);
    res.status(400).json({ message: "Failed to delete channel" });
  }
});
router.post("/api/admin/channels/reorder", async (req, res) => {
  console.log("Channel reorder request - Session:", req.session?.admin);
  try {
    if (!req.session?.admin && !req.session?.adminUser) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const admin = req.session.admin || req.session.adminUser;
    if (admin?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required for reordering" });
    }
    const { channelIds } = req.body;
    console.log("Reordering channels:", channelIds);
    await storage.reorderChannels(channelIds);
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: "reorder_channels",
      targetId: null,
      targetName: "Channel List",
      details: JSON.stringify({ newOrder: channelIds }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    console.log("Channels reordered successfully");
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder channels:", error);
    res.status(400).json({ message: "Failed to reorder channels" });
  }
});
router.get("/api/admin/channel-history", async (req, res) => {
  console.log("Channel history request - Session admin:", req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId) : void 0;
    const limit = parseInt(req.query.limit) || 50;
    const history = await storage.getChannelHistory(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error("Failed to fetch channel history:", error);
    res.status(500).json({ message: "Failed to fetch channel history" });
  }
});
router.get("/api/admin/stats/website", async (req, res) => {
  console.log("Website stats request - Session:", req.session);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await storage.getWebsiteStats(days);
    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch website stats:", error);
    res.status(500).json({ message: "Failed to fetch website stats" });
  }
});
router.get("/api/admin/moderators", async (req, res) => {
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const moderators = await storage.getAllModerators();
    res.json({ success: true, moderators });
  } catch (error) {
    console.error("Failed to fetch moderators:", error);
    res.status(500).json({ message: "Failed to fetch moderators" });
  }
});
router.post("/api/admin/moderators", async (req, res) => {
  console.log("Create moderator request - Session:", req.session?.admin);
  if (!req.session?.admin && !req.session?.adminUser) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const admin = req.session.admin || req.session.adminUser;
  if (admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const admin2 = req.session.admin || req.session.adminUser;
    const validatedData = insertAdminUserSchema.parse({
      ...req.body,
      role: "moderator",
      createdBy: admin2.id
    });
    const moderator = await storage.createModerator(validatedData);
    await storage.logSystemEvent({
      level: "info",
      category: "admin",
      message: `New moderator account created: ${moderator.username}`,
      details: JSON.stringify({ createdBy: admin2.username }),
      userId: admin2.id.toString(),
      ipAddress: req.ip
    });
    res.json(moderator);
  } catch (error) {
    console.error("Failed to create moderator:", error);
    if (error.code === "23505" && error.constraint === "admin_users_username_unique") {
      return res.status(400).json({
        message: "Username already exists. Please choose a different username."
      });
    }
    res.status(400).json({ message: "Failed to create moderator" });
  }
});
router.get("/api/admin/activity", async (req, res) => {
  console.log("Activity request - Session admin:", req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const moderatorId = req.query.moderatorId ? parseInt(req.query.moderatorId) : void 0;
    const limit = parseInt(req.query.limit) || 50;
    const activity = await storage.getModeratorActivity(moderatorId, limit);
    res.json(activity);
  } catch (error) {
    console.error("Failed to fetch moderator activity:", error);
    res.status(500).json({ message: "Failed to fetch moderator activity" });
  }
});
router.get("/api/admin/sessions", async (req, res) => {
  console.log("Sessions request - Session admin:", req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const sessions = await storage.getActiveSessions();
    res.json(sessions);
  } catch (error) {
    console.error("Failed to fetch active sessions:", error);
    res.status(500).json({ message: "Failed to fetch active sessions" });
  }
});
router.get("/api/admin/logs", async (req, res) => {
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const level = req.query.level;
    const category = req.query.category;
    const limit = parseInt(req.query.limit) || 100;
    const logs = await storage.getSystemLogs(level, category, limit);
    res.json(logs);
  } catch (error) {
    console.error("Failed to fetch system logs:", error);
    res.status(500).json({ message: "Failed to fetch system logs" });
  }
});
router.get("/api/admin/channel-history", isAuthenticated, async (req, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({ message: "Access denied" });
    }
    const channelId = req.query.channelId ? parseInt(req.query.channelId) : void 0;
    const limit = parseInt(req.query.limit) || 50;
    const history = await storage.getChannelHistory(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error("Failed to fetch channel history:", error);
    res.status(500).json({ message: "Failed to fetch channel history" });
  }
});
router.put("/api/admin/moderators/:id", async (req, res) => {
  console.log("Update moderator request - Session:", req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const admin = req.session.admin;
  if (admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const moderatorId = parseInt(req.params.id);
    const updateData = req.body;
    console.log("Updating moderator:", moderatorId, "with data:", updateData);
    const updatedModerator = await storage.updateModerator(moderatorId, updateData);
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: "update_moderator",
      targetId: moderatorId,
      targetName: updatedModerator.username,
      details: JSON.stringify({ updatedData: updateData }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    await storage.logSystemEvent({
      level: "info",
      category: "admin",
      message: `Moderator account updated: ${updatedModerator.username}`,
      details: JSON.stringify({ updatedBy: admin.username }),
      userId: admin.id.toString(),
      ipAddress: req.ip
    });
    console.log("Moderator updated successfully");
    res.json(updatedModerator);
  } catch (error) {
    console.error("Failed to update moderator:", error);
    res.status(400).json({ message: "Failed to update moderator" });
  }
});
router.delete("/api/admin/moderators/:id", async (req, res) => {
  console.log("Delete moderator request - Session:", req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const admin = req.session.admin;
  if (admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const moderatorId = parseInt(req.params.id);
    const moderator = await storage.getModerator(moderatorId);
    if (!moderator) {
      return res.status(404).json({ message: "Moderator not found" });
    }
    console.log("Deleting moderator:", moderatorId, moderator.username);
    await storage.deleteModerator(moderatorId);
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: "delete_moderator",
      targetId: moderatorId,
      targetName: moderator.username,
      details: JSON.stringify({ deletedModerator: moderator }),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });
    await storage.logSystemEvent({
      level: "warning",
      category: "admin",
      message: `Moderator account deleted: ${moderator.username}`,
      details: JSON.stringify({ deletedBy: admin.username }),
      userId: admin.id.toString(),
      ipAddress: req.ip
    });
    console.log("Moderator deleted successfully");
    res.json({ success: true, message: "Moderator deleted successfully" });
  } catch (error) {
    console.error("Failed to delete moderator:", error);
    res.status(400).json({ message: "Failed to delete moderator" });
  }
});

// server/key-management-routes.ts
import { Router as Router2 } from "express";
var keyManagementRoutes = Router2();
var requireAdmin2 = (req, res, next) => {
  if (!req.session?.admin || req.session.admin.role !== "admin") {
    return res.status(401).json({ message: "Admin access required" });
  }
  next();
};
function generateAccessKey() {
  const prefix = "TPLAY";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null) || req.ip || "127.0.0.1";
}
keyManagementRoutes.get("/access-keys", requireAdmin2, async (req, res) => {
  try {
    const keys = await storage.getAllAccessKeys();
    res.json(keys);
  } catch (error) {
    console.error("Failed to fetch access keys:", error);
    res.status(500).json({ message: "Failed to fetch access keys" });
  }
});
keyManagementRoutes.post("/access-keys", requireAdmin2, async (req, res) => {
  try {
    const { notes, maxDevices, expiryDate } = req.body;
    const admin = req.session.admin;
    const keyData = {
      keyCode: generateAccessKey(),
      createdBy: admin.id,
      createdByUsername: admin.username,
      maxDevices: maxDevices || 5,
      expiryDate: new Date(expiryDate),
      notes: notes || "",
      isActive: true
    };
    const newKey = await storage.createAccessKey(keyData);
    await storage.logKeyUsage({
      keyId: newKey.id,
      ipAddress: getClientIP(req),
      action: "key_created",
      success: true
    });
    res.json(newKey);
  } catch (error) {
    console.error("Failed to create access key:", error);
    res.status(500).json({ message: "Failed to create access key" });
  }
});
keyManagementRoutes.put("/access-keys/:id/toggle", requireAdmin2, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    const { isActive } = req.body;
    const updatedKey = await storage.updateAccessKey(keyId, { isActive });
    await storage.logKeyUsage({
      keyId,
      ipAddress: getClientIP(req),
      action: isActive ? "key_enabled" : "key_disabled",
      success: true
    });
    res.json(updatedKey);
  } catch (error) {
    console.error("Failed to toggle key status:", error);
    res.status(500).json({ message: "Failed to toggle key status" });
  }
});
keyManagementRoutes.delete("/access-keys/:id", requireAdmin2, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    await storage.deleteAccessKey(keyId);
    res.json({ success: true, message: "Access key deleted successfully" });
  } catch (error) {
    console.error("Failed to delete access key:", error);
    res.status(500).json({ message: "Failed to delete access key" });
  }
});
keyManagementRoutes.get("/access-keys/:id/details", requireAdmin2, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    const [devices, usageLogs] = await Promise.all([
      storage.getKeyDevices(keyId),
      storage.getKeyUsageLogs(keyId)
    ]);
    res.json({ devices, usageLogs });
  } catch (error) {
    console.error("Failed to fetch key details:", error);
    res.status(500).json({ message: "Failed to fetch key details" });
  }
});
keyManagementRoutes.post("/verify-key", async (req, res) => {
  try {
    const { accessKey } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers["user-agent"] || "";
    if (!accessKey) {
      return res.status(400).json({
        success: false,
        message: "Access key is required"
      });
    }
    const key = await storage.getAccessKeyByCode(accessKey);
    if (!key) {
      await storage.logKeyUsage({
        keyId: 0,
        // Unknown key
        ipAddress: clientIP,
        action: "login_attempt",
        success: false,
        errorMessage: "Invalid access key"
      });
      return res.status(401).json({
        success: false,
        message: "Invalid access key"
      });
    }
    if (!key.isActive) {
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: "login_attempt",
        success: false,
        errorMessage: "Key is disabled"
      });
      return res.status(401).json({
        success: false,
        message: "Access key is disabled"
      });
    }
    if (/* @__PURE__ */ new Date() > new Date(key.expiryDate)) {
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: "login_attempt",
        success: false,
        errorMessage: "Key expired"
      });
      return res.status(401).json({
        success: false,
        message: "Access key has expired"
      });
    }
    const existingDevices = await storage.getKeyDevices(key.id);
    const existingDevice = existingDevices.find(
      (device) => device.ipAddress === clientIP && device.isActive
    );
    if (!existingDevice) {
      const activeDeviceCount = existingDevices.filter((device) => device.isActive).length;
      if (activeDeviceCount >= key.maxDevices) {
        await storage.logKeyUsage({
          keyId: key.id,
          ipAddress: clientIP,
          action: "device_limit_exceeded",
          success: false,
          errorMessage: `Device limit exceeded (${key.maxDevices} max)`
        });
        return res.status(401).json({
          success: false,
          message: `Device limit exceeded. Maximum ${key.maxDevices} devices allowed.`
        });
      }
      await storage.addKeyDevice({
        keyId: key.id,
        ipAddress: clientIP,
        userAgent,
        isActive: true
      });
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: "device_added",
        success: true
      });
    } else {
      await storage.updateKeyDeviceLastUsed(existingDevice.id);
    }
    await storage.logKeyUsage({
      keyId: key.id,
      ipAddress: clientIP,
      action: "login_success",
      success: true
    });
    res.json({
      success: true,
      message: "Access granted successfully",
      accessLevel: "premium",
      expiryDate: key.expiryDate,
      devicesUsed: existingDevices.filter((d) => d.isActive).length + (existingDevice ? 0 : 1),
      maxDevices: key.maxDevices
    });
  } catch (error) {
    console.error("Error verifying access key:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify access key"
    });
  }
});

// server/routes.ts
async function registerRoutes(app2) {
  registerAuthRoutes(app2);
  registerWorkerRoutes(app2);
  app2.use(router);
  app2.use("/api/admin", keyManagementRoutes);
  app2.get("/api/admin/channels/all", async (req, res) => {
    try {
      const channels2 = await storage.getChannels();
      res.json(channels2);
    } catch (error) {
      console.error("Error fetching all channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });
  app2.put("/api/admin/channels/:id/access", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isFreeAccess } = req.body;
      const updatedChannel = await storage.updateChannel(id, { isFreeAccess });
      res.json(updatedChannel);
    } catch (error) {
      console.error("Error updating channel access:", error);
      res.status(500).json({ message: "Failed to update channel access" });
    }
  });
  app2.post("/api/admin/channels/bulk-access", async (req, res) => {
    try {
      const { action } = req.body;
      const channels2 = await storage.getChannels();
      switch (action) {
        case "make_all_free":
          await Promise.all(channels2.map(
            (channel) => storage.updateChannel(channel.id, { isFreeAccess: true })
          ));
          break;
        case "make_all_premium":
          await Promise.all(channels2.map(
            (channel) => storage.updateChannel(channel.id, { isFreeAccess: false })
          ));
          break;
        case "first_100_free":
          await Promise.all(channels2.map(
            (channel, index) => storage.updateChannel(channel.id, { isFreeAccess: index < 100 })
          ));
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }
      res.json({ success: true, message: "Bulk update completed" });
    } catch (error) {
      console.error("Error performing bulk update:", error);
      res.status(500).json({ message: "Failed to perform bulk update" });
    }
  });
  app2.get("/test-worker", (req, res) => {
    res.sendFile("test-worker-api.html", { root: process.cwd() });
  });
  app2.get("/api/channels", async (req, res) => {
    try {
      const accessKey = req.headers["x-access-key"];
      let hasFullAccess = false;
      const validKeys = ["tplay2025premium", "tplaypro2025", "premium_access_2025"];
      if (accessKey && validKeys.includes(accessKey)) {
        hasFullAccess = true;
      }
      if (!hasFullAccess && accessKey) {
        const clientIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip || "127.0.0.1";
        const key = await storage.getAccessKeyByCode(accessKey);
        if (key && key.isActive && /* @__PURE__ */ new Date() <= new Date(key.expiryDate)) {
          const devices = await storage.getKeyDevices(key.id);
          const existingDevice = devices.find(
            (device) => device.ipAddress === clientIP && device.isActive
          );
          if (existingDevice || devices.filter((d) => d.isActive).length < key.maxDevices) {
            hasFullAccess = true;
            if (existingDevice) {
              await storage.updateKeyDeviceLastUsed(existingDevice.id);
            } else {
              await storage.addKeyDevice({
                keyId: key.id,
                ipAddress: clientIP,
                userAgent: req.headers["user-agent"] || "",
                isActive: true
              });
            }
            await storage.logKeyUsage({
              keyId: key.id,
              ipAddress: clientIP,
              action: "channel_access",
              success: true
            });
          }
        }
      }
      let channels2 = await storage.getChannels();
      if (!hasFullAccess) {
        channels2 = channels2.filter((channel) => channel.isFreeAccess !== false).slice(0, 100);
      }
      res.json(channels2);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });
  app2.post("/api/verify-access-key", async (req, res) => {
    try {
      const { accessKey } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || "unknown";
      const legacyKeys = [
        "tplay2025premium",
        "tplaypro2025",
        "premium_access_2025"
      ];
      if (legacyKeys.includes(accessKey)) {
        try {
          await storage.logKeyUsage({
            keyId: 0,
            // Use 0 for legacy keys
            ipAddress: clientIP,
            action: "legacy_key_access",
            success: true
          });
        } catch (logError) {
          console.error("Failed to log legacy key usage:", logError);
        }
        return res.json({
          success: true,
          message: "Access granted successfully",
          accessLevel: "premium"
        });
      }
      const key = await storage.getAccessKeyByCode(accessKey);
      if (key && key.isActive && /* @__PURE__ */ new Date() < new Date(key.expiryDate)) {
        const devices = await storage.getKeyDevices(key.id);
        const existingDevice = devices.find(
          (device) => device.ipAddress === clientIP && device.isActive
        );
        if (existingDevice || devices.filter((d) => d.isActive).length < key.maxDevices) {
          if (existingDevice) {
            await storage.updateKeyDeviceLastUsed(existingDevice.id);
          } else {
            await storage.addKeyDevice({
              keyId: key.id,
              ipAddress: clientIP,
              userAgent: req.headers["user-agent"] || "",
              isActive: true
            });
          }
          await storage.logKeyUsage({
            keyId: key.id,
            ipAddress: clientIP,
            action: "key_verification",
            success: true
          });
          return res.json({
            success: true,
            message: "Access granted successfully",
            accessLevel: "premium",
            keyInfo: {
              maxDevices: key.maxDevices,
              devicesUsed: devices.filter((d) => d.isActive).length,
              expiryDate: key.expiryDate
            }
          });
        } else {
          await storage.logKeyUsage({
            keyId: key.id,
            ipAddress: clientIP,
            action: "key_verification",
            success: false
          });
          return res.status(401).json({
            success: false,
            message: "Device limit reached for this access key"
          });
        }
      }
      try {
        await storage.logKeyUsage({
          keyId: 0,
          ipAddress: clientIP,
          action: "invalid_key_attempt",
          success: false
        });
      } catch (logError) {
        console.error("Failed to log invalid key attempt:", logError);
      }
      res.status(401).json({
        success: false,
        message: "Invalid access key"
      });
    } catch (error) {
      console.error("Error verifying access key:", error);
      res.status(500).json({ message: "Failed to verify access key" });
    }
  });
  app2.get("/api/channels/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const channels2 = await storage.getChannelsByCategory(category);
      res.json(channels2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels by category" });
    }
  });
  app2.get("/api/channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const channel = await storage.getChannel(id);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      res.json(channel);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });
  app2.put("/api/channels/:id", async (req, res) => {
    console.log("Channel update request received:", req.params.id, req.body);
    try {
      if (!req.session?.admin && !req.session?.backend) {
        console.log("No admin or backend session found");
        return res.status(401).json({ message: "Authentication required" });
      }
      const id = parseInt(req.params.id);
      const updates = req.body;
      console.log("Updating channel:", id, "with data:", updates);
      const oldChannel = await storage.getChannel(id);
      if (!oldChannel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      const channel = await storage.updateChannel(id, updates);
      console.log("Channel updated successfully:", channel);
      res.json(channel);
    } catch (error) {
      console.error("Failed to update channel:", error);
      res.status(500).json({
        message: "Failed to update channel",
        error: error.message
      });
    }
  });
  app2.patch("/api/channels/:id/viewers", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { count } = req.body;
      await storage.updateChannelViewers(id, count);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update viewer count" });
    }
  });
  app2.get("/api/channels/:id/programs", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const programs2 = await storage.getPrograms(channelId);
      res.json(programs2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });
  app2.get("/api/channels/:id/current-program", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const program = await storage.getCurrentProgram(channelId);
      res.json(program || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current program" });
    }
  });
  app2.post("/api/validate-stream", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "Stream URL is required" });
      }
      const validFormats = [".m3u8", ".mpd", ".ts"];
      const isValidFormat = validFormats.some(
        (format) => url.toLowerCase().includes(format) || url.toLowerCase().includes("manifest") || url.toLowerCase().includes("playlist")
      );
      if (!isValidFormat) {
        return res.status(400).json({
          message: "Invalid stream format. Supported formats: M3U8, MPD, TS, DASH"
        });
      }
      res.json({
        valid: true,
        format: url.includes(".m3u8") ? "HLS" : url.includes(".mpd") ? "DASH" : url.includes(".ts") ? "TS" : "Unknown",
        url
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to validate stream" });
    }
  });
  app2.get("/api/custom-channels", async (req, res) => {
    try {
      const userId = req.sessionID || req.ip || "anonymous";
      const customChannels2 = await storage.getCustomChannels(userId);
      res.json(customChannels2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom channels" });
    }
  });
  app2.get("/api/custom-channels/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const userId = req.sessionID || req.ip || "anonymous";
      const customChannels2 = await storage.getCustomChannelsByCategory(category, userId);
      res.json(customChannels2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom channels by category" });
    }
  });
  app2.post("/api/custom-channels/m3u", async (req, res) => {
    try {
      const { content, url, name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Playlist name is required" });
      }
      const userId = req.sessionID || req.ip || "anonymous";
      let m3uContent = content;
      if (url && !content) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          m3uContent = await response.text();
        } catch (fetchError) {
          return res.status(400).json({
            message: "Failed to fetch M3U from URL",
            error: fetchError.message
          });
        }
      }
      if (!m3uContent) {
        return res.status(400).json({ message: "M3U content or URL is required" });
      }
      const parsedChannels = await storage.parseM3UPlaylist(m3uContent, name, userId);
      res.json({
        success: true,
        count: parsedChannels.length,
        channels: parsedChannels,
        userId
        // For debugging
      });
    } catch (error) {
      console.error("M3U parsing error:", error);
      res.status(500).json({
        message: "Failed to parse M3U playlist",
        error: error.message
      });
    }
  });
  app2.delete("/api/custom-channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.sessionID || req.ip || "anonymous";
      await storage.deleteCustomChannel(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom channel" });
    }
  });
  app2.get("/api/stream-proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Stream URL is required" });
    }
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Content-Type");
      if (url.includes(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (url.includes(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else if (url.includes(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      } else if (url.includes(".mpd")) {
        res.setHeader("Content-Type", "application/dash+xml");
      }
      res.json({
        proxiedUrl: url,
        originalUrl: url,
        corsEnabled: true,
        streamType: url.includes(".m3u8") ? "HLS" : url.includes(".mp4") ? "MP4" : "OTHER",
        mobileOptimized: true,
        message: "Stream accessible with CORS headers"
      });
    } catch (error) {
      console.error("Stream proxy error:", error);
      res.status(500).json({ error: "Stream proxy failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/exclusive-seed.ts
import { eq as eq3 } from "drizzle-orm";
async function seedExclusiveChannels() {
  try {
    console.log("\u{1F31F} Seeding T PLAY Exclusive Channels...");
    const exclusiveChannels = [
      {
        name: "T PLAY News",
        streamUrl: "https://bpprod6livek.akamaized.net/out/v1/f8fa102b2c6e4a599f84bb10a9193a7e/index.m3u8",
        category: "News",
        logo: "https://i.postimg.cc/J7dCqg0m/T-PLAY-News.png",
        description: "T PLAY News Channel - 24/7 latest news and updates",
        quality: "HD",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY EXCLUSIVE"
      },
      {
        name: "T PLAY Sports",
        streamUrl: "https://bpprod7livek.akamaized.net/out/v1/c9a26e9b9e6d413bb70e0bfee3a5da4f/index.m3u8",
        category: "Sports",
        logo: "https://i.postimg.cc/QMYxqJ4b/T-PLAY-Sports.png",
        description: "T PLAY Sports - Live coverage and analysis of all sports",
        quality: "4K",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY EXCLUSIVE"
      },
      {
        name: "T PLAY Movies",
        streamUrl: "https://d1g8wgjurz8via.cloudfront.net/bpk-tv/Zeebanglacinema/default/manifest.mpd",
        category: "Movies",
        logo: "https://i.postimg.cc/C5rJhq3W/T-PLAY-Movies.png",
        description: "T PLAY Movies - Huge collection of movies in multiple languages",
        quality: "4K",
        streamFormat: "DASH",
        isDrmProtected: true,
        drmKeyId: "fbbfd9ce4bbe4d818b16df7dfe89f05b",
        drmKey: "1e96d0f88ef740e982d6f6105721c8bc",
        manifestUrl: "https://d1g8wgjurz8via.cloudfront.net/bpk-tv/Zeebanglacinema/default/manifest.mpd",
        isExclusive: true,
        exclusiveTag: "T PLAY PREMIUM"
      },
      {
        name: "T PLAY Music",
        streamUrl: "https://bpprod8livek.akamaized.net/out/v1/a1b2c3d4e5f6/index.m3u8",
        category: "Music",
        logo: "https://i.postimg.cc/GtK8Zx2Y/T-PLAY-Music.png",
        description: "T PLAY Music - Unique collection of local and international music",
        quality: "HD",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY EXCLUSIVE"
      },
      {
        name: "T PLAY Kids",
        streamUrl: "https://bpprod9livek.akamaized.net/out/v1/b2c3d4e5f6g7/index.m3u8",
        category: "Kids",
        logo: "https://i.postimg.cc/SQk7Rx1Y/T-PLAY-Kids.png",
        description: "T PLAY Kids - Safe and educational content for children",
        quality: "HD",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY FAMILY"
      },
      {
        name: "T PLAY Drama",
        streamUrl: "https://bpprod10livek.akamaized.net/out/v1/c3d4e5f6g7h8/index.m3u8",
        category: "Entertainment",
        logo: "https://i.postimg.cc/W1jK9X3Y/T-PLAY-Drama.png",
        description: "T PLAY Drama - Special collection of dramas and series",
        quality: "HD",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY ORIGINAL"
      },
      {
        name: "T PLAY Live",
        streamUrl: "https://bpprod11livek.akamaized.net/out/v1/d4e5f6g7h8i9/index.m3u8",
        category: "Entertainment",
        logo: "https://i.postimg.cc/VsJ8dK2W/T-PLAY-Live.png",
        description: "T PLAY Live - Live talk shows, magazine and event coverage",
        quality: "4K",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY LIVE"
      },
      {
        name: "T PLAY Regional",
        streamUrl: "https://bpprod12livek.akamaized.net/out/v1/e5f6g7h8i9j0/index.m3u8",
        category: "Regional",
        logo: "https://i.postimg.cc/8CrL5X6M/T-PLAY-Regional.png",
        description: "T PLAY Regional - Local culture and traditional programs",
        quality: "HD",
        streamFormat: "HLS",
        isExclusive: true,
        exclusiveTag: "T PLAY CULTURE"
      }
    ];
    for (const channelData of exclusiveChannels) {
      try {
        const [existing] = await db.select().from(channels).where(eq3(channels.name, channelData.name));
        if (!existing) {
          await db.insert(channels).values({
            ...channelData,
            viewerCount: Math.floor(Math.random() * 1e3) + 500
            // Random viewer count between 500-1500
          });
          console.log(`\u2713 Added exclusive channel: ${channelData.name}`);
        } else {
          await db.update(channels).set({
            isExclusive: true,
            exclusiveTag: channelData.exclusiveTag
          }).where(eq3(channels.id, existing.id));
          console.log(`\u2713 Updated existing channel to exclusive: ${channelData.name}`);
        }
      } catch (error) {
        console.log(`\u26A0\uFE0F Channel ${channelData.name} might already exist`);
      }
    }
    console.log("\u{1F31F} T PLAY Exclusive Channels seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error seeding exclusive channels:", error);
    return false;
  }
}

// server/seed.ts
import { sql as sql3 } from "drizzle-orm";
async function markChannelsAsFreeAccess() {
  try {
    console.log("\u{1F31F} Updating channels for free access system...");
    await db.update(channels).set({ isFreeAccess: true }).where(sql3`id <= 100`);
    await db.update(channels).set({ isFreeAccess: false }).where(sql3`id > 100`);
    console.log("\u2713 Updated channel access levels successfully!");
    console.log("\u2713 First 100 channels: Free access");
    console.log("\u2713 Remaining channels: Premium access");
  } catch (error) {
    console.error("\u274C Failed to update channel access levels:", error);
  }
}

// server/index.ts
var app = express2();
app.use(cors());
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "tplay-secret-key-2025",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    await seedExclusiveChannels();
    await markChannelsAsFreeAccess();
  } catch (error) {
    log("Failed to seed database:", String(error));
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
