import { Router } from 'express';
import { storage } from './storage';
import { isAuthenticated, isAdmin } from './auth-routes';
import { insertChannelSchema, insertAdminUserSchema } from '@shared/schema';

const router = Router();

// Admin Channel Management Routes
router.post('/api/admin/channels', isAuthenticated, async (req: any, res) => {
  try {
    // Check if user is admin or moderator
    const userRole = req.session.admin?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const validatedData = insertChannelSchema.parse(req.body);
    const channel = await storage.createChannel(validatedData);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: 'add_channel',
      targetId: channel.id,
      targetName: channel.name,
      details: JSON.stringify({ channel: validatedData }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await storage.logChannelHistory({
      channelId: channel.id,
      action: 'created',
      newData: JSON.stringify(channel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });

    res.json(channel);
  } catch (error) {
    console.error('Failed to create channel:', error);
    res.status(400).json({ message: 'Failed to create channel' });
  }
});

router.put('/api/admin/channels/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const id = parseInt(req.params.id);
    const oldChannel = await storage.getChannel(id);
    
    const updates = req.body;
    const channel = await storage.updateChannel(id, updates);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: 'update_channel',
      targetId: channel.id,
      targetName: channel.name,
      details: JSON.stringify({ oldData: oldChannel, newData: updates }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await storage.logChannelHistory({
      channelId: channel.id,
      action: 'updated',
      oldData: JSON.stringify(oldChannel),
      newData: JSON.stringify(channel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });

    res.json(channel);
  } catch (error) {
    console.error('Failed to update channel:', error);
    res.status(400).json({ message: 'Failed to update channel' });
  }
});

router.delete('/api/admin/channels/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const id = parseInt(req.params.id);
    const oldChannel = await storage.getChannel(id);
    
    await storage.deleteChannel(id);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: req.session.admin.id,
      moderatorUsername: req.session.admin.username,
      action: 'delete_channel',
      targetId: id,
      targetName: oldChannel?.name || 'Unknown',
      details: JSON.stringify({ deletedChannel: oldChannel }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await storage.logChannelHistory({
      channelId: id,
      action: 'deleted',
      oldData: JSON.stringify(oldChannel),
      performedBy: req.session.admin.id,
      performedByUsername: req.session.admin.username
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete channel:', error);
    res.status(400).json({ message: 'Failed to delete channel' });
  }
});

router.post('/api/admin/channels/reorder', async (req: any, res) => {
  console.log('Channel reorder request - Session:', req.session?.admin);
  
  try {
    if (!req.session?.admin && !req.session?.adminUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const admin = req.session.admin || req.session.adminUser;
    if (admin?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required for reordering' });
    }

    const { channelIds } = req.body;
    console.log('Reordering channels:', channelIds);
    
    await storage.reorderChannels(channelIds);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: 'reorder_channels',
      targetId: null,
      targetName: 'Channel List',
      details: JSON.stringify({ newOrder: channelIds }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log('Channels reordered successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder channels:', error);
    res.status(400).json({ message: 'Failed to reorder channels' });
  }
});

// Missing admin route for channel history
router.get('/api/admin/channel-history', async (req: any, res) => {
  console.log('Channel history request - Session admin:', req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getChannelHistory(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch channel history:', error);
    res.status(500).json({ message: 'Failed to fetch channel history' });
  }
});

// Admin-only routes
router.get('/api/admin/stats/website', async (req: any, res) => {
  console.log('Website stats request - Session:', req.session);
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.session.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = await storage.getWebsiteStats(days);
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch website stats:', error);
    res.status(500).json({ message: 'Failed to fetch website stats' });
  }
});

router.get('/api/admin/moderators', async (req: any, res) => {
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.session.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const moderators = await storage.getAllModerators();
    res.json({ success: true, moderators });
  } catch (error) {
    console.error('Failed to fetch moderators:', error);
    res.status(500).json({ message: 'Failed to fetch moderators' });
  }
});

router.post('/api/admin/moderators', async (req: any, res) => {
  console.log('Create moderator request - Session:', req.session?.admin);
  
  if (!req.session?.admin && !req.session?.adminUser) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const admin = req.session.admin || req.session.adminUser;
  if (admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const admin = req.session.admin || req.session.adminUser;
    
    const validatedData = insertAdminUserSchema.parse({
      ...req.body,
      role: 'moderator',
      createdBy: admin.id
    });
    
    const moderator = await storage.createModerator(validatedData);
    
    await storage.logSystemEvent({
      level: 'info',
      category: 'admin',
      message: `New moderator account created: ${moderator.username}`,
      details: JSON.stringify({ createdBy: admin.username }),
      userId: admin.id.toString(),
      ipAddress: req.ip
    });

    res.json(moderator);
  } catch (error) {
    console.error('Failed to create moderator:', error);
    
    // Handle specific database errors
    if (error.code === '23505' && error.constraint === 'admin_users_username_unique') {
      return res.status(400).json({ 
        message: 'Username already exists. Please choose a different username.' 
      });
    }
    
    res.status(400).json({ message: 'Failed to create moderator' });
  }
});

router.get('/api/admin/activity', async (req: any, res) => {
  console.log('Activity request - Session admin:', req.session?.admin);
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.session.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const moderatorId = req.query.moderatorId ? parseInt(req.query.moderatorId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = await storage.getModeratorActivity(moderatorId, limit);
    res.json(activity);
  } catch (error) {
    console.error('Failed to fetch moderator activity:', error);
    res.status(500).json({ message: 'Failed to fetch moderator activity' });
  }
});

router.get('/api/admin/sessions', async (req: any, res) => {
  console.log('Sessions request - Session admin:', req.session?.admin);  
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.session.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const sessions = await storage.getActiveSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Failed to fetch active sessions:', error);
    res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

router.get('/api/admin/logs', async (req: any, res) => {
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.session.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const level = req.query.level as string;
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getSystemLogs(level, category, limit);
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch system logs:', error);
    res.status(500).json({ message: 'Failed to fetch system logs' });
  }
});

router.get('/api/admin/channel-history', isAuthenticated, async (req: any, res) => {
  try {
    const userRole = req.session.admin?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getChannelHistory(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch channel history:', error);
    res.status(500).json({ message: 'Failed to fetch channel history' });
  }
});

// Update moderator
router.put('/api/admin/moderators/:id', async (req: any, res) => {
  console.log('Update moderator request - Session:', req.session?.admin);
  
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const admin = req.session.admin;
  if (admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const moderatorId = parseInt(req.params.id);
    const updateData = req.body;
    
    console.log('Updating moderator:', moderatorId, 'with data:', updateData);
    
    const updatedModerator = await storage.updateModerator(moderatorId, updateData);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: 'update_moderator',
      targetId: moderatorId,
      targetName: updatedModerator.username,
      details: JSON.stringify({ updatedData: updateData }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await storage.logSystemEvent({
      level: 'info',
      category: 'admin',
      message: `Moderator account updated: ${updatedModerator.username}`,
      details: JSON.stringify({ updatedBy: admin.username }),
      userId: admin.id.toString(),
      ipAddress: req.ip
    });

    console.log('Moderator updated successfully');
    res.json(updatedModerator);
  } catch (error) {
    console.error('Failed to update moderator:', error);
    res.status(400).json({ message: 'Failed to update moderator' });
  }
});

// Delete moderator
router.delete('/api/admin/moderators/:id', async (req: any, res) => {
  console.log('Delete moderator request - Session:', req.session?.admin);
  
  if (!req.session?.admin) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const admin = req.session.admin;
  if (admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const moderatorId = parseInt(req.params.id);
    
    // Get moderator info before deletion for logging
    const moderator = await storage.getModerator(moderatorId);
    
    if (!moderator) {
      return res.status(404).json({ message: 'Moderator not found' });
    }

    console.log('Deleting moderator:', moderatorId, moderator.username);
    
    await storage.deleteModerator(moderatorId);
    
    // Log activity
    await storage.logModeratorActivity({
      moderatorId: admin.id,
      moderatorUsername: admin.username,
      action: 'delete_moderator',
      targetId: moderatorId,
      targetName: moderator.username,
      details: JSON.stringify({ deletedModerator: moderator }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await storage.logSystemEvent({
      level: 'warning',
      category: 'admin',
      message: `Moderator account deleted: ${moderator.username}`,
      details: JSON.stringify({ deletedBy: admin.username }),
      userId: admin.id.toString(),
      ipAddress: req.ip
    });

    console.log('Moderator deleted successfully');
    res.json({ success: true, message: 'Moderator deleted successfully' });
  } catch (error) {
    console.error('Failed to delete moderator:', error);
    res.status(400).json({ message: 'Failed to delete moderator' });
  }
});

export { router as adminRoutes };