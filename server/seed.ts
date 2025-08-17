import { db } from './db';
import { channels } from '@shared/schema';
import { sql } from 'drizzle-orm';

export async function markChannelsAsFreeAccess() {
  try {
    console.log('🌟 Updating channels for free access system...');
    
    // Mark first 100 channels as free access
    await db
      .update(channels)
      .set({ isFreeAccess: true })
      .where(sql`id <= 100`);
    
    // Mark remaining channels as premium
    await db
      .update(channels)
      .set({ isFreeAccess: false })
      .where(sql`id > 100`);
    
    console.log('✓ Updated channel access levels successfully!');
    console.log('✓ First 100 channels: Free access');
    console.log('✓ Remaining channels: Premium access');
    
  } catch (error) {
    console.error('❌ Failed to update channel access levels:', error);
  }
}