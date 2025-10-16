/**
 * Bookmark Service
 * Handles bookmark operations with Redis storage and 30-day auto-expiration
 */

import { RedisService } from "../lib/redis";
import { Product } from "../types/product";

export interface BookmarkData {
  bookmarkedProducts: Product[];
  bookmarkCount: number;
  updatedAt: string;
}

export interface BookmarkResponse {
  data: BookmarkData;
  count: number;
}

export class BookmarkService {
  private redis: RedisService;

  constructor(env: any) {
    this.redis = new RedisService(env.REDIS_URL);
  }

  /**
   * Get bookmark key for user or guest session
   */
  private getBookmarkKey(userId?: string, sessionId?: string): string {
    if (userId) {
      return `bookmarks:user:${userId}`;
    }
    if (sessionId) {
      return `bookmarks:guest:${sessionId}`;
    }
    throw new Error("Either userId or sessionId must be provided");
  }

  /**
   * Get bookmark data for user or guest
   */
  async getBookmarks(
    userId?: string,
    sessionId?: string
  ): Promise<BookmarkData> {
    const key = this.getBookmarkKey(userId, sessionId);
    const bookmarkData = await (this.redis as any).redis.get(key);

    if (!bookmarkData) {
      return {
        bookmarkedProducts: [],
        bookmarkCount: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const parsed = JSON.parse(bookmarkData);
      return {
        bookmarkedProducts: parsed.bookmarkedProducts || [],
        bookmarkCount: parsed.bookmarkCount || 0,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to parse bookmark data:", error);
      return {
        bookmarkedProducts: [],
        bookmarkCount: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Save bookmark data with 30-day expiration
   */
  async saveBookmarks(
    bookmarkData: BookmarkData,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const key = this.getBookmarkKey(userId, sessionId);
    const dataToStore = {
      ...bookmarkData,
      updatedAt: new Date().toISOString(),
    };

    // Store with 30-day expiration (30 * 24 * 60 * 60 = 2592000 seconds)
    await (this.redis as any).redis.setex(
      key,
      2592000,
      JSON.stringify(dataToStore)
    );
  }

  /**
   * Add bookmark
   */
  async addBookmark(
    product: Product,
    userId?: string,
    sessionId?: string
  ): Promise<BookmarkResponse> {
    const bookmarks = await this.getBookmarks(userId, sessionId);

    // Check if already bookmarked
    const isAlreadyBookmarked = bookmarks.bookmarkedProducts.some(
      (p) => p.id === product.id
    );

    if (!isAlreadyBookmarked) {
      bookmarks.bookmarkedProducts.push(product);
      bookmarks.bookmarkCount = bookmarks.bookmarkedProducts.length;

      await this.saveBookmarks(bookmarks, userId, sessionId);
    }

    return {
      data: bookmarks,
      count: bookmarks.bookmarkCount,
    };
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(
    productId: string,
    userId?: string,
    sessionId?: string
  ): Promise<BookmarkResponse> {
    const bookmarks = await this.getBookmarks(userId, sessionId);

    bookmarks.bookmarkedProducts = bookmarks.bookmarkedProducts.filter(
      (p) => p.id !== productId
    );
    bookmarks.bookmarkCount = bookmarks.bookmarkedProducts.length;

    await this.saveBookmarks(bookmarks, userId, sessionId);

    return {
      data: bookmarks,
      count: bookmarks.bookmarkCount,
    };
  }

  /**
   * Toggle bookmark
   */
  async toggleBookmark(
    product: Product,
    userId?: string,
    sessionId?: string
  ): Promise<BookmarkResponse> {
    const bookmarks = await this.getBookmarks(userId, sessionId);

    const existingIndex = bookmarks.bookmarkedProducts.findIndex(
      (p) => p.id === product.id
    );

    if (existingIndex >= 0) {
      // Remove bookmark
      bookmarks.bookmarkedProducts.splice(existingIndex, 1);
    } else {
      // Add bookmark
      bookmarks.bookmarkedProducts.push(product);
    }

    bookmarks.bookmarkCount = bookmarks.bookmarkedProducts.length;
    await this.saveBookmarks(bookmarks, userId, sessionId);

    return {
      data: bookmarks,
      count: bookmarks.bookmarkCount,
    };
  }

  /**
   * Clear all bookmarks
   */
  async clearBookmarks(
    userId?: string,
    sessionId?: string
  ): Promise<BookmarkResponse> {
    const emptyBookmarks: BookmarkData = {
      bookmarkedProducts: [],
      bookmarkCount: 0,
      updatedAt: new Date().toISOString(),
    };

    await this.saveBookmarks(emptyBookmarks, userId, sessionId);

    return {
      data: emptyBookmarks,
      count: 0,
    };
  }

  /**
   * Get bookmark count only (for performance)
   */
  async getBookmarkCount(userId?: string, sessionId?: string): Promise<number> {
    const bookmarks = await this.getBookmarks(userId, sessionId);
    return bookmarks.bookmarkCount;
  }

  /**
   * Check if product is bookmarked
   */
  async isBookmarked(
    productId: string,
    userId?: string,
    sessionId?: string
  ): Promise<boolean> {
    const bookmarks = await this.getBookmarks(userId, sessionId);
    return bookmarks.bookmarkedProducts.some((p) => p.id === productId);
  }

  /**
   * Migrate guest bookmarks to user bookmarks
   */
  async migrateGuestBookmarks(
    guestSessionId: string,
    userId: string
  ): Promise<BookmarkResponse> {
    const guestBookmarks = await this.getBookmarks(undefined, guestSessionId);
    const userBookmarks = await this.getBookmarks(userId);

    // Merge bookmarks - avoid duplicates
    const mergedProducts = [...userBookmarks.bookmarkedProducts];

    for (const guestProduct of guestBookmarks.bookmarkedProducts) {
      const exists = mergedProducts.some((p) => p.id === guestProduct.id);
      if (!exists) {
        mergedProducts.push(guestProduct);
      }
    }

    const mergedBookmarks: BookmarkData = {
      bookmarkedProducts: mergedProducts,
      bookmarkCount: mergedProducts.length,
      updatedAt: new Date().toISOString(),
    };

    // Save merged bookmarks to user account
    await this.saveBookmarks(mergedBookmarks, userId);

    // Clear guest bookmarks
    await this.clearBookmarks(undefined, guestSessionId);

    return {
      data: mergedBookmarks,
      count: mergedBookmarks.bookmarkCount,
    };
  }
}
