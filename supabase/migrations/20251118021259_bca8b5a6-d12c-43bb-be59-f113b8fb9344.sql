-- Step 1: Add semantic search keywords to existing products
UPDATE products 
SET tags = COALESCE(tags, ARRAY[]::text[]) || ARRAY['sneakers', 'footwear', 'athletic', 'casual']
WHERE (title ILIKE '%nike%' OR title ILIKE '%adidas%' OR title ILIKE '%balance%' OR title ILIKE '%shoe%')
  AND NOT (tags @> ARRAY['footwear']);

-- Step 2: Update exact_search_products to include tag matching
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
  match_score DOUBLE PRECISION
) AS $$
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
    CASE 
      WHEN LOWER(p.sku) = LOWER(search_query) THEN 'exact_sku'
      WHEN LOWER(p.title) = LOWER(search_query) THEN 'exact_title'
      WHEN p.sku ILIKE '%' || search_query || '%' THEN 'partial_sku'
      WHEN p.title ILIKE '%' || search_query || '%' THEN 'partial_title'
      WHEN search_query = ANY(p.tags) THEN 'tag_match'
      WHEN p.product_type ILIKE '%' || search_query || '%' THEN 'type_match'
      ELSE 'description_match'
    END AS match_type,
    CASE 
      WHEN LOWER(p.sku) = LOWER(search_query) THEN 1.0
      WHEN LOWER(p.title) = LOWER(search_query) THEN 0.95
      WHEN p.sku ILIKE '%' || search_query || '%' THEN 0.9
      WHEN p.title ILIKE '%' || search_query || '%' THEN 0.85
      WHEN search_query = ANY(p.tags) THEN 0.8
      WHEN p.product_type ILIKE '%' || search_query || '%' THEN 0.7
      ELSE 0.5
    END AS match_score
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
  ORDER BY match_score DESC, p.price ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;