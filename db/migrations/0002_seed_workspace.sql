-- Seeds the single demo workspace used by this thin slice.
-- The id below is hardcoded as DEFAULT_WORKSPACE_ID in src/lib/constants.ts.
-- Safe to run more than once.

insert into workspaces (id, name, slug)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Workspace',
  'demo'
)
on conflict (id) do nothing;
