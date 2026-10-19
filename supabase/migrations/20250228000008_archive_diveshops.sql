-- Archive existing diveshops table before creating new schema with references
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diveshops') THEN
        ALTER TABLE diveshops RENAME TO diveshops_old;
    END IF;
END $$;
