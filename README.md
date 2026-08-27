# Policy-Enforced AI Data Workspace (DBMCP)

> **"MCP is the access protocol. The workspace policy engine is the security boundary."**

A production-quality full-stack workspace that securely exposes documents (PDF, DOCX, TXT) and structured data (CSV, JSON) to AI models (Claude, Cursor, custom agents) through the **Model Context Protocol (MCP)**.

---

## 1. Product Architecture

The AI model **never** receives unrestricted access to underlying files, Supabase Storage, or the PostgreSQL database. Every request made through MCP passes through strict authentication, workspace isolation, policy evaluation, read-time transformation/anonymisation, and audit logging before any data is returned.

```
AI Model / Client (Claude, Cursor, Agents)
       │
       ▼
[ MCP Gateway ]  (/mcp JSON-RPC 2.0 endpoint)
       │
       ▼
[ Bearer Token Authentication ]  (Hashed credential verification)
       │
       ▼
[ Context-Derived Workspace Resolution ]  (Never trusts client-supplied workspace ID)
       │
       ▼
[ Policy Engine ]  (Operation rules, Resource rules, Precedence: DENY > ALLOW)
       │
       ├── Allowed? ── No ──► [ Audit Denied Event ] ──► Return Access Denied Error
       │
       ▼ Yes
[ Data Retrieval ]  (Processed text / structured rows from database & storage)
       │
       ▼
[ Anonymisation & Transformation Engine ]  (Mask, Redact, Pseudonymize, Remove)
       │
       ▼
[ Output Policy Validator & Indirect Leakage Guard ]
       │
       ▼
[ Audit Log Event ]  (Sanitized event saved without secrets or sensitive payload)
       │
       ▼
Filtered & Anonymised Response to AI Model
```

---

## 2. Local Setup Instructions

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ and npm
- Docker (optional for local multi-container development)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create your `.env` file from `.env.example`:
   ```bash
   cp ../.env.example .env
   ```
4. Run the automated test suite:
   ```bash
   python -m pytest -v
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Environment Variable Descriptions

All environment variables are declared in `.env.example`:

| Variable | Description |
|---|---|
| `APP_ENV` | Environment mode (`development`, `production`, `testing`). In `production`, default secrets are rejected at startup. |
| `APP_NAME` | Display name of the application. |
| `APP_URL` / `FRONTEND_URL` | Public URL of the frontend application. |
| `API_URL` | Public URL of the backend FastAPI service. |
| `PORT` | Web server port (Render assigns this dynamically). |
| `SECRET_KEY` | Secret key used for cryptographic operations. |
| `JWT_SECRET_KEY` | Secret key for signing user authentication JWT tokens. |
| `JWT_ALGORITHM` | JWT signing algorithm (default `HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| User access token lifetime in minutes (default `60`). |
| `REFRESH_TOKEN_EXPIRE_DAYS` | User refresh token lifetime in days (default `30`). |
| `DATABASE_URL` | Async connection string for PostgreSQL (e.g. `postgresql+asyncpg://...`) or SQLite (`sqlite+aiosqlite:///...`). |
| `SUPABASE_URL` | Supabase project URL for cloud file storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service role key (never sent to the frontend or AI model). |
| `SUPABASE_STORAGE_BUCKET` | Supabase bucket name for uploaded file binaries. |
| `WORKSPACE_HASH_SECRET` | Secret key used to salt deterministic pseudonymisation within workspaces. |
| `MCP_TOKEN_SECRET` | Secret key used to generate HMAC-SHA256 hashes of private MCP tokens. |
| `MCP_TOKEN_EXPIRE_DAYS` | Default lifetime in days for generated MCP credentials (default `30`). |
| `MCP_SESSION_SECRET` | Secret used for session-level state validation. |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins. |
| `MAX_UPLOAD_SIZE_MB` | Maximum allowed file upload size (default `50`). |
| `LOG_LEVEL` | Application logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

---

## 4. Database Migrations & Initialization

The backend uses SQLAlchemy 2.0 with asynchronous engine drivers (`asyncpg` for PostgreSQL and `aiosqlite` for local dev/testing).
- On application startup (`lifespan`), all tables (`users`, `workspaces`, `workspace_members`, `files`, `extracted_content`, `resource_policies`, `operation_policies`, `anonymisation_rules`, `mcp_credentials`, `audit_logs`) are automatically created.
- All workspace-owned resources contain `workspace_id` foreign keys and indices.
- All queries are strictly scoped by `workspace_id`.

---

## 5. Supabase Setup

