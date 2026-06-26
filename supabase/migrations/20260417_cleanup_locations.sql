-- Migration to cleanup old location table
-- Run this only after confirming all systems are using tracking_logs

DROP TABLE IF EXISTS public.resource_locations CASCADE;
