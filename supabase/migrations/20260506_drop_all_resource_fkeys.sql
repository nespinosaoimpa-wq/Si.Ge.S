-- ============================================================
-- Migración: DROP ALL RESOURCE FK CONSTRAINTS
-- Profesionalización del esquema: Eliminar restricciones que bloquean
-- el flujo de datos dinámico entre Auth y Resources.
-- ============================================================

DO $$
DECLARE
    _table_name TEXT;
    _constraint_name TEXT;
BEGIN
    -- Lista de tablas que referencian public.resources(id)
    FOR _table_name, _constraint_name IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'resources'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', _table_name, _constraint_name);
        RAISE NOTICE 'Eliminado constraint % de la tabla %', _constraint_name, _table_name;
    END LOOP;

    RAISE NOTICE 'Limpieza de Foreign Keys completada. El sistema ahora permite flujo híbrido UUID/ResourceID.';
END $$;
