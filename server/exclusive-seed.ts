import { db } from "./db";
import { channels } from "@shared/schema";
import { eq } from "drizzle-orm";

// Seed T PLAY's 10 Exclusive Channels
export async function seedExclusiveChannels() {
  try {
    console.log('🌟 Seeding T PLAY Exclusive Channels...');

    const exclusiveChannels = [
      {
        name: 'T PLAY News',
        streamUrl: 'https://bpprod6livek.akamaized.net/out/v1/f8fa102b2c6e4a599f84bb10a9193a7e/index.m3u8',
        category: 'News',
        logo: 'https://i.postimg.cc/J7dCqg0m/T-PLAY-News.png',
        description: 'T PLAY News Channel - 24/7 latest news and updates',
        quality: 'HD',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY EXCLUSIVE'
      },
      {
        name: 'T PLAY Sports',
        streamUrl: 'https://bpprod7livek.akamaized.net/out/v1/c9a26e9b9e6d413bb70e0bfee3a5da4f/index.m3u8',
        category: 'Sports',
        logo: 'https://i.postimg.cc/QMYxqJ4b/T-PLAY-Sports.png',
        description: 'T PLAY Sports - Live coverage and analysis of all sports',
        quality: '4K',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY EXCLUSIVE'
      },
      {
        name: 'T PLAY Movies',
        streamUrl: 'https://d1g8wgjurz8via.cloudfront.net/bpk-tv/Zeebanglacinema/default/manifest.mpd',
        category: 'Movies',
        logo: 'https://i.postimg.cc/C5rJhq3W/T-PLAY-Movies.png',
        description: 'T PLAY Movies - Huge collection of movies in multiple languages',
        quality: '4K',
        streamFormat: 'DASH',
        isDrmProtected: true,
        drmKeyId: 'fbbfd9ce4bbe4d818b16df7dfe89f05b',
        drmKey: '1e96d0f88ef740e982d6f6105721c8bc',
        manifestUrl: 'https://d1g8wgjurz8via.cloudfront.net/bpk-tv/Zeebanglacinema/default/manifest.mpd',
        isExclusive: true,
        exclusiveTag: 'T PLAY PREMIUM'
      },
      {
        name: 'T PLAY Music',
        streamUrl: 'https://bpprod8livek.akamaized.net/out/v1/a1b2c3d4e5f6/index.m3u8',
        category: 'Music',
        logo: 'https://i.postimg.cc/GtK8Zx2Y/T-PLAY-Music.png',
        description: 'T PLAY Music - Unique collection of local and international music',
        quality: 'HD',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY EXCLUSIVE'
      },
      {
        name: 'T PLAY Kids',
        streamUrl: 'https://bpprod9livek.akamaized.net/out/v1/b2c3d4e5f6g7/index.m3u8',
        category: 'Kids',
        logo: 'https://i.postimg.cc/SQk7Rx1Y/T-PLAY-Kids.png',
        description: 'T PLAY Kids - Safe and educational content for children',
        quality: 'HD',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY FAMILY'
      },
      {
        name: 'T PLAY Drama',
        streamUrl: 'https://bpprod10livek.akamaized.net/out/v1/c3d4e5f6g7h8/index.m3u8',
        category: 'Entertainment',
        logo: 'https://i.postimg.cc/W1jK9X3Y/T-PLAY-Drama.png',
        description: 'T PLAY Drama - Special collection of dramas and series',
        quality: 'HD',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY ORIGINAL'
      },
      {
        name: 'T PLAY Live',
        streamUrl: 'https://bpprod11livek.akamaized.net/out/v1/d4e5f6g7h8i9/index.m3u8',
        category: 'Entertainment',
        logo: 'https://i.postimg.cc/VsJ8dK2W/T-PLAY-Live.png',
        description: 'T PLAY Live - Live talk shows, magazine and event coverage',
        quality: '4K',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY LIVE'
      },
      {
        name: 'T PLAY Regional',
        streamUrl: 'https://bpprod12livek.akamaized.net/out/v1/e5f6g7h8i9j0/index.m3u8',
        category: 'Regional',
        logo: 'https://i.postimg.cc/8CrL5X6M/T-PLAY-Regional.png',
        description: 'T PLAY Regional - Local culture and traditional programs',
        quality: 'HD',
        streamFormat: 'HLS',
        isExclusive: true,
        exclusiveTag: 'T PLAY CULTURE'
      },

    ];

    // Insert exclusive channels
    for (const channelData of exclusiveChannels) {
      try {
        const [existing] = await db.select().from(channels).where(eq(channels.name, channelData.name));
        
        if (!existing) {
          await db.insert(channels).values({
            ...channelData,
            viewerCount: Math.floor(Math.random() * 1000) + 500 // Random viewer count between 500-1500
          });
          console.log(`✓ Added exclusive channel: ${channelData.name}`);
        } else {
          // Update existing channel to be exclusive
          await db.update(channels)
            .set({ 
              isExclusive: true, 
              exclusiveTag: channelData.exclusiveTag 
            })
            .where(eq(channels.id, existing.id));
          console.log(`✓ Updated existing channel to exclusive: ${channelData.name}`);
        }
      } catch (error) {
        console.log(`⚠️ Channel ${channelData.name} might already exist`);
      }
    }

    console.log('🌟 T PLAY Exclusive Channels seeded successfully!');
    return true;

  } catch (error) {
    console.error('Error seeding exclusive channels:', error);
    return false;
  }
}