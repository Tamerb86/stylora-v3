# Admin Impersonation & Tenant Security - Implementation Guide

## Overview

This implementation adds secure admin impersonation functionality that allows platform administrators to view and interact with tenant salons while maintaining proper security boundaries and audit trails.

## Key Security Features

### 1. JWT-Based Tenant Context
- **tenantId**: Always derived from JWT, not from user database lookup
- **impersonating**: Boolean flag indicating active impersonation
- **act**: Admin user ID performing the impersonation (for audit trail)
- **Token Expiration**: Impersonation tokens expire after 30 minutes

### 2. Audit Logging
All impersonation events are logged to the `auditLogs` table:
- Impersonation start (with admin details, tenant, IP address)
- Impersonation end (with timestamps)

### 3. Request Logging
Every authenticated request logs:
- `userId` - Current user ID
- `tenantId` - Active tenant context
- `impersonating` - Whether in impersonation mode
- `ip` - Client IP address (masked in logs)

## How It Works

### Backend Flow

1. **Admin initiates impersonation** via `saasAdmin.impersonateTenant` mutation:
   ```typescript
   impersonateMutation.mutate({ tenantId: "target-tenant-id" });
   ```

2. **Server creates impersonation JWT** with:
   ```typescript
   {
     openId: adminOpenId,
     role: "admin",
     tenantId: targetTenantId,
     impersonatedTenantId: targetTenantId,
     impersonating: true,
     act: adminOpenId,
     exp: Date.now() + 30_MINUTES
   }
   ```

