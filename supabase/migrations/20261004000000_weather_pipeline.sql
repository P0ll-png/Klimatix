CREATE TABLE IF NOT EXISTS public.weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lgu_id integer NOT NULL REFERENCES public.lgus(id),
  source text NOT NULL DEFAULT 'openmeteo',
  observed_at timestamptz NOT NULL,
  rainfall_mm numeric,
  rainfall_intensity text,
  tcws_signal smallint,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_observations
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS lgu_id integer REFERENCES public.lgus(id),
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'openmeteo',
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rainfall_mm numeric,
  ADD COLUMN IF NOT EXISTS rainfall_intensity text,
  ADD COLUMN IF NOT EXISTS tcws_signal smallint,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_weather_lgu_time
  ON public.weather_observations (lgu_id, observed_at DESC);

ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE public.weather_observations TO service_role;

ALTER TABLE public.alerto_advisories
  ADD COLUMN IF NOT EXISTS pipeline_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_alerto_pipeline_lgu_time
  ON public.alerto_advisories (lgu_id, pipeline_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lgu_scorecards_period_lgu
  ON public.lgu_scorecards (period_start DESC, lgu_id);

GRANT SELECT ON TABLE public.lgus, public.flood_reports TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.alerto_advisories TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lgu_scorecards TO service_role;
