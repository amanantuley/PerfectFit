'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileText, Calendar, Tag, CheckCircle, XCircle, RefreshCw, Truck, Undo, Package, MessageCircle, Send, Loader2, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useApp, Order } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { platformApi } from '@/lib/api';

const returnReasons = [
  "Size was too small",
  "Size was too large",
  "Didn't match description",
  "Arrived damaged",
  "Changed my mind",
];

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'processing':
      return { variant: 'secondary' as const, icon: RefreshCw, text: 'Processing' };
    case 'shipped':
      return { variant: 'secondary' as const, icon: Truck, text: 'Shipped' };
    case 'delivered':
      return { variant: 'default' as const, icon: CheckCircle, text: 'Delivered' };
    case 'returned':
      return { variant: 'outline' as const, icon: Undo, text: 'Returned' };
    case 'cancelled':
    case 'canceled':
      return { variant: 'destructive' as const, icon: XCircle, text: 'Cancelled' };
    default:
      return { variant: 'outline' as const, icon: Package, text: status };
  }
};

export default function OrdersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { orders, ordersLoading, fetchOrders, updateOrderStatus } = useApp();
  
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleOpenMessageDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsMessageOpen(true);
  };

  const handleOpenReturnDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsReturnOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const formData = new FormData(e.currentTarget);
    const reason = formData.get('returnReason') as string;

    if (!reason) {
      toast({
        variant: 'destructive',
        title: 'No Reason Selected',
        description: 'Please select a reason for the return.',
      });
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await platformApi.createReturn({
        order_id: selectedOrder.id,
        reason,
      });

      updateOrderStatus(selectedOrder.id, 'returned');
      await fetchOrders();

      setIsReturnOpen(false);
      toast({
        title: 'Return Requested',
        description: `Your request to return Order #${selectedOrder.id.slice(0, 8)} has been submitted.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Return Error', description: err.message || 'Failed to submit return request' });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg animate-fade-in-up border-white/10">
        <CardHeader>
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">My Orders</CardTitle>
          <CardDescription>View and track your database-backed orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <Package className="h-12 w-12 mx-auto opacity-40" />
              <p className="text-lg font-semibold text-foreground">No orders yet</p>
              <p className="text-sm">Place an order from the store catalog to see it here.</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const itemQuantity = order.items ? order.items.reduce((a, b) => a + b.quantity, 0) : 0;
                  return (
                    <Card key={order.id} className="overflow-hidden transition-all hover:shadow-md hover:bg-muted/50 border-white/10">
                      <CardContent className="p-4 flex gap-4">
                        <div className="flex-1 space-y-2">
                          <p className="font-bold">Order #{order.id.slice(0, 8)}</p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1.5"/>
                            <p>{order.items?.length || 0} items ({itemQuantity} pcs)</p>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 mr-1.5" />
                            <p>₹{order.final_amount.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1.5"/>
                            <p>{format(new Date(order.created_at), 'PPP')}</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="px-4 pb-3 flex flex-col gap-2">
                        <Badge variant={statusConfig.variant} className="w-full justify-center py-2">
                          <statusConfig.icon className="h-4 w-4 mr-2" />
                          {statusConfig.text}
                        </Badge>
                        {order.status === 'shipped' && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/track/${order.id}`)}>
                            <MapPin className="mr-2 h-4 w-4" />
                            Track Order
                          </Button>
                        )}
                        {order.status === 'delivered' && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenReturnDialog(order)}>
                            <Undo className="mr-2 h-4 w-4" />
                            Request Return
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenMessageDialog(order)}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message Support
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block rounded-md border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);
                      return (
                        <TableRow key={order.id} className="transition-colors hover:bg-muted/50">
                          <TableCell className="font-mono text-xs font-semibold">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.items?.length || 0} items
                          </TableCell>
                          <TableCell className="font-bold">
                            ₹{order.final_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className="gap-1.5">
                              <statusConfig.icon className="h-3.5 w-3.5" />
                              {statusConfig.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {order.status === 'shipped' && (
                              <Button variant="outline" size="sm" onClick={() => router.push(`/track/${order.id}`)}>
                                <MapPin className="mr-2 h-4 w-4" />
                                Track
                              </Button>
                            )}
                            {order.status === 'delivered' && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenReturnDialog(order)}>
                                <Undo className="mr-2 h-4 w-4" />
                                Return
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleOpenMessageDialog(order)}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogContent className="h-[28rem] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Message Atelier Support</DialogTitle>
            <DialogDescription>Order ID: {selectedOrder?.id}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 text-sm">
              <div className="bg-muted p-3 rounded-lg max-w-sm">
                <p className="font-bold text-xs mb-1">Master Tailor</p>
                <p>Hello! Your order #{selectedOrder?.id.slice(0, 8)} is registered. Let us know if you have specific sizing preferences.</p>
              </div>
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background">
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); toast({ title: 'Message Sent' }); setIsMessageOpen(false); }}>
              <Input placeholder="Type your message..." className="flex-1" />
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Request Dialog */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Return</DialogTitle>
            <DialogDescription>
              Select a reason to return Order #{selectedOrder?.id.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="py-4 space-y-4">
            <RadioGroup name="returnReason" className="space-y-2">
              {returnReasons.map(reason => (
                <Label key={reason} htmlFor={reason} className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-border/40 hover:bg-muted/40">
                  <RadioGroupItem value={reason} id={reason} />
                  <span className="text-sm">{reason}</span>
                </Label>
              ))}
            </RadioGroup>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsReturnOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingReturn}>
                {isSubmittingReturn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Return
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
