-- Document times_used on default_divers: each diver object may include times_used (number of bookings).
-- Used to show "most used" divers in booking chips (up to 2). No schema change; JSONB accepts new key.
COMMENT ON COLUMN profiles.default_divers IS 'Array of { name, certification_number, number_of_dives, height, height_unit, weight, weight_unit, gear: [{ gear_type }], times_used?: number }. Prefill for recurring bookings; times_used tracks bookings per diver for chip ordering.';
