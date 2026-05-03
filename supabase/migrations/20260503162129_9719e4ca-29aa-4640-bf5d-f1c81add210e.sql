INSERT INTO storage.buckets (id, name, public) VALUES ('investor-photos', 'investor-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read investor photos" ON storage.objects FOR SELECT USING (bucket_id = 'investor-photos');
CREATE POLICY "Auth upload investor photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'investor-photos');
CREATE POLICY "Auth update investor photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'investor-photos');
CREATE POLICY "Auth delete investor photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'investor-photos');