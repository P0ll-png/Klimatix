ALTER TABLE public.flood_reports
  ADD COLUMN IF NOT EXISTS reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.flood_report_upvotes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS flood_report_upvotes_report_user_unique
  ON public.flood_report_upvotes (report_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.flood_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flood_report_upvotes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.klimatix_verified_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND (email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL)
      AND (banned_until IS NULL OR banned_until < pg_catalog.now())
  );
$$;

REVOKE ALL ON FUNCTION public.klimatix_verified_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.klimatix_verified_user() TO authenticated;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('flood_reports', 'flood_report_upvotes')
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS "Public can read flood reports" ON public.flood_reports;
CREATE POLICY "Public can read flood reports"
  ON public.flood_reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Verified users can submit own reports" ON public.flood_reports;
CREATE POLICY "Verified users can submit own reports"
  ON public.flood_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (public.klimatix_verified_user() AND auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Verified users can vote as themselves" ON public.flood_report_upvotes;
CREATE POLICY "Verified users can vote as themselves"
  ON public.flood_report_upvotes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.klimatix_verified_user() AND auth.uid() = user_id);

REVOKE INSERT ON TABLE public.flood_reports FROM anon, authenticated, PUBLIC;
REVOKE INSERT (id, lat, lng, severity, description, photo_url, confidence_score, status, upvote_count, origin, handle, created_at, source, reporter_hash, reporter_id)
  ON TABLE public.flood_reports FROM anon, authenticated, PUBLIC;
GRANT INSERT (lat, lng, severity, description, photo_url, source, reporter_hash, reporter_id)
  ON TABLE public.flood_reports TO authenticated;
GRANT SELECT ON TABLE public.flood_reports TO anon, authenticated;

REVOKE INSERT ON TABLE public.flood_report_upvotes FROM anon, authenticated, PUBLIC;
REVOKE INSERT (id, report_id, voter_token, user_id, created_at)
  ON TABLE public.flood_report_upvotes FROM anon, authenticated, PUBLIC;
GRANT INSERT (report_id, voter_token, user_id)
  ON TABLE public.flood_report_upvotes TO authenticated;
