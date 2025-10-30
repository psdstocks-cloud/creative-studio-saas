-- ============================================
-- QUICK SETUP: Stock Sources
-- Copy this entire file and run it in Supabase SQL Editor
-- This will create tables and seed data for the stock sources feature
-- ============================================

-- Create stock_sources table
CREATE TABLE IF NOT EXISTS public.stock_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  cost          DECIMAL(10, 2),
  icon          TEXT,
  icon_url      TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_sources_key ON public.stock_sources(key);
CREATE INDEX IF NOT EXISTS idx_stock_sources_active ON public.stock_sources(active);

-- Enable RLS
ALTER TABLE public.stock_sources ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active stock sources
DROP POLICY IF EXISTS "Anyone can view active stock sources" ON public.stock_sources;
CREATE POLICY "Anyone can view active stock sources"
  ON public.stock_sources FOR SELECT USING (true);

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.stock_source_audit (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_source_key   TEXT NOT NULL,
  action             TEXT NOT NULL,
  old_value          TEXT,
  new_value          TEXT,
  changed_by         UUID REFERENCES auth.users(id),
  changed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_stock_source_audit_key ON public.stock_source_audit(stock_source_key);
CREATE INDEX IF NOT EXISTS idx_stock_source_audit_changed_at ON public.stock_source_audit(changed_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.stock_source_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view audit logs
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.stock_source_audit;
CREATE POLICY "Authenticated users can view audit logs"
  ON public.stock_source_audit FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed stock sources data
INSERT INTO public.stock_sources (key, name, cost, icon, icon_url, active) VALUES
  ('adobestock', 'adobestock', 0.40, 'adobestock.png', 'https://nehtw.com/assets/icons/adobestock.png', true),
  ('pixelbuddha', 'pixelbuddha', 0.60, 'pixelbuddha.png', 'https://nehtw.com/assets/icons/pixelbuddha.png', true),
  ('iconscout', 'iconscout', 0.20, 'iconscout.png', 'https://nehtw.com/assets/icons/iconscout.png', true),
  ('mockupcloud', 'mockupcloud', 1.00, 'mockupcloud.png', 'https://nehtw.com/assets/icons/mockupcloud.png', true),
  ('ui8', 'ui8', 3.00, 'ui8.png', 'https://nehtw.com/assets/icons/ui8.png', true),
  ('pixeden', 'pixeden', 0.60, 'pixeden.png', 'https://nehtw.com/assets/icons/pixeden.png', true),
  ('creativefabrica', 'creativefabrica', 0.50, 'creativefabrica.png', 'https://nehtw.com/assets/icons/creativefabrica.png', true),
  ('envato', 'envato', 0.50, 'envato.png', 'https://nehtw.com/assets/icons/envato.png', true),
  ('vectorstock', 'vectorstock', 1.00, 'vectorstock.png', 'https://nehtw.com/assets/icons/vectorstock.png', true),
  ('vshutter4k', 'SS video 4K', 17.00, 'vshutter4k.png', 'https://nehtw.com/assets/icons/vshutter4k.png', true),
  ('vshutter', 'SS video HD', 8.00, 'vshutter.png', 'https://nehtw.com/assets/icons/vshutter.png', true),
  ('dreamstime', 'dreamstime', 0.65, 'dreamstime.png', 'https://nehtw.com/assets/icons/dreamstime.png', true),
  ('istockphoto_video_fullhd', 'istock video hd', 25.00, 'istockphoto_video_fullhd.png', 'https://nehtw.com/assets/icons/istockphoto_video_fullhd.png', true),
  ('designi', 'designi', 0.80, 'designi.png', 'https://nehtw.com/assets/icons/designi.png', true),
  ('istockphoto', 'istockphoto', 0.80, 'istockphoto.png', 'https://nehtw.com/assets/icons/istockphoto.png', true),
  ('storyblocks', 'storyblocks', 1.00, 'storyblocks.png', 'https://nehtw.com/assets/icons/storyblocks.png', true),
  ('123rf', '123rf', 0.65, '123rf.png', 'https://nehtw.com/assets/icons/123rf.png', true),
  ('vecteezy', 'vecteezy', 0.30, 'vecteezy.png', 'https://nehtw.com/assets/icons/vecteezy.png', true),
  ('rawpixel', 'rawpixel', 0.30, 'rawpixel.png', 'https://nehtw.com/assets/icons/rawpixel.png', true),
  ('uihut', 'uihut', NULL, 'uihut.png', 'https://nehtw.com/assets/icons/uihut.png', false),
  ('vfreepik', 'Freepik video', 1.00, 'vfreepik.png', 'https://nehtw.com/assets/icons/vfreepik.png', true),
  ('mshutter', 'SS music', 1.00, 'mshutter.png', 'https://nehtw.com/assets/icons/mshutter.png', true),
  ('freepik', 'freepik', 0.20, 'freepik.png', 'https://nehtw.com/assets/icons/freepik.png', true),
  ('adobestock_v4k', 'Adobestock video', 4.50, 'adobestock_v4k.png', 'https://nehtw.com/assets/icons/adobestock_v4k.png', true),
  ('flaticon', 'flaticon', 0.20, 'flaticon.png', 'https://nehtw.com/assets/icons/flaticon.png', true),
  ('craftwork', 'craftwork', 2.00, 'craftwork.png', 'https://nehtw.com/assets/icons/craftwork.png', true),
  ('alamy', 'alamy', 16.00, 'alamy.png', 'https://nehtw.com/assets/icons/alamy.png', true),
  ('motionarray', 'motionarray', 0.25, 'motionarray.png', 'https://nehtw.com/assets/icons/motionarray.png', true),
  ('soundstripe', 'soundstripe', 0.30, 'soundstripe.png', 'https://nehtw.com/assets/icons/soundstripe.png', true),
  ('yellowimages', 'yellowimages', 12.00, 'yellowimages.png', 'https://nehtw.com/assets/icons/yellowimages.png', true),
  ('shutterstock', 'shutterstock', 0.50, 'shutterstock.png', 'https://nehtw.com/assets/icons/shutterstock.png', true),
  ('depositphotos', 'depositphotos', 0.60, 'depositphotos.png', 'https://nehtw.com/assets/icons/depositphotos.png', true),
  ('artlist_sound', 'artlist music/sfx', 0.40, 'artlist_sound.png', 'https://nehtw.com/assets/icons/artlist_sound.png', true),
  ('epidemicsound', 'epidemicsound', 0.30, 'epidemicsound.png', 'https://nehtw.com/assets/icons/epidemicsound.png', true),
  ('artgrid_hd', 'artgrid_HD', 0.80, 'artgrid_HD.png', 'https://nehtw.com/assets/icons/artgrid_HD.png', true),
  ('motionelements', 'motionelements', 0.50, 'motionelements.png', 'https://nehtw.com/assets/icons/motionelements.png', true),
  ('deeezy', 'deeezy', 0.50, 'deeezy.png', 'https://nehtw.com/assets/icons/deeezy.png', true),
  ('artlist_footage', 'artlist video/template', 1.00, 'artlist_footage.png', 'https://nehtw.com/assets/icons/artlist_footage.png', true),
  ('pixelsquid', 'pixelsquid', 0.80, 'pixelsquid.png', 'https://nehtw.com/assets/icons/pixelsquid.png', true),
  ('footagecrate', 'footagecrate', 1.00, 'footagecrate.png', 'https://nehtw.com/assets/icons/footagecrate.png', true)
ON CONFLICT (key) DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS stock_sources_updated_at_trigger ON public.stock_sources;
CREATE TRIGGER stock_sources_updated_at_trigger
  BEFORE UPDATE ON public.stock_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_sources_updated_at();

-- Verify setup
SELECT 
  'Stock Sources Setup Complete!' as message,
  COUNT(*) as total_sources,
  SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active_sources
FROM public.stock_sources;

