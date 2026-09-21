# DBMCP: Policy-Enforced AI Data Workspace

DBMCP is a full-stack platform designed to provide AI models and autonomous agents with secure, policy-governed access to enterprise documents and structured datasets. By operating as a Model Context Protocol (MCP) server, DBMCP establishes an enforcement layer between AI clients (such as Claude, ChatGPT, Cursor, and custom agent frameworks) and underlying storage backends.

The platform ensures that an AI model never interacts directly with raw databases or file storage. Every tool invocation and data request is authenticated, mapped to an isolated workspace, evaluated against granular access policies, filtered through an anonymisation engine, and logged in an immutable audit trail before any output is returned to the model.

## System Architecture

The system operates across three primary layers: the client interaction layer, the core application and security gateway, and the persistence storage layer.

```
+-------------------------------------------------------------------+
| AI Clients & Integrations (Claude Desktop, Cursor, Custom Agents) |
+-------------------------------------------------------------------+
                                  |
                                  | JSON-RPC 2.0 over HTTP (/mcp)
                                  v
+-------------------------------------------------------------------+
| MCP Gateway & Authentication Layer                                |
| - Bearer Token Validation (HMAC-SHA256 hashed credentials)        |
| - Scope Resolution (Workspace Token vs Account Master Token)      |
| - Sliding Window In-Memory Rate Limiting                          |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Policy & Governance Engine                                        |
| - Operation Policies (File reads, search, dataset mutations)      |
| - Resource Policies (File-level access controls)                  |
| - Rule Precedence: Explicit DENY overrides ALLOW                  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Data Execution & Mutation Engines                                 |
| - Structured Tabular Engine (CSV, XLSX, JSON filtering/updates)   |
| - Document Extraction & Search (PDF, DOCX, TXT keyword index)     |
| - Generative UI Form Engine (Short-lived signed entry sessions)   |
| - Workspace Note Studio (Markdown scratchpads with file linking)  |
| - AI Guidance Playbook System (Platform rules and workflows)      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Anonymisation & Information Redaction Layer                       |
| - PII Entity Detection (Regex and dictionary detection)           |
| - Transformations: MASK, REDACT, PSEUDONYMIZE, REMOVE             |
| - Deterministic Pseudonymisation using workspace-specific salt    |
| - Indirect Column Leakage Guard (Block aggregations on denied col)|
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| Storage & Persistence Layer                                       |
| - PostgreSQL / SQLite (Application state, policies, audit logs)   |
| - Supabase Storage / Local Storage (Encrypted file binaries)      |
+-------------------------------------------------------------------+
```

### Request Lifecycle

1. Authentication: The incoming request reaches the `/mcp` endpoint with an `Authorization: Bearer <token>` header. The token is hashed via HMAC-SHA256 and matched against stored credential hashes. The workspace context is derived solely from the credential record; client-provided workspace identifiers are never trusted.

2. Policy Evaluation: The requested tool and target resource ID are checked by the Policy Engine. If a matching policy rule evaluates to DENY, or if no ALLOW rule covers the operation, the request is rejected immediately with an audit log record.

3. Execution: If permitted, the service executes the requested operation. For structured tabular datasets, queries execute against in-memory or persisted tables. For document reading, processed content is loaded.

4. Transformation: Any string or tabular output passes through the Anonymisation Engine. Configured rules transform sensitive fields (e.g., masking credit card numbers or replacing names with salted pseudonyms).

5. Audit Logging: The result metadata, actor details, execution timestamp, and decision outcomes are recorded in the audit log table. Passwords, private keys, and sensitive raw payloads are stripped prior to storage.

6. Response Delivery: The clean, policy-compliant response is returned to the AI client in standard JSON-RPC 2.0 format.

## Directory Structure and File Organization

The repository is structured as a monorepo containing a Python FastAPI backend, a Next.js 14 frontend, tests, configuration templates, and deployment specifications.

