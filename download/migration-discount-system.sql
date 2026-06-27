-- =============================================
-- Migration: Discount System for POS
-- Date: 2026-06-28
-- Description: Adds item-level discount support and
--   bill-level discount reason tracking to sales
-- =============================================

-- Add discountType and discountReason to Sale table
ALTER TABLE "Sale" ADD COLUMN "discountType" TEXT;
ALTER TABLE "Sale" ADD COLUMN "discountReason" TEXT;

-- Add discountType to SaleItem table (discount column already exists)
ALTER TABLE "SaleItem" ADD COLUMN "discountType" TEXT DEFAULT 'percentage';