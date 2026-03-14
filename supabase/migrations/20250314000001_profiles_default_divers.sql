-- Add default_divers to profiles: array of divers from last booking (name, certification_number, number_of_dives, height, height_unit, weight, weight_unit, gear).
-- Used to prefill all future bookings. Keeps default_diver for backward compatibility.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_divers JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.default_divers IS 'Array of { name, certification_number, number_of_dives, height, height_unit, weight, weight_unit, gear: [{ gear_type }] } from last booking; prefill for recurring bookings.';
