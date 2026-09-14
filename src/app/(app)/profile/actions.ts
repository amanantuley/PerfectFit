'use server';

import { z } from 'zod';

export async function submitProfile(prevState: any, formData: FormData) {
  const schema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  });

  const parsed = schema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });

  if (!parsed.success) {
    return { message: 'Invalid data', error: true };
  }

  return { message: 'Profile updated successfully!', error: false };
}

export async function deleteAccount() {
  return { message: 'Your account has been deleted successfully.', error: false };
}
