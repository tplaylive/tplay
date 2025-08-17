import type { Express } from "express";
import { storage } from "./storage";
import { insertCustomChannelSchema } from "@shared/schema";
import { requireAdmin, requireBackendAccess } from "./auth";
import { z } from "zod";

// Worker API key for authentication (in production, use proper auth)
const WORKER_API_KEY = process.env.WORKER_API_KEY || "worker_demo_key_2025";

// Role-based permission checker
const checkPermission = (req: any, action: string) => {
  const adminUser = (req as any).adminUser;
  if (!adminUser) return false;
  
  // Admin has all permissions
  if (adminUser.role === 'admin') return true;
  
  // Moderator has limited permissions
  if (adminUser.role === 'moderator') {
    const allowedActions = ['add_channel', 'edit_channel', 'delete_channel', 'reorder_channel'];
    return allowedActions.includes(action);
  }
  
  return false;
};

// Enhanced worker authentication middleware with role-based access
const authenticateWorker = (req: any, res: any, next: any) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if user has proper authentication (admin, moderator, or backend access)
  const hasAdminAccess = (req as any).adminUser; // Admin or Moderator
  const hasBackendAccess = (req as any).backendAccess; // Backend access
  
  if (!hasAdminAccess && !hasBackendAccess) {
    console.warn(`[SECURITY] Unauthorized worker access attempt from IP ${clientIP}`);
    return res.status(401).json({ 
      error: "Access Denied", 
      message: "Authentication required to access backend features" 
    });
  }

  // Grant access based on role
  if (hasAdminAccess) {
    console.log(`[AUTH] Worker access granted to ${hasAdminAccess.username} (${hasAdminAccess.role}) from IP ${clientIP}`);
    next();
    return;
  }

  // Grant access to backend users (full access)
  if (hasBackendAccess) {
    console.log(`[AUTH] Backend worker access granted to ${hasBackendAccess.username} from IP ${clientIP}`);
    next();
    return;
  }
  
  // Fallback for API key access (legacy support)
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey && apiKey === WORKER_API_KEY) {
    console.log(`[AUTH] API key worker access granted from IP ${clientIP}`);
    next();
    return;
  }

  // Default deny
  return res.status(401).json({ 
    error: "Authentication Failed", 
    message: "Invalid credentials for backend features" 
  });
};

// Permission-specific middleware for different actions
const requirePermission = (action: string) => {
  return (req: any, res: any, next: any) => {
    if (!checkPermission(req, action)) {
      const adminUser = (req as any).adminUser;
      const role = adminUser ? adminUser.role : 'none';
      console.warn(`[SECURITY] Permission denied: ${role} attempted ${action}`);
      return res.status(403).json({
        error: "Permission Denied",
        message: `Your role (${role}) does not have permission for this action`
      });
    }
    next();
  };
};

// Detect stream format from URL
const detectStreamFormat = (url: string): string => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
    return 'M3U8';
  } else if (urlLower.includes('.mpd')) {
    return 'MPD';
  } else if (urlLower.includes('.ts')) {
    return 'TS';
  } else if (urlLower.includes('dash')) {
    return 'DASH';
  } else if (urlLower.includes('.mp4')) {
    return 'MP4';
  } else {
    return 'UNKNOWN';
  }
};

// Auto-categorize channel based on name and metadata
const autoCategorizechannel = (name: string, description?: string): string => {
  const nameUpper = name.toUpperCase();
  const descUpper = (description || '').toUpperCase();
  const content = `${nameUpper} ${descUpper}`;
  
  // News channels
  if (content.match(/(NEWS|KHABAR|SANGBAD|24|HEADLINES|BREAKING)/)) {
    return 'News';
  }
  
  // Sports channels  
  if (content.match(/(SPORT|CRICKET|FOOTBALL|SOCCER|ESPN|STAR SPORTS)/)) {
    return 'Sports';
  }
  
  // Music channels
  if (content.match(/(MUSIC|9XM|MTV|GAAN|SANGEET|FM)/)) {
    return 'Music';
  }
  
  // Movie channels
  if (content.match(/(MOVIE|CINEMA|FILM|PICTURES|BOLLYWOOD|HOLLYWOOD)/)) {
    return 'Movies';
  }
  
  // Kids channels
  if (content.match(/(KIDS|CARTOON|NICK|DISNEY|POGO|CHHOTA)/)) {
    return 'Kids';
  }
  
  // Regional/Bangla channels
  if (content.match(/(BANGLA|BENGALI|KOLKATA|BD|BANGLADESH)/)) {
    return 'Regional';
  }
  
  // Default
  return 'Entertainment';
};

