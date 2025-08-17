import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channels = pgTable("channels", {
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
  streamFormat: text("stream_format").default("HLS"), // HLS, DASH, MPD
  isDrmProtected: boolean("is_drm_protected").default(false),
  drmKeyId: text("drm_key_id"), // For clearkey DRM
  drmKey: text("drm_key"), // For clearkey DRM
  manifestUrl: text("manifest_url"), // For DASH/MPD streams
  sortOrder: integer("sort_order").default(0),
  // T PLAY Exclusive Channels
  isExclusive: boolean("is_exclusive").default(false),
  exclusiveTag: text("exclusive_tag"), // "T PLAY EXCLUSIVE", "PREMIUM", etc.
  // Free access for 100 channels without authentication
  isFreeAccess: boolean("is_free_access").default(true),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isLive: boolean("is_live").default(false),
});

export const customChannels = pgTable("custom_channels", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Link to user who uploaded
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  logo: text("logo"),
  category: text("category").notNull(),
  quality: text("quality").default("HD"),
  streamFormat: text("stream_format").notNull(), // M3U8, DASH, TS, MPD
  customName: text("custom_name").notNull(),
  playlistName: text("playlist_name"), // M3U playlist name if from playlist
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channelsRelations = relations(channels, ({ many }) => ({
  programs: many(programs),
}));

export const programsRelations = relations(programs, ({ one }) => ({
  channel: one(channels, {
    fields: [programs.channelId],
    references: [channels.id],
  }),
}));

export const customChannelsRelations = relations(customChannels, ({ many }) => ({
  // Add relations if needed for future features
}));

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  viewerCount: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
});

export const insertCustomChannelSchema = createInsertSchema(customChannels).omit({
  id: true,
  createdAt: true,
});

// Admin/Moderator accounts for backend management
export const adminUsers: any = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("moderator"), // admin or moderator
  secretKey: varchar("secret_key", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references((): any => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Backend access credentials
export const backendAccess = pgTable("backend_access", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackendAccessSchema = createInsertSchema(backendAccess).omit({
  id: true,
  createdAt: true,
});

// Premium Access Keys Management
export const accessKeys = pgTable("access_keys", {
  id: serial("id").primaryKey(),
  keyCode: varchar("key_code", { length: 100 }).unique().notNull(),
  createdBy: integer("created_by").references(() => adminUsers.id).notNull(),
  createdByUsername: varchar("created_by_username", { length: 50 }).notNull(),
  maxDevices: integer("max_devices").default(5).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"), // Admin notes about the key
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Device tracking for access keys
export const keyDevices = pgTable("key_devices", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => accessKeys.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"), // Browser fingerprint
  firstUsed: timestamp("first_used").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Key usage logs
export const keyUsageLogs = pgTable("key_usage_logs", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => accessKeys.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'login', 'channel_access', 'device_add'
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAccessKeySchema = createInsertSchema(accessKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeyDeviceSchema = createInsertSchema(keyDevices).omit({
  id: true,
  firstUsed: true,
  lastUsed: true,
});

export const insertKeyUsageLogSchema = createInsertSchema(keyUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type CustomChannel = typeof customChannels.$inferSelect;
export type InsertCustomChannel = z.infer<typeof insertCustomChannelSchema>;
export type AccessKey = typeof accessKeys.$inferSelect;
export type InsertAccessKey = z.infer<typeof insertAccessKeySchema>;
export type KeyDevice = typeof keyDevices.$inferSelect;
export type KeyUsageLog = typeof keyUsageLogs.$inferSelect;
// Website analytics and traffic monitoring
export const websiteStats = pgTable("website_stats", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 20 }).notNull(), // YYYY-MM-DD format
  totalVisitors: integer("total_visitors").default(0),
  pageViews: integer("page_views").default(0),
  channelViews: integer("channel_views").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgSessionTime: integer("avg_session_time").default(0), // seconds
  topChannel: text("top_channel"),
  topCategory: text("top_category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Moderator activity tracking
export const moderatorActivity = pgTable("moderator_activity", {
  id: serial("id").primaryKey(),
  moderatorId: integer("moderator_id").references(() => adminUsers.id),
  moderatorUsername: varchar("moderator_username", { length: 50 }).notNull(),
  action: text("action").notNull(), // add_channel, edit_channel, delete_channel, reorder_channels
  targetId: integer("target_id"), // channel_id or other resource id
  targetName: text("target_name"), // channel name or resource name
  details: text("details"), // JSON string with action details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// System logs for admin monitoring
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level", { length: 20 }).notNull(), // info, warning, error, security
  category: varchar("category", { length: 50 }).notNull(), // auth, channel, system, security
  message: text("message").notNull(),
  details: text("details"), // Additional context as JSON
  userId: text("user_id"), // admin/moderator id if applicable
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Active user sessions tracking
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(), // viewer, admin, moderator
  userId: text("user_id"), // For logged in users
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  currentPage: text("current_page"),
  currentChannel: integer("current_channel").references(() => channels.id),
  startTime: timestamp("start_time").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Channel management history
export const channelHistory = pgTable("channel_history", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, deleted, reordered
  oldData: text("old_data"), // JSON of previous state
  newData: text("new_data"), // JSON of new state
  performedBy: integer("performed_by").references(() => adminUsers.id),
  performedByUsername: varchar("performed_by_username", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertWebsiteStatsSchema = createInsertSchema(websiteStats).omit({
  id: true,
  createdAt: true,
});

export const insertModeratorActivitySchema = createInsertSchema(moderatorActivity).omit({
  id: true,
  timestamp: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  id: true,
  startTime: true,
  lastActivity: true,
});

export const insertChannelHistorySchema = createInsertSchema(channelHistory).omit({
  id: true,
  timestamp: true,
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type BackendAccess = typeof backendAccess.$inferSelect;
export type InsertBackendAccess = z.infer<typeof insertBackendAccessSchema>;
export type WebsiteStats = typeof websiteStats.$inferSelect;
export type InsertWebsiteStats = z.infer<typeof insertWebsiteStatsSchema>;
export type ModeratorActivity = typeof moderatorActivity.$inferSelect;
export type InsertModeratorActivity = z.infer<typeof insertModeratorActivitySchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;
export type ChannelHistory = typeof channelHistory.$inferSelect;
export type InsertChannelHistory = z.infer<typeof insertChannelHistorySchema>;
