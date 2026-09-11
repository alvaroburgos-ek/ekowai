-- ============================================================================
-- ROLLBACK for verification-pack-din18130.sql (SR-1 Kampagnen-Verifikation 2026-08-01)
-- Resets exactly the 51 field ids touched by the pack, guarded on the campaign note
-- so rows verified by any other campaign are never reset.
-- ============================================================================

begin;

update public.fields
set verification_status = 'imported_unverified',
    verification_quote  = null,
    verification_note   = null,
    verified_at         = null
where id in (
  '3ba4ba52-6c0a-4019-963c-61a69c96e454', -- A_min
  'ac2a7a68-7dd2-41c6-b6e8-213f5f9ebd94', -- alpha
  'a386681f-97c9-4e3e-917b-e057f56f1f11', -- bezeichnung
  '597006b7-7a19-4f40-bc02-814552e25c49', -- bodenart
  'd7a1693d-9968-4e2a-b2d9-8832ec0d3602', -- bodengruppe
  'ef6e2637-66ea-4f58-a735-196e2ac312d1', -- dichte_konstant
  '59bc1db9-de60-40cc-8bfb-027362c69253', -- durchlaessigkeitsbereich
  '08a5ce38-c0da-435c-a0a6-7b35c6bbe158', -- max_d
  '4cb64643-51ba-4514-aa87-35dc0a698394', -- S_r
  '6d6c6496-cb39-438d-89a7-41ded8a97cf3', -- ungleichfoermig
  '0813691e-6a6e-4148-bddf-550cb50b650d', -- versuchsklasse
  'b4a22ebc-9e9d-4086-9148-30e4e980c7ef', -- wasser_geeignet
  '2469cefe-a11d-48a5-84ac-ce7a718c0ac5', -- gamma_org
  '673f92f6-ba13-4e9b-ae09-6730d0bcdfaa', -- gefaelle_typ
  'dbac1531-cd84-4cb8-8694-63aadd6a48e6', -- h
  '50a6bf3b-d18e-4123-91aa-6027d4aeaeb8', -- h_0
  '954b00dc-ae2e-49a9-9298-73f339783dec', -- messung_wassermenge
  '36992010-1463-4180-8efc-ba98623d0592', -- saettigung_aufgebracht
  '6de4835a-2381-406f-a0d1-fd7e23622645', -- statische_belastung
  '088c758e-9a08-4597-9d7c-82ec64846946', -- stroemungsrichtung
  'b3a2b009-9e60-49c5-bd90-b9b9a89a019b', -- u_0
  'ccbb1e48-980c-4a75-996b-1b2ea5819f48', -- umlaeufigkeit_verhindert
  '6f55ff07-4824-4278-b49e-d8043fe0362f', -- versuchsanordnung
  '26d0fac3-5f6a-4504-8418-2239fa86bbbb', -- a
  '904354fc-c526-48a4-8bdf-b8179beef2f0', -- A
  'cec53830-aa4c-4e9f-b18a-cd1cdfcc6300', -- e
  '43335c8a-cde4-4ee6-9172-37d8e5731c0c', -- gamma_w
  'ef26cd5f-0808-4feb-b5ac-4ad9fae2f0d2', -- h_1
  '5d8e8051-d38e-4a31-9d16-bb231c0f2637', -- h_2
  'c06e8c96-1b44-4411-82d3-4ce281f32779', -- h_o
  'b6612290-3535-447f-832f-a36b0f0f5b59', -- h_u
  '78708f8c-9d0e-4691-bb74-75cf4e05cd88', -- l
  '3eabe319-1183-477b-88cc-8a7699bcbf3c', -- l_0
  '47fc17d6-f99f-46b4-825e-1c6f8763f823', -- n_pore
  '4b59cbfc-8caf-4c47-aca3-78908f8a8ac5', -- p_o
  '0ff7675b-e106-4d7f-a731-abc34942bfa4', -- p_u
  '28abc442-a5dd-49ce-b30d-16fb7801d195', -- rho
  'aa045eb7-3b13-46f2-a782-09081e721c7c', -- rho_d
  'e95afe5d-2c6d-41b5-a7fd-3c2b2dc28f74', -- rho_s
  'b477266b-0464-47d6-a1ac-71b6fd3641aa', -- t
  'e6acad67-811a-4aec-a005-bec29e2f311e', -- T
  '8ddf3a9b-2feb-48a8-b5c2-d71e530f8926', -- V_w
  'f2dba419-2fc7-445f-b0d3-a61a74ae93a2', -- w_a
  '6174a6af-dac9-4075-b818-88f3d4859bdc', -- w_e
  '2f1f51b2-b264-4352-8488-3bbfb2f884f3', -- i
  '934803b1-519e-4cb5-aadc-2780731e3b66', -- k
  'defe9a0f-e8c6-4012-863b-1425c0522fe7', -- k_10
  '970ac97f-e655-4b76-bd40-ff9d544db69e', -- k_T
  'c23e7ec2-da24-480d-989a-19d1e2ed0bcd', -- Q
  'bde45807-8eeb-4b8f-9dd0-5f565a59ab4a', -- v
  '7babd5f2-ba5f-458c-be93-316aad3fc305', -- i_bereich
  '281f9678-076b-42be-b542-4bbd4bb7a3f9'  -- versuchsbericht_vollstaendig
)
and verification_note like 'SR-1 Kampagnen-Verifikation 2026-08-01 (OCR%';

commit;
