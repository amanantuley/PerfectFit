'use server';

import { z } from 'zod';

export async function sendSupportMessage(_: any, formData: FormData) {
  const schema = z.object({
    message: z.string().min(10, { message: 'Message must be at least 10 characters long.' }),
  });

  const parsed = schema.safeParse({
    message: formData.get('message'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  return { success: true, message: 'Your message has been sent to the support team!' };
}
