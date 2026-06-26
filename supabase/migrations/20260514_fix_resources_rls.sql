-- Fix RLS for resources table to allow gerentes to view all staff
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerentes can view all resources" ON resources;

CREATE POLICY "Gerentes can view all resources" ON resources 
FOR SELECT 
TO authenticated 
USING (
  (auth.jwt() ->> 'role' = 'gerente') OR 
  (auth.uid() = assigned_to)
);

-- Also ensure managers can see related data
ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gerentes can view all shifts" ON guard_shifts;
CREATE POLICY "Gerentes can view all shifts" ON guard_shifts 
FOR SELECT 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'gerente');

ALTER TABLE patrol_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gerentes can view all rounds" ON patrol_rounds;
CREATE POLICY "Gerentes can view all rounds" ON patrol_rounds 
FOR SELECT 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'gerente');
