
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Types from the backend API
export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  purchase_type: 'buy' | 'rent';
  size?: string;
  color?: string;
  customization_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  discount_applied: number;
  tax_amount: number;
  shipping_amount: number;
  final_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  purchase_type: string;
  size?: string;
  color?: string;
}

export interface ReturnEntry {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  description?: string;
  status: 'requested' | 'approved' | 'rejected' | 'shipped_back' | 'completed';
  refund_amount?: number;
  created_at: string;
}

interface AppContextType {
  orders: Order[];
  ordersLoading: boolean;
  ordersError?: string;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  addMultipleOrders: (newOrders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  
  returns: ReturnEntry[];
  returnsLoading: boolean;
  returnsError?: string;
  addReturn: (returnEntry: ReturnEntry) => void;
  
  cart: CartItem[];
  cartLoading: boolean;
  cartError?: string;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number, purchaseType: 'buy' | 'rent', options?: Partial<CartItem>) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => Promise<void>;
  clearCart: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string>();
  
  // Returns state
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsError, setReturnsError] = useState<string>();
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string>();

  // API helper
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  };

  // Fetch orders from API
  const fetchOrders = async () => {
    if (!user || !token) return;
    
    try {
      setOrdersLoading(true);
      setOrdersError(undefined);
      const data = await apiCall('/api/v1/orders');
      setOrders(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orders';
      setOrdersError(message);
      console.error('Failed to fetch orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch cart from API
  const fetchCart = async () => {
    if (!user || !token) return;
    
    try {
      setCartLoading(true);
      setCartError(undefined);
      const data = await apiCall('/api/v1/cart');
      setCart(data.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cart';
      setCartError(message);
      console.error('Failed to fetch cart:', error);
    } finally {
      setCartLoading(false);
    }
  };

  // Add to cart via API
  const addToCart = async (
    productId: string,
    quantity: number,
    purchaseType: 'buy' | 'rent',
    options?: Partial<CartItem>
  ) => {
    if (!user || !token) return;
    
    try {
      setCartError(undefined);
      const item = await apiCall('/api/v1/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity,
          purchase_type: purchaseType,
          ...options,
        }),
      });
      
      // Refresh cart to get updated data
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item to cart';
      setCartError(message);
      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  // Remove from cart via API
  const removeFromCart = async (itemId: string) => {
    if (!user || !token) return;
    
    try {
      setCartError(undefined);
      await apiCall(`/api/v1/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      
      // Refresh cart
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
      setCartError(message);
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  };

  // Update cart item via API
  const updateCartItem = async (itemId: string, updates: Partial<CartItem>) => {
    if (!user || !token) return;
    
    try {
      setCartError(undefined);
      await apiCall(`/api/v1/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      // Refresh cart
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cart item';
      setCartError(message);
      console.error('Failed to update cart item:', error);
      throw error;
    }
  };

  // Clear cart via API
  const clearCart = async () => {
    if (!user || !token) return;
    
    try {
      setCartError(undefined);
      await apiCall('/api/v1/cart', {
        method: 'DELETE',
      });
      
      setCart([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear cart';
      setCartError(message);
      console.error('Failed to clear cart:', error);
      throw error;
    }
  };

  // Local context methods (for backward compatibility)
  const addOrder = (order: Order) => {
    setOrders(prevOrders => [order, ...prevOrders]);
  };

  const addMultipleOrders = (newOrders: Order[]) => {
    setOrders(prevOrders => [...newOrders, ...prevOrders]);
  };
  
  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const addReturn = (returnEntry: ReturnEntry) => {
    setReturns(prevReturns => [returnEntry, ...prevReturns]);
  };

  // Load data when user authenticates
  useEffect(() => {
    if (user && token) {
      fetchOrders();
      fetchCart();
    }
  }, [user, token]);

  return (
    <AppContext.Provider value={{ 
        orders,
        ordersLoading,
        ordersError,
        fetchOrders,
        addOrder,
        addMultipleOrders,
        updateOrderStatus,
        
        returns,
        returnsLoading,
        returnsError,
        addReturn,
        
        cart,
        cartLoading,
        cartError,
        fetchCart,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
