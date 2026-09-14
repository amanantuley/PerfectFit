# Frontend-Backend Integration Guide

This document explains how to connect the Next.js frontend to the FastAPI backend.

## 🔗 Connection Setup

### 1. Configure Frontend Environment

Create or update `.env.local` in the frontend root:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx

# Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

### 2. Create API Client (Frontend)

Update or create `src/lib/api-client.ts`:

```typescript
import axios from 'axios';
import { getAccessToken, setTokens, clearTokens } from '@/lib/auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          token: refreshToken,
        });

        setTokens(response.data.access_token, refreshToken);
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        return apiClient(originalRequest);
      } catch (err) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 3. Authentication Flow (Frontend)

Update `src/lib/auth.ts`:

```typescript
import apiClient from '@/lib/api-client';

// Login
export async function login(email: string, password: string) {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user_authenticated', 'true');

    return response.data;
  } catch (error) {
    throw error;
  }
}

// Register
export async function register(userData: any) {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const response = await apiClient.get('/users/me');
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Logout
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_authenticated');
}
```

### 4. Update Cart & Orders (Frontend)

Replace local state with backend calls in `src/context/app-context.tsx`:

```typescript
export function AppProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Fetch orders from backend
  useEffect(() => {
    fetchUserOrders();
  }, []);

  async function fetchUserOrders() {
    try {
      const response = await apiClient.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }

  const addOrder = async (items: CartItem[], address: any) => {
    try {
      const response = await apiClient.post('/orders', {
        items: items.map(item => ({
          product_id: item.id,
          quantity: 1,
          purchase_type: item.purchaseType,
          size: item.size,
          color: item.color,
          customization_details: { notes: item.customizationNote },
        })),
        shipping_address: address,
      });

      const newOrder = response.data;
      setOrders([newOrder, ...orders]);
      setCart([]);

      return newOrder;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  };

  // ... rest of context
}
```

### 5. Payment Integration (Razorpay)

Update payment flow in `src/components/checkout.tsx`:

```typescript
import apiClient from '@/lib/api-client';

async function handlePayment(orderId: string) {
  try {
    // Step 1: Create Razorpay order
    const orderResponse = await apiClient.post('/payments/razorpay/create-order', {
      order_id: orderId,
      payment_method: 'razorpay',
    });

    const orderData = orderResponse.data;

    // Step 2: Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      // Step 3: Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount * 100,
        currency: 'INR',
        order_id: orderData.razorpay_order_id,
        handler: async (response: any) => {
          // Step 4: Verify payment on backend
          try {
            const verifyResponse = await apiClient.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.data.status === 'success') {
              // Payment successful
              toast.success('Payment successful!');
              // Redirect to order confirmation
            }
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          email: currentUser.email,
          contact: currentUser.phone,
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('Payment initiation failed:', error);
    toast.error('Failed to initiate payment');
  }
}
```

### 6. Real-time Notifications (WebSocket)

Add Socket.io integration in `src/hooks/use-notifications.ts`:

```typescript
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useNotifications(userId: string) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    socket.on('connect', () => {
      console.log('Connected to notifications');
      socket.emit('join_user', { user_id: userId });
    });

    socket.on('order_update', (data) => {
      console.log('Order updated:', data);
      // Show notification or update UI
    });

    socket.on('notification_new', (notification) => {
      console.log('New notification:', notification);
      // Add to notification center
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}
```

## 🔄 API Response Formats

### Successful Response
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  // ... other fields
}
```

### Error Response
```json
{
  "detail": "User not found"
}
```

## 🚀 Testing Integration

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Test Protected Route
```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <your_access_token>"
```

### Test Products
```bash
curl http://localhost:8000/api/v1/products
```

## 🔐 CORS Configuration

Update `app/config.py` if needed:

```python
CORS_ORIGINS = [
    "http://localhost:9002",  # Frontend
    "http://localhost:3000",  # Alternative port
    "https://perfectfit.com", # Production
]
```

## 📋 Environment Variables Checklist

**Frontend (.env.local)**
- [ ] NEXT_PUBLIC_API_URL
- [ ] NEXT_PUBLIC_RAZORPAY_KEY_ID
- [ ] NEXT_PUBLIC_SOCKET_URL

**Backend (.env)**
- [ ] DATABASE_URL
- [ ] REDIS_URL
- [ ] SECRET_KEY
- [ ] RAZORPAY_KEY_ID
- [ ] RAZORPAY_KEY_SECRET
- [ ] SMTP_USER
- [ ] SMTP_PASS
- [ ] FRONTEND_URL

## 🧪 Quick Test Commands

```bash
# Test backend is running
curl http://localhost:8000/health

# Create account
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test"
  }'

# Get all products
curl http://localhost:8000/api/v1/products

# View API docs
# Open http://localhost:8000/docs
```

## 🐛 Common Issues

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Update CORS_ORIGINS in backend config and restart.

### Token Expired
```
401 Unauthorized
```
**Solution**: Use refresh token to get new access token automatically (handled in interceptor).

### Connection Refused
```
ECONNREFUSED 127.0.0.1:8000
```
**Solution**: Make sure backend is running on port 8000.

## ✅ Integration Checklist

- [ ] Backend running on http://localhost:8000
- [ ] PostgreSQL database connected
- [ ] Frontend environment variables configured
- [ ] Login flow tested
- [ ] Products API working
- [ ] Orders creation working
- [ ] Razorpay integration tested
- [ ] WebSocket notifications connected
- [ ] Email notifications working (check backend logs)

---

**Integration Status**: Ready for full-stack testing
