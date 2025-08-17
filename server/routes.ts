import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChannelSchema, insertCustomChannelSchema } from "@shared/schema";
import { registerWorkerRoutes } from "./worker-routes";
import { registerAuthRoutes } from "./auth-routes";
import { adminRoutes } from "./admin-routes";
import { keyManagementRoutes } from "./key-management-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Register authentication routes
  registerAuthRoutes(app);
  
  // Register worker routes for channel management
  registerWorkerRoutes(app);
  
  // Register admin management routes
  app.use(adminRoutes);
  
  // Register key management routes  
  app.use('/api/admin', keyManagementRoutes);

  // Get all channels for admin management
  app.get("/api/admin/channels/all", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      console.error('Error fetching all channels:', error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Update channel access level
  app.put("/api/admin/channels/:id/access", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isFreeAccess } = req.body;
      
      const updatedChannel = await storage.updateChannel(id, { isFreeAccess });
      res.json(updatedChannel);
    } catch (error) {
      console.error('Error updating channel access:', error);
      res.status(500).json({ message: "Failed to update channel access" });
    }
  });

  // Bulk update channel access
  app.post("/api/admin/channels/bulk-access", async (req, res) => {
    try {
      const { action } = req.body;
      
      const channels = await storage.getChannels();
      
      switch (action) {
        case 'make_all_free':
          await Promise.all(channels.map(channel => 
            storage.updateChannel(channel.id, { isFreeAccess: true })
          ));
          break;
        case 'make_all_premium':
          await Promise.all(channels.map(channel => 
            storage.updateChannel(channel.id, { isFreeAccess: false })
          ));
          break;
        case 'first_100_free':
          await Promise.all(channels.map((channel, index) => 
            storage.updateChannel(channel.id, { isFreeAccess: index < 100 })
          ));
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }
      
      res.json({ success: true, message: "Bulk update completed" });
    } catch (error) {
      console.error('Error performing bulk update:', error);
      res.status(500).json({ message: "Failed to perform bulk update" });
    }
  });

  // Serve worker API test page
  app.get("/test-worker", (req, res) => {
    res.sendFile("test-worker-api.html", { root: process.cwd() });
  });
  
  // Get all channels (with free access limit and device tracking)
  app.get("/api/channels", async (req, res) => {
    try {
      const accessKey = req.headers['x-access-key'] as string;
      let hasFullAccess = false;
      
      // Check for hardcoded premium keys
      const validKeys = ['tplay2025premium', 'tplaypro2025', 'premium_access_2025'];
      if (accessKey && validKeys.includes(accessKey)) {
        hasFullAccess = true;
      }
      
      // Check for admin-generated keys with device tracking
      if (!hasFullAccess && accessKey) {
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        req.ip || 
                        '127.0.0.1';
        
        const key = await storage.getAccessKeyByCode(accessKey);
        
        if (key && key.isActive && new Date() <= new Date(key.expiryDate)) {
          // Check device limit
          const devices = await storage.getKeyDevices(key.id);
          const existingDevice = devices.find(device => 
            device.ipAddress === clientIP && device.isActive
          );
          
          if (existingDevice || devices.filter(d => d.isActive).length < key.maxDevices) {
            hasFullAccess = true;
            
            // Update last used time or add new device
            if (existingDevice) {
              await storage.updateKeyDeviceLastUsed(existingDevice.id);
            } else {
              await storage.addKeyDevice({
                keyId: key.id,
                ipAddress: clientIP,
                userAgent: req.headers['user-agent'] || '',
                isActive: true
              });
            }
            
            // Log channel access
            await storage.logKeyUsage({
              keyId: key.id,
              ipAddress: clientIP,
              action: 'channel_access',
              success: true
            });
          }
        }
      }
      
      let channels = await storage.getChannels();
      
      // If user doesn't have full access, limit to first 100 free channels
      if (!hasFullAccess) {
        channels = channels.filter(channel => channel.isFreeAccess !== false).slice(0, 100);
      }
      
      res.json(channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Verify access key endpoint
  app.post('/api/verify-access-key', async (req, res) => {
    try {
      const { accessKey } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Check legacy hardcoded keys first
      const legacyKeys = [
        'tplay2025premium',
        'tplaypro2025', 
        'premium_access_2025'
      ];
      
      if (legacyKeys.includes(accessKey)) {
        // Log usage for legacy keys
        try {
          await storage.logKeyUsage({
            keyId: 0, // Use 0 for legacy keys
            ipAddress: clientIP,
            action: 'legacy_key_access',
            success: true
          });
        } catch (logError) {
          console.error('Failed to log legacy key usage:', logError);
        }
        
        return res.json({ 
          success: true, 
          message: 'Access granted successfully',
          accessLevel: 'premium'
        });
      }
      
      // Check database keys
      const key = await storage.getAccessKeyByCode(accessKey);
      
      if (key && key.isActive && new Date() < new Date(key.expiryDate)) {
        // Check device limit
        const devices = await storage.getKeyDevices(key.id);
        const existingDevice = devices.find(device => 
          device.ipAddress === clientIP && device.isActive
        );
        
        if (existingDevice || devices.filter(d => d.isActive).length < key.maxDevices) {
          // Update device tracking
          if (existingDevice) {
            await storage.updateKeyDeviceLastUsed(existingDevice.id);
          } else {
            await storage.addKeyDevice({
              keyId: key.id,
              ipAddress: clientIP,
              userAgent: req.headers['user-agent'] || '',
              isActive: true
            });
          }
          
          // Log successful access
          await storage.logKeyUsage({
            keyId: key.id,
            ipAddress: clientIP,
            action: 'key_verification',
            success: true
          });
          
          return res.json({ 
            success: true, 
            message: 'Access granted successfully',
            accessLevel: 'premium',
            keyInfo: {
              maxDevices: key.maxDevices,
              devicesUsed: devices.filter(d => d.isActive).length,
              expiryDate: key.expiryDate
            }
          });
        } else {
          // Log failed attempt
          await storage.logKeyUsage({
            keyId: key.id,
            ipAddress: clientIP,
            action: 'key_verification',
            success: false
          });
          
          return res.status(401).json({ 
            success: false, 
            message: 'Device limit reached for this access key'
          });
        }
      }
      
      // Log invalid key attempt  
      try {
        await storage.logKeyUsage({
          keyId: 0,
          ipAddress: clientIP,
          action: 'invalid_key_attempt',
          success: false
        });
      } catch (logError) {
        console.error('Failed to log invalid key attempt:', logError);
      }
      
      res.status(401).json({ 
        success: false, 
        message: 'Invalid access key' 
      });
    } catch (error) {
      console.error('Error verifying access key:', error);
      res.status(500).json({ message: 'Failed to verify access key' });
    }
  });

  // Get channels by category
  app.get("/api/channels/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const channels = await storage.getChannelsByCategory(category);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels by category" });
    }
  });

  // Get specific channel
  app.get("/api/channels/:id", async (req, res) => {
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

  // Update channel (for admin functionality)
  app.put("/api/channels/:id", async (req, res) => {
    console.log('Channel update request received:', req.params.id, req.body);
    
    try {
      // Check authentication
      if (!req.session?.admin && !req.session?.backend) {
        console.log('No admin or backend session found');
        return res.status(401).json({ message: 'Authentication required' });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log('Updating channel:', id, 'with data:', updates);
      
      // Get current channel data
      const oldChannel = await storage.getChannel(id);
      if (!oldChannel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Update channel
      const channel = await storage.updateChannel(id, updates);
      
      console.log('Channel updated successfully:', channel);

      res.json(channel);
    } catch (error) {
      console.error('Failed to update channel:', error);
      res.status(500).json({ 
        message: 'Failed to update channel',
        error: error.message 
      });
    }
  });

  // Update channel viewer count
  app.patch("/api/channels/:id/viewers", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { count } = req.body;
      await storage.updateChannelViewers(id, count);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update viewer count" });
    }
  });

  // Get programs for a channel
  app.get("/api/channels/:id/programs", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const programs = await storage.getPrograms(channelId);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  // Get current program for a channel
  app.get("/api/channels/:id/current-program", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const program = await storage.getCurrentProgram(channelId);
      res.json(program || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current program" });
    }
  });

  // Validate stream URL
  app.post("/api/validate-stream", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "Stream URL is required" });
      }

      // Basic URL validation for streaming formats
      const validFormats = ['.m3u8', '.mpd', '.ts'];
      const isValidFormat = validFormats.some(format => 
        url.toLowerCase().includes(format) || 
        url.toLowerCase().includes('manifest') ||
        url.toLowerCase().includes('playlist')
      );

      if (!isValidFormat) {
        return res.status(400).json({ 
          message: "Invalid stream format. Supported formats: M3U8, MPD, TS, DASH" 
        });
      }

      res.json({ 
        valid: true, 
        format: url.includes('.m3u8') ? 'HLS' : 
                url.includes('.mpd') ? 'DASH' : 
                url.includes('.ts') ? 'TS' : 'Unknown',
        url 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to validate stream" });
    }
  });

  // Custom channels routes - user-specific
  app.get("/api/custom-channels", async (req, res) => {
    try {
      // For demo purposes, using session ID or IP as user identifier
      // In production, this would use proper user authentication
      const userId = req.sessionID || req.ip || 'anonymous';
      const customChannels = await storage.getCustomChannels(userId);
      res.json(customChannels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom channels" });
    }
  });

  app.get("/api/custom-channels/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const userId = req.sessionID || req.ip || 'anonymous';
      const customChannels = await storage.getCustomChannelsByCategory(category, userId);
      res.json(customChannels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom channels by category" });
    }
  });

  // Parse M3U playlist - user-specific
  app.post("/api/custom-channels/m3u", async (req, res) => {
    try {
      const { content, url, name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Playlist name is required" });
      }

      // Get user identifier
      const userId = req.sessionID || req.ip || 'anonymous';
      let m3uContent = content;
      
      // If URL provided, fetch the content
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
        userId: userId // For debugging
      });
    } catch (error) {
      console.error('M3U parsing error:', error);
      res.status(500).json({ 
        message: "Failed to parse M3U playlist", 
        error: error.message 
      });
    }
  });

  // Delete custom channel - user-specific
  app.delete("/api/custom-channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.sessionID || req.ip || 'anonymous';
      await storage.deleteCustomChannel(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom channel" });
    }
  });

  // Stream proxy endpoint to handle CORS issues for mobile
  app.get("/api/stream-proxy", async (req, res) => {
    const { url } = req.query;
    
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Stream URL is required" });
    }

    try {
      // Set comprehensive CORS headers for streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Content-Type');
      
      // Detect stream type and set appropriate headers
      if (url.includes('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (url.includes('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      } else if (url.includes('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (url.includes('.mpd')) {
        res.setHeader('Content-Type', 'application/dash+xml');
      }

      // Return stream info with CORS enabled
      res.json({ 
        proxiedUrl: url,
        originalUrl: url,
        corsEnabled: true,
        streamType: url.includes('.m3u8') ? 'HLS' : url.includes('.mp4') ? 'MP4' : 'OTHER',
        mobileOptimized: true,
        message: "Stream accessible with CORS headers"
      });
    } catch (error) {
      console.error("Stream proxy error:", error);
      res.status(500).json({ error: "Stream proxy failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
