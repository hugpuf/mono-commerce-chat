-- Create exact search function with extensible architecture for future fuzzy/vector search
CREATE OR REPLACE FUNCTION exact_search_products(
  workspace_uuid UUID,
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  max_price_filter NUMERIC DEFAULT NULL,
  result_limit INTEGER DEFAULT 10
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
) AS $$
BEGIN
  RETURN QUERY
  WITH exact_matches AS (
    -- Exact SKU match (highest priority)
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.stock,
      p.image_url,
      p.sku,
      p.variant_options,
      'exact_sku'::TEXT as match_type,
      1.0::FLOAT as match_score,
      1 as priority
    FROM products p
    WHERE 
      p.workspace_id = workspace_uuid
      AND p.status = 'active'
      AND p.stock > 0
      AND LOWER(p.sku) = LOWER(search_query)
      AND (category_filter IS NULL OR p.product_type = category_filter)
      AND (max_price_filter IS NULL OR p.price <= max_price_filter)
    
    UNION ALL
    
    -- Exact title match
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.stock,
      p.image_url,
      p.sku,
      p.variant_options,
      'exact_title'::TEXT as match_type,
      1.0::FLOAT as match_score,
      2 as priority
    FROM products p
    WHERE 
      p.workspace_id = workspace_uuid
      AND p.status = 'active'
      AND p.stock > 0
      AND LOWER(p.title) = LOWER(search_query)
      AND (category_filter IS NULL OR p.product_type = category_filter)
      AND (max_price_filter IS NULL OR p.price <= max_price_filter)
    
    UNION ALL
    
    -- Partial title match (contains)
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.stock,
      p.image_url,
      p.sku,
      p.variant_options,
      'partial_title'::TEXT as match_type,
      0.8::FLOAT as match_score,
      3 as priority
    FROM products p
    WHERE 
      p.workspace_id = workspace_uuid
      AND p.status = 'active'
      AND p.stock > 0
      AND LOWER(p.title) LIKE '%' || LOWER(search_query) || '%'
      AND LOWER(p.title) != LOWER(search_query)  -- Exclude exact matches already found
      AND (category_filter IS NULL OR p.product_type = category_filter)
      AND (max_price_filter IS NULL OR p.price <= max_price_filter)
  )
  -- Future: Add fuzzy_matches CTE here with pg_trgm similarity
  -- Future: Add vector_matches CTE here with embedding <=> query_embedding
  -- Future: Combine with weighted scoring and deduplication
  SELECT 
    em.id,
    em.title,
    em.description,
    em.price,
    em.stock,
    em.image_url,
    em.sku,
    em.variant_options,
    em.match_type,
    em.match_score
  FROM exact_matches em
  ORDER BY 
    em.priority ASC,
    em.match_score DESC,
    em.price ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add helpful comment for future developers
COMMENT ON FUNCTION exact_search_products IS 
'Exact product search function. Architecture designed for future extensions:
- Add fuzzy_matches CTE using similarity(title, search_query) with pg_trgm
- Add vector_matches CTE using embedding <=> query_embedding::vector
- Combine CTEs with FULL OUTER JOIN for deduplication
- Weight scores: exact=1.0, fuzzy=0.6, semantic=0.7, combined with configurable weights
- Return combined_score as weighted sum of all match types';