To use Supabase for production PostgreSQL and Supabase Storage:
1. Create a project at [supabase.com](https://supabase.com).
2. Create a Storage Bucket named `workspace-files` with **Private** access.
3. In your Supabase Project Settings:
   - Copy the Database URI (Connection Pooling / Direct connection) and set `DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`.
   - Copy your Project URL and set `SUPABASE_URL`.
   - Copy your Service Role Key (`secret`) and set `SUPABASE_SERVICE_ROLE_KEY`.
4. The frontend **never** touches Supabase directly; all storage interactions flow through server-side authenticated backend endpoints.

---

## 6. Render Deployment Instructions

This repository is pre-configured for one-click deployment on [Render](https://render.com) using [`render.yaml`](file:///c:/Users/MUHAMMAD%20AHMAD/Downloads/DBMCP/render.yaml):

1. Push this repository to GitHub or GitLab.
2. In Render, select **Blueprints** → **New Blueprint Instance**.
3. Select your repository. Render will detect `render.yaml` and provision:
   - **Backend Web Service (`dbmcp-backend`)**: Python environment running `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   - **Frontend Web Service (`dbmcp-frontend`)**: Node environment running `npm run build && npm run start`.
4. Fill in the required environment variables in Render's dashboard (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Secret keys (`SECRET_KEY`, `JWT_SECRET_KEY`, `WORKSPACE_HASH_SECRET`, `MCP_TOKEN_SECRET`) are automatically generated by Render with high entropy.

---

## 7. MCP Credential Generation

Private high-entropy MCP tokens are generated per workspace:
1. Log in to the application and open your workspace.
2. Navigate to the **MCP Access** tab.
3. Click **Generate New Token**.
4. The system:
   - Generates a cryptographically random token: `mcp_live_<prefix>_<secret_entropy>`.
   - Calculates the `HMAC-SHA256` hash of the token.
   - Stores **only the hash** and the public prefix in the database.
   - Reveals the raw token **once** in a modal.
5. The raw token cannot be retrieved or reconstructed after the modal is closed.
6. You can **Rotate** credentials (invalidates the previous token immediately) or **Revoke** credentials at any time.

---

## 8. MCP Connection Configuration

### Connecting to Claude Desktop
Add your workspace MCP server to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-workspace": {
      "url": "https://your-api.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer mcp_live_YOUR_PREFIX_YOUR_SECRET"
      }
    }
  }
}
```

### Direct cURL / Protocol Test
```bash
curl -X POST https://your-api.onrender.com/mcp \
  -H "Authorization: Bearer mcp_live_YOUR_PREFIX_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "workspace_info",
      "arguments": {}
    }
  }'
```

### Supported Read-Only MCP Tools
- `workspace_info`: Returns workspace name, active policies overview, supported capabilities.
- `list_resources`: Lists permitted documents; filters out any resource denied by policy.
- `get_resource_metadata`: Returns file metadata without exposing raw storage URLs or internal paths.
- `search`: Scoped full-text keyword search returning policy-anonymised snippets.
- `read_resource`: Reads document text after evaluating access policies and executing anonymisation transformations.
- `get_dataset_schema`: Inspects CSV/JSON schemas while omitting restricted fields.
- `query_dataset`: Tabular projection, filtering, and aggregation. Strictly rejects queries targeting restricted columns.

---

## 9. Security Model & Invariants

> **The MCP connection credential provides authentication to a workspace.**
> 
> **Authentication alone does not bypass workspace policies.**
> 
> **Every MCP operation is evaluated against access policies and anonymisation rules before data is returned.**

### Security Invariants
1. **No Raw Storage Access**: AI models can never access raw Supabase Storage URLs or execute raw SQL queries.
2. **Context-Derived Isolation**: MCP tools never accept a client-provided `workspace_id`. The workspace context is derived solely from the verified bearer credential.
3. **Precedence Hierarchy**:
   - Explicit `DENY` overrides `ALLOW`.
   - Specific resource policies override workspace default rules.
   - Transformations apply only to allowed reads.
4. **Deterministic Pseudonymisation**:
   - An entity (e.g. `John Smith`) consistently becomes `Person_042` inside Workspace A.
   - Inside Workspace B, the same name maps to a completely different pseudonym due to workspace salting.
   - Pseudonym mappings are never exposed to the AI model.
5. **Indirect Information Leakage Protection**:
   - If a structured column (e.g. `salary`) is denied, any `SELECT`, `WHERE`, or aggregation (`AVG(salary)`, `MAX(salary)`) referencing that column is denied immediately.
6. **Leak-Free Audit Logs**:
   - Security operations are audited with actor type, operation, decision, and reason.
   - Passwords, MCP secrets, and raw document contents are stripped before persisting logs.

---

## 10. Known MVP Limitations

1. **In-Memory Rate Limiting**: The MVP rate limiter uses a sliding window in-memory implementation suitable for single-instance deployments on Render. For distributed multi-instance clusters, a Redis-backed adapter can be swapped behind the `RateLimiterInterface`.
2. **Synchronous Text Extraction**: File uploads extract text and detect PII synchronously or via background tasks within the FastAPI process. Large file volumes can later be routed to an external queue without modifying the policy or MCP layers.
3. **Search Mechanism**: Uses case-insensitive substring and full-text matching in PostgreSQL/SQLite. The `SearchService` interface is modular and ready for vector embeddings when desired.
