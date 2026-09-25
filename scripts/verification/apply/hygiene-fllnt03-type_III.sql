BEGIN;
UPDATE fields SET active = false WHERE id = '8c627e22-4795-4b4b-89ef-95d0bacaa769' AND symbol = 'type_III' AND active = true;
COMMIT;
