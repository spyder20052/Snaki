-- A executer une fois dans le SQL Editor si schema.sql a deja ete lance.

grant usage on schema public to anon, authenticated;

grant select on
  media, categories, collections, products, product_images,
  product_collections, product_variant_groups, product_variant_options,
  delivery_zones, opening_hours, closures, reviews,
  site_sections, site_content, settings
to anon;

grant insert on analytics_sessions, analytics_events, reviews, carts, cart_items
to anon;
grant select, update, delete on carts, cart_items to anon;
grant update on analytics_sessions to anon;

grant select, insert, update, delete on all tables in schema public
to authenticated;
grant usage, select on all sequences in schema public to authenticated;
