import { z } from 'zod';

export const uploadFileSchema = z.object({
  entityType: z.string().max(50).default('general'),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