```
DBMCP/
├── backend/                  # FastAPI Application and MCP Server
│   ├── app/                  # Application source code
│   │   ├── account_mcp/      # Account-level master MCP router and services
│   │   ├── admin/            # Administrative management router
│   │   ├── anonymisation/    # PII detection and text transformation engine
│   │   ├── audit/            # Audit logging service
│   │   ├── auth/             # User authentication, registration, JWT handling
│   │   ├── core/             # Base security, crypto, rate limiting utilities
│   │   ├── database/         # SQLAlchemy models, sessions, database seeding
│   │   ├── files/            # File extraction and format parsers
│   │   ├── forms/            # Generative UI data entry web forms
│   │   ├── guidance/         # AI guidance playbooks and rules router
│   │   ├── mcp/              # MCP protocol server and tool definitions
│   │   ├── notes/            # Structured workspace notes router and logic
│   │   ├── policies/         # Access policy engine and schema definitions
│   │   ├── resources/        # Resource metadata and file management
│   │   ├── search/           # Full-text and keyword search engine
│   │   ├── storage/          # Supabase storage adapter
│   │   ├── structured/       # Tabular data query and mutation engine
│   │   ├── workspaces/       # Workspace lifecycle and membership management
│   │   ├── config.py         # Application settings loaded from environment
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # Automated Pytest test suite
│   ├── pytest.ini            # Pytest configuration
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js 14 Frontend Application
│   ├── app/                  # App Router pages and layouts
│   │   ├── (auth)/           # Authentication pages (login, register)
│   │   ├── admin/            # Admin dashboard and telemetry viewer
│   │   ├── dashboard/        # Workspace overview and creation
│   │   ├── forms/            # Standalone generative UI form renderer
│   │   ├── settings/         # User profile and account configuration
│   │   ├── workspaces/       # Workspace tabs: files, policies, notes, MCP keys
│   │   ├── globals.css       # Tailwind CSS and design tokens
│   │   ├── layout.tsx        # Root HTML layout and provider wrapper
│   │   ├── Navbar.tsx        # Top navigation component
│   │   └── page.tsx          # Public landing page
│   ├── lib/                  # Frontend utilities, types, and API client
│   │   ├── api.ts            # Typed HTTP client communicating with backend
│   │   ├── auth.ts           # Client-side session and token storage
│   │   ├── types.ts          # Shared TypeScript interfaces
│   │   └── utils.ts          # UI formatting helpers
│   ├── public/               # Static images and client skill guides
│   ├── package.json          # Node dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
├── .env.example              # Sample environment variable configuration
├── docker-compose.yml        # Multi-container local orchestration
├── render.yaml               # Render blueprint configuration for deployments
└── README.md                 # Project documentation
```

### Detailed Component Overview

#### Backend Modules (`backend/app/`)

* `main.py`: Creates the FastAPI application instance, configures CORS middleware, sets up exception handlers, attaches all API routers, and defines the lifespan context manager that initializes database tables on startup.
* `config.py`: Implements a Pydantic BaseSettings class that reads and validates environment variables, setting defaults for JWT lifetimes, upload size limits, and database connection strings.

* `core/`:
  * `security.py`: Password hashing with bcrypt, JWT token creation, and HMAC-SHA256 signature verification.
  * `rate_limit.py`: In-memory sliding window rate limiter tracking request frequency per IP or MCP token.
  * `audit.py`: Helper functions for recording sanitized event objects to the audit log table.

* `database/`:
  * `session.py`: Asynchronous SQLAlchemy engine and session factory supporting PostgreSQL (`asyncpg`) and SQLite (`aiosqlite`).
  * `models.py`: Declarative SQLAlchemy models covering users, workspaces, files, policies, anonymisation rules, MCP credentials, notes, guidance playbooks, form sessions, and audit logs.
  * `guidance_seed.py`: Default platform guidance playbooks seeded into the database on first boot.

* `mcp/`:
  * `server.py`: Complete implementation of the Model Context Protocol JSON-RPC 2.0 interface. Handles `tools/list`, `tools/call`, `resources/list`, and `resources/read`. Contains implementations of all workspace-scoped tools.
  * `skills.py`: Textual system instructions and operational directives provided to AI agents describing tool usage, policy constraints, and data entry workflows.
  * `router.py`: FastAPI endpoint exposing POST `/mcp` for workspace-scoped AI connections.

