-- Add Camera rental equipment referenced in Japan v.13 CSV (Blue Magic, Sensuiya, Reef Encounters).
INSERT INTO rental_equipment (name) VALUES ('Camera')
ON CONFLICT (name) DO NOTHING;
