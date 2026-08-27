You are a senior full-stack, backend, security, and AI infrastructure engineer. Build a production-quality MVP for a policy-enforced AI data workspace that securely exposes documents and structured data to AI models through MCP.

The core product principle is:

**MCP is the access protocol. The workspace policy engine is the security boundary.**

The AI model must never receive unrestricted access to underlying files or storage. Every request made through MCP must be authenticated, authorized, evaluated against workspace policies, transformed when necessary, and logged before any data is returned.

## 1. Technology Stack

Use the following stack:

* Frontend: Next.js with TypeScript
* Backend API: FastAPI with Python
* MCP server: Python implementation integrated into the FastAPI backend
* Hosting target: Render
* Database: Supabase PostgreSQL
* Authentication: Application-level username and password authentication
* File storage: Supabase Storage
* ORM/database access: SQLAlchemy or another mature async PostgreSQL-compatible Python ORM
* Password hashing: Argon2 or bcrypt
* File processing: Python libraries appropriate for PDF, DOCX, TXT, CSV, and JSON
* Background processing: FastAPI application processes/tasks only for MVP; do not use Redis
* Do not introduce Redis, Celery, RabbitMQ, Kafka, or other message queues
* Keep the architecture modular so a queue can be introduced later without major rewrites

The MVP should be deployable on Render.

## 2. Environment Variables

Do not hardcode secrets, credentials, URLs, private keys, API keys, database credentials, or storage credentials.

Create an `.env.example` file containing all required variables. Use descriptive placeholder values only.

Include at minimum:

```env
# Application
APP_ENV=development
APP_NAME=Policy Enforced AI Workspace
APP_URL=
API_URL=
FRONTEND_URL=

# Backend Security
SECRET_KEY=
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Database
DATABASE_URL=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=

# Workspace and MCP Security
WORKSPACE_HASH_SECRET=
MCP_TOKEN_SECRET=
MCP_TOKEN_EXPIRE_DAYS=30
MCP_SESSION_SECRET=

# Encryption
DATA_ENCRYPTION_KEY=

# Optional AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Logging
LOG_LEVEL=INFO

# File Limits
MAX_UPLOAD_SIZE_MB=50
MAX_FILES_PER_WORKSPACE=100

# CORS
ALLOWED_ORIGINS=

# Render
PORT=8000
```

Document what every environment variable is used for.

The application must fail safely if required secrets are missing in production.

## 3. Product Overview

The application allows a user to:

1. Create an account.
2. Log in using username and password.
3. Create one or more workspaces.
4. Upload files to a workspace.
5. Configure access rules for files and datasets.
6. Configure anonymisation rules.
7. Configure operation-level permissions.
8. Generate a private MCP connection for the workspace.
9. Provide the MCP connection to an AI model or MCP-compatible client.
10. Allow the model to access only the information permitted by the workspace policies.
11. View audit logs showing what was requested and whether access was allowed or denied.

Supported MVP file types:

* PDF
* DOCX
* TXT
* CSV
* JSON

The architecture should make it easy to add additional data sources later.

## 4. Core Security Principle

Never implement direct MCP access to Supabase Storage or the PostgreSQL database.

This is prohibited:

```text
AI Model
   ↓
MCP
   ↓
Supabase Storage
```

The required architecture is:

```text
AI Model
   ↓
MCP Gateway
   ↓
Authentication
   ↓
Workspace Resolution
   ↓
Authorization
   ↓
Policy Engine
   ↓
Anonymisation / Transformation
   ↓
Storage or Database
   ↓
Policy Enforcement on Response
   ↓
AI Model
```

Every single MCP request must go through this pipeline.

There must be no MCP tool that exposes unrestricted file URLs, Supabase credentials, raw storage paths, database credentials, or unrestricted database queries.

## 5. Workspace Architecture

A workspace is the primary security boundary.

Each workspace contains:

```text
Workspace
├── Owner
├── Members
├── Files
├── Datasets
├── Access Policies
├── Anonymisation Policies
├── Operation Policies
├── MCP Credentials
├── MCP Sessions
└── Audit Logs
```

