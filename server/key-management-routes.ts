import { Router } from 'express';
import { storage } from './storage';
import type { AccessKey, InsertAccessKey } from '@shared/schema';

export const keyManagementRoutes = Router();

// Middleware to check admin authentication
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.admin || req.session.admin.role !== 'admin') {
    return res.status(401).json({ message: 'Admin access required' });
  }
  next();
};

// Generate unique access key
function generateAccessKey(): string {
  const prefix = 'TPLAY';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Get client IP address
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip || 
         '127.0.0.1';
}

// Get all access keys (Admin only)
keyManagementRoutes.get('/access-keys', requireAdmin, async (req, res) => {
  try {
    const keys = await storage.getAllAccessKeys();
    res.json(keys);
  } catch (error) {
    console.error('Failed to fetch access keys:', error);
    res.status(500).json({ message: 'Failed to fetch access keys' });
  }
});

// Create new access key (Admin only)
keyManagementRoutes.post('/access-keys', requireAdmin, async (req, res) => {
  try {
    const { notes, maxDevices, expiryDate } = req.body;
    const admin = req.session.admin;
    
    const keyData: InsertAccessKey = {
      keyCode: generateAccessKey(),
      createdBy: admin.id,
      createdByUsername: admin.username,
      maxDevices: maxDevices || 5,
      expiryDate: new Date(expiryDate),
      notes: notes || '',
      isActive: true
    };
    
    const newKey = await storage.createAccessKey(keyData);
    
    // Log the creation
    await storage.logKeyUsage({
      keyId: newKey.id,
      ipAddress: getClientIP(req),
      action: 'key_created',
      success: true
    });
    
    res.json(newKey);
  } catch (error) {
    console.error('Failed to create access key:', error);
    res.status(500).json({ message: 'Failed to create access key' });
  }
});

// Toggle key active status (Admin only)
keyManagementRoutes.put('/access-keys/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    const updatedKey = await storage.updateAccessKey(keyId, { isActive });
    
    // Log the action
    await storage.logKeyUsage({
      keyId,
      ipAddress: getClientIP(req),
      action: isActive ? 'key_enabled' : 'key_disabled',
      success: true
    });
    
    res.json(updatedKey);
  } catch (error) {
    console.error('Failed to toggle key status:', error);
    res.status(500).json({ message: 'Failed to toggle key status' });
  }
});

// Delete access key (Admin only)
keyManagementRoutes.delete('/access-keys/:id', requireAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    
    await storage.deleteAccessKey(keyId);
    
    res.json({ success: true, message: 'Access key deleted successfully' });
  } catch (error) {
    console.error('Failed to delete access key:', error);
    res.status(500).json({ message: 'Failed to delete access key' });
  }
});

// Get key devices and usage logs (Admin only)
keyManagementRoutes.get('/access-keys/:id/details', requireAdmin, async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    
    const [devices, usageLogs] = await Promise.all([
      storage.getKeyDevices(keyId),
      storage.getKeyUsageLogs(keyId)
    ]);
    
    res.json({ devices, usageLogs });
  } catch (error) {
    console.error('Failed to fetch key details:', error);
    res.status(500).json({ message: 'Failed to fetch key details' });
  }
});

// Verify access key with device management
keyManagementRoutes.post('/verify-key', async (req, res) => {
  try {
    const { accessKey } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    if (!accessKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Access key is required' 
      });
    }
    
    // Get key details
    const key = await storage.getAccessKeyByCode(accessKey);
    
    if (!key) {
      // Log failed attempt
      await storage.logKeyUsage({
        keyId: 0, // Unknown key
        ipAddress: clientIP,
        action: 'login_attempt',
        success: false,
        errorMessage: 'Invalid access key'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid access key' 
      });
    }
    
    // Check if key is active
    if (!key.isActive) {
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: 'login_attempt',
        success: false,
        errorMessage: 'Key is disabled'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Access key is disabled' 
      });
    }
    
    // Check if key is expired
    if (new Date() > new Date(key.expiryDate)) {
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: 'login_attempt',
        success: false,
        errorMessage: 'Key expired'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Access key has expired' 
      });
    }
    
    // Check device limit
    const existingDevices = await storage.getKeyDevices(key.id);
    const existingDevice = existingDevices.find(device => 
      device.ipAddress === clientIP && device.isActive
    );
    
    if (!existingDevice) {
      // Check if we've reached the device limit
      const activeDeviceCount = existingDevices.filter(device => device.isActive).length;
      
      if (activeDeviceCount >= key.maxDevices) {
        await storage.logKeyUsage({
          keyId: key.id,
          ipAddress: clientIP,
          action: 'device_limit_exceeded',
          success: false,
          errorMessage: `Device limit exceeded (${key.maxDevices} max)`
        });
        
        return res.status(401).json({ 
          success: false, 
          message: `Device limit exceeded. Maximum ${key.maxDevices} devices allowed.` 
        });
      }
      
      // Add new device
      await storage.addKeyDevice({
        keyId: key.id,
        ipAddress: clientIP,
        userAgent,
        isActive: true
      });
      
      await storage.logKeyUsage({
        keyId: key.id,
        ipAddress: clientIP,
        action: 'device_added',
        success: true
      });
    } else {
      // Update last used time for existing device
      await storage.updateKeyDeviceLastUsed(existingDevice.id);
    }
    
    // Log successful access
    await storage.logKeyUsage({
      keyId: key.id,
      ipAddress: clientIP,
      action: 'login_success',
      success: true
    });
    
    res.json({ 
      success: true, 
      message: 'Access granted successfully',
      accessLevel: 'premium',
      expiryDate: key.expiryDate,
      devicesUsed: existingDevices.filter(d => d.isActive).length + (existingDevice ? 0 : 1),
      maxDevices: key.maxDevices
    });
    
  } catch (error) {
    console.error('Error verifying access key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify access key' 
    });
  }
});