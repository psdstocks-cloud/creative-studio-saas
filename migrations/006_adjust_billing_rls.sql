-- Migration: Relax billing policies to permit service role operations
SET search_path = public;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users create subscriptions" ON public.subscriptions;
CREATE POLICY "Users create subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users update subscriptions" ON public.subscriptions;
CREATE POLICY "Users update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Invoices policies
DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;
CREATE POLICY "Users create invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users update invoices" ON public.invoices;
CREATE POLICY "Users update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Invoice items policies
DROP POLICY IF EXISTS "Users view own invoice items" ON public.invoice_items;
CREATE POLICY "Users view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_id
        AND inv.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create invoice items" ON public.invoice_items;
CREATE POLICY "Users create invoice items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_id
        AND inv.user_id = auth.uid()
    )
  );
