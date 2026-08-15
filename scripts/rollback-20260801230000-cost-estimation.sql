-- Rollback for 20260801230000_cost_estimation.sql (Slice E2).
-- Drops the four Kostenschätzung tables (policies, indexes and grants go with
-- them). Reverse dependency order: lines/bids first, then estimates, then the
-- catalog. No other table was touched by the forward migration.

DROP TABLE IF EXISTS contractor_bids;
DROP TABLE IF EXISTS cost_estimate_lines;
DROP TABLE IF EXISTS cost_estimates;
DROP TABLE IF EXISTS cost_items;
