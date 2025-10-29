# Admin Panel - Complete URL List

## Domain
**Production**: https://creative-studio-saas.pages.dev

---

## 🔐 Admin Panel Pages

### 1. Admin Dashboard (Home)
**URL**: https://creative-studio-saas.pages.dev/admin

**Description**: Main operational KPIs dashboard showing:
- Orders in last 24 hours
- Currently processing orders
- Total spend over last 30 days
- Top stock sources by usage
- Recent audit trail events

**Features**:
- Real-time metrics
- Refresh button for live updates
- Quick overview of platform health

**Access**: Requires admin role (admin, ops, support, finance, or superadmin)

---

### 2. Users Management
**URL**: https://creative-studio-saas.pages.dev/admin/users

**Description**: Comprehensive user management panel for viewing and managing all platform users.

**Features**:
- View all registered users
- Search and filter users
- Adjust user balances with modal form
- Sort by ID, email, balance, created date, subscription, status
- Table with skeleton loaders and empty states
- Balance adjustment with Zod validation

**Detail View**: https://creative-studio-saas.pages.dev/admin/users/:userId

**Access**: Requires admin role

---

### 3. Orders Management
**URL**: https://creative-studio-saas.pages.dev/admin/orders

**Description**: Complete order tracking and management system for all stock downloads.

**Features**:
- View all orders across the platform
- Filter by status (pending, processing, ready, error)
- Sort by date, user, asset, status, cost
- Regenerate download links with modal dialog
- Copy download links with toast notifications
- Skeleton loaders during data fetch
- Empty states for no orders

**Detail View**: https://creative-studio-saas.pages.dev/admin/orders/:taskId

**Description**: Detailed view of individual order with full payload, logs, and status history.

**Features**:
- Complete order information
- Download payload details
- Order status timeline
- Error logs (if any)
- Cost breakdown
- User information

**Access**: Requires admin role

---

### 4. AI Jobs Management
**URL**: https://creative-studio-saas.pages.dev/admin/aijobs

**Description**: Monitor and manage AI image generation jobs submitted by users.

**Features**:
- View all AI generation requests
- Track job status (queued, processing, completed, failed)
- Monitor generation parameters
- Review generated images
- Track costs and credits used

**Detail View**: https://creative-studio-saas.pages.dev/admin/aijobs/:jobId

**Description**: Detailed view of individual AI job with generation parameters and results.

**Access**: Requires admin role

---

### 5. Stock Sources
**URL**: https://creative-studio-saas.pages.dev/admin/stock-sources

**Description**: Review and manage upstream stock provider integrations.

**Features**:
- View all connected stock providers
- Check provider availability and status
- Review pricing tiers
- Monitor catalog coverage
- Track provider performance

**Purpose**: Helps admins understand which stock sources are available and their configurations.

**Access**: Requires admin role

---

### 6. File Archive
**URL**: https://creative-studio-saas.pages.dev/admin/files

**Description**: Browse and manage generated download links and file archives.

**Features**:
- View recently generated download links
- Quick access to files for customer support
- Open files for QA purposes
- Search and filter file archives
- Track file expiration dates

**Purpose**: Customer support tool for quickly accessing user downloads.

**Access**: Requires admin role

---

### 7. Audit Trail
**URL**: https://creative-studio-saas.pages.dev/admin/audit

**Description**: Complete audit log of all administrative actions and system events.

**Features**:
- View latest 75 audit entries
- Track admin mutations
- Monitor proxy operations
- Review session lifecycle events
- Captured by BFF audit sink
- Timestamp and actor tracking

**Purpose**: Security and compliance monitoring for all platform operations.

**Access**: Requires admin role

---

### 8. Platform Settings
**URL**: https://creative-studio-saas.pages.dev/admin/settings

**Description**: Inspect and manage platform-wide configuration settings.