* `account_mcp/`:
  * `router.py`: Endpoint exposing POST `/account/mcp` for account master operators.
  * `service.py`: Business logic allowing administrative cross-workspace discovery, cloud ingestion, and workspace creation from a single AI session.

* `policies/`:
  * `engine.py`: Policy evaluation engine. Computes effective permissions by combining workspace defaults, resource-specific overrides, and operation-level policies.
  * `router.py`: Endpoints for creating, updating, and deleting access policies.
  * `schemas.py`: Pydantic validation schemas for policy definitions.

* `anonymisation/`:
  * `engine.py`: Text and tabular transformation engine. Applies MASK, REDACT, PSEUDONYMIZE, and REMOVE actions.
  * `pii_detector.py`: Regex and dictionary-based scanner for emails, phone numbers, social security numbers, and custom patterns.

* `structured/`:
  * `engine.py`: Engine for processing CSV, Excel (`.xlsx`), and JSON datasets. Evaluates column filters, executes projections, performs mathematical aggregations, and applies record inserts, updates, and deletes.

* `forms/`:
  * `router.py`: Serves the standalone responsive HTML/JavaScript form interface at `/forms/view` and accepts submission requests at `/forms/submit`.
  * `service.py`: Creates short, cryptographically secure 32-character hexadecimal form tokens, validates sessions, and commits validated data mutations directly to storage.

* `notes/`:
  * `router.py`: Endpoints for listing, creating, reading, updating, and deleting workspace notes.
  * `service.py`: Manages markdown content, tagging, file reference links, and append workflows.

* `resources/` and `files/`:
  * `router.py`: Handles file uploads, extraction status checking, metadata viewing, and file downloads.
  * `extractor.py`: Multi-format text extraction engine capable of extracting clean text and structured rows from PDF, DOCX, TXT, CSV, XLSX, and JSON files.

* `storage/`:
  * `service.py`: Adapter layer abstracting file persistence. Uploads and streams files to Supabase Storage or the local file system.

* `admin/`:
  * `router.py`: Endpoints for platform administrators to view system health, inspect user observation signals, and manage global playbooks.

#### Frontend Modules (`frontend/`)

* `app/page.tsx`: Landing page detailing product features and capabilities.
* `app/(auth)/`: Handles user authentication with dedicated login and registration forms.
* `app/dashboard/`: Displays the user's accessible workspaces, system status, and workspace creation modals.
* `app/workspaces/[id]/`: Core workspace management screen divided into four functional views:
  * Files View: File upload drag-and-drop, extraction status, schema inspection, and download.
  * Policies View: Granular policy matrix editor for configuring read, query, edit, and anonymisation rules.
  * Notes View: Markdown note editor with file tagging and search.
  * MCP Keys View: Generation, rotation, and revocation of workspace MCP credentials.
* `app/forms/`: Standalone form rendering page that parses the session token, dynamically renders form inputs matching the dataset schema, and submits data back to the API.
* `lib/api.ts`: Centralized HTTP client managing authentication headers, error handling, and JSON serialization.

## Core Capabilities and Mechanics

### Model Context Protocol (MCP) Interface

DBMCP implements the JSON-RPC 2.0 specification defined by the Model Context Protocol. AI clients connect using HTTP POST requests containing an Authorization header with a bearer token.

The platform provides two distinct credential types:

1. Workspace-Scoped Credentials (`mcp_live_ws_...`):
   * Bound to a single workspace.
   * Only files and data belonging to that workspace can be listed or queried.
   * Tools available: `get_tools_cache`, `workspace_info`, `list_resources`, `get_resource_metadata`, `get_dataset_schema`, `query_dataset`, `edit_dataset`, `generate_data_entry_form`, `search`, `read_resource`, `create_note`, `list_notes`, `get_note`, `update_note`, `delete_note`, `search_ai_guidance`, `get_ai_guidance`, `get_global_ai_rules`, `record_user_observation_signal`.

