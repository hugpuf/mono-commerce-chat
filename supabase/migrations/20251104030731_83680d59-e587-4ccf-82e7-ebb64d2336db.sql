-- Enable real-time updates for catalog_sources table
ALTER TABLE catalog_sources REPLICA IDENTITY FULL;

-- Add the catalog_sources table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_sources;