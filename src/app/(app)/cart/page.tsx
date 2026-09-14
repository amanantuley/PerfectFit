'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Loader2, Trash2, CalendarDays, Edit, Zap, MapPin, Tag, ShieldCheck, Check } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/context/subscription-provider';
import { Badge } from '@/components/ui/badge';
import { addDays, format } from 'date-fns';
import { useApp, CartItem } from '@/context/app-context';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi, ordersApi, paymentsApi, platformApi, ApiProduct, ApiTailor } from '@/lib/api';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const EXPRESS_DELIVERY_FEE = 250;
const VALID_COUPON = 'PERFECT10';
const COUPON_DISCOUNT_PERCENTAGE = 10;

export default function CartPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { cart, removeFromCart, clearCart, updateCartItem, cartLoading } = useApp();
  const { activePlan, discount: subscriptionDiscount } = useSubscription();

  const [productMap, setProductMap] = useState<Record<string, ApiProduct>>({});
  const [tailors, setTailors] = useState<ApiTailor[]>([]);
  const [selectedTailor, setSelectedTailor] = useState<string>('');
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>('standard');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address state
  const [address, setAddress] = useState(user?.address || '123 Fashion Ave');
  const [city, setCity] = useState(user?.city || 'Mumbai');
  const [state, setState] = useState(user?.state || 'Maharashtra');
  const [postalCode, setPostalCode] = useState(user?.postal_code || '400001');

  // Customization dialog state
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [customNote, setCustomNote] = useState('');

  // Fetch product details for items in cart
  const loadProductDetails = useCallback(async () => {
    const missingProductIds = cart.map(i => i.product_id).filter(id => !productMap[id]);
    if (missingProductIds.length === 0) return;

    const newMap = { ...productMap };
    for (const pid of Array.from(new Set(missingProductIds))) {
      try {
        const prod = await productsApi.get(pid);
        newMap[pid] = prod;
      } catch (e) {
        console.error('Failed to fetch product', pid, e);
      }
    }
    setProductMap(newMap);
  }, [cart, productMap]);

  // Fetch tailors
  const loadTailors = useCallback(async () => {
    try {
      const data = await platformApi.listTailors();
      setTailors(data);
      if (data.length > 0) setSelectedTailor(data[0].id);
    } catch (e) {
      console.error('Failed to load tailors', e);
    }
  }, []);

  useEffect(() => {
    loadProductDetails();
  }, [cart, loadProductDetails]);

  useEffect(() => {
    loadTailors();
  }, [loadTailors]);

  // Calculate pricing from DB products
  const subtotal = cart.reduce((acc, item) => {
    const prod = productMap[item.product_id];
    if (!prod) return acc;
    const price = item.purchase_type === 'rent' ? (prod.rent_price || prod.price) : prod.price;
    return acc + price * item.quantity;
  }, 0);

  const subscriptionDiscountAmount = (subtotal * subscriptionDiscount) / 100;
  const couponDiscountAmount = (subtotal * couponDiscount) / 100;
  const totalDiscount = subscriptionDiscountAmount + couponDiscountAmount;
  const deliveryFee = deliveryOption === 'express' ? EXPRESS_DELIVERY_FEE : 0;
  const finalPrice = Math.max(0, subtotal - totalDiscount + deliveryFee);

  const standardDeliveryDate = format(addDays(new Date(), 10), 'PPP');
  const expressDeliveryDate = format(addDays(new Date(), 5), 'PPP');
  const estimatedDeliveryDate = deliveryOption === 'standard' ? standardDeliveryDate : expressDeliveryDate;

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === VALID_COUPON) {
      setCouponDiscount(COUPON_DISCOUNT_PERCENTAGE);
      toast({ title: 'Coupon Applied!', description: `You've received a ${COUPON_DISCOUNT_PERCENTAGE}% discount.` });
    } else {
      setCouponDiscount(0);
      toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'The coupon code you entered is not valid.' });
    }
  };

  const handleOpenCustomize = (item: CartItem) => {
    setActiveItem(item);
    setCustomNote(item.customization_notes || '');
    setIsCustomizeOpen(true);
  };

  const handleSaveCustomization = async () => {
    if (!activeItem) return;
    try {
      await updateCartItem(activeItem.id, { customization_notes: customNote });
      setIsCustomizeOpen(false);
      toast({ title: 'Customization Saved', description: 'Your preferences have been updated.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save customization.' });
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      // Step 1: Create Order in PostgreSQL
      const order = await ordersApi.create({
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_type: item.purchase_type,
          size: item.size || undefined,
          color: item.color || undefined,
          customization_details: item.customization_notes ? { notes: item.customization_notes } : undefined,
        })),
        shipping_address: {
          address,
          city,
          state,
          postal_code: postalCode,
          country: 'India',
        },
      });

      // Step 2: Create Razorpay Order
      const rzpOrder = await paymentsApi.createRazorpayOrder({
        order_id: order.id,
        payment_method: 'razorpay',
      });

      // Step 3: Open Razorpay Checkout widget
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: rzpOrder.key_id,
          amount: Math.round(rzpOrder.amount * 100),
          currency: rzpOrder.currency || 'INR',
          name: 'PerfectFit',
          description: `Order #${order.id.slice(0, 8)}`,
          order_id: rzpOrder.razorpay_order_id,
          handler: async (response: any) => {
            try {
              // Verify payment on backend
              await paymentsApi.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              await clearCart();
              toast({ title: 'Payment Successful!', description: 'Your order has been confirmed and is now being processed.' });
              router.push('/orders');
            } catch (err: any) {
              console.error(err);
              toast({ variant: 'destructive', title: 'Payment Verification Failed', description: err.message || 'Verification error' });
            }
          },
          prefill: {
            email: user?.email || '',
          },
          theme: {
            color: '#8B5CF6',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback: If Razorpay script hasn't loaded, verify direct test order
        toast({ title: 'Order Placed', description: 'Your order is pending payment.' });
        await clearCart();
        router.push('/orders');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({ variant: 'destructive', title: 'Checkout Failed', description: err.message || 'Unable to complete order' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {cart.length === 0 ? (
        <Card className="shadow-lg text-center py-20 border-white/10">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Your Cart is Empty</CardTitle>
            <CardDescription className="text-lg">Looks like you haven't added anything to your cart yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/store">Browse Store Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">
                  <ShoppingCart className="h-8 w-8 text-purple-400" />
                  Your Shopping Cart
                </CardTitle>
                <CardDescription>
                  Review and customize your items before purchase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => {
                  const prod = productMap[item.product_id];
                  const itemPrice = prod ? (item.purchase_type === 'rent' ? (prod.rent_price || prod.price) : prod.price) : 0;
                  return (
                    <div key={item.id} className="flex items-start gap-4 border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                      <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted/20 flex-shrink-0">
                        <Image
                          src={prod?.image_url || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400'}
                          alt={prod?.name || 'Garment'}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">{prod?.name || 'Garment Item'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={item.purchase_type === 'buy' ? 'default' : 'secondary'} className="capitalize">
                            {item.purchase_type}
                          </Badge>
                          {item.size && <span className="text-xs text-muted-foreground">Size: {item.size}</span>}
                          {item.color && <span className="text-xs text-muted-foreground">Color: {item.color}</span>}
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                        </div>
                        {item.customization_notes && (
                          <p className="text-xs text-purple-400 italic mt-1 line-clamp-1">Customization: {item.customization_notes}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-xl font-bold">₹{(itemPrice * item.quantity).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenCustomize(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card className="shadow-lg border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" /> Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="address">Street Address</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} onChange={e => setState(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} required />
                </div>
              </CardContent>
            </Card>

            {/* Tailor Selection */}
            {tailors.length > 0 && (
              <Card className="shadow-lg border-white/10">
                <CardHeader>
                  <CardTitle>Assigned Master Tailor</CardTitle>
                  <CardDescription>Selected tailor for precision alterations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <RadioGroup value={selectedTailor} onValueChange={setSelectedTailor}>
                    {tailors.map(t => (
                      <Label key={t.id} htmlFor={t.id} className={cn("flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all", selectedTailor === t.id ? "border-purple-500 bg-purple-500/10" : "hover:bg-muted/40")}>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <div>
                            <p className="font-bold text-sm">{t.shop_name}</p>
                            <p className="text-xs text-muted-foreground">{t.city || 'Local Atelier'} • Rating: {t.rating} ★</p>
                          </div>
                        </div>
                        <RadioGroupItem value={t.id} id={t.id} />
                      </Label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1 space-y-8 sticky top-24">
            <Card className="shadow-lg border-white/10">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon">Have a coupon?</Label>
                  <div className="flex gap-2">
                    <Input id="coupon" placeholder="Enter coupon (e.g. PERFECT10)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                    <Button type="button" variant="secondary" onClick={handleApplyCoupon}>Apply</Button>
                  </div>
                </div>
                <Separator />
                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {activePlan && (
                    <div className="flex justify-between items-center text-purple-400 font-medium">
                      <span>{activePlan} Discount ({subscriptionDiscount}%)</span>
                      <span>-₹{subscriptionDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400 font-medium">
                      <span className="flex items-center gap-1"><Tag className="h-4 w-4"/>Coupon ({couponDiscount}%)</span>
                      <span>-₹{couponDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'Free'}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center font-bold text-xl">
                    <span>Total</span>
                    <span>₹{finalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <Separator className="my-2"/>
                <RadioGroup defaultValue="standard" value={deliveryOption} onValueChange={(value) => setDeliveryOption(value as 'standard' | 'express')}>
                  <Label htmlFor="standard-delivery" className={cn("flex justify-between items-center p-3 rounded-xl border cursor-pointer", deliveryOption === 'standard' && "border-purple-500 bg-purple-500/10")}>
                    <div>
                      <p className="font-semibold text-sm">Standard Delivery</p>
                      <p className="text-xs text-muted-foreground">Est. {standardDeliveryDate}</p>
                    </div>
                    <p className="font-semibold text-xs">Free</p>
                    <RadioGroupItem value="standard" id="standard-delivery" className="sr-only"/>
                  </Label>
                  <Label htmlFor="express-delivery" className={cn("flex justify-between items-center p-3 rounded-xl border cursor-pointer", deliveryOption === 'express' && "border-purple-500 bg-purple-500/10")}>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-400" />
                      <div>
                        <p className="font-semibold text-sm">Express Delivery</p>
                        <p className="text-xs text-muted-foreground">Est. {expressDeliveryDate}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-xs">₹{EXPRESS_DELIVERY_FEE.toFixed(2)}</p>
                    <RadioGroupItem value="express" id="express-delivery" className="sr-only"/>
                  </Label>
                </RadioGroup>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <CalendarDays className="h-4 w-4"/>
                  <span>Estimated Delivery: {estimatedDeliveryDate}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full py-6 text-base font-bold bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-lg" size="lg" disabled={isSubmitting} onClick={handleCheckout}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Order...</>
                  ) : (
                    'Proceed to Razorpay Payment'
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>256-Bit SSL Encrypted Razorpay Test Checkout</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Fit Preferences</DialogTitle>
            <DialogDescription>Add tailored instructions or notes for this garment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cust-note">Customization Notes</Label>
              <Textarea
                id="cust-note"
                placeholder="e.g. Slim fit waist, adjust sleeve length by -1 inch, mother-of-pearl buttons"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCustomizeOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomization}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