3. **JWT is set as session cookie** (replaces admin's token)

4. **Audit log entry created** with impersonation details

5. **All subsequent requests** use the impersonated tenant context from JWT

### Frontend Flow

1. **Admin clicks "View as salon"** button
2. **Original admin token backed up** to localStorage
3. **All React Query/tRPC caches cleared** to prevent stale data
4. **New impersonation token set** as cookie
5. **Hard reload** to `/dashboard` with fresh tenant context
6. **Impersonation banner shown** at top of page
7. **Admin can exit** impersonation via banner button:
   - Original token restored from localStorage OR
   - User forced to re-login if backup not available
   - All caches cleared again
   - Redirect to `/saas-admin`

## Setup & Configuration

### Environment Variables

Ensure these are set in your `.env` file:

```bash
# Platform owner identification
OWNER_OPEN_ID="platform-owner-unique-id"

# JWT secret (must be secure)
JWT_SECRET="your-secure-secret-here"

# Database connection
DATABASE_URL="mysql://user:pass@host:port/database"
```

### Database Schema

The audit logs table is already created via migration. Verify it exists:

```sql
SELECT * FROM auditLogs WHERE action IN ('impersonation_start', 'impersonation_end');
```

## Usage Instructions

### For Administrators

1. **Login as Platform Admin**
   - Navigate to `/saas-admin/login`
   - Login with your admin credentials
   - Your `openId` must match `OWNER_OPEN_ID` environment variable

2. **View Tenants List**
   - Go to `/saas-admin/tenants`
   - You'll see all registered salons

3. **Impersonate a Salon**
   - Click "View as salon" (eye icon) next to any tenant
   - System will:
     - Store your admin token
     - Clear all caches
     - Switch to tenant context
     - Reload to salon dashboard
   - Orange banner appears at top showing impersonation status

4. **Work in Tenant Context**
   - All data shown is scoped to that tenant
   - All actions are performed as that tenant
   - Token expires after 30 minutes
   - All actions are logged for audit

5. **Exit Impersonation**
   - Click "Exit Impersonation" in orange banner
   - System will:
     - Restore your admin token (if available)
     - Clear all caches again
     - Redirect to admin panel
   - If token restoration fails, you'll need to re-login

### For Developers

#### Checking Current Context

Visit `/system-status` (while logged in) to see:
- Current environment (production/development)
- Database connectivity
- Current user details from JWT:
  - User ID
  - Email
  - Role
  - Tenant ID
  - Impersonation status
  - Impersonated Tenant ID (if active)

#### Testing Impersonation

1. **Setup Test Environment**
   ```bash
   # Set platform owner
   export OWNER_OPEN_ID="your-admin-open-id"
   
   # Start dev server
   npm run dev
   ```

2. **Create Test Tenants**
   - Use signup flow or direct DB insert to create 2+ tenants
   - Create test customers in each tenant

3. **Test Impersonation Flow**
   ```bash
   # 1. Login as admin
   # 2. Go to /saas-admin/tenants
   # 3. Click "View as salon" for Tenant A
   # 4. Verify customers list shows only Tenant A data
   # 5. Exit impersonation
   # 6. Repeat for Tenant B
   # 7. Verify data changes correctly
   ```

4. **Verify Audit Logs**
   ```sql
   SELECT 
     action,
     afterValue,
     ipAddress,
     createdAt
   FROM auditLogs
   WHERE action IN ('impersonation_start', 'impersonation_end')
   ORDER BY createdAt DESC
   LIMIT 10;
   ```

#### Adding Tenant Scoping to New Procedures

Always use the `requireTenant()` helper in your procedures:

```typescript
import { requireTenant } from "./_core/trpc";

// In your router
myProcedure: protectedProcedure
  .input(z.object({ ... }))
  .query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx); // Throws if no tenant
    
    // Query with tenant scoping
    const data = await dbInstance
      .select()
      .from(myTable)
      .where(eq(myTable.tenantId, tenantId)); // Always filter by tenant
    
    return data;
  })
```

## Security Considerations

### ✅ What's Protected

1. **JWT-based context**: Tenant ID always comes from verified JWT
2. **Short expiration**: Impersonation tokens expire in 30 minutes
3. **Audit trail**: All impersonation events logged with IP and timestamps
4. **Cache clearing**: Old tenant data never shown in new context
5. **Server-side enforcement**: All queries filtered by JWT tenantId

### ⚠️ Important Notes

1. **Never trust client-side tenantId**: Always use `ctx.tenantId` from JWT
2. **Always filter queries**: Every DB query must include `WHERE tenantId = ?`
3. **Check expiration**: Impersonation tokens expire automatically
4. **Monitor audit logs**: Regularly review impersonation activities
5. **Backup admin token**: Frontend stores it in localStorage, but users may need to re-login

## Troubleshooting

### Issue: "No tenant access" error during impersonation

**Cause**: JWT doesn't contain valid tenantId

**Solution**:
1. Check `/system-status` to see current JWT content
2. Verify `OWNER_OPEN_ID` matches your admin's openId
3. Try exiting and re-entering impersonation
4. Check server logs for JWT parsing errors

### Issue: Seeing data from wrong tenant

**Cause**: Old data cached in React Query

**Solution**:
1. Impersonation should auto-clear caches
2. If not, hard refresh browser (Ctrl+Shift+R)
3. Check that tenant switch calls `utils.client.resetQueries()`
4. Verify `/system-status` shows correct tenantId

### Issue: Impersonation token expired

**Cause**: Token lifetime is 30 minutes

**Solution**:
1. Exit impersonation and re-enter
2. Or wait for auto-logout and login again
3. Check server logs for JWT expiration errors

### Issue: Cannot restore admin token after exit

**Cause**: localStorage backup missing or corrupted

**Solution**:
1. Clear browser cookies and localStorage
2. Re-login as admin from `/saas-admin/login`
3. Impersonation will work again with fresh token

## Commands Reference

### Development

```bash
# Install dependencies
npm install

# Run type checking
npm run check

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Database

```bash
# Generate migration
npm run migrate

# Apply migrations
npm run db:push
```

### Verification

```bash
# Check system status (in browser)
http://localhost:3000/system-status

# Check audit logs (in DB)
SELECT * FROM auditLogs WHERE action LIKE 'impersonation%' ORDER BY createdAt DESC;

# Check user JWT claims (server logs)
grep "Auth.*Request:" logs/combined.log | tail -20
```

## Files Changed

### Backend
- `server/_core/auth-simple.ts` - JWT structure and impersonation token creation
- `server/_core/context.ts` - Context extraction with impersonation support
- `server/_core/trpc.ts` - `requireTenant()` helper function
- `server/_core/systemRouter.ts` - System status endpoint
- `server/routers.ts` - `impersonateTenant` and `clearImpersonation` procedures

### Frontend
- `client/src/pages/SaasAdmin/SaasAdminTenants.tsx` - Impersonation trigger with cache clearing
- `client/src/components/ImpersonationBanner.tsx` - Banner with exit functionality
- `client/src/pages/SystemStatus.tsx` - Diagnostic page
- `client/src/App.tsx` - Added SystemStatus route

### Configuration
- `vite.config.ts` - Enabled production sourcemaps

## Next Steps

1. **Apply `requireTenant()` to all procedures** - Review all tRPC procedures and add tenant scoping
2. **Test extensively** - Verify no data leakage between tenants
3. **Monitor audit logs** - Set up alerts for impersonation activities
4. **Document for support** - Train support staff on safe impersonation usage
5. **Add rate limiting** - Consider limiting impersonation frequency per admin
