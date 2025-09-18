# Security Documentation

## Row Level Security (RLS) Policies

This project implements strict Row Level Security policies to protect sensitive user data.

### Overview

- **Anonymous users** (`auth.role() = 'anon'`) have **NO SELECT access** to `public.profiles` or `public.orders`
- **Authenticated users** can only access their own data (where `auth.uid() = user_id`)
- **Admin users** (JWT claim `role=admin`) can access all data

### Protected Tables

#### public.profiles

Contains sensitive personal information including:
- Full names
- Phone numbers  
- Home addresses
- User preferences

**Access Rules:**
- ❌ Anonymous: No access
- ✅ Authenticated: Own profile only (`auth.uid() = user_id`)
- ✅ Admin: All profiles

#### public.orders

Contains customer purchase history and transaction data:
- Order details
- Payment information
- Shipping addresses
- Purchase history

**Access Rules:**
- ❌ Anonymous: No access
- ✅ Authenticated: Own orders only (`auth.uid() = user_id`)
- ✅ Admin: All orders

### Admin Access

Admin users are identified by the `role` claim in their JWT token:

```json
{
  "sub": "user-uuid",
  "role": "admin",
  "aud": "authenticated"
}
```

Admin users can bypass the owner-only restrictions and access all data for:
- Customer support
- System administration
- Data analytics
- Compliance reporting

### Policy Implementation

RLS policies use the pattern:

```sql
USING (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
)
```

This ensures:
1. Only authenticated users can access data
2. Users can only access their own data (`auth.uid() = user_id`)
3. Admin role provides full access bypass

### Security Testing

Run the RLS verification tests to ensure policies are working:

```bash
# SQL tests
psql -f tests/rls/rls_verification.sql

# Node.js tests
node tests/rls/rls_test.js
```

### Migration Files

Security policies are defined in:
- `sql/rls_profiles_secure.sql` - Profiles table RLS policies
- `sql/rls_orders_secure.sql` - Orders table RLS policies

These files are idempotent and can be run multiple times safely.

### Best Practices

1. **Never disable RLS** on tables containing user data
2. **Always test policies** with different user roles
3. **Use admin role sparingly** - only for legitimate administrative functions
4. **Audit admin access** regularly
5. **Keep JWT secrets secure** and rotate them regularly

### Compliance

These security measures help ensure compliance with:
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- SOC 2 Type II requirements
- PCI DSS (for payment data)

### Monitoring

Monitor for security violations:
- Failed RLS policy checks
- Unusual admin access patterns
- Anonymous access attempts to protected tables
- Bulk data access patterns

### Contact

For security concerns or questions, contact the development team.