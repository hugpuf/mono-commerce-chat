-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS products_embedding_idx 
ON products 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create vector search function
CREATE OR REPLACE FUNCTION vector_search_products(
  workspace_uuid UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  stock INTEGER,
  image_url TEXT,
  sku TEXT,
  variant_options JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.stock,
    p.image_url,
    p.sku,
    p.variant_options,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.workspace_id = workspace_uuid
    AND p.status = 'active'
    AND p.stock > 0
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create hybrid search function (combines keyword + vector)
CREATE OR REPLACE FUNCTION hybrid_search_products(
  workspace_uuid UUID,
  search_query TEXT,
  query_embedding vector(1536) DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  max_price_filter NUMERIC DEFAULT NULL,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  stock INTEGER,
  image_url TEXT,
  sku TEXT,
  variant_options JSONB,
  match_type TEXT,
  match_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH keyword_results AS (
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.stock,
      p.image_url,
      p.sku,
      p.variant_options,
      CASE 
        WHEN LOWER(p.sku) = LOWER(search_query) THEN 'exact_sku'
        WHEN LOWER(p.title) = LOWER(search_query) THEN 'exact_title'
        WHEN p.sku ILIKE '%' || search_query || '%' THEN 'partial_sku'
        WHEN p.title ILIKE '%' || search_query || '%' THEN 'partial_title'
        WHEN search_query = ANY(p.tags) THEN 'tag_match'
        ELSE 'keyword_match'
      END AS match_type,
      CASE 
        WHEN LOWER(p.sku) = LOWER(search_query) THEN 1.0
        WHEN LOWER(p.title) = LOWER(search_query) THEN 0.95
        WHEN p.sku ILIKE '%' || search_query || '%' THEN 0.9
        WHEN p.title ILIKE '%' || search_query || '%' THEN 0.85
        WHEN search_query = ANY(p.tags) THEN 0.8
        ELSE 0.5
      END::FLOAT AS match_score
    FROM products p
    WHERE p.workspace_id = workspace_uuid
      AND p.status = 'active'
      AND p.stock > 0
      AND (
        p.sku ILIKE '%' || search_query || '%'
        OR p.title ILIKE '%' || search_query || '%'
        OR search_query = ANY(p.tags)
        OR p.product_type ILIKE '%' || search_query || '%'
        OR p.description ILIKE '%' || search_query || '%'
      )
      AND (category_filter IS NULL OR p.product_type = category_filter)
      AND (max_price_filter IS NULL OR p.price <= max_price_filter)
  ),
  vector_results AS (
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.stock,
      p.image_url,
      p.sku,
      p.variant_options,
      'semantic'::TEXT AS match_type,
      (1 - (p.embedding <=> query_embedding))::FLOAT AS match_score
    FROM products p
    WHERE query_embedding IS NOT NULL
      AND p.workspace_id = workspace_uuid
      AND p.status = 'active'
      AND p.stock > 0
      AND p.embedding IS NOT NULL
      AND (category_filter IS NULL OR p.product_type = category_filter)
      AND (max_price_filter IS NULL OR p.price <= max_price_filter)
      AND 1 - (p.embedding <=> query_embedding) > 0.6
  ),
  combined AS (
    SELECT * FROM keyword_results
    UNION ALL
    SELECT * FROM vector_results
  )
  SELECT DISTINCT ON (c.id)
    c.id,
    c.title,
    c.description,
    c.price,
    c.stock,
    c.image_url,
    c.sku,
    c.variant_options,
    c.match_type,
    c.match_score
  FROM combined c
  ORDER BY c.id, c.match_score DESC
  LIMIT result_limit;
END;
$$;