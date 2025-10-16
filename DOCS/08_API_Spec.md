# API Specification
**Date:** 2025-10-15

## Overview
RESTful API specification for WhatsApp Invoicer MVP. All authenticated endpoints require session cookie or JWT token.

## Authentication
- **Session:** Cookie-based (httpOnly, secure, sameSite=lax)
- **JWT:** Bearer token in `Authorization: Bearer <token>` header
- **Roles:** `admin` (full access), `staff` (limited access)

---

## WhatsApp Webhook

### GET /api/wa/webhook
**Purpose:** Verify webhook URL for WhatsApp Cloud API  
**Auth:** None (public)  
**Query Params:**
- `hub.mode` (string, required) — Must be "subscribe"
- `hub.verify_token` (string, required) — Must match `WHATSAPP_VERIFY_TOKEN`
- `hub.challenge` (string, required) — Echo this value back

**Response:**
- `200 OK` — Returns `hub.challenge` value as plain text
- `403 Forbidden` — Invalid verify token

**Example:**
```bash
curl "https://api.example.com/api/wa/webhook?hub.mode=subscribe&hub.verify_token=my_token&hub.challenge=test123"
# Response: test123
```

### POST /api/wa/webhook
**Purpose:** Receive incoming WhatsApp messages  
**Auth:** HMAC signature validation (`x-hub-signature-256`)  
**Headers:**
- `x-hub-signature-256: sha256=<hmac_hex>` (required)
- `Content-Type: application/json`

**Body:** WhatsApp Graph API webhook payload
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "PHONE_NUMBER_ID" },
        "messages": [{
          "id": "wamid.ABC123...",
          "from": "420123456789",
          "timestamp": "1642521600",
          "type": "text",
          "text": { "body": "faktura" }
        }]
      }
    }]
  }]
}
```

**Response:**
- `200 OK` — Message processed (always return 200 to acknowledge receipt)
- `403 Forbidden` — Invalid HMAC signature

**Processing Steps:**
1. Validate HMAC signature
2. Deduplicate message by ID
3. Check rate limit (10 msgs/min/phone)
4. Load/create conversation state (FSM)
5. Process message and update state
6. Send reply via WhatsApp API

---

## Authentication Endpoints

### POST /api/auth/signup
**Purpose:** Create new user account  
**Auth:** None  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "companyName": "Example s.r.o.",
  "ico": "12345678"
}
```

**Response:**
- `201 Created` — User created, returns session token
```json
{
  "userId": 1,
  "organizationId": 1,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Account created successfully"
}
```
- `400 Bad Request` — Validation error
- `409 Conflict` — Email already exists

### POST /api/auth/login
**Purpose:** Authenticate user  
**Auth:** None  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
- `200 OK` — Login successful
```json
{
  "userId": 1,
  "organizationId": 1,
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "7d"
}
```
- `401 Unauthorized` — Invalid credentials
- `403 Forbidden` — Account disabled

### POST /api/auth/logout
**Purpose:** End user session  
**Auth:** Session (any role)  
**Response:** `200 OK`