**Features**:
- Runtime configuration from BFF
- Polling thresholds
- Rate limiting settings
- Session TTL configuration
- System-wide parameters

**Purpose**: View and potentially modify platform operational parameters.

**Access**: Requires admin role (typically superadmin only)

---

## 🔒 Access Control

All admin pages are protected by RBAC (Role-Based Access Control) and require one of the following roles:

- **superadmin**: Full access to all features including settings
- **admin**: Full operational access
- **ops**: Operations team access
- **support**: Customer support access
- **finance**: Financial operations access

**Route Protection**: Implemented via `<ProtectedRoute>` component in App.tsx (lines 68-87)

---

## 📊 Implementation Status

| Page | Route | Status | Features |
|------|-------|--------|----------|
| Dashboard | `/admin` | ✅ Complete | KPIs, Charts, Audit Preview |
| Users | `/admin/users` | ✅ Complete | CRUD, Balance Adjust, Sorting |
| User Detail | `/admin/users/:userId` | 🟡 Partial | Route exists, uses Users component |
| Orders | `/admin/orders` | ✅ Complete | Filtering, Sorting, Regenerate Links |
| Order Detail | `/admin/orders/:taskId` | ✅ Complete | Full order info, logs, timeline |
| AI Jobs | `/admin/aijobs` | ✅ Complete | Job tracking and monitoring |
| AI Job Detail | `/admin/aijobs/:jobId` | 🟡 Partial | Route exists, uses AI Jobs component |
| Stock Sources | `/admin/stock-sources` | ✅ Complete | Provider catalog and status |
| File Archive | `/admin/files` | ✅ Complete | Download link management |
| Audit Trail | `/admin/audit` | ✅ Complete | Security and compliance logs |
| Settings | `/admin/settings` | ✅ Complete | Platform configuration view |

**Legend**:
- ✅ Complete: Fully implemented with all features
- 🟡 Partial: Route exists but uses parent component (detail view needed)
- ❌ Missing: Not implemented

---

## 🚀 Quick Access Links

### Main Admin Entry
- **Login & Access**: https://creative-studio-saas.pages.dev/admin

### Most Used Pages
1. **Dashboard**: https://creative-studio-saas.pages.dev/admin
2. **Orders**: https://creative-studio-saas.pages.dev/admin/orders
3. **Users**: https://creative-studio-saas.pages.dev/admin/users
4. **Audit Trail**: https://creative-studio-saas.pages.dev/admin/audit

### Support Tools
- **File Archive**: https://creative-studio-saas.pages.dev/admin/files
- **AI Jobs**: https://creative-studio-saas.pages.dev/admin/aijobs

### Configuration
- **Stock Sources**: https://creative-studio-saas.pages.dev/admin/stock-sources
- **Settings**: https://creative-studio-saas.pages.dev/admin/settings

---

## 📝 Notes

1. **Authentication Required**: All admin pages require a valid authenticated session with admin roles
2. **Live Site**: The domain https://creative-studio-saas.pages.dev is currently live and accessible
3. **Role Assignment**: Admin roles must be assigned in the Supabase database (see THIRD_PARTY_SETUP.md)
4. **Detail Pages**: Some detail pages (`:userId`, `:jobId`) currently reuse the list component - dedicated detail components recommended for better UX
5. **Real-time Updates**: Most pages have a "Refresh" button for fetching latest data
6. **Mobile Responsive**: All admin pages are responsive and work on mobile devices

---

## 🔗 Related Documentation

- **Complete Page Inventory**: `PAGE_INVENTORY.md`
- **Production Setup**: `README_PRODUCTION_STATUS.md`
- **Third-Party Configuration**: `THIRD_PARTY_SETUP.md`
- **Implementation Status**: `IMPLEMENTATION_COMPLETE.md`

---

**Last Updated**: October 29, 2025
**Domain**: https://creative-studio-saas.pages.dev
**Repository**: https://github.com/psdstocks-cloud/creative-studio-saas

