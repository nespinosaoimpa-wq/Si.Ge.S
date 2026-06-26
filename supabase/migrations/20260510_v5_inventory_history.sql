-- 1. Crear tabla de logs de inventario
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'asignacion', 'devolucion', 'reparacion', 'baja', 'creacion'
    previous_condition TEXT,
    new_condition TEXT,
    previous_objective_id UUID REFERENCES public.objectives(id),
    new_objective_id UUID REFERENCES public.objectives(id),
    performed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Enable all for authenticated users" ON public.inventory_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Trigger para auto-loguear cambios en inventory_items (Opcional pero recomendado)
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO inventory_logs (
            item_id, 
            action_type, 
            previous_condition, 
            new_condition, 
            previous_objective_id, 
            new_objective_id,
            notes
        ) VALUES (
            NEW.id,
            'actualizacion',
            OLD.condition,
            NEW.condition,
            OLD.assigned_to_objective,
            NEW.assigned_to_objective,
            'Cambio automático de estado/ubicación'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_inventory_change
AFTER UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION log_inventory_change();