Each workspace must have:

* Internal UUID
* Human-readable name
* Owner user ID
* Creation timestamp
* Update timestamp
* Private MCP identifier
* Private MCP secret or credential configuration
* Active/inactive status

The internal workspace UUID must not be treated as a secret.

## 6. User Authentication

Implement username and password authentication.

Requirements:

* Username must be unique.
* Passwords must never be stored in plaintext.
* Passwords must be hashed using Argon2 or bcrypt.
* Login returns a secure application session or JWT-based access and refresh token mechanism.
* Users can only access workspaces for which they are authorized.
* Workspace ownership must be checked server-side.
* Do not rely on frontend authorization for security.

For MVP roles, implement:

```text
OWNER
MEMBER
```

OWNER can:

* Manage workspace
* Upload files
* Delete files
* Create policies
* Modify policies
* Generate/revoke MCP credentials
* View audit logs
* Manage members

MEMBER can initially:

* Access the workspace based on permissions
* Upload only if explicitly allowed
* Access files only through policies

Keep the role system extensible.

## 7. Private MCP Access

The MCP connection must be private.

Do not expose a public workspace endpoint that anyone can access merely by knowing a workspace ID.

Use a private high-entropy credential generated for MCP access.

Conceptually, the user may receive a connection URL such as:

```text
https://api.example.com/mcp/connect/<private-high-entropy-token>
```

However, do not treat obscurity alone as the only security mechanism.

The MCP token must:

* Be generated using cryptographically secure randomness.
* Have sufficient entropy.
* Be stored securely.
* Prefer storing only a hash of the token in the database.
* Be associated with exactly one workspace.
* Be revocable.
* Be rotatable.
* Support expiration.
* Be independently disableable.

Recommended flow:

```text
User creates workspace
       ↓
User generates MCP credential
       ↓
System generates:
  Public credential identifier
  Private high-entropy secret
       ↓
System stores only secret hash
       ↓
User receives private credential once
       ↓
User configures Claude or another MCP client
       ↓
Client authenticates to MCP server
       ↓
MCP server validates credential
       ↓
Workspace is resolved
       ↓
Policies are applied
```

The raw private token should never be returned again after creation.

Provide a "rotate MCP credential" operation.

Rotating credentials must immediately invalidate the previous credential.

Provide a "revoke MCP access" operation.

Revoked credentials must immediately fail authentication.

## 8. MCP Authentication Requirement

The MCP server must not allow anonymous access.

Every MCP request must require valid workspace credentials.

The MCP authentication layer must:

1. Extract the MCP credential.
2. Validate it.
3. Check expiration.
4. Check revocation.
5. Resolve the associated workspace.
6. Create an authenticated request context.
7. Pass that context to every MCP tool.

The authenticated request context should conceptually contain:

```python
AuthenticatedMCPContext(
    workspace_id,
    credential_id,
    authenticated=True,
    permissions,
    policy_version
)
```

MCP tools must never accept a workspace ID from the AI model and trust it without validation.

The workspace must always come from the authenticated credential context.

Prevent a model connected to Workspace A from requesting Workspace B.

## 9. MCP Transport Security

Require HTTPS in production.

Reject insecure configuration in production where possible.

Use CORS and origin validation appropriate for the selected MCP transport.

Never expose:

* Database credentials
* Supabase service role key
* Storage credentials
* Internal encryption keys
* Other users' MCP credentials
* Raw unprotected storage URLs

The backend should communicate with Supabase using server-side credentials only.

The frontend must never receive the Supabase service role key.

## 10. File Upload Architecture

The upload pipeline should be:

```text
User
 ↓
Authentication
 ↓
Workspace Authorization
 ↓
Upload Validation
 ↓
File Size Validation
 ↓
File Type Validation
 ↓
Storage
 ↓
Create File Record
 ↓
Text Extraction
 ↓
Entity / PII Detection
 ↓
Store Extracted Metadata
 ↓
Ready for Policy Enforcement
```

