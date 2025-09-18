# Security Documentation

## Row Level Security (RLS) Policies

This project implements **comprehensive** Row Level Security policies to completely block anonymous access to sensitive data while maintaining seamless guest user experience through local storage.

### Security Overview

- **Anonymous users** (`auth.role() = 'anon'`) have **ZERO DATABASE ACCESS** to sensitive tables
- **Authenticated users** can only access their own data (where `auth.uid() = user_id`)  
- **Admin users** (JWT claim `role=admin`) can access all data for support and management
- **Guest users** use local storage for cart/designs with automatic migration on login

### Protected Tables

#### public.profiles (PII Data)

Contains sensitive personal information including:
- Full names
- Phone numbers  
- Home addresses
- User preferences

**Access Rules:**
- ❌ Anonymous: **ZERO ACCESS** - completely blocked
- ✅ Authenticated: Own profile only (`auth.uid() = user_id`)
- ✅ Admin: All profiles

#### public.orders (Financial Data)

Contains customer purchase history and transaction data:
- Order details
- Payment information
- Shipping addresses
- Purchase history

**Access Rules:**
- ❌ Anonymous: **ZERO ACCESS** - completely blocked
- ✅ Authenticated: Own orders only (`auth.uid() = user_id`)
- ✅ Admin: All orders

#### public.cart_items (Shopping Behavior)

Contains user shopping cart data:
- Cart contents
- Quantities
- User preferences

**Access Rules:**
- ❌ Anonymous: **ZERO ACCESS** - guests use local storage
- ✅ Authenticated: Own cart only (`auth.uid() = user_id`)
- ✅ Admin: All carts

#### public.order_items (Purchase Details)

Contains detailed purchase information:
- Item quantities
- Pricing data
- Order relationships

**Access Rules:**
- ❌ Anonymous: **ZERO ACCESS** - completely blocked
- ✅ Authenticated: Own order items only (via order ownership)
- ✅ Admin: All order items

#### public.designs (User Creations)

Contains user-created designs:
- Design parameters
- Preview images
- User customizations

**Access Rules:**
- ✅ Anonymous: **Published designs only** (for public gallery)
- ✅ Authenticated: Own designs + published designs
- ✅ Admin: All designs

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

### Guest User Experience

Despite blocking anonymous database access, guests can still:

- **Browse and customize designs** using local storage
- **Add items to cart** stored locally  
- **Save designs** temporarily in browser
- **Seamless migration** to database when they sign up/login

**Technical Implementation:**
- Guest data stored in `localStorage` using `src/lib/guestStorage.ts`
- Automatic migration to user account on authentication via `useGuestMigration` hook
- No database access required for guest functionality

### Policy Implementation

All sensitive tables use this security pattern:

```sql
-- Block anonymous, allow owner or admin
USING (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id  -- or appropriate user reference
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
)
```

**Key Security Guarantees:**
1. **Anonymous users have ZERO database access** to sensitive data
2. **Authenticated users** see only their own data (`auth.uid() = user_id`)
3. **Admin role** provides controlled full access for support
4. **Guest experience** maintained through local storage + migration

### Security Testing

Multiple test layers verify the security implementation:

**1. SQL Tests:**
```bash
psql -f tests/rls/rls_verification.sql
```

**2. Node.js Integration Tests:**
```bash
node tests/rls/rls_test.js  
```

**3. Client-side RLS Verification:**
```javascript
import { runRLSTests, displayTestResults } from '@/lib/rlsTestRunner';

// Run comprehensive RLS tests
const results = await runRLSTests();
displayTestResults(results);
```

**Test Coverage:**
- ✅ Anonymous access blocked to all sensitive tables
- ✅ Authenticated users see only own data  
- ✅ Published designs visible to anonymous users
- ✅ Catalog data (products) remains publicly accessible
- ✅ Admin bypass functionality

### Implementation Files

**Security Hardening:**
- Database migration with comprehensive RLS policies applied to all sensitive tables
- Anonymous access completely blocked while maintaining guest UX

**Guest Storage System:**
- `src/lib/guestStorage.ts` - Local storage management for anonymous users
- `src/hooks/useGuestMigration.tsx` - Automatic data migration on login
- `src/pages/Cart.tsx` - Hybrid cart supporting both authenticated and guest users
- `src/pages/MyDesigns.tsx` - Design management for both user types

**Security Testing:**
- `src/lib/rlsTestRunner.ts` - Client-side RLS verification
- `tests/rls/rls_verification.sql` - SQL-based policy testing  
- `tests/rls/rls_test.js` - Node.js integration tests

### Best Practices

1. **Never disable RLS** on tables containing user data
2. **Block anonymous access** to all sensitive tables
3. **Test security policies** comprehensively with all user roles
4. **Use admin role sparingly** - only for legitimate administrative functions
5. **Maintain guest UX** through local storage patterns
6. **Audit admin access** regularly and monitor for suspicious patterns
7. **Keep JWT secrets secure** and rotate them regularly
8. **Migrate guest data** seamlessly to prevent user friction

### Compliance

These security measures help ensure compliance with:
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- SOC 2 Type II requirements
- PCI DSS (for payment data)

### Monitoring

Monitor for security violations:
- **Failed RLS policy checks** - Should be zero for anonymous users
- **Unusual admin access patterns** - Large data exports, unusual timing
- **Anonymous access attempts** to protected tables - All should be blocked
- **Guest data migration patterns** - Ensure smooth user onboarding
- **Local storage abuse** - Monitor for excessive guest data storage

### Contact

For security concerns or questions, contact the development team.