import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("Must be a valid Supabase URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "Supabase anon key is required"),
  VITE_ADMIN_EMAIL: z.string().email("Must be a valid email for admin access").optional(),
  VITE_ADMIN_EMAILS: z.string().optional(),
  VITE_MAPBOX_TOKEN: z.string().optional(),
  // Include any other expected variables here
});

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL,
  VITE_ADMIN_EMAILS: import.meta.env.VITE_ADMIN_EMAILS,
  VITE_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
});
