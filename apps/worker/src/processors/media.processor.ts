import type { Job } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import type { MediaCleanupJobPayload } from '@restaurent/shared';

import { collection } from '../db';

const publicIdFromUrl = (url: string): string => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const uploadIndex = parts.indexOf('upload');
  const assetParts = uploadIndex >= 0 ? parts.slice(uploadIndex + 1) : parts;
  const withoutVersion = assetParts[0]?.startsWith('v') ? assetParts.slice(1) : assetParts;
  const joined = withoutVersion.join('/');
  return joined.replace(/\.[a-zA-Z0-9]+$/, '');
};

export const mediaProcessor = async (job: Job): Promise<void> => {
  if (job.name === 'media.cleanup_cloudinary_asset') {
    const payload = job.data as MediaCleanupJobPayload;
    const mediaJobs = await collection('media_cleanup_attempts');
    const publicId = publicIdFromUrl(payload.url);

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      });
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    }

    await mediaJobs.insertOne({
      createdAt: new Date(),
      menuItemId: payload.menuItemId,
      publicId,
      status: 'completed',
      url: payload.url,
    });
    return;
  }

  throw new Error(`Unknown media job: ${job.name}`);
};