Validate:

* File extension
* MIME type where available
* File size
* Workspace ownership
* Upload permissions

For MVP, use Supabase Storage for original file storage.

Do not expose the original storage object directly through MCP.

Store metadata in PostgreSQL.

## 11. File Data Model

Each file should contain fields similar to:

```text
id
workspace_id
original_filename
storage_path
content_type
file_size
file_type
status
uploaded_by
created_at
updated_at
```

File status may include:

```text
UPLOADING
PROCESSING
READY
FAILED
DELETED
```

Do not expose `storage_path` to MCP clients unless there is a specific secure reason.

## 12. Extracted Content

For each file, store a processed representation separate from the original file.

Conceptually:

```text
Original File
      │
      ├── Original binary in storage
      │
      ├── Extracted text
      │
      ├── Detected PII/entities
      │
      ├── Structured metadata
      │
      └── Policy-transformed response generated at access time
```

Do not permanently overwrite the original document when anonymisation is configured.

Policies should generally be applied at read time.

This allows policy changes to take effect without modifying the original data.

## 13. Access Policies

Implement three distinct policy categories.

### A. Resource Access Policies

Control whether a resource can be accessed.

Example:

```text
File: employee_records.pdf
Operation: read
Decision: allow
```

or:

```text
File: financial_report.pdf
Operation: read
Decision: deny
```

Policies must be evaluated before data retrieval.

### B. Anonymisation Policies

Control how allowed information is transformed.

Supported MVP transformations:

```text
ALLOW
REMOVE
REDACT
MASK
PSEUDONYMIZE
```

Examples:

```text
email → MASK
phone → REMOVE
ssn → REMOVE
person_name → PSEUDONYMIZE
```

### C. Operation Policies

Control which MCP operations are permitted.

Examples:

```text
list_resources → ALLOW
search → ALLOW
read_resource → ALLOW
download_original → DENY
query_dataset → ALLOW
export_dataset → DENY
```

The policy engine must evaluate all relevant policy categories.

## 14. Policy Evaluation

Create a dedicated policy engine.

Do not scatter authorization logic throughout MCP tools.

Every protected operation should conceptually call:

```python
decision = policy_engine.evaluate(
    workspace_id=workspace_id,
    actor=authenticated_context,
    resource=resource,
    operation=operation
)
```

The result should contain:

```text
ALLOW
DENY
ALLOW_WITH_TRANSFORMATION
```

The policy engine should also return applicable transformation rules.

Example:

```python
PolicyDecision(
    allowed=True,
    transformations=[
        MaskEmail(),
        RemovePhone(),
        PseudonymizeNames()
    ],
    policy_version=12
)
```

Use a clear policy precedence model.

For MVP:

1. Explicit deny overrides allow.
2. More specific resource rules override workspace defaults.
3. If no allow rule exists for a sensitive operation, deny by default.
4. Transformation rules apply only after access is allowed.
5. Policy decisions must be logged.

Default-deny is required for MCP access.

## 15. Anonymisation Engine

Implement an anonymisation/transformation engine independent of the MCP implementation.

The engine should accept:

```python
data
+
policy_rules
+
workspace_context
```

and return transformed data.

Examples:

Original:

```text
John Smith
john.smith@example.com
+1 555 123 4567
SSN: 123-45-6789
```

Policy:

```text
name → PSEUDONYMIZE
email → MASK
phone → REMOVE
ssn → REMOVE
```

Result:

```text
Person_001
j***@example.com
```

Pseudonymization should be deterministic within a workspace where appropriate.

For example:

```text
John Smith
```

should consistently become:

```text
Person_001
```

inside the same workspace.

However, the pseudonym mapping must not be exposed to the AI model.

Use a workspace-specific secret or salt where appropriate.

## 16. Structured Data Policies

CSV and JSON data should support field-level policies.

Example dataset:

```text
name
email
phone
salary
department
```

Rules:

```text
name → PSEUDONYMIZE
email → MASK
phone → REMOVE
salary → DENY
department → ALLOW
```

The model must not receive restricted fields.

Do not implement a generic unrestricted SQL execution tool.

For MVP, expose controlled operations such as:

```text
get_schema
list_columns
query_dataset
aggregate_dataset
```

Validate requested fields before query execution.

The policy engine must inspect:

* Requested columns
* Requested rows where applicable
* Filters
* Aggregations
* Output fields

If a query requests restricted information, deny or rewrite the query safely.

## 17. Indirect Information Leakage

Design for indirect leakage.

A restricted field must not become exposed simply because an AI model asks for an aggregation.

Example:

```text
salary → restricted
```

The following must also be policy controlled:

```text
What is the highest salary?
What is the average salary?
How many employees earn above $100,000?
```

For MVP, if a field is denied, aggregations or filters directly referencing that field must also be denied.

Do not attempt advanced differential privacy for the MVP unless required.

Keep the architecture extensible for future aggregation privacy controls.

## 18. MCP Tools

Implement a limited set of read-only MCP tools.

Recommended MVP tools:

```text
workspace_info
list_resources
get_resource_metadata
search
read_resource
get_dataset_schema
query_dataset
```

Every tool must:

1. Use the authenticated workspace context.
2. Verify operation permission.
3. Resolve the requested resource inside that workspace only.
4. Evaluate resource policy.
5. Retrieve data.
6. Apply anonymisation rules.
7. Validate output.
8. Log the operation.
9. Return only permitted information.

Never implement:

```text
download_original_file
get_storage_url
execute_raw_sql
execute_shell_command
```

for the MVP.

## 19. MCP Tool Example

The conceptual implementation of reading a file should follow:

```python
async def read_resource(context, resource_id):

    workspace_id = context.workspace_id

    resource = await resource_service.get_resource(
        workspace_id=workspace_id,
        resource_id=resource_id
    )

    if resource is None:
        raise ResourceNotFound()

    decision = await policy_engine.evaluate(
        workspace_id=workspace_id,
        actor=context,
        resource=resource,
        operation="read_resource"
    )

    if not decision.allowed:
        await audit_service.log_denied_access(...)
        raise AccessDenied()

    content = await resource_service.get_processed_content(
        resource
    )

    safe_content = anonymisation_engine.apply(
        content=content,
        transformations=decision.transformations,
        workspace_id=workspace_id
    )

    safe_content = output_policy_validator.validate(
        safe_content,
        decision
    )

    await audit_service.log_success(...)

    return safe_content
```

Do not copy this blindly if framework requirements differ, but preserve this security model.

## 20. Search

Implement workspace-scoped search.

Search must:

* Only search resources in the authenticated workspace.
* Respect file-level access policies.
* Never return restricted metadata or snippets.
* Apply anonymisation to returned snippets.
* Avoid leaking restricted data through search ranking or snippets.

For MVP, PostgreSQL full-text search is sufficient.

Do not add a separate vector database initially.

Design the search service so vector search can be added later.

## 21. Audit Logging

Every security-relevant operation must generate an audit event.

Store:

```text
id
workspace_id
actor_type
credential_id
user_id if applicable
operation
resource_type
resource_id
decision
reason
policy_version
timestamp
request_metadata
```

Do not log sensitive document contents unnecessarily.

Do not log raw passwords.

Do not log raw MCP secrets.

Audit examples:

```text
MCP_AUTH_SUCCESS
MCP_AUTH_FAILURE
RESOURCE_LISTED
RESOURCE_READ
RESOURCE_ACCESS_DENIED
SEARCH_EXECUTED
DATASET_QUERY_ALLOWED
DATASET_QUERY_DENIED
MCP_TOKEN_CREATED
MCP_TOKEN_ROTATED
MCP_TOKEN_REVOKED
POLICY_CREATED
POLICY_UPDATED
FILE_UPLOADED
```

The workspace owner must be able to view audit logs through the frontend.

## 22. Database Schema