### GET /api/auth/me
**Purpose:** Get current user info  
**Auth:** Session (any role)  
**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "admin",
  "organizationId": 1,
  "organization": {
    "name": "Example s.r.o.",
    "ico": "12345678"
  }
}
```

---

## Invoice Endpoints

### GET /api/invoices
**Purpose:** List invoices with pagination and filters  
**Auth:** Session (admin/staff)  
**Query Params:**
- `page` (int, default: 1)
- `limit` (int, default: 50, max: 100)
- `status` (enum: draft, sent, paid, overdue, cancelled)
- `clientId` (int)
- `dateFrom` (YYYY-MM-DD)
- `dateTo` (YYYY-MM-DD)
- `search` (string) — Search by invoice number or client name
- `sortBy` (string: issue_date, total, status)
- `sortOrder` (asc/desc, default: desc)

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "2025-00001",
      "clientId": 5,
      "clientName": "Client ABC",
      "issueDate": "2025-01-15",
      "dueDate": "2025-01-29",
      "total": 3025.50,
      "currency": "CZK",
      "status": "sent",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### GET /api/invoices/:id
**Purpose:** Get invoice detail with items  
**Auth:** Session (admin/staff, same org)  
**Response:**
```json
{
  "id": 1,
  "invoiceNumber": "2025-00001",
  "variableSymbol": "202500001",
  "status": "sent",
  "issueDate": "2025-01-15",
  "dueDate": "2025-01-29",
  "deliveryDate": "2025-01-15",
  "currency": "CZK",
  "subtotal": 2500.00,
  "vatAmount": 525.00,
  "total": 3025.00,
  "pdfPath": "/data/invoices/1/2025/2025-00001.pdf",
  "notes": "Thank you for your business",
  "createdVia": "whatsapp",
  "createdAt": "2025-01-15T10:30:00Z",
  "sentAt": "2025-01-15T10:32:00Z",
  "paidAt": null,
  "client": {
    "id": 5,
    "name": "Client ABC",
    "ico": "87654321",
    "address": "Street 1, Prague 110 00"
  },
  "items": [
    {
      "id": 1,
      "position": 1,
      "description": "Consulting services",
      "quantity": 10.0,
      "unit": "hod",
      "unitPrice": 250.00,
      "vatRate": 21.00,
      "subtotal": 2500.00,
      "vatAmount": 525.00,
      "total": 3025.00
    }
  ]
}
```
- `404 Not Found` — Invoice doesn't exist
- `403 Forbidden` — Invoice belongs to different organization

### POST /api/invoices/preview
**Purpose:** Calculate totals before creating invoice  
**Auth:** Session (admin/staff)  
**Body:**
```json
{
  "items": [
    {
      "description": "Service A",
      "quantity": 2,
      "unitPrice": 1000,
      "vatRate": 21
    }
  ],
  "isVatPayer": true
}
```

**Response:**
```json
{
  "subtotal": 2000.00,
  "vatAmount": 420.00,
  "total": 2420.00,
  "items": [
    {
      "description": "Service A",
      "quantity": 2,
      "unitPrice": 1000.00,
      "vatRate": 21.00,
      "subtotal": 2000.00,
      "vatAmount": 420.00,
      "total": 2420.00
    }
  ]
}
```

### POST /api/invoices/create
**Purpose:** Create new invoice (called from webhook or web)  
**Auth:** Session (admin/staff) or internal (from webhook handler)  
**Body:**
```json
{
  "clientId": 5,
  "items": [
    {
      "description": "Consulting",
      "quantity": 10,
      "unitPrice": 250,
      "vatRate": 21,
      "unit": "hod"
    }
  ],
  "issueDate": "2025-01-15",
  "dueDate": "2025-01-29",
  "deliveryDate": "2025-01-15",
  "notes": "Payment terms: 14 days"
}
```

**Response:**
- `201 Created`
```json
{
  "invoiceId": 1,
  "invoiceNumber": "2025-00001",
  "variableSymbol": "202500001",
  "total": 3025.00,
  "pdfPath": "/data/invoices/1/2025/2025-00001.pdf",
  "pdfUrl": "/api/invoices/1/pdf"
}
```
- `400 Bad Request` — Validation error
- `500 Internal Server Error` — PDF generation failed

### PATCH /api/invoices/:id/status
**Purpose:** Update invoice status  
**Auth:** Session (admin/staff)  
**Body:**
```json
{
  "status": "paid",
  "paidAt": "2025-01-20T14:30:00Z"
}
```

**Response:** `200 OK` with updated invoice object

### POST /api/invoices/:id/resend
**Purpose:** Resend invoice PDF to WhatsApp  
**Auth:** Session (admin)  
**Response:**
- `200 OK` — PDF sent successfully
- `404 Not Found` — Invoice or PDF missing
- `500 Internal Server Error` — WhatsApp send failed

### GET /api/invoices/:id/pdf
**Purpose:** Download/stream invoice PDF  
**Auth:** Session (admin/staff, same org)  
**Response:**
- `200 OK` — PDF stream (Content-Type: application/pdf)
- `404 Not Found` — PDF file missing
- `403 Forbidden` — Not authorized

### GET /api/invoices/export/csv
**Purpose:** Export filtered invoices to CSV  
**Auth:** Session (admin/staff)  
**Query Params:** Same as GET /api/invoices  
**Response:**
- `200 OK` — CSV file (Content-Type: text/csv)
```csv
Invoice Number,Client,Issue Date,Due Date,Subtotal,VAT,Total,Status
2025-00001,Client ABC,2025-01-15,2025-01-29,2500.00,525.00,3025.00,sent
```

---

## Client Endpoints

### GET /api/clients
**Purpose:** List clients for current organization  
**Auth:** Session (admin/staff)  
**Query Params:**
- `page` (int, default: 1)
- `limit` (int, default: 50)
- `search` (string) — Search by name, IČO, or phone

**Response:**
```json
{
  "clients": [
    {
      "id": 5,
      "name": "Client ABC",
      "ico": "87654321",
      "email": "client@example.com",
      "phone": "420123456789",
      "city": "Prague",
      "invoiceCount": 12,
      "totalRevenue": 45000.00
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 25, "pages": 1 }
}
```

### GET /api/clients/:id
**Purpose:** Get client detail  
**Auth:** Session (admin/staff)  
**Response:**
```json
{
  "id": 5,
  "name": "Client ABC",
  "ico": "87654321",
  "dic": "CZ87654321",
  "addressStreet": "Street 1",
  "addressCity": "Prague",
  "addressZip": "110 00",
  "email": "client@example.com",
  "phone": "420123456789",
  "whatsappPhone": "420123456789",
  "notes": "Regular client",
  "createdAt": "2024-06-01T10:00:00Z"
}
```

### POST /api/clients
**Purpose:** Create new client  
**Auth:** Session (admin/staff)  
**Body:**
```json
{
  "name": "New Client Ltd.",
  "ico": "11223344",
  "dic": "CZ11223344",
  "addressStreet": "Street 10",
  "addressCity": "Brno",
  "addressZip": "602 00",
  "email": "contact@newclient.cz",
  "phone": "420987654321",
  "whatsappPhone": "420987654321"
}
```

**Response:** `201 Created` with client object

### PATCH /api/clients/:id
**Purpose:** Update client  
**Auth:** Session (admin/staff)  
**Body:** Partial client object  
**Response:** `200 OK` with updated client

### DELETE /api/clients/:id
**Purpose:** Delete client  
**Auth:** Session (admin only)  
**Response:**
- `200 OK` — Client deleted
- `409 Conflict` — Client has invoices (cannot delete)

---

## Organization/Settings Endpoints

### GET /api/organization
**Purpose:** Get current organization settings  
**Auth:** Session (admin/staff)  
**Response:**
```json
{
  "id": 1,
  "name": "Example s.r.o.",
  "ico": "12345678",
  "dic": "CZ12345678",
  "isVatPayer": true,
  "addressStreet": "Business St 1",
  "addressCity": "Prague",
  "addressZip": "110 00",
  "iban": "CZ6508000000192000145399",
  "bankName": "ČSOB",
  "defaultCurrency": "CZK",
  "defaultVatRate": 21.00,
  "invoicePrefix": "FV-",
  "invoiceNumberingStart": 1,
  "logoPath": "/uploads/logo.png"
}
```

### PATCH /api/organization
**Purpose:** Update organization settings  
**Auth:** Session (admin only)  
**Body:** Partial organization object  
**Response:** `200 OK` with updated organization

### POST /api/organization/logo
**Purpose:** Upload company logo  
**Auth:** Session (admin only)  
**Body:** multipart/form-data with `logo` file (max 2MB, jpg/png)  
**Response:**
```json
{
  "logoPath": "/uploads/logo_abc123.png"
}
```

---

## Dashboard/Analytics Endpoints

### GET /api/dashboard/stats
**Purpose:** Get dashboard KPIs  
**Auth:** Session (admin/staff)  
**Query Params:**
- `period` (enum: this_month, last_month, this_year, custom)
- `dateFrom` (YYYY-MM-DD, required if period=custom)
- `dateTo` (YYYY-MM-DD, required if period=custom)

**Response:**
```json
{
  "revenue": {
    "total": 125000.00,
    "currency": "CZK",
    "changePercent": 15.2
  },
  "vat": {
    "total": 26250.00,
    "currency": "CZK"
  },
  "unpaid": {
    "count": 8,
    "total": 35000.00,
    "overdue": 3
  },
  "invoices": {
    "total": 45,
    "draft": 2,
    "sent": 8,
    "paid": 32,
    "overdue": 3
  }
}
```

### GET /api/dashboard/recent
**Purpose:** Get recent invoices  
**Auth:** Session (admin/staff)  
**Query Params:** `limit` (int, default: 10)  
**Response:** Array of invoice objects

---

## Audit Log Endpoints

### GET /api/audit
**Purpose:** Get audit log entries  
**Auth:** Session (admin only)  
**Query Params:**
- `page`, `limit`
- `entityType` (invoice, client, organization, user)
- `entityId` (int)
- `action` (created, updated, deleted, sent, paid, cancelled)
- `userId` (int)
- `dateFrom`, `dateTo`

**Response:**
```json
{
  "entries": [
    {
      "id": 123,
      "entityType": "invoice",
      "entityId": 1,
      "action": "paid",
      "changes": {
        "status": { "before": "sent", "after": "paid" },
        "paidAt": { "before": null, "after": "2025-01-20T14:30:00Z" }
      },
      "userId": 2,
      "userName": "Staff User",
      "ipAddress": "192.168.1.100",
      "createdAt": "2025-01-20T14:30:05Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 250, "pages": 5 }
}
```

---

## Health/Utility Endpoints

### GET /api/health
**Purpose:** Health check endpoint (for monitoring)  
**Auth:** None  
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "gotenberg": "up"
  }
}
```

### GET /api/version
**Purpose:** Get API version  
**Auth:** None  
**Response:**
```json
{
  "version": "1.0.0",
  "buildDate": "2025-01-10",
  "environment": "production"
}
```

---

## Error Response Format

All errors follow consistent format:
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "errorId": "uuid-for-support-reference",
  "details": {
    "field": "Specific validation error"
  }
}
```

### HTTP Status Codes
- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Validation error
- `401 Unauthorized` — Not authenticated
- `403 Forbidden` — Not authorized
- `404 Not Found` — Resource doesn't exist
- `409 Conflict` — Duplicate or constraint violation
- `429 Too Many Requests` — Rate limit exceeded
- `500 Internal Server Error` — Unexpected error

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| WhatsApp webhook | 10 per phone | 1 minute |
| Authentication | 5 attempts | 15 minutes |
| Invoice creation | 20 requests | 1 minute |
| General API | 100 requests | 1 minute |

**Rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642525200
```

---

## Pagination

All list endpoints support pagination with consistent format:
```
?page=1&limit=50
```

Default: `page=1, limit=50`  
Max limit: `100`

Response includes `pagination` object:
```json
{
  "page": 1,
  "limit": 50,
  "total": 250,
  "pages": 5
}
```
