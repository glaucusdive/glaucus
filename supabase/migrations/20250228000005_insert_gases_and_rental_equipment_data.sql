-- Insert gases and rental equipment from Scuba Master Database v.12 CSVs

INSERT INTO gases (name) VALUES
  ('Argox'),
  ('Heliox'),
  ('Hydreliox'),
  ('Hydrox'),
  ('Nitrox'),
  ('Trimix')
ON CONFLICT (name) DO NOTHING;

INSERT INTO rental_equipment (name) VALUES
  ('BCD'),
  ('Boots'),
  ('Dive Computer'),
  ('Drysuit'),
  ('Fins'),
  ('Flashlight'),
  ('Gloves'),
  ('Hood'),
  ('Mask'),
  ('None listed'),
  ('Regulator'),
  ('Snorkel'),
  ('Tanks'),
  ('Wetsuit'),
  ('Yes (unspecified gear)')
ON CONFLICT (name) DO NOTHING;
