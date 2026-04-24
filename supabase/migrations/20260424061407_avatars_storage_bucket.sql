-- Greenfield: Storage > Buckets > `avatars` (public = true).
-- Read: anyone who has the object URL can fetch it (anon + authenticated SELECT).
-- Write: INSERT / UPDATE / DELETE only when the policies below pass (not open to the world).
--
-- Object key is "{user_id}/avatar" (see apps/web/lib/supabase/profile-avatar-storage.ts).
-- RLS uses split_part + UUID cast (not storage.foldername), which is reliable in WITH CHECK.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

CREATE POLICY "avatars_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (SELECT authz.is_session_valid())
  AND NOT (SELECT authz.is_account_locked())
  AND (
    (SELECT authz.is_system_admin())
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND split_part(name, '/', 1)::uuid = (SELECT auth.uid())
    )
    OR (
      (SELECT authz.check_permission_version_for_tenant((SELECT authz.current_tenant_id())))
      AND (SELECT authz.has_permission('tenant_members.manage'))
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND EXISTS (
        SELECT 1
        FROM public.tenant_members tm
        WHERE tm.user_id = split_part(name, '/', 1)::uuid
          AND tm.tenant_id = (SELECT authz.current_tenant_id())
          AND tm.status = 'active'
      )
    )
  )
);

CREATE POLICY "avatars_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (SELECT authz.is_session_valid())
  AND NOT (SELECT authz.is_account_locked())
  AND (
    (SELECT authz.is_system_admin())
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND split_part(name, '/', 1)::uuid = (SELECT auth.uid())
    )
    OR (
      (SELECT authz.check_permission_version_for_tenant((SELECT authz.current_tenant_id())))
      AND (SELECT authz.has_permission('tenant_members.manage'))
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND EXISTS (
        SELECT 1
        FROM public.tenant_members tm
        WHERE tm.user_id = split_part(name, '/', 1)::uuid
          AND tm.tenant_id = (SELECT authz.current_tenant_id())
          AND tm.status = 'active'
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (SELECT authz.is_session_valid())
  AND NOT (SELECT authz.is_account_locked())
  AND (
    (SELECT authz.is_system_admin())
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND split_part(name, '/', 1)::uuid = (SELECT auth.uid())
    )
    OR (
      (SELECT authz.check_permission_version_for_tenant((SELECT authz.current_tenant_id())))
      AND (SELECT authz.has_permission('tenant_members.manage'))
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND EXISTS (
        SELECT 1
        FROM public.tenant_members tm
        WHERE tm.user_id = split_part(name, '/', 1)::uuid
          AND tm.tenant_id = (SELECT authz.current_tenant_id())
          AND tm.status = 'active'
      )
    )
  )
);

CREATE POLICY "avatars_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (SELECT authz.is_session_valid())
  AND NOT (SELECT authz.is_account_locked())
  AND (
    (SELECT authz.is_system_admin())
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND split_part(name, '/', 1)::uuid = (SELECT auth.uid())
    )
    OR (
      (SELECT authz.check_permission_version_for_tenant((SELECT authz.current_tenant_id())))
      AND (SELECT authz.has_permission('tenant_members.manage'))
      AND name ~ '^[0-9a-fA-F-]{36}/'
      AND EXISTS (
        SELECT 1
        FROM public.tenant_members tm
        WHERE tm.user_id = split_part(name, '/', 1)::uuid
          AND tm.tenant_id = (SELECT authz.current_tenant_id())
          AND tm.status = 'active'
      )
    )
  )
);
