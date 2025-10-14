import { AppError } from '../utils/error-handler';

export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  tags?: string[];
  isPrivateFile: boolean;
  customCoordinates?: string;
  fileType: string;
}

export interface ImageKitDeleteResponse {
  success: boolean;
  message: string;
}

export interface ImageKitBulkDeleteResponse {
  successfullyDeleted: string[];
  errors: Array<{
    fileId: string;
    error: string;
  }>;
}

export interface UploadOptions {
  fileName: string;
  folder?: string;
  tags?: string[];
  isPrivateFile?: boolean;
  useUniqueFileName?: boolean;
  responseFields?: string[];
  extensions?: Array<{
    name: string;
    options: Record<string, any>;
  }>;
  webhookUrl?: string;
  overwriteFile?: boolean;
  overwriteAITags?: boolean;
  overwriteTags?: boolean;
  overwriteCustomMetadata?: boolean;
  customMetadata?: Record<string, any>;
}

export class ImageKitService {
  private publicKey: string;
  private privateKey: string;
  private urlEndpoint: string;
  private baseUrl = 'https://api.imagekit.io/v1';

  constructor(env: any) {
    this.publicKey = env.IMAGEKIT_PUBLIC_KEY;
    this.privateKey = env.IMAGEKIT_PRIVATE_KEY;
    this.urlEndpoint = env.IMAGEKIT_URL_ENDPOINT;

    if (!this.publicKey || !this.privateKey || !this.urlEndpoint) {
      throw new AppError('ImageKit configuration is missing', 500);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.privateKey}:`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  private getUploadAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.privateKey}:`);
    return {
      'Authorization': `Basic ${credentials}`,
    };
  }

  async uploadFile(
    file: File | Buffer | string,
    options: UploadOptions
  ): Promise<ImageKitUploadResponse> {
    try {
      const formData = new FormData();
      
      if (file instanceof File) {
        formData.append('file', file);
      } else if (Buffer.isBuffer(file)) {
        formData.append('file', new Blob([file]));
      } else if (typeof file === 'string') {
        formData.append('file', file);
      } else {
        throw new AppError('Invalid file type', 400);
      }

      formData.append('fileName', options.fileName);
      formData.append('publicKey', this.publicKey);

      if (options.folder) {
        formData.append('folder', options.folder);
      }

      if (options.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
      }

      if (options.isPrivateFile !== undefined) {
        formData.append('isPrivateFile', options.isPrivateFile.toString());
      }

      if (options.useUniqueFileName !== undefined) {
        formData.append('useUniqueFileName', options.useUniqueFileName.toString());
      }

      if (options.responseFields && options.responseFields.length > 0) {
        formData.append('responseFields', options.responseFields.join(','));
      }

      if (options.extensions && options.extensions.length > 0) {
        formData.append('extensions', JSON.stringify(options.extensions));
      }

      if (options.webhookUrl) {
        formData.append('webhookUrl', options.webhookUrl);
      }

      if (options.overwriteFile !== undefined) {
        formData.append('overwriteFile', options.overwriteFile.toString());
      }

      if (options.overwriteAITags !== undefined) {
        formData.append('overwriteAITags', options.overwriteAITags.toString());
      }

      if (options.overwriteTags !== undefined) {
        formData.append('overwriteTags', options.overwriteTags.toString());
      }

      if (options.overwriteCustomMetadata !== undefined) {
        formData.append('overwriteCustomMetadata', options.overwriteCustomMetadata.toString());
      }

      if (options.customMetadata) {
        formData.append('customMetadata', JSON.stringify(options.customMetadata));
      }

      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        headers: this.getUploadAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.message || `ImageKit upload failed: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      return result as ImageKitUploadResponse;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('ImageKit upload error:', error);
      throw new AppError('Failed to upload file to ImageKit', 500);
    }
  }

  async deleteFile(fileId: string): Promise<ImageKitDeleteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.message || `ImageKit delete failed: ${response.statusText}`,
          response.status
        );
      }

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('ImageKit delete error:', error);
      throw new AppError('Failed to delete file from ImageKit', 500);
    }
  }

  async bulkDeleteFiles(fileIds: string[]): Promise<ImageKitBulkDeleteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/batch/deleteByFileIds`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fileIds: fileIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.message || `ImageKit bulk delete failed: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      return {
        successfullyDeleted: result.successfullyDeleted || [],
        errors: result.errors || [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('ImageKit bulk delete error:', error);
      throw new AppError('Failed to bulk delete files from ImageKit', 500);
    }
  }

  async getFileDetails(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/details`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.message || `ImageKit get file details failed: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('ImageKit get file details error:', error);
      throw new AppError('Failed to get file details from ImageKit', 500);
    }
  }

  async listFiles(options: {
    path?: string;
    searchQuery?: string;
    fileType?: 'image' | 'non-image' | 'all';
    tags?: string[];
    includeFolder?: boolean;
    name?: string;
    limit?: number;
    skip?: number;
    sort?: 'ASC_CREATED' | 'DESC_CREATED' | 'ASC_NAME' | 'DESC_NAME' | 'ASC_SIZE' | 'DESC_SIZE';
  } = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams();

      if (options.path) queryParams.append('path', options.path);
      if (options.searchQuery) queryParams.append('searchQuery', options.searchQuery);
      if (options.fileType) queryParams.append('fileType', options.fileType);
      if (options.tags && options.tags.length > 0) queryParams.append('tags', options.tags.join(','));
      if (options.includeFolder !== undefined) queryParams.append('includeFolder', options.includeFolder.toString());
      if (options.name) queryParams.append('name', options.name);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.skip) queryParams.append('skip', options.skip.toString());
      if (options.sort) queryParams.append('sort', options.sort);

      const response = await fetch(`${this.baseUrl}/files?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.message || `ImageKit list files failed: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('ImageKit list files error:', error);
      throw new AppError('Failed to list files from ImageKit', 500);
    }
  }

  extractFileIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const fileIdIndex = pathSegments.findIndex(segment => segment.length === 24);
      return fileIdIndex !== -1 ? pathSegments[fileIdIndex] : null;
    } catch {
      return null;
    }
  }

  async atomicDeleteFiles(urls: string[]): Promise<{
    success: boolean;
    deletedFiles: string[];
    failedFiles: Array<{ url: string; error: string }>;
  }> {
    const fileIds = urls
      .map(url => this.extractFileIdFromUrl(url))
      .filter((id): id is string => id !== null);

    if (fileIds.length === 0) {
      return {
        success: true,
        deletedFiles: [],
        failedFiles: [],
      };
    }

    try {
      const result = await this.bulkDeleteFiles(fileIds);
      
      return {
        success: result.errors.length === 0,
        deletedFiles: result.successfullyDeleted,
        failedFiles: result.errors.map(error => ({
          url: urls.find(url => this.extractFileIdFromUrl(url) === error.fileId) || error.fileId,
          error: error.error,
        })),
      };
    } catch (error) {
      return {
        success: false,
        deletedFiles: [],
        failedFiles: urls.map(url => ({
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      };
    }
  }
}
