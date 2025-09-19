# Database Security Guidelines

## View Security Model

### Why SECURITY DEFINER Views Are Dangerous

`SECURITY DEFINER` views execute with the privileges of the view owner (typically a superuser), effectively bypassing Row Level Security (RLS) policies. In client-facing applications, this can expose sensitive data to unauthorized users.

### Policy: All Views Must Be SECURITY INVOKER

**All views in the `public` schema must use `SECURITY INVOKER`** to ensure they run with the caller's privileges and respect RLS policies.

## Creating Compliant Views

When adding a new public view, always use this pattern:

```sql
create view public.my_view
security invoker
as select <columns> from public.my_table;

-- Grant appropriate permissions
grant select on public.my_view to anon, authenticated;
```

## Verification

### Manual Check

Run this query to verify no SECURITY DEFINER views remain:

```sql
-- Should return zero rows
select table_schema, table_name, security_type
from information_schema.views
where table_schema = 'public'
  and security_type = 'DEFINER';
```

### Automated CI Check

The project includes a CI test that fails if any SECURITY DEFINER views are detected:

```bash
npm run test:db
```

This test uses the `check_no_definer_views()` RPC function to verify compliance.

## Migration History

- **2024_fix_security_definer_views.sql**: Converted all existing DEFINER views to INVOKER
- **2024_rpc_check_no_definer_views.sql**: Added verification function for CI

## Security Principles

1. **Principle of Least Privilege**: Views should run with caller's permissions
2. **RLS Enforcement**: All data access must respect Row Level Security
3. **Defense in Depth**: Multiple layers of security checks
4. **Continuous Verification**: Automated tests prevent regressions

## Troubleshooting

If a view needs elevated privileges:
1. Consider if the requirement is valid
2. Use a `SECURITY DEFINER` function instead of a view
3. Implement proper input validation and access controls
4. Document the security decision thoroughly