2. Account Master Credentials (`mcp_live_acc_...`):
   * Bound to a user account with operator access across workspaces.
   * Tools available: `get_tools_cache`, `account_info`, `list_workspaces`, `create_workspace`, `get_workspace`, `list_files`, `upload_file`, `import_cloud_link`, `read_file_content`, `query_dataset`, `get_dataset_schema`, `edit_dataset`, `generate_data_entry_form`, `delete_file`, `list_workspace_mcp_links`, `generate_workspace_mcp_link`, `revoke_workspace_mcp_link`, `create_note`, `list_notes`, `get_note`, `update_note`, `delete_note`, `search_ai_guidance`, `get_ai_guidance`, `get_global_ai_rules`, `record_user_observation_signal`.

### Live Tool Cache and Server-Side Registry

AI clients typically fetch tool specifications only once when starting a session. DBMCP provides the `get_tools_cache` tool to enable dynamic discovery, cache diffing, and schema inspection directly from the server:
* Server-Side Cache: Maintained dynamically in memory with cache versioning and update timestamps.
* Diffing Against Local Sessions: The AI model can provide `known_tools: ["workspace_info", ...]`. The server returns `new_tools_on_server` identifying newly added or changed tools that the AI client does not have.
* Schema and Parameter Breakdown: Returns detailed JSON input schemas, categories (`data_management`, `interactive_forms`, `resource_documents`, `notes_scratchpad`, `ai_guidance_telemetry`), and lists of required and optional parameters.
* Dynamic Tool Registration: Developers or backend services can call `ToolCacheRegistry.register_tool()` to add custom tools at runtime, immediately invalidating and updating the server cache.

### Policy and Security Rules

Access control decisions follow deterministic rules:
* Precedence: An explicit DENY rule overrides any ALLOW rule.
* Specificity: A rule applied to an individual file overrides the default workspace policy.
* Indirect Column Leakage Protection: If a column is marked as restricted (e.g., `salary`), an AI model cannot bypass this restriction through queries such as `SELECT AVG(salary)` or `WHERE salary > 50000`. Any query referencing a denied column is rejected.

### Anonymisation Mechanics

When data access is allowed, the Anonymisation Engine modifies text before returning it to the AI client:
* MASK: Replaces characters with mask symbols while preserving length or formatting (e.g., `4111-XXXX-XXXX-1111`).
* REDACT: Replaces sensitive content with a generic label (e.g., `[REDACTED]`).
* PSEUDONYMIZE: Replaces values with deterministic pseudonyms salted by workspace secret. For example, `John Smith` becomes `Person_042` across queries in Workspace A, but becomes `Person_819` in Workspace B.
* REMOVE: Completely strips the specified field from JSON or tabular responses.

### Generative UI Interactive Data Entry

When an AI model identifies that data needs to be added or edited, rather than attempting to render non-interactive text forms in chat, it calls `generate_data_entry_form`.

1. The server creates a short 32-character hexadecimal session token (`FormDataEntrySession`) stored in PostgreSQL.
2. The server returns an interactive form URL: `https://<domain>/forms/view?session=<token>`.
3. The AI presents the clickable link to the user.
4. When opened, the standalone interface dynamically builds form controls according to the file's schema (date pickers, numeric inputs, text fields, and dropdown options).
5. Submitting the form validates data types and updates the underlying spreadsheet or CSV directly, eliminating conversational hallucination errors.

## Running the Project Locally

### Prerequisites

* Python 3.10, 3.11, or 3.12
* Node.js 18 or higher with npm
* Git
* PostgreSQL (optional; local development defaults to SQLite)

### 1. Clone the Repository

```bash
git clone https://github.com/ahmad-beyond-limits/DBMCP.git
cd DBMCP
```

### 2. Environment Configuration

Copy the example environment configuration file to `.env` in the project root:

```bash
cp .env.example .env
```

Review the `.env` settings. For local testing without third-party services:
* Leave `DATABASE_URL` empty to use local SQLite (`sqlite+aiosqlite:///./test.db`).
* Leave `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` empty to store uploaded files locally.

