-- =========================================================================
-- EXPENSE REIMBURSEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Paste this script into your Supabase Dashboard: SQL Editor -> Run
-- =========================================================================

-- 1. Create Claims Table
create table if not exists public.claims (
  id text primary key,
  expense_type text default 'fuel' check (expense_type in ('fuel', 'food')),
  employee_name text not null,
  employee_id text not null,
  employee_email text not null,
  date_from text not null,
  date_to text not null,
  travel_date text,
  home_location text,
  home_lat numeric,
  home_lng numeric,
  claimed_amount numeric not null default 0,
  location_summary text,
  status text default 'pending_surveillance',
  pending_reason text,
  
  -- Receipts & Stops
  receipt_url text,
  receipt_name text,
  receipts_json jsonb default '[]'::jsonb,
  stops_json jsonb default '[]'::jsonb,
  route_legs_json jsonb default '[]'::jsonb,
  automation_report_json jsonb,
  automation_run_at timestamptz,

  -- Surveillance Verification (Fuel Claims)
  surveillance_status text default 'pending',
  surveillance_notes text,
  surveillance_checked_by text,
  surveillance_checked_at timestamptz,

  -- Hotel Booking Verification (Food Claims)
  hotel_verification_status text default 'pending',
  hotel_notes text,
  hotel_checked_by text,
  hotel_checked_at timestamptz,
  night_stay_verified boolean default false,
  nights_count integer default 0,
  night_stay_location text,
  total_tip_deducted numeric default 0,
  eligible_food_amount numeric default 0,

  -- Fuel Weighted Average & Mileage Matrix
  total_distance_km numeric default 0,
  fuel_rate_km_per_liter numeric default 30.0,
  fuel_liters numeric default 0,
  petrol_rate_pkr numeric default 0,
  petrol_rate_date text,
  weighted_avg_fuel_rate numeric default 0,
  total_gallons_purchased numeric default 0,
  total_fuel_receipts_amount numeric default 0,

  -- Financial Ceilings & Admin Approvals
  calculated_amount numeric default 0,
  approved_amount numeric default 0,
  admin_comment_type text default 'policy_standard',
  admin_notes text,
  reviewed_at timestamptz,
  email_sent integer default 0,
  email_sent_at timestamptz,

  created_at timestamptz default now()
);

-- 2. Create Dynamic Company Settings Table
create table if not exists public.settings (
  key text primary key,
  value text not null,
  description text
);

-- Seed Default Settings
insert into public.settings (key, value, description)
values
  ('food_daily_cutoff_limit', '25.00', 'Daily maximum food allowance ceiling in USD'),
  ('mileage_km_per_gallon', '30.0', 'Fuel efficiency limit: 30 KM per 1 Gallon'),
  ('mileage_km_per_liter', '30.0', 'Legacy compatibility alias'),
  ('fuel_rate_mode', 'weighted_average', 'Fuel gas rate computed dynamically via receipt weighted average'),
  ('petrol_rate', '3.50', 'Fallback national benchmark rate per gallon'),
  ('currency', 'USD', 'Currency ISO Code'),
  ('currency_symbol', '$', 'Currency display symbol'),
  ('country', 'United States', 'Operating jurisdiction')
on conflict (key) do update 
set value = excluded.value;

-- 3. Create Emails Log Table
create table if not exists public.emails (
  id text primary key,
  claim_id text references public.claims(id) on delete set null,
  to_email text not null,
  subject text not null,
  body_html text not null,
  preview_url text,
  status text not null default 'sent',
  sent_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS) & Public Policies for App Access
alter table public.claims enable row level security;
alter table public.settings enable row level security;
alter table public.emails enable row level security;

-- Allow anon read & write for app operations
create policy "Allow public read access on claims" on public.claims for select using (true);
create policy "Allow public insert on claims" on public.claims for insert with check (true);
create policy "Allow public update on claims" on public.claims for update using (true);

create policy "Allow public read access on settings" on public.settings for select using (true);
create policy "Allow public upsert on settings" on public.settings for all using (true);

create policy "Allow public access on emails" on public.emails for all using (true);

-- 5. Storage Bucket for Receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "Allow public receipt viewing" on storage.objects for select using (bucket_id = 'receipts');
create policy "Allow public receipt uploads" on storage.objects for insert with check (bucket_id = 'receipts');
