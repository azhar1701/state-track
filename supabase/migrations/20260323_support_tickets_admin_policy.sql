-- Migration: Standardize Admin RLS and Add Admin Notes for Support Tickets
-- Date: 2026-03-23
-- Purpose: Enable administrators to view and manage all support tickets, and add admin resolution notes
-- File: 20260323_support_tickets_admin_policy.sql

BEGIN;

-- 1. Add admin_notes column if not exists
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS admin_notes text;

-- 2. Drop existing restrictive policies on support_tickets
DROP POLICY IF EXISTS "st_read" ON public.support_tickets;
DROP POLICY IF EXISTS "st_update" ON public.support_tickets;
DROP POLICY IF EXISTS "admin_read_all_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "admin_update_support_tickets" ON public.support_tickets;

-- 3. Recreate policies with admin override using public.is_admin()
CREATE POLICY "admin_read_all_support_tickets" ON public.support_tickets
  FOR SELECT
  USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "admin_update_support_tickets" ON public.support_tickets
  FOR UPDATE
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Keep insert policy standard for authenticated users
DROP POLICY IF EXISTS "st_insert" ON public.support_tickets;
CREATE POLICY "st_insert" ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;