// Worker route schema
const workerAddChannelSchema = z.object({
  name: z.string().min(1, "Channel name required"),
  streamUrl: z.string().url("Valid stream URL required"),
  logo: z.string().url().optional(),
  category: z.string().optional(),
  quality: z.string().default("HD"),
  customName: z.string().optional(),
  description: z.string().optional(),
  workerId: z.string().min(1, "Worker ID required")
});

export function registerWorkerRoutes(app: Express) {
  // Worker dashboard - list all channels
  app.get("/worker/channels", authenticateWorker, async (req, res) => {
    try {
      const channels = await storage.getChannels();
      const customChannels = await storage.getCustomChannels();
      
      res.json({
        success: true,
        data: {
          regularChannels: channels,
          customChannels: customChannels,
          totalCount: channels.length + customChannels.length
        }
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to fetch channels",
        message: error.message 
      });
    }
  });

  // Worker add channel (moderator can add channels)
  app.post("/worker/channels/add", authenticateWorker, requirePermission('add_channel'), async (req, res) => {
    try {
      const validatedData = workerAddChannelSchema.parse(req.body);
      
      // Auto-detect stream format
      const streamFormat = detectStreamFormat(validatedData.streamUrl);
      
      // Auto-categorize if not provided
      const category = validatedData.category || 
        autoCategorizechannel(validatedData.name, validatedData.description);
      
      // Create custom channel with worker ID as userId
      const customChannel = await storage.createCustomChannel({
        userId: `worker_${validatedData.workerId}`,
        name: validatedData.name,
        streamUrl: validatedData.streamUrl,
        logo: validatedData.logo || null,
        category: category,
        quality: validatedData.quality,
        streamFormat: streamFormat,
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

  // Worker delete channel (moderator can delete channels)
  app.delete("/worker/channels/:id", authenticateWorker, requirePermission('delete_channel'), async (req, res) => {
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

  // Worker update channel (moderator can edit channels)  
  app.patch("/worker/channels/:id", authenticateWorker, requirePermission('edit_channel'), async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const { workerId, ...updateData } = req.body;
      
      if (!workerId) {
        return res.status(400).json({
          error: "Worker ID required"
        });
      }
      
      // For now, delete and recreate (in production, implement proper update)
      await storage.deleteCustomChannel(channelId, `worker_${workerId}`);
      
      // Re-detect format if URL changed
      if (updateData.streamUrl) {
        updateData.streamFormat = detectStreamFormat(updateData.streamUrl);
      }
      
      // Re-categorize if needed
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

  // Worker bulk add channels (moderator can bulk add channels)
  app.post("/worker/channels/bulk", authenticateWorker, requirePermission('add_channel'), async (req, res) => {
    try {
      const { channels, workerId } = req.body;
      
      if (!Array.isArray(channels) || !workerId) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Provide channels array and workerId"
        });
      }
      
      const results = [];
      const errors = [];
      
      for (let i = 0; i < channels.length; i++) {
        try {
          const channelData = channels[i];
          const streamFormat = detectStreamFormat(channelData.streamUrl);
          const category = channelData.category || 
            autoCategorizechannel(channelData.name, channelData.description);
          
          const customChannel = await storage.createCustomChannel({
            userId: `worker_${workerId}`,
            name: channelData.name,
            streamUrl: channelData.streamUrl,
            logo: channelData.logo || null,
            category: category,
            quality: channelData.quality || "HD",
            streamFormat: streamFormat,
            customName: channelData.customName || channelData.name,
            playlistName: channelData.playlistName || null,
            isActive: channelData.isActive !== false
          });
          
          results.push(customChannel);
        } catch (error) {
          errors.push({
            index: i,
            channel: channels[i],
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

  // Worker statistics (admin only - full stats)
  app.get("/worker/stats", authenticateWorker, requirePermission('view_stats'), async (req, res) => {
    try {
      const { workerId } = req.query;
      
      const allCustomChannels = await storage.getCustomChannels();
      const workerChannels = workerId 
        ? allCustomChannels.filter(ch => ch.userId === `worker_${workerId}`)
        : allCustomChannels;
      
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
          activeChannels: workerChannels.filter(ch => ch.isActive).length,
          categoryBreakdown: categoryStats,
          formatBreakdown: formatStats,
          recentChannels: workerChannels
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
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