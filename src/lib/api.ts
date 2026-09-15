/** Browser client for the FastAPI source of truth. */
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://perfectfit-4quj.onrender.com/api/v1'
).replace(/\/$/, '');



export type ApiUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  preferred_style?: string[] | null;
  role: 'customer' | 'tailor' | 'admin';
  is_active?: boolean;
  created_at?: string;
};

export type ApiProduct = {
  id: string;
  name: string;
  type: string;
  product_type?: string | null;
  description?: string | null;
  price: number;
  rent_price?: number | null;
  image_url?: string | null;
  additional_images?: string[] | null;
  data_ai_hint?: string | null;
  available_sizes?: string[] | null;
  available_colors?: string[] | null;
  stock_quantity: number;
  rating: number;
  review_count: number;
  in_stock: boolean;
  is_active: boolean;
  created_by?: string | null;
  tags?: string[] | null;
  sku?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiCartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  purchase_type: 'buy' | 'rent';
  size?: string | null;
  color?: string | null;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  customization_details?: Record<string, any> | null;
  customization_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiCart = {
  id: string;
  user_id: string;
  items: ApiCartItem[];
  created_at: string;
  updated_at: string;
};

export type ApiOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  purchase_type: string;
  size?: string | null;
  color?: string | null;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  customization_details?: Record<string, any> | null;
  created_at: string;
};

export type ApiOrder = {
  id: string;
  user_id: string;
  total_amount: number;
  discount_applied: number;
  tax_amount: number;
  shipping_amount: number;
  final_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  shipping_address?: Record<string, any> | null;
  tracking_number?: string | null;
  notes?: string | null;
  customization_notes?: string | null;
  items: ApiOrderItem[];
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
};

export type ApiReturnRequest = {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  description?: string | null;
  status: 'requested' | 'approved' | 'rejected' | 'shipped_back' | 'completed';
  refund_amount?: number | null;
  created_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
};

export type ApiSubscription = {
  id: string;
  user_id: string;
  plan_type: string;
  price: number;
  status: string;
  auto_renew: boolean;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  cancelled_at?: string | null;
  created_at: string;
};

export type ApiMeasurement = {
  id: string;
  user_id: string;
  image_url: string;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  shoulder?: number | null;
  inseam?: number | null;
  sleeve_length?: number | null;
  neck?: number | null;
  confidence_score: number;
  model_version?: string | null;
  notes?: string | null;
  created_at: string;
};

export type ApiWallet = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type ApiTransaction = {
  id: string;
  wallet_id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description?: string | null;
  reference_id?: string | null;
  created_at: string;
};

export type ApiReward = {
  id: string;
  user_id: string;
  points_earned: number;
  points_used: number;
  current_balance: number;
  tier: string;
  created_at: string;
  last_updated?: string | null;
};

export type ApiMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  attachments?: string[] | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

export type ApiNotification = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
  expires_at?: string | null;
};

export type ApiTailor = {
  id: string;
  user_id: string;
  shop_name: string;
  shop_image?: string | null;
  bio?: string | null;
  specialization?: string[] | null;
  verified: boolean;
  is_active: boolean;
  rating: number;
  review_count: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  availability?: Record<string, any> | null;
  price_range?: { min?: number; max?: number } | null;
  created_at: string;
  updated_at?: string | null;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || body.error || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  register: async (payload: { email: string; password: string; first_name?: string; last_name?: string }) => {
    const user = await apiFetch<ApiUser>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    return user;
  },
  login: async (email: string, password: string) => {
    const res = await apiFetch<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (typeof window !== 'undefined' && res?.access_token) {
      localStorage.setItem('access_token', res.access_token);
      if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);
    }
    return res;
  },
  me: () => apiFetch<ApiUser>('/auth/me'),
  logout: async () => {
    try {
      return await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  },
  forgotPassword: (email: string) => apiFetch<{ message: string }>('/auth/forgot-password?email=' + encodeURIComponent(email), { method: 'POST' }),
};

