-- CreateFunction: clone_schema
-- Clones a PostgreSQL schema including tables, sequences, indexes, constraints, and data.
-- Used by createTenantSchema() to provision new tenants from tenant_template.

CREATE OR REPLACE FUNCTION clone_schema(source_schema text, dest_schema text)
RETURNS void AS $$
DECLARE
  rec record;
  seq_val bigint;
BEGIN
  -- Create the destination schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', dest_schema);

  -- Clone tables (structure + data)
  FOR rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = source_schema
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- Create table with structure
    EXECUTE format(
      'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
      dest_schema, rec.table_name, source_schema, rec.table_name
    );

    -- Copy data
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM %I.%I',
      dest_schema, rec.table_name, source_schema, rec.table_name
    );
  END LOOP;

  -- Fix sequences: set values to match copied data
  FOR rec IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = dest_schema
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM %I.%I), 1))',
        dest_schema || '.' || rec.sequence_name,
        dest_schema,
        replace(replace(rec.sequence_name, '_id_seq', ''), '_seq', '')
      );
    EXCEPTION WHEN OTHERS THEN
      -- Skip sequences that don't match a table
      NULL;
    END;
  END LOOP;

  -- Recreate foreign keys pointing within the schema
  FOR rec IN
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = source_schema
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE',
        dest_schema, rec.table_name,
        rec.constraint_name || '_' || dest_schema,
        rec.column_name,
        dest_schema, rec.foreign_table_name,
        rec.foreign_column_name
      );
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists from INCLUDING ALL
      NULL;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
