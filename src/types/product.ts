/**
 * Product and Cart Types
 * Shared types for product and cart operations
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  inStock: boolean;
  featured?: boolean;
  tags?: string[];
  weight?: string;
  origin?: string;
  benefits?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image: string;
  productCount: number;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified?: boolean;
}

export interface ProductFilters {
  category?: string;
  priceRange?: [number, number];
  inStock?: boolean;
  search?: string;
  sortBy?: 'name' | 'price' | 'newest' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