export const productsApi = {
  list: (params?: { product_type?: string; search?: string; min_price?: number; max_price?: number; in_stock_only?: boolean; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.product_type) query.append('product_type', params.product_type);
    if (params?.search) query.append('search', params.search);
    if (params?.min_price !== undefined) query.append('min_price', String(params.min_price));
    if (params?.max_price !== undefined) query.append('max_price', String(params.max_price));
    if (params?.in_stock_only) query.append('in_stock_only', 'true');
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const queryString = query.toString();
    return apiFetch<ApiProduct[]>(`/products${queryString ? '?' + queryString : ''}`);
  },
  get: (id: string) => apiFetch<ApiProduct>(`/products/${id}`),
  create: (data: Partial<ApiProduct>) => apiFetch<ApiProduct>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiProduct>) => apiFetch<ApiProduct>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const cartApi = {
  get: () => apiFetch<ApiCart>('/cart'),
  addItem: (data: { product_id: string; quantity: number; purchase_type: 'buy' | 'rent'; size?: string; color?: string; customization_notes?: string }) =>
    apiFetch<ApiCartItem>('/cart/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: { quantity?: number; size?: string; color?: string; customization_notes?: string }) =>
    apiFetch<ApiCartItem>(`/cart/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeItem: (id: string) => apiFetch<void>(`/cart/items/${id}`, { method: 'DELETE' }),
  clear: () => apiFetch<void>('/cart', { method: 'DELETE' }),
};

export const ordersApi = {
  list: () => apiFetch<ApiOrder[]>('/orders'),
  get: (id: string) => apiFetch<ApiOrder>(`/orders/${id}`),
  create: (data: { items: { product_id: string; quantity: number; purchase_type: string; size?: string; color?: string; customization_details?: any }[]; shipping_address?: any; customization_notes?: string }) =>
    apiFetch<ApiOrder>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  tracking: (id: string) => apiFetch<any>(`/orders/${id}/tracking`),
  cancel: (id: string) => apiFetch<{ message: string }>(`/orders/${id}/cancel`, { method: 'POST' }),
  updateStatus: (id: string, status: string) => apiFetch<{ message: string }>(`/orders/${id}/status?new_status=${status}`, { method: 'PUT' }),
};

export const paymentsApi = {
  createRazorpayOrder: (data: { order_id?: string; subscription_id?: string; payment_method?: string }) =>
    apiFetch<{ razorpay_order_id: string; amount: number; currency: string; key_id: string; payment_id: string }>('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify(data) }),
  verifyRazorpayPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    apiFetch<{ status: string; message: string; payment_id: string; razorpay_payment_id: string }>('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(data) }),
};

export const subscriptionsApi = {
  getPlans: () => apiFetch<{ plans: { id: string; name: string; price: number; duration_days: number; features: string[] }[] }>('/subscriptions/plans'),
  list: () => apiFetch<ApiSubscription[]>('/subscriptions'),
  purchasePlan: (planId: string) => apiFetch<{ subscription_id: string; payment_id: string; plan_id: string; plan_name: string; amount: number; currency: string; message: string }>(`/subscriptions/plans/${planId}/purchase`, { method: 'POST' }),
  cancel: (id: string) => apiFetch<{ status: string; message: string; subscription_id: string }>(`/subscriptions/${id}/cancel`, { method: 'POST' }),
  status: (id: string) => apiFetch<any>(`/subscriptions/${id}/status`),
};

export const platformApi = {
  listMeasurements: () => apiFetch<ApiMeasurement[]>('/measurements'),
  createMeasurement: (data: Partial<ApiMeasurement>) => apiFetch<ApiMeasurement>('/measurements', { method: 'POST', body: JSON.stringify(data) }),
  getWallet: () => apiFetch<ApiWallet>('/wallet'),
  addWalletMoney: (amount: number) => apiFetch<ApiWallet>('/wallet/add-money', { method: 'POST', body: JSON.stringify({ amount }) }),
  getWalletTransactions: () => apiFetch<ApiTransaction[]>('/wallet/transactions'),
  getRewards: () => apiFetch<ApiReward>('/rewards'),
  redeemRewards: (points: number) => apiFetch<ApiReward>(`/rewards/redeem?points=${points}`, { method: 'POST' }),
  listReturns: () => apiFetch<ApiReturnRequest[]>('/returns'),
  createReturn: (data: { order_id: string; reason: string; description?: string }) => apiFetch<ApiReturnRequest>('/returns', { method: 'POST', body: JSON.stringify(data) }),
  listNotifications: () => apiFetch<ApiNotification[]>('/notifications'),
  markNotificationRead: (id: string) => apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' }),
  listMessages: () => apiFetch<ApiMessage[]>('/messages'),
  sendMessage: (data: { receiver_id: string; content: string; message_type?: string }) => apiFetch<ApiMessage>('/messages', { method: 'POST', body: JSON.stringify(data) }),
  markMessageRead: (id: string) => apiFetch<{ message: string }>(`/messages/${id}/read`, { method: 'POST' }),
  listTailors: () => apiFetch<ApiTailor[]>('/tailors'),
  getTailor: (id: string) => apiFetch<ApiTailor>(`/tailors/${id}`),
  updateMyTailorProfile: (data: Partial<ApiTailor>) => apiFetch<ApiTailor>('/tailors/me', { method: 'PUT', body: JSON.stringify(data) }),
};

export const usersApi = {
  me: () => apiFetch<ApiUser>('/users/me'),
  updateMe: (data: Partial<ApiUser>) => apiFetch<ApiUser>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/users/upload-profile-picture`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.detail || 'Upload failed');
    }
    return response.json() as Promise<{ message: string; url: string }>;
  },
};