Create migrations and tables approximately equivalent to:

```text
users
workspaces
workspace_members
files
extracted_content
resource_policies
anonymisation_rules
operation_policies
mcp_credentials
audit_logs
```

Recommended relationships:

```text
User
  │
  ├── owns → Workspaces
  │
  └── belongs to → Workspace Members

Workspace
  │
  ├── Files
  ├── Policies
  ├── MCP Credentials
  └── Audit Logs
```

All workspace-owned resources must contain `workspace_id`.

Every database query involving a workspace resource must be scoped by `workspace_id`.

Do not fetch resources globally and then check workspace ownership afterward when a properly scoped query can be used.

## 23. MCP Credential Table

Store approximately:

```text
id
workspace_id
credential_prefix
secret_hash
name
created_at
expires_at
revoked_at
last_used_at
```

Never store the raw secret.

When creating a credential:

1. Generate the raw secret using a cryptographically secure generator.
2. Return the raw secret to the user exactly once.
3. Hash the secret.
4. Store only the hash.
5. Store a non-sensitive prefix for identification.

Example display:

```text
mcp_live_abcd...xyz
```

Do not store the full value.

## 24. Frontend Pages

Build:

### Authentication

```text
/login
/register
```

### Workspace

```text
/dashboard
/workspaces/new
/workspaces/[workspaceId]
```

Workspace page sections:

```text
Overview
Files
Policies
Anonymisation
MCP Access
Audit Logs
Settings
```

### Files

Allow:

* Upload
* View metadata
* Delete
* View processing status

### Policies

Allow workspace owners to:

* Define resource rules
* Define operation permissions
* Define anonymisation rules

### MCP Access

Allow:

* Create MCP credential
* Name credential
* View credential prefix
* View creation date
* View last-used timestamp
* Revoke credential
* Rotate credential

The raw credential must be displayed only once immediately after creation.

Show a clear warning that the credential grants access according to workspace policies and must be treated as sensitive.

## 25. API Design

Create clear API boundaries.

Example:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /workspaces
POST   /workspaces
GET    /workspaces/{id}
DELETE /workspaces/{id}

GET    /workspaces/{id}/files
POST   /workspaces/{id}/files
GET    /workspaces/{id}/files/{file_id}
DELETE /workspaces/{id}/files/{file_id}

GET    /workspaces/{id}/policies
POST   /workspaces/{id}/policies
PUT    /workspaces/{id}/policies/{policy_id}
DELETE /workspaces/{id}/policies/{policy_id}

GET    /workspaces/{id}/mcp-credentials
POST   /workspaces/{id}/mcp-credentials
POST   /workspaces/{id}/mcp-credentials/{credential_id}/rotate
POST   /workspaces/{id}/mcp-credentials/{credential_id}/revoke

