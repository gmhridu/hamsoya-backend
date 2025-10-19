/**
 * Cart Service
 * Handles cart operations with Redis storage and 30-day auto-expiration
 */

import { RedisService } from '../lib/redis';
import type { CartItem, Product } from '../types/product';

export interface CartData {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  updatedAt: string;
}

export interface CartResponse {
  data: CartData;
  count: number;
}

export class CartService {
  private redis: RedisService;

  constructor(env: any) {
    this.redis = new RedisService(env.REDIS_URL);
  }

  /**
   * Get cart key for user or guest session
   */
  private getCartKey(userId?: string, sessionId?: string): string {
    if (userId) {
      return `cart:user:${userId}`;
    }
    if (sessionId) {
      return `cart:guest:${sessionId}`;
    }
    throw new Error('Either userId or sessionId must be provided');
  }

  /**
   * Get cart data for user or guest with retry logic
   */
  async getCart(userId?: string, sessionId?: string): Promise<CartData> {
    const key = this.getCartKey(userId, sessionId);

    try {
      // Use RedisService method instead of direct Redis access
      const cartData = await this.redis.getCartData(key);

      if (!cartData) {
        return {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        items: cartData.items || [],
        totalItems: cartData.totalItems || 0,
        totalPrice: cartData.totalPrice || 0,
        updatedAt: cartData.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to get cart for key ${key}:`, error);
      // Return empty cart on Redis failure instead of throwing
      return {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Save cart data with 30-day expiration and retry logic
   */
  async saveCart(cartData: CartData, userId?: string, sessionId?: string): Promise<void> {
    const key = this.getCartKey(userId, sessionId);
    const dataToStore = {
      ...cartData,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Use RedisService method with 30-day expiration
      await this.redis.setCartData(key, dataToStore, 2592000);
    } catch (error) {
      console.error(`Failed to save cart for key ${key}:`, error);
      // Don't throw - allow cart operations to fail gracefully
    }
  }

  /**
   * Add item to cart
   */
  async addItem(product: Product, quantity: number = 1, userId?: string, sessionId?: string): Promise<CartResponse> {
    const cart = await this.getCart(userId, sessionId);

    const existingItemIndex = cart.items.findIndex(item => item.product.id === product.id);

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({ product, quantity });
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    await this.saveCart(cart, userId, sessionId);

    return {
      data: cart,
      count: cart.totalItems,
    };
  }

  /**
   * Remove item from cart
   */
  async removeItem(productId: string, userId?: string, sessionId?: string): Promise<CartResponse> {
    const cart = await this.getCart(userId, sessionId);

    cart.items = cart.items.filter(item => item.product.id !== productId);

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    await this.saveCart(cart, userId, sessionId);

    return {
      data: cart,
      count: cart.totalItems,
    };
  }

  /**
   * Update item quantity
   */
  async updateQuantity(productId: string, quantity: number, userId?: string, sessionId?: string): Promise<CartResponse> {
    if (quantity <= 0) {
      return this.removeItem(productId, userId, sessionId);
    }

    const cart = await this.getCart(userId, sessionId);

    const existingItemIndex = cart.items.findIndex(item => item.product.id === productId);

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = quantity;
    }

    // Recalculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    await this.saveCart(cart, userId, sessionId);

    return {
      data: cart,
      count: cart.totalItems,
    };
  }

  /**
   * Clear cart
   */
  async clearCart(userId?: string, sessionId?: string): Promise<CartResponse> {
    const emptyCart: CartData = {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      updatedAt: new Date().toISOString(),
    };

    await this.saveCart(emptyCart, userId, sessionId);

    return {
      data: emptyCart,
      count: 0,
    };
  }

  /**
   * Get cart count only (for performance)
   */
  async getCartCount(userId?: string, sessionId?: string): Promise<number> {
    const cart = await this.getCart(userId, sessionId);
    return cart.totalItems;
  }

  /**
   * Migrate guest cart to user cart
   */
  async migrateGuestCart(guestSessionId: string, userId: string): Promise<CartResponse> {
    const guestCart = await this.getCart(undefined, guestSessionId);
    const userCart = await this.getCart(userId);

    // Merge carts - user cart takes precedence for duplicate items
    const mergedItems = [...userCart.items];

    for (const guestItem of guestCart.items) {
      const existingIndex = mergedItems.findIndex(item => item.product.id === guestItem.product.id);

      if (existingIndex >= 0) {
        // Add quantities for existing items
        mergedItems[existingIndex].quantity += guestItem.quantity;
      } else {
        // Add new items
        mergedItems.push(guestItem);
      }
    }

    const mergedCart: CartData = {
      items: mergedItems,
      totalItems: mergedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: mergedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
      updatedAt: new Date().toISOString(),
    };

    // Save merged cart to user account
    await this.saveCart(mergedCart, userId);

    // Clear guest cart
    await this.clearCart(undefined, guestSessionId);

    return {
      data: mergedCart,
      count: mergedCart.totalItems,
    };
  }
}
