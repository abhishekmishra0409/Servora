import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      api_key: this.configService.get<string>('media.apiKey') ?? '',
      api_secret: this.configService.get<string>('media.apiSecret') ?? '',
      cloud_name: this.configService.get<string>('media.cloudName') ?? '',
      secure: true,
    });
  }

  signUpload(folder?: string): {
    apiKey: string;
    cloudName: string;
    folder: string;
    signature: string;
    timestamp: number;
  } {
    const timestamp = Math.floor(Date.now() / 1000);
    const targetFolder = folder ?? this.configService.get<string>('media.folder', 'restaurent');
    const signature = cloudinary.utils.api_sign_request(
      { folder: targetFolder, timestamp },
      this.configService.get<string>('media.apiSecret', ''),
    );

    return {
      apiKey: this.configService.get<string>('media.apiKey', ''),
      cloudName: this.configService.get<string>('media.cloudName', ''),
      folder: targetFolder,
      signature,
      timestamp,
    };
  }

  async deleteAsset(publicId: string): Promise<{ deleted: boolean; publicId: string; result: string }> {
    const response = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    });
    const result = typeof response.result === 'string' ? response.result : 'unknown';

    return {
      deleted: result === 'ok' || result === 'not found',
      publicId,
      result,
    };
  }
}