GET    /workspaces/{id}/audit-logs
```

The MCP endpoint should be implemented separately and should not trust user-supplied workspace IDs.

Conceptually:

```text
/mcp
```

Authentication should determine the workspace.

Alternatively, if the selected MCP transport requires a credential identifier in the path, the path identifier must still be paired with a secret authentication mechanism.

## 26. Error Handling

Security-sensitive errors should not reveal unnecessary information.

For MCP authentication failures, do not reveal whether:

* The workspace exists.
* The credential prefix exists.
* The credential expired.
* The credential was revoked.

Return a generic authentication failure to unauthenticated callers.

Internally log the detailed reason.

## 27. Rate Limiting

Implement basic rate limiting where possible for:

* Login
* Registration
* MCP authentication
* File upload

Prevent brute-force attacks against MCP credentials.

Keep the implementation compatible with Render and do not require Redis.

For a single-instance MVP, an in-process rate limiter is acceptable, but clearly isolate it behind an interface so it can later be replaced with a distributed implementation.

Document this limitation.

## 28. Security Requirements

The application must:

* Use HTTPS in production.
* Use secure password hashing.
* Use secure random generation for credentials.
* Never expose raw database credentials.
* Never expose Supabase service role keys.
* Never store plaintext passwords.
* Never store raw MCP secrets.
* Default deny MCP access.
* Scope all resources to workspaces.
* Validate all user input.
* Validate file uploads.
* Apply policies server-side.
* Log security-sensitive actions.
* Support credential revocation.
* Support credential rotation.
* Avoid unrestricted database access.
* Avoid unrestricted storage access.
* Prevent cross-workspace access.

Do not claim that the system is absolutely secure or "impossible to access without permission." Instead, implement defense-in-depth and clearly document the remaining security assumptions.

The primary security guarantee for the MVP should be:

**A valid, non-expired, non-revoked MCP credential is required to access a workspace through MCP, and every authenticated request is further constrained by the workspace policy engine.**

## 29. Testing

Implement automated tests for at minimum:

### Authentication

* Registration
* Login
* Incorrect password
* Duplicate username
* Password hashing

### Workspace Isolation

* User A cannot access User B workspace.
* MCP credential for Workspace A cannot access Workspace B.
* Resource ID from another workspace cannot be read.

### MCP Credentials

* Valid credential works.
* Invalid credential fails.
* Revoked credential fails.
* Expired credential fails.
* Rotated old credential fails.
* Raw credentials are not stored in the database.

### Policies

* Explicit deny overrides allow.
* Restricted resource cannot be read.
* Masking works.
* Removal works.
* Pseudonymisation is deterministic inside one workspace.
* Different workspaces do not necessarily produce the same pseudonym.
* Restricted structured-data fields cannot be queried.
* Aggregations over restricted fields are denied.

### Audit Logging

* Allowed requests create logs.
* Denied requests create logs.
* Secrets are not included in logs.

## 30. Project Structure

Use a modular structure similar to:

```text
project/
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── workspaces/
│   │   ├── resources/
│   │   ├── policies/
│   │   ├── anonymisation/
│   │   ├── mcp/
│   │   ├── audit/
│   │   ├── database/
│   │   └── security/
│   │
│   ├── tests/
│   └── migrations/
│
├── .env.example
├── README.md
└── docker-compose.yml
```

Docker support is optional but preferred for local development.

Do not require Docker for deployment to Render.

## 31. Development Priorities

Build in this order:

### Phase 1

* Authentication
* Database
* Workspace creation
* Workspace isolation

### Phase 2

* File upload
* Supabase Storage
* File metadata
* Text extraction

### Phase 3

* Policy engine
* File-level access
* Anonymisation

### Phase 4

* MCP authentication
* MCP tools
* Policy-enforced MCP access

### Phase 5

* Audit logs
* Credential rotation/revocation
* Security tests

### Phase 6

* Frontend polish
* Deployment configuration
* Documentation

## 32. Documentation

Create a README containing:

1. Product architecture.
2. Local setup instructions.
3. Environment variable descriptions.
4. Database migration instructions.
5. Supabase setup.
6. Render deployment instructions.
7. MCP credential generation.
8. MCP connection configuration.
9. Security model.
10. Known MVP limitations.

Include a section explaining:

```text
The MCP connection credential provides authentication to a workspace.

Authentication alone does not bypass workspace policies.

Every MCP operation is evaluated against access policies and anonymisation rules before data is returned.
```

## 33. Final Engineering Constraint

Prioritize correctness and security boundaries over unnecessary complexity.

This is an MVP. Do not introduce microservices, Redis, Kafka, Celery, Kubernetes, or distributed infrastructure.

Use a modular monolith architecture:

```text
One application
├── Authentication module
├── Workspace module
├── File module
├── Policy engine
├── Anonymisation engine
├── MCP gateway
└── Audit service
```

The architecture must allow these components to be separated later.

The most important invariant is:

**There must be no code path through which an MCP client can access original workspace data without passing through authentication, workspace isolation, authorization, policy evaluation, and anonymisation/output filtering.**

Before considering the implementation complete, review the code specifically for bypass paths and cross-workspace data access vulnerabilities.