### 3. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment:

On Linux or macOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

On Windows (PowerShell):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Run database tests to verify your environment:

```bash
python -m pytest tests/test_data_entry_forms.py -v
```

Start the FastAPI application:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend server is accessible at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

### 4. Frontend Setup

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install Node dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5. Running with Docker Compose

To run both backend and frontend in containers:

```bash
docker-compose up --build
```

The frontend will be exposed on port 3000 and the backend on port 8000.

### 6. Executing the Test Suite

The backend contains automated tests covering authentication, workspace isolation, policy enforcement, structured queries, MCP credentials, and data entry forms.

Run the test suite from the `backend` directory:

```bash
cd backend
python -m pytest -v
```

### 7. Connecting an AI Client via MCP

1. Open the frontend at `http://localhost:3000`, register an account, and open or create a workspace.
2. Navigate to the **MCP Access** tab in your workspace.
3. Click **Generate New Token**. Copy the token (e.g., `mcp_live_ws_...`).
4. In your AI client configuration (such as Claude Desktop's `claude_desktop_config.json`), configure the server:

```json
{
  "mcpServers": {
    "dbmcp-workspace": {
      "url": "http://localhost:8000/mcp",
      "headers": {
        "Authorization": "Bearer mcp_live_ws_your_token_here"
      }
    }
  }
}
```

5. Restart the AI client. The model will now discover available workspace files, respect policies, and use the interactive form generator when modifying datasets.

## How to Read and Navigate This Codebase

For engineers, architects, or contributors approaching this codebase for the first time, understanding the request execution path and design philosophy is critical. The codebase is organized around a security pipeline where untrusted AI requests are validated, authorized, executed, and scrubbed.

### Recommended Reading Order

1. The Data Models (`backend/app/database/models.py`)
Start here to understand the relationships between users, workspaces, files, access policies, anonymisation rules, form sessions, and audit logs. All core business rules map directly to these entities.

2. The MCP Protocol Gateway (`backend/app/mcp/server.py`)
This is the heart of the AI interface. It implements JSON-RPC 2.0 handling for `tools/list`, `tools/call`, `resources/list`, and `resources/read`. Follow how a tool call enters `handle_tool_call()`, extracts arguments, and dispatches to helper functions.

3. The Security and Policy Engine (`backend/app/policies/engine.py`)
Examine `PolicyEngine.evaluate()`. This is where access control decisions are made before any tool touches actual storage. Notice how it checks for explicit denials, verifies operation permissions, and compiles field restrictions.

4. The Anonymisation and Redaction Layer (`backend/app/anonymisation/engine.py`)
Review `AnonymisationEngine.transform_text()` and `transform_structured()`. Understand how PII matches are converted into masks, redactions, or salted pseudonyms before leaving the backend.

5. Generative UI and Form Handling (`backend/app/forms/`)
Review `backend/app/forms/service.py` and `backend/app/forms/router.py`. Understand how AI agents avoid hallucinations by generating lightweight, cryptographically signed form session tokens that allow humans to input structured records through a web form instead of chat.

6. The Frontend Architecture (`frontend/app/workspaces/[id]/page.tsx`)
Inspect how the Next.js frontend coordinates file uploads, policy toggles, MCP token generation, and structured notes through `frontend/lib/api.ts`.

## Architectural Invariants and Development Rules

When maintaining or extending DBMCP, the following invariants must never be broken:

### 1. Zero Trust in Client-Supplied Workspace Identifiers
An AI model or external client must never be able to access data by passing a `workspace_id` parameter. The target workspace is always derived cryptographically from the hashed bearer credential (`mcp_live_ws_...`). If a request asks for a resource outside the credential's workspace, it must be rejected immediately.

### 2. Strict Precedence: Explicit Deny Overrides Allow
In the policy engine, an explicit DENY rule always takes precedence over an ALLOW rule. If a user has a general permission to query datasets, but a specific file or column is marked with a DENY policy, the operation must be blocked.

### 3. Indirect Column Leakage Protection
Blocking access to a column (such as `salary` or `ssn`) requires blocking both direct projections (`SELECT salary`) and indirect aggregations or filters (`WHERE salary > 100000`, `AVG(salary)`). The structured query engine in `backend/app/structured/engine.py` inspects all query clauses to ensure denied columns cannot be inferred mathematically.

### 4. Deterministic Salted Pseudonymisation
Pseudonymisation must be consistent within a single workspace so that an AI model can track entity relationships (for example, recognizing that `Person_102` appears across two related tables). However, the transformation must use a workspace-specific secret salt (`WORKSPACE_HASH_SECRET`) so that pseudonyms cannot be correlated across different workspaces.

### 5. UI-First Mutation Workflow
AI models should not draw ASCII forms, render LaTeX tables, or ask users for long lists of column values in chat. Whenever data needs to be added, inserted, or updated, tools must generate a signed form session link (`generate_data_entry_form`) that allows users to submit validated data through the web UI.

### 6. Sanitized Audit Logging
Audit logs must record metadata, timestamps, user or token identifiers, and decisions (ALLOW or DENY). Under no circumstance should plaintext passwords, raw MCP tokens, or sensitive document text be written to the `audit_logs` table.

## Extending the System and Contributing

Contributions should maintain the modular structure of the repository. Follow the patterns described below when implementing new features.

### Adding a New MCP Tool

1. Define the Tool Specification:
Add the JSON schema definition in `backend/app/mcp/server.py` under `MCP_TOOLS_DEFINITIONS`. Specify clear descriptions, required parameters, and input constraints.

2. Implement the Tool Handler:
Create an asynchronous handler method within the `MCPServer` class (for example, `_handle_my_tool`). Ensure the method:
- Validates input arguments against the schema.
- Calls `PolicyEngine.evaluate()` before accessing data.
- Processes the request using application services.
- Passes string or tabular outputs through `AnonymisationEngine`.
- Logs the action using `AuditService.log_event()`.

3. Register in Tool Dispatch:
Add a case matching your tool name in `MCPServer.handle_tool_call()`.

4. Update Agent Skills:
If the tool requires specific prompting behavior or precautions, add clear instructions to `backend/app/mcp/skills.py` and `frontend/public/POAIS_AGENT_SKILLS.md`.

5. Write Automated Tests:
Add unit and integration tests in `backend/tests/` verifying permitted calls, denied calls, and edge cases.

### Adding Support for a New File Format

1. Implement the Extractor:
Add format-specific extraction logic in `backend/app/files/extractor.py`. The extractor should return:
- Clean plain text for document reading and keyword search.
- Structured tabular data (a list of dictionaries) if the file represents a table.

2. Update File Type Mappings:
Add the MIME type and file extension to `SUPPORTED_EXTENSIONS` and `DATASET_FILE_TYPES` in `backend/app/files/extractor.py` and `backend/app/resources/router.py`.

3. Test Parsing and Extraction:
Create a test case in `backend/tests/test_file_download.py` or a dedicated test file validating extraction, metadata parsing, and error handling for corrupted files.

### Adding a New Anonymisation Rule

1. Update the Rule Model:
Ensure the action type is registered in `backend/app/database/models.py` under the `AnonymisationRule` model.

2. Implement the Transformation:
Add the handling branch in `backend/app/anonymisation/engine.py` within `transform_text()` and `transform_structured()`.

3. Validate Output Integrity:
Verify that the transformation does not break structured JSON formatting or tabular row alignment. Add test assertions in `backend/tests/test_policies.py`.

### Contribution Checklist

Before submitting code changes or opening a pull request:
- Run the full test suite from the `backend` directory: `python -m pytest -v`.
- Ensure all new database models have corresponding columns and foreign keys in `backend/app/database/models.py`.
- Verify that no API endpoint accepts client-provided tenant or workspace IDs without server-side validation against session context.
- Verify that no secrets, passwords, or raw Bearer tokens are logged to stdout or the audit log table.
- Verify frontend TypeScript compilation with `npm run build` in the `frontend` directory.
