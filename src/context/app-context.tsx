'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cartApi, ordersApi, platformApi, ApiCartItem, ApiOrder, ApiReturnRequest } from '@/lib/api';

export type CartItem = ApiCartItem;
export type Order = ApiOrder;
export type ReturnEntry = ApiReturnRequest;

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
  fetchReturns: () => Promise<void>;
  addReturn: (returnEntry: ReturnEntry) => void;
  
  cart: CartItem[];
  cartLoading: boolean;
  cartError?: string;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, purchaseType?: 'buy' | 'rent', options?: Partial<CartItem>) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => Promise<void>;
  clearCart: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
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

  // Fetch orders from FastAPI
  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); return; }
    try {
      setOrdersLoading(true);
      setOrdersError(undefined);
      const data = await ordersApi.list();
      setOrders(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orders';
      setOrdersError(message);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  // Fetch returns from FastAPI
  const fetchReturns = useCallback(async () => {
    if (!user) { setReturns([]); return; }
    try {
      setReturnsLoading(true);
      setReturnsError(undefined);
      const data = await platformApi.listReturns();
      setReturns(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch returns';
      setReturnsError(message);
    } finally {
      setReturnsLoading(false);
    }
  }, [user]);

  // Fetch cart from FastAPI
  const fetchCart = useCallback(async () => {
    if (!user) { setCart([]); return; }
    try {
      setCartLoading(true);
      setCartError(undefined);
      const data = await cartApi.get();
      setCart(data.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cart';
      setCartError(message);
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  // Add to cart via FastAPI
  const addToCart = async (
    productId: string,
    quantity: number = 1,
    purchaseType: 'buy' | 'rent' = 'buy',
    options?: Partial<CartItem>
  ) => {
    if (!user) return;
    try {
      setCartError(undefined);
      await cartApi.addItem({
        product_id: productId,
        quantity,
        purchase_type: purchaseType,
        size: options?.size || undefined,
        color: options?.color || undefined,
        customization_notes: options?.customization_notes || undefined,
      });
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item to cart';
      setCartError(message);
      throw error;
    }
  };

  // Remove from cart via FastAPI
  const removeFromCart = async (itemId: string) => {
    if (!user) return;
    try {
      setCartError(undefined);
      await cartApi.removeItem(itemId);
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
      setCartError(message);
      throw error;
    }
  };

  // Update cart item via FastAPI
  const updateCartItem = async (itemId: string, updates: Partial<CartItem>) => {
    if (!user) return;
    try {
      setCartError(undefined);
      await cartApi.updateItem(itemId, {
        quantity: updates.quantity,
        size: updates.size || undefined,
        color: updates.color || undefined,
        customization_notes: updates.customization_notes || undefined,
      });
      await fetchCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cart item';
      setCartError(message);
      throw error;
    }
  };

  // Clear cart via FastAPI
  const clearCart = async () => {
    if (!user) return;
    try {
      setCartError(undefined);
      await cartApi.clear();
      setCart([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear cart';
      setCartError(message);
      throw error;
    }
  };

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
    if (user) {
      fetchOrders();
      fetchCart();
      fetchReturns();
    } else {
      setOrders([]);
      setCart([]);
      setReturns([]);
    }
  }, [user, fetchOrders, fetchCart, fetchReturns]);

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
        fetchReturns,
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
