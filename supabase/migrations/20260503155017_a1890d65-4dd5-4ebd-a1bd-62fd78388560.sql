INSERT INTO storage.buckets (id, name, public) VALUES ('investment-slips', 'investment-slips', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read investment slips" ON storage.objects FOR SELECT USING (bucket_id = 'investment-slips');
CREATE POLICY "Auth upload investment slips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'investment-slips' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth update investment slips" ON storage.objects FOR UPDATE USING (bucket_id = 'investment-slips' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete investment slips" ON storage.objects FOR DELETE USING (bucket_id = 'investment-slips' AND auth.uid() IS NOT NULL);