-- Add rental equipment for Sunrise Divers (was missing; gear chips did not show in booking flow)
INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'f947f18f-f3d9-4d8b-96bc-1ce9db89abf3'::uuid, id FROM rental_equipment WHERE name IN ('Wetsuit', 'Regulator', 'Fins', 'Mask', 'BCD', 'Snorkel', 'Dive Computer')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;
