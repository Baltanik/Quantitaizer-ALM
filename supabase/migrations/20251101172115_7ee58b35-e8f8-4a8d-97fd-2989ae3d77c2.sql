-- Fed Data Table
CREATE TABLE public.fed_data (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  sofr DECIMAL(10, 5),
  iorb DECIMAL(10, 5),
  sofr_iorb_spread DECIMAL(10, 5),
  walcl DECIMAL(15, 2),
  wresbal DECIMAL(15, 2),
  rrpontsyd DECIMAL(15, 2),
  rpontsyd DECIMAL(15, 2),
  rponttld DECIMAL(15, 2),
  dtb3 DECIMAL(10, 5),
  dtb1yr DECIMAL(10, 5),
  us10y DECIMAL(10, 5),
  scenario VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bitcoin Data Table
CREATE TABLE public.bitcoin_data (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  price DECIMAL(15, 2),
  volume DECIMAL(20, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signals Table
CREATE TABLE public.signals (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  signal_type VARCHAR(50),
  description TEXT,
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fed_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitcoin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Public read policies (dashboard is public)
CREATE POLICY "Allow public read access to fed_data"
  ON public.fed_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to bitcoin_data"
  ON public.bitcoin_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to signals"
  ON public.signals FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_fed_data_date ON public.fed_data(date DESC);
CREATE INDEX idx_bitcoin_data_date ON public.bitcoin_data(date DESC);
CREATE INDEX idx_signals_date ON public.signals(date DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fed_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bitcoin_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fed_data
CREATE TRIGGER update_fed_data_updated_at
  BEFORE UPDATE ON public.fed_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();