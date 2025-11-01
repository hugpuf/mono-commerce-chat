-- Fix search_path for security
ALTER FUNCTION products_search_text(products) SET search_path = public;
ALTER FUNCTION search_products(UUID, TEXT, TEXT, NUMERIC, INTEGER) SET search_path = public;
ALTER FUNCTION generate_order_number() SET search_path = public;