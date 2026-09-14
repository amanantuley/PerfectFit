'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Package,
  Truck,
  Home,
  Scissors,
  Info,
  AlertTriangle,
  Calendar,
  Clock,
  Receipt,
  ShieldCheck,
  FileDown,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useApp, Order } from '@/context/app-context';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { addDays, format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MapPlaceholder = ({ status }: { status: string }) => {
  const progressPercentage = useMemo(() => {
    switch (status.toLowerCase()) {
      case 'shipped': return 50;
      case 'out for delivery': return 80;
      case 'delivered': return 100;
      default: return 20;
    }
  }, [status]);

  const pathLength = 530;
  const strokeDashoffset = pathLength - (pathLength * progressPercentage) / 100;
  const routePath = "M 50 150 C 150 50, 350 50, 450 150";

  return (
    <div className="relative w-full h-64 md:h-96 bg-muted/40 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
      <svg width="100%" height="100%" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" />
          </pattern>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#smallGrid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <path
          d={routePath}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6 6"
          className="opacity-30"
        />
        <path
          d={routePath}
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeDasharray={pathLength}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1.5s ease-in-out',
          }}
        />
        {progressPercentage > 0 && (
          <motion.g
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{ offsetPath: `path('${routePath}')` }}
          >
            <Truck
              className="text-primary drop-shadow-lg"
              width="24"
              height="24"
              transform="translate(-12, -12)"
            />
          </motion.g>
        )}

        <g transform="translate(50, 150)">
          <circle r="10" fill="hsl(var(--primary))" opacity="0.15" />
          <circle r="5" fill="hsl(var(--primary))" />
          <Package x="-8" y="-22" width="16" height="16" className="text-primary" />
        </g>
        <g transform="translate(450, 150)">
          <circle r="10" fill="hsl(var(--primary))" opacity="0.15" />
          <circle r="5" fill="hsl(var(--primary))" />
          <Home x="-8" y="-22" width="16" height="16" className="text-primary" />
        </g>
      </svg>
    </div>
  );
};

const trackingSteps = [
  { status: 'pending', label: 'Confirmed', description: 'Your order has been confirmed and registered.', icon: CheckCircle },
  { status: 'processing', label: 'Processing', description: 'Your tailor is crafting your custom fit.', icon: Scissors },
  { status: 'shipped', label: 'Shipped', description: 'Your outfit has left our atelier.', icon: Truck },
  { status: 'delivered', label: 'Delivered', description: 'Delivered successfully. Enjoy your fit!', icon: Package },
];

const getStepIndex = (status: string): number => {
  switch (status.toLowerCase()) {
    case 'processing': return 1;
    case 'shipped': return 2;
    case 'delivered': return 3;
    default: return 0;
  }
};

export default function TrackOrderPage() {
  const params = useParams();
  const { orders } = useApp();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | undefined>();

  useEffect(() => {
    const foundOrder = orders.find(o => o.id === orderId || o.id.startsWith(orderId));
    setOrder(foundOrder);
  }, [orderId, orders]);

  const currentStep = useMemo(() => (order ? getStepIndex(order.status) : 0), [order]);
  const eta = useMemo(() => (order ? addDays(new Date(order.created_at), 10) : null), [order]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Card className="p-8 w-full max-w-md text-center shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Order Not Found</CardTitle>
            <CardDescription>
              We couldn’t find your order. It may have been canceled or not yet created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="mt-4">
              <Link href="/orders">Go to My Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (['cancelled', 'returned'].includes(order.status.toLowerCase())) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
              Order Status
            </CardTitle>
            <CardDescription>Order ID: #{order.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Order {order.status}</AlertTitle>
              <AlertDescription>
                This order has been {order.status.toLowerCase()} and active tracking has concluded.
              </AlertDescription>
            </Alert>
            <Button asChild>
              <Link href="/orders">Back to My Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 animate-fade-in-up"
    >
      <Card className="shadow-xl border border-white/10 backdrop-blur-md">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">
                Track Order
              </CardTitle>
              <CardDescription>Order ID: #{order.id}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary"><ShieldCheck className="h-4 w-4" /> Insured shipping</Badge>
              <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary"><Clock className="h-4 w-4" /> ETA {eta ? format(eta, 'PPP') : '—'}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Placed', value: format(new Date(order.created_at), 'PPP'), icon: Calendar },
              { label: 'Status', value: order.status.toUpperCase(), icon: Info },
              { label: 'Payment', value: order.payment_status.toUpperCase(), icon: Package },
              { label: 'Total', value: `₹${order.final_amount.toFixed(2)}`, icon: Receipt },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/70 px-4 py-3 shadow-sm">
                <span className="p-2 rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>
                <div className="leading-tight">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <MapPlaceholder status={order.status} />
          <Separator />

          <div>
            <h3 className="text-xl font-bold mb-6">Delivery Progress</h3>
            <div className="relative space-y-8">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
              {trackingSteps.map((step, index) => (
                <div key={step.status} className="flex items-start gap-4 pl-12 relative">
                  <div
                    className={cn(
                      'absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 shadow-sm',
                      index <= currentStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={cn('font-semibold', index <= currentStep ? 'text-foreground' : 'text-muted-foreground')}>
                      {step.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
