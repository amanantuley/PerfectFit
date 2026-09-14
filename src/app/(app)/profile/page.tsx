'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Loader2, Camera, Trash2, User, MapPin, Mail, ShieldCheck, Activity, Calendar, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/auth-provider';
import { usersApi, apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, refreshUser, logout } = useAuthContext();

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setStreet(user.address || '');
      setCity(user.city || '');
      setState(user.state || '');
      setZip(user.postal_code || '');
      setAvatarPreview(user.profile_image_url || '');
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await usersApi.uploadProfilePicture(file);
      setAvatarPreview(res.url);
      await refreshUser();
      toast({
        title: 'Profile Picture Updated',
        description: 'Your avatar has been successfully updated.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'Failed to upload profile picture.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updateMe({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        address: street,
        city: city,
        state: state,
        postal_code: zip,
      });
      await refreshUser();
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved successfully.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiFetch('/users/me', { method: 'DELETE' });
      toast({
        title: 'Account Deleted',
        description: 'Your account has been deleted successfully.',
      });
      await logout();
      router.push('/');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Account',
        description: err.message || 'Failed to delete account.',
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-muted/40 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 sm:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
        <div className="relative space-y-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">Profile Management</h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">Manage your personal information, shipping addresses, and account preferences.</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">🔒 Secure & Encrypted</span>
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">✅ Database Backed</span>
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">📧 Email Verified</span>
          </div>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Profile Info */}
        <Card className="lg:col-span-2 shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">Account Information</CardTitle>
            <CardDescription>Update your personal details and contact information</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              {/* Avatar + Basic Info */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-lg bg-muted/20 border border-muted/30">
                <div className="relative group">
                  <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-xl transition-transform group-hover:scale-105">
                    <AvatarImage src={avatarPreview} alt="User Avatar" />
                    <AvatarFallback className="bg-primary/10">
                      {uploadingAvatar ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      ) : (
                        <User className="h-12 w-12 text-primary" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2.5 cursor-pointer hover:bg-primary/90 shadow-lg transition-all hover:scale-110"
                  >
                    <Camera className="h-4 w-4" />
                    <Input
                      id="avatar-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                  </Label>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-semibold">
                        <User className="h-4 w-4 text-primary" />
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="border-muted/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-semibold">
                        <User className="h-4 w-4 text-primary" />
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="border-muted/50 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="cursor-not-allowed bg-muted/40 border-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold">
                        <Phone className="h-4 w-4 text-primary" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="border-muted/50 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Shipping Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street" className="text-sm font-medium">Street Address</Label>
                    <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Fashion Ave" className="border-muted/50 focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className="border-muted/50 focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">State</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" className="border-muted/50 focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-sm font-medium">Postal Code</Label>
                    <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="400001" className="border-muted/50 focus:border-primary" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right - Quick Stats & Info */}
        <div className="space-y-6">
          <Card className="shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Verified Account</p>
                  <p className="text-xs text-muted-foreground">{user?.role || 'Customer'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <Activity className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Active</p>
                  <p className="text-xs text-muted-foreground">Session: Authenticated</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Member Since</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-lg border-destructive/50 bg-destructive/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deleting your account is permanent and cannot be undone. All your data will be removed.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full shadow-md">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="border-t border-muted/40 py-6 px-6 sm:px-8 bg-gradient-to-r from-primary/5 via-background to-primary/5 rounded-lg">
        <div className="max-w-4xl space-y-3">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p><strong>Privacy Protected:</strong> Your personal information is encrypted and stored securely in PostgreSQL.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
