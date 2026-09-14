'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Star, Verified } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/translation-provider';
import { useAuthContext } from '@/context/auth-provider';
import { platformApi, usersApi, ApiTailor } from '@/lib/api';

const SewingPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16.5 3.5c-1.9 1.9-1.9 5.1 0 7l5 5-7 7-5-5c-1.9-1.9-5.1-1.9-7 0" />
    <path d="m15 8 7 7" />
  </svg>
);

export default function TailorProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('/placeholder.png');
  const [formData, setFormData] = useState({
    shopName: '',
    bio: '',
    specialization: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        shopName: `${user.first_name || 'Tailor'}'s Atelier`,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postal_code || '',
      }));
      if (user.profile_image_url) setAvatarPreview(user.profile_image_url);
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await usersApi.uploadProfilePicture(file);
      setAvatarPreview(res.url);
      toast({ title: 'Avatar Uploaded', description: 'Your profile picture has been updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const specs = formData.specialization
        ? formData.specialization.split(',').map((s) => s.trim()).filter(Boolean)
        : ['Custom Suits', 'Alterations'];

      await platformApi.updateMyTailorProfile({
        shop_name: formData.shopName,
        bio: formData.bio,
        specialization: specs,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        phone: formData.phone,
      });

      toast({ title: 'Profile Updated!', description: 'Your tailor atelier settings have been saved to PostgreSQL.' });
    } catch (error: any) {
      console.error('Tailor profile update error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start animate-fade-in-up">
      <Card className="w-full max-w-3xl shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 animate-text-rainbow">
            {t('Tailor Profile & Atelier Settings')}
          </CardTitle>
          <CardDescription>{t('This information is displayed to customers for custom sizing and alteration requests.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-md">
                  <AvatarImage src={avatarPreview} alt="Tailor Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {uploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin" /> : 'T'}
                  </AvatarFallback>
                </Avatar>
                <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                  <Camera className="h-4 w-4" />
                  <Input id="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                </Label>
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h3 className="text-xl font-bold flex items-center justify-center sm:justify-start gap-2">
                  {formData.shopName || 'Tailor Atelier'} <Verified className="h-5 w-5 text-blue-500" />
                </h3>
                <p className="text-muted-foreground">{user?.email || '—'}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                  <span className="text-muted-foreground text-sm ml-1">(Verified Master Tailor)</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">{t('Atelier / Shop Name')}</Label>
                <Input id="shopName" name="shopName" value={formData.shopName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('Contact Phone')}</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('Biography & Master Craftsman Details')}</Label>
              <Textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} placeholder="Decades of bespoke tailoring expertise in suits, formalwear, and ethnic fashion..." />
            </div>

            <Card className="bg-muted/30 border-muted/40">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <SewingPinIcon /> {t('Specialties & Atelier Location')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">{t('Specialties (comma-separated)')}</Label>
                  <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Suits, Tuxedos, Lehengas, Alterations" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t('City')}</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="Mumbai" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t('State')}</Label>
                    <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{t('Postal Code')}</Label>
                    <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="400001" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full mt-6 bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 text-white font-semibold shadow-md" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Update Tailor Profile')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
