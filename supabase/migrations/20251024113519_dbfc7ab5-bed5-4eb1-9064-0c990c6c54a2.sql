-- Add GPS coordinates column to customers table
ALTER TABLE public.customers 
ADD COLUMN gps_latitude numeric,
ADD COLUMN gps_longitude numeric,
ADD COLUMN gps_last_updated timestamp with time zone;