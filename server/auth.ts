import { z } from "zod";
import { adminUsers, backendAccess, type AdminUser, type BackendAccess } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

// Default admin credentials - will be seeded if not exists
const DEFAULT_ADMIN = {
  username: "tplaybd",
  password: "tplaylive",
  role: "admin" as const,
  secretKey: "bCn5832iNtErNeT??"
};

const DEFAULT_BACKEND_ACCESS = {
  username: "tplayback", 
  password: "tplaylive758!!"
};

// Seed default accounts on startup
export async function seedDefaultAccounts() {
  try {
    // Check if admin exists
    const [existingAdmin] = await db.select().from(adminUsers).where(eq(adminUsers.username, DEFAULT_ADMIN.username));
    
    if (!existingAdmin) {
      await db.insert(adminUsers).values(DEFAULT_ADMIN);
      console.log("[Auth] Default admin account created");
    }

    // Check if backend access exists  
    const [existingBackend] = await db.select().from(backendAccess).where(eq(backendAccess.username, DEFAULT_BACKEND_ACCESS.username));
    
    if (!existingBackend) {
      await db.insert(backendAccess).values(DEFAULT_BACKEND_ACCESS);
      console.log("[Auth] Default backend access created");
    }

  } catch (error) {
    console.error("[Auth] Error seeding default accounts:", error);
  }
}

// Authentication schemas
export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  secretKey: z.string().optional(),
});

export const backendLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createModeratorSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(255),
  secretKey: z.string().optional(),
});

// Security tracking
interface LoginAttempt {
  ip: string;
  username: string;
  timestamp: number;
  success: boolean;
}

const loginAttempts: LoginAttempt[] = [];
const RATE_LIMIT_ATTEMPTS = 5; // Max 5 attempts per IP per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const ADMIN_ATTEMPTS_LIMIT = 3; // Even stricter for admin
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes lockout

// Authentication functions
export class AuthService {
  
  // Check if IP is rate limited
  static isRateLimited(ip: string, isAdmin: boolean = false): boolean {
    const now = Date.now();
    const limit = isAdmin ? ADMIN_ATTEMPTS_LIMIT : RATE_LIMIT_ATTEMPTS;
    
    // Clean old attempts
    const recentAttempts = loginAttempts.filter(
      attempt => now - attempt.timestamp < RATE_LIMIT_WINDOW && attempt.ip === ip
    );
    
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    
    return failedAttempts.length >= limit;
  }

  // Log login attempt
  static logAttempt(ip: string, username: string, success: boolean): void {
    loginAttempts.push({
      ip,
      username: username.toLowerCase(),
      timestamp: Date.now(),
      success
    });
    
    // Keep only last 1000 attempts in memory
    if (loginAttempts.length > 1000) {
      loginAttempts.splice(0, 100);
    }
    
    // Log security events
    if (!success) {
      console.warn(`[SECURITY] Failed login attempt for ${username} from IP ${ip}`);
    }
  }

  // Advanced admin authentication with multiple security layers
  static async authenticateAdmin(ip: string, username: string, password: string, secretKey?: string): Promise<AdminUser | null> {
    try {
      // Security Layer 1: Rate limiting by IP
      if (this.isRateLimited(ip, true)) {
        console.warn(`[SECURITY] IP ${ip} rate limited for admin access`);
        this.logAttempt(ip, username, false);
        return null;
      }

      // Security Layer 2: Username validation (prevent SQL injection)
      if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        console.warn(`[SECURITY] Invalid username format attempt: ${username} from IP ${ip}`);
        this.logAttempt(ip, username, false);
        return null;
      }

      // Security Layer 3: Database query with exact match
      const [user] = await db.select()
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.username, username),
            eq(adminUsers.password, password),
            eq(adminUsers.isActive, true)
          )
        );

      if (!user) {
        this.logAttempt(ip, username, false);
        return null;
      }

      // Security Layer 4: Admin role requires secret key validation
      if (user.role === 'admin') {
        if (!secretKey || user.secretKey !== secretKey) {
          console.warn(`[SECURITY] Admin login without valid secret key from IP ${ip}`);
          this.logAttempt(ip, username, false);
          return null;
        }
      }

      // Security Layer 5: Additional validation for moderator
      if (user.role === 'moderator') {
        // Moderators can only login if created by active admin
        if (user.createdBy) {
          const [admin] = await db.select()
            .from(adminUsers)
            .where(
              and(
                eq(adminUsers.id, user.createdBy),
                eq(adminUsers.role, 'admin'),
                eq(adminUsers.isActive, true)
              )
            );
          
          if (!admin) {
            console.warn(`[SECURITY] Moderator login blocked - creator admin inactive`);
            this.logAttempt(ip, username, false);
            return null;
          }
        }
      }

      // Success - log and return
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
  static async authenticateBackend(ip: string, username: string, password: string): Promise<BackendAccess | null> {
    try {
      // Rate limiting for backend access
      if (this.isRateLimited(ip, false)) {
        console.warn(`[SECURITY] IP ${ip} rate limited for backend access`);
        this.logAttempt(ip, username, false);
        return null;
      }

      // Username validation
      if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        console.warn(`[SECURITY] Invalid backend username format: ${username} from IP ${ip}`);
        this.logAttempt(ip, username, false);
        return null;
      }

      const [access] = await db.select()
        .from(backendAccess)
        .where(
          and(
            eq(backendAccess.username, username),
            eq(backendAccess.password, password),
            eq(backendAccess.isActive, true)
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
  static async createModerator(adminId: number, username: string, password: string, secretKey?: string): Promise<AdminUser | null> {
    try {
      // Verify admin exists
      const [admin] = await db.select()
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.id, adminId),
            eq(adminUsers.role, 'admin'),
            eq(adminUsers.isActive, true)
          )
        );

      if (!admin) throw new Error("Only admin can create moderators");

      const [moderator] = await db.insert(adminUsers).values({
        username,
        password,
        role: 'moderator',
        secretKey,
        createdBy: adminId,
      }).returning();

      return moderator;
    } catch (error) {
      console.error("[Auth] Create moderator error:", error);
      return null;
    }
  }

  // Get all moderators (admin only)
  static async getModerators(adminId: number): Promise<AdminUser[]> {
    try {
      // Verify admin
      const [admin] = await db.select()
        .from(adminUsers)  
        .where(
          and(
            eq(adminUsers.id, adminId),
            eq(adminUsers.role, 'admin')
          )
        );

      if (!admin) return [];

      return await db.select()
        .from(adminUsers)
        .where(eq(adminUsers.role, 'moderator'));
    } catch (error) {
      console.error("[Auth] Get moderators error:", error);
      return [];
    }
  }
}

// Middleware for admin/moderator authentication
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).adminUser as AdminUser;
  
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return res.status(401).json({ error: "Admin/Moderator access required" });
  }
  
  next();
};

// Middleware for admin-only access
export const requireAdminOnly = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).adminUser as AdminUser;
  
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: "Admin access required" });
  }
  
  next();
};

// Middleware for backend access
export const requireBackendAccess = (req: Request, res: Response, next: NextFunction) => {
  const access = (req as any).backendAccess as BackendAccess;
  
  if (!access) {
    return res.status(401).json({ error: "Backend access required" });
  }
  
  next();
};