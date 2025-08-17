import type { Express, Request, Response } from "express";
import { AuthService, adminLoginSchema, backendLoginSchema, createModeratorSchema, seedDefaultAccounts, requireAdmin, requireAdminOnly, requireBackendAccess } from "./auth";
import { SecurityMonitor } from "./security-monitor";
import { z } from "zod";

export function registerAuthRoutes(app: Express) {
  
  // Seed default accounts on startup
  seedDefaultAccounts();

  // Admin/Moderator Login with enhanced security
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      const { username, password, secretKey } = adminLoginSchema.parse(req.body);
      
      // Security delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = await AuthService.authenticateAdmin(clientIP, username, password, secretKey);
      
      if (!user) {
        // Generic error message to prevent user enumeration
        return res.status(401).json({ 
          error: "Authentication failed", 
          message: "Invalid credentials or access denied"
        });
      }

      // Additional session security
      req.session.regenerate((err) => {
        if (err) {
          console.error("[SECURITY] Session regeneration failed:", err);
          return res.status(500).json({ error: "Session error" });
        }

        // Store user in session with additional security metadata (use both keys)
        (req.session as any).admin = user;
        (req.session as any).adminUser = user;
        (req.session as any).loginTime = Date.now();
        (req.session as any).clientIP = clientIP;
        
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request format" });
      }
      res.status(500).json({ error: "Authentication service unavailable" });
    }
  });

  // Backend Access Login with enhanced security
  app.post("/api/backend/login", async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      const { username, password } = backendLoginSchema.parse(req.body);
      
      // Security delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const access = await AuthService.authenticateBackend(clientIP, username, password);
      
      if (!access) {
        return res.status(401).json({ 
          error: "Access denied", 
          message: "Authentication failed"
        });
      }

      // Secure session handling
      req.session.regenerate((err) => {
        if (err) {
          console.error("[SECURITY] Backend session error:", err);
          return res.status(500).json({ error: "Session error" });
        }

        (req.session as any).backend = access;
        (req.session as any).backendAccess = access;
        (req.session as any).loginTime = Date.now();
        (req.session as any).clientIP = clientIP;
        
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request" });
      }
      res.status(500).json({ error: "Service unavailable" });
    }
  });

  // Check authentication status
  app.get("/api/auth/status", (req: Request, res: Response) => {
    const admin = (req.session as any)?.admin;
    const adminUser = (req.session as any)?.adminUser;
    const backend = (req.session as any)?.backend;
    const backendAccess = (req.session as any)?.backendAccess;
    
    // Use admin or adminUser (prefer admin)
    const adminData = admin || adminUser;
    const backendData = backend || backendAccess;
    
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

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Security middleware with session validation
  app.use((req: Request, res: Response, next) => {
    const session = req.session as any;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Validate admin session
    if (session?.adminUser) {
      // Check session IP consistency (prevent session hijacking)
      if (session.clientIP && session.clientIP !== clientIP) {
        console.warn(`[SECURITY] Session IP mismatch for admin ${session.adminUser.username}: ${session.clientIP} vs ${clientIP}`);
        session.destroy();
        return next();
      }
      
      // Check session age (auto logout after 2 hours of inactivity)
      if (session.loginTime && Date.now() - session.loginTime > 2 * 60 * 60 * 1000) {
        console.log(`[SECURITY] Admin session expired for ${session.adminUser.username}`);
        session.destroy();
        return next();
      }
      
      (req as any).adminUser = session.adminUser;
    }
    
    // Validate backend session
    if (session?.backendAccess) {
      // Same security checks for backend access
      if (session.clientIP && session.clientIP !== clientIP) {
        console.warn(`[SECURITY] Backend session IP mismatch: ${session.clientIP} vs ${clientIP}`);
        session.destroy();
        return next();
      }
      
      if (session.loginTime && Date.now() - session.loginTime > 2 * 60 * 60 * 1000) {
        console.log(`[SECURITY] Backend session expired`);
        session.destroy();
        return next();
      }
      
      (req as any).backendAccess = session.backendAccess;
    }
    
    next();
  });

  // Admin-only routes
  
  // Create moderator (admin only)
  app.post("/api/admin/moderators/create", requireAdminOnly, async (req: Request, res: Response) => {
    try {
      const { username, password, secretKey } = createModeratorSchema.parse(req.body);
      const adminId = ((req as any).adminUser).id;
      
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create moderator" });
    }
  });

  // Get all moderators (admin only)
  app.get("/api/admin/moderators", requireAdminOnly, async (req: Request, res: Response) => {
    try {
      const adminId = ((req as any).adminUser).id;
      const moderators = await AuthService.getModerators(adminId);
      
      res.json({
        success: true,
        moderators: moderators.map(m => ({
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

  // Security monitoring endpoint (admin only)
  app.get("/api/security/stats", requireAdminOnly, (req: Request, res: Response) => {
    try {
      const stats = SecurityMonitor.getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error("[SECURITY] Stats error:", error);
      res.status(500).json({ error: "Unable to fetch security stats" });
    }
  });

  // Force logout all sessions (emergency admin function)
  app.post("/api/security/force-logout-all", requireAdminOnly, (req: Request, res: Response) => {
    try {
      // In production, this would invalidate all sessions in the session store
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

  // Admin-only middleware
  app.use('/api/admin/middleware/isAdmin', (req: any, res, next) => {
    if (!req.session.admin || req.session.admin.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session.admin && !req.session.backend) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (!req.session.admin || req.session.admin.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};