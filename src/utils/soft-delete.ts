import { AppError } from './error-handler';

export interface SoftDeleteOptions {
  undoTimeoutMs?: number;
  includeUndoToken?: boolean;
  atomicOperations?: Array<() => Promise<void>>;
  rollbackOperations?: Array<() => Promise<void>>;
}

export interface SoftDeleteResult {
  success: boolean;
  message: string;
  undo_token?: string;
  undo_expires_at?: Date;
  metadata?: Record<string, any>;
}

export interface UndoDeleteResult {
  success: boolean;
  message: string;
  restored_item?: any;
}

export interface AtomicDeleteOperation {
  execute: () => Promise<void>;
  rollback: () => Promise<void>;
  description: string;
}

export class SoftDeleteManager {
  private static undoTokens = new Map<string, {
    expires_at: Date;
    rollback_operations: Array<() => Promise<void>>;
    metadata: Record<string, any>;
  }>();

  static generateUndoToken(entityType: string, entityId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `undo_${entityType}_${entityId}_${timestamp}_${random}`;
  }

  static async executeSoftDelete(
    entityType: string,
    entityId: string,
    deleteOperation: () => Promise<any>,
    options: SoftDeleteOptions = {}
  ): Promise<SoftDeleteResult> {
    const {
      undoTimeoutMs = 5000,
      includeUndoToken = true,
      atomicOperations = [],
      rollbackOperations = [],
    } = options;

    try {
      const rollbackOps: Array<() => Promise<void>> = [];
      
      const mainResult = await deleteOperation();
      rollbackOps.push(...rollbackOperations);

      for (const operation of atomicOperations) {
        await operation();
      }

      let undo_token: string | undefined;
      let undo_expires_at: Date | undefined;

      if (includeUndoToken) {
        undo_token = this.generateUndoToken(entityType, entityId);
        undo_expires_at = new Date(Date.now() + undoTimeoutMs);

        this.undoTokens.set(undo_token, {
          expires_at: undo_expires_at,
          rollback_operations: rollbackOps,
          metadata: {
            entity_type: entityType,
            entity_id: entityId,
            deleted_at: new Date(),
            main_result: mainResult,
          },
        });

        setTimeout(() => {
          this.undoTokens.delete(undo_token!);
        }, undoTimeoutMs);
      }

      return {
        success: true,
        message: `${entityType} deleted successfully`,
        undo_token,
        undo_expires_at,
        metadata: {
          entity_type: entityType,
          entity_id: entityId,
          deleted_at: new Date(),
        },
      };
    } catch (error) {
      console.error(`Soft delete failed for ${entityType} ${entityId}:`, error);
      
      try {
        for (const rollback of rollbackOperations.reverse()) {
          await rollback();
        }
      } catch (rollbackError) {
        console.error(`Rollback failed for ${entityType} ${entityId}:`, rollbackError);
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete ${entityType}`, 500);
    }
  }

  static async executeUndo(
    undoToken: string,
    restoreOperation: (metadata: Record<string, any>) => Promise<any>
  ): Promise<UndoDeleteResult> {
    const tokenData = this.undoTokens.get(undoToken);
    
    if (!tokenData) {
      throw new AppError('Invalid or expired undo token', 400);
    }

    if (new Date() > tokenData.expires_at) {
      this.undoTokens.delete(undoToken);
      throw new AppError('Undo token has expired', 400);
    }

    try {
      const restoredItem = await restoreOperation(tokenData.metadata);

      for (const rollback of tokenData.rollback_operations) {
        await rollback();
      }

      this.undoTokens.delete(undoToken);

      return {
        success: true,
        message: `${tokenData.metadata.entity_type} restored successfully`,
        restored_item: restoredItem,
      };
    } catch (error) {
      console.error(`Undo operation failed for token ${undoToken}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to restore item', 500);
    }
  }

  static async executeBulkSoftDelete(
    entityType: string,
    entityIds: string[],
    bulkDeleteOperation: (ids: string[]) => Promise<any>,
    options: SoftDeleteOptions = {}
  ): Promise<SoftDeleteResult> {
    const {
      undoTimeoutMs = 5000,
      includeUndoToken = true,
      atomicOperations = [],
      rollbackOperations = [],
    } = options;

    if (entityIds.length === 0) {
      throw new AppError('No entity IDs provided for bulk delete', 400);
    }

    try {
      const rollbackOps: Array<() => Promise<void>> = [];
      
      const mainResult = await bulkDeleteOperation(entityIds);
      rollbackOps.push(...rollbackOperations);

      for (const operation of atomicOperations) {
        await operation();
      }

      let undo_token: string | undefined;
      let undo_expires_at: Date | undefined;

      if (includeUndoToken) {
        undo_token = this.generateUndoToken(entityType, `bulk_${entityIds.length}`);
        undo_expires_at = new Date(Date.now() + undoTimeoutMs);

        this.undoTokens.set(undo_token, {
          expires_at: undo_expires_at,
          rollback_operations: rollbackOps,
          metadata: {
            entity_type: entityType,
            entity_ids: entityIds,
            deleted_at: new Date(),
            main_result: mainResult,
            is_bulk: true,
          },
        });

        setTimeout(() => {
          this.undoTokens.delete(undo_token!);
        }, undoTimeoutMs);
      }

      return {
        success: true,
        message: `${entityIds.length} ${entityType}s deleted successfully`,
        undo_token,
        undo_expires_at,
        metadata: {
          entity_type: entityType,
          entity_ids: entityIds,
          deleted_at: new Date(),
          count: entityIds.length,
        },
      };
    } catch (error) {
      console.error(`Bulk soft delete failed for ${entityType}:`, error);
      
      try {
        for (const rollback of rollbackOperations.reverse()) {
          await rollback();
        }
      } catch (rollbackError) {
        console.error(`Bulk rollback failed for ${entityType}:`, rollbackError);
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete ${entityType}s`, 500);
    }
  }

  static async executeBulkUndo(
    undoToken: string,
    bulkRestoreOperation: (metadata: Record<string, any>) => Promise<any>
  ): Promise<UndoDeleteResult> {
    const tokenData = this.undoTokens.get(undoToken);
    
    if (!tokenData) {
      throw new AppError('Invalid or expired undo token', 400);
    }

    if (new Date() > tokenData.expires_at) {
      this.undoTokens.delete(undoToken);
      throw new AppError('Undo token has expired', 400);
    }

    if (!tokenData.metadata.is_bulk) {
      throw new AppError('Token is not for bulk operation', 400);
    }

    try {
      const restoredItems = await bulkRestoreOperation(tokenData.metadata);

      for (const rollback of tokenData.rollback_operations) {
        await rollback();
      }

      this.undoTokens.delete(undoToken);

      return {
        success: true,
        message: `${tokenData.metadata.entity_ids.length} ${tokenData.metadata.entity_type}s restored successfully`,
        restored_item: restoredItems,
      };
    } catch (error) {
      console.error(`Bulk undo operation failed for token ${undoToken}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to restore items', 500);
    }
  }

  static isValidUndoToken(undoToken: string): boolean {
    const tokenData = this.undoTokens.get(undoToken);
    return tokenData !== undefined && new Date() <= tokenData.expires_at;
  }

  static getUndoTokenMetadata(undoToken: string): Record<string, any> | null {
    const tokenData = this.undoTokens.get(undoToken);
    return tokenData ? tokenData.metadata : null;
  }

  static cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.undoTokens.entries()) {
      if (now > data.expires_at) {
        this.undoTokens.delete(token);
      }
    }
  }

  static getActiveTokensCount(): number {
    this.cleanupExpiredTokens();
    return this.undoTokens.size;
  }
}
