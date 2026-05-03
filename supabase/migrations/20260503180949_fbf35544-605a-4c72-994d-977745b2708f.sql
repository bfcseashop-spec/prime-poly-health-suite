CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_type TEXT NOT NULL DEFAULT 'deposit',
  bank_name TEXT NOT NULL,
  account_number TEXT,
  amount_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference_no TEXT,
  description TEXT,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/accountant can view bank transactions"
ON public.bank_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Admin/accountant can insert bank transactions"
ON public.bank_transactions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Admin/accountant can update bank transactions"
ON public.bank_transactions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Admin/accountant can delete bank transactions"
ON public.bank_transactions FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE TRIGGER update_bank_transactions_updated_at
BEFORE UPDATE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bank_txn_date ON public.bank_transactions(txn_date DESC);
CREATE INDEX idx_bank_txn_bank ON public.bank_transactions(bank_name);

INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-receipts', 'bank-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Bank receipts are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-receipts');

CREATE POLICY "Admin/accountant can upload bank receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bank-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));

CREATE POLICY "Admin/accountant can update bank receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bank-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));

CREATE POLICY "Admin/accountant can delete bank receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'bank-receipts' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')));
