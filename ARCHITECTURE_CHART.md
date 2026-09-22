# DBMCP / POAIS: System Architecture & Workflow Charts

This document provides visual flowcharts and diagrams of the DBMCP / POAIS platform.

> [!TIP]
> You can also open the interactive HTML visualization file in your browser:  
> 👉 **[architecture_chart.html](file:///c:/Users/MUHAMMAD%20AHMAD/Downloads/DBMCP/architecture_chart.html)**

---

## 1. Complete System Architecture (6 Layers)

```mermaid
flowchart TB
    subgraph L1["1. Client & Agent Layer"]
        AICLIENT["🤖 AI Clients\n(Claude Desktop, Cursor, Custom Agents)\nJSON-RPC 2.0 via Bearer Token"]
        WEBCLIENT["💻 Next.js 14 Web UI\n(Dashboard, Workspaces, Admin)\nREST API via JWT"]
        FORMCLIENT["📝 Ephemeral Form End-Users\n(300s Standalone Browser Session)\nHTTPS View & Submit"]
    end

    subgraph L2["2. API Gateway & Ingestion Layer (FastAPI)"]
        ENDPOINT_MCP["/mcp (Unified Protocol Gateway)\nSingle Master Tool: get_tools_cache"]
        ENDPOINT_REST["/api/v1 (Workspaces, Files, Notes, Admin)"]
        ENDPOINT_FORMS["/forms (View, Session, Submit, Close)"]
        AUTH_GUARD["🛡️ Auth & Scope Guard\n- HMAC-SHA256 Token Validation\n- Workspace Boundary Derivation\n- In-Memory Sliding-Window Rate Limiter"]
    end

    subgraph L3["3. Policy Governance & Compliance Layer"]
        POLICY_EVAL["⚖️ PolicyEngine (policies/engine.py)\n- Operation-Level (ALLOW / DENY)\n- Resource-Level Overrides\n- Restricted Field Exclusions"]
        DENY_CHECK{"Rule Evaluation:\nExplicit DENY Overrides ALLOW"}
        GUIDANCE_STORE["📚 AI Guidance & Stealth Playbooks\nPlatform Rules & Confidential Handbooks"]
    end

    subgraph L4["4. Processing & Execution Engines"]
        MCP_DISPATCH["MCP Server Dispatcher"]
        TAB_ENGINE["📊 Tabular Query Engine\nCSV, XLSX, JSON Filter & Math Aggregations"]
        DOC_ENGINE["📄 Document Text Extractor & Search\nPDF, DOCX, TXT Keyword Index"]
        FORM_ENGINE["⚡ Generative UI Form Engine\n300s Ephemeral Token & Formula Sanitizer"]
        NOTES_ENGINE["🧠 Companion Memory & Notes\nPersistent Markdown Scratchpads"]
    end

    subgraph L5["5. Anonymisation & Redaction Layer"]
        PII_DETECT["🔍 PII Entity Detector (Regex & Patterns)\nEmails, Phones, SSNs, Names, Cards"]
        TRANSFORM["🔒 Transformation Engine\nMASK, REDACT, PSEUDONYMIZE, REMOVE"]
    end

    subgraph L6["6. Persistence & Storage Layer"]
        DB[("🗄️ Relational Database\nPostgreSQL / SQLite\n(Users, Workspaces, Policies, Notes, Forms)")]
        AUDIT_STORE[("📜 Immutable Audit Trail\n(Sanitized Payloads, Timestamps, Decisions)")]
        BLOB_STORE[("📦 Object Storage\nSupabase Storage / Local Disk\n(Encrypted Datasets & Uploads)")]
    end

    AICLIENT -->|JSON-RPC 2.0| ENDPOINT_MCP
    WEBCLIENT -->|REST HTTP| ENDPOINT_REST
    FORMCLIENT -->|Interactive Session| ENDPOINT_FORMS

    ENDPOINT_MCP --> AUTH_GUARD
    ENDPOINT_REST --> AUTH_GUARD
    ENDPOINT_FORMS --> AUTH_GUARD

    AUTH_GUARD --> POLICY_EVAL
    POLICY_EVAL --> DENY_CHECK

    DENY_CHECK -->|DENIED| AUDIT_STORE
    DENY_CHECK -->|ALLOWED| MCP_DISPATCH

    MCP_DISPATCH --> TAB_ENGINE
    MCP_DISPATCH --> DOC_ENGINE
    MCP_DISPATCH --> FORM_ENGINE
    MCP_DISPATCH --> NOTES_ENGINE
    MCP_DISPATCH --> GUIDANCE_STORE

    TAB_ENGINE <--> BLOB_STORE
    TAB_ENGINE <--> DB
    DOC_ENGINE <--> BLOB_STORE
    FORM_ENGINE <--> BLOB_STORE
    NOTES_ENGINE <--> DB

    TAB_ENGINE --> PII_DETECT
    DOC_ENGINE --> PII_DETECT
    PII_DETECT --> TRANSFORM
    TRANSFORM --> AUDIT_STORE

    AUDIT_STORE -->|Sanitized Result| AICLIENT
    AUDIT_STORE -->|API Response| WEBCLIENT
    FORM_ENGINE -->|Submission & Teardown| FORMCLIENT
```

---

## 2. AI Agent MCP Request Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Agent as 🤖 AI Agent (Claude/Cursor)
    participant Gateway as 🚪 FastAPI Gateway (/mcp)
    participant Auth as 🛡️ Auth & Scope Guard
    participant Policy as ⚖️ PolicyEngine
    participant Engine as ⚙️ Tabular Query Engine
    participant Anon as 🔒 Anonymisation Engine
    participant Audit as 📜 Audit Logger
    participant Storage as 🗄️ Relational DB & Storage

    Agent->>Gateway: POST /mcp (JSON-RPC tools/call: query_dataset)
    Gateway->>Auth: Validate Bearer token (mcp_live_...)
    Auth->>Auth: HMAC-SHA256 lookup & check expiry/revocation
    Auth-->>Gateway: Authenticated context (Workspace ID, Permissions)

    Gateway->>Policy: evaluate(workspace_id, operation, requested_fields)
    Policy->>Policy: 1. Check credential permissions & allowed file scope
    Policy->>Policy: 2. Check operation policy (ALLOW / DENY)
    Policy->>Policy: 3. Check resource-level policy (Specific overrides default)
    Policy->>Policy: 4. Check restricted columns for indirect leakage

    alt Policy Check Evaluates to DENY
        Policy-->>Audit: Log DENIED decision & reason
        Gateway-->>Agent: JSON-RPC Error (-32600): Policy Access Denied
    else Policy Check Evaluates to ALLOW
        Gateway->>Engine: execute_query(resource_id, columns, filters)
        Engine->>Storage: Fetch parsed dataset rows from ExtractedContent
        Engine->>Engine: Apply filters ($gt, $lt, $eq, $contains, etc.)
        Engine-->>Anon: Pass filtered rows + workspace anonymisation rules
        Anon->>Anon: Transform values: MASK / REDACT / PSEUDONYMIZE (Salted HMAC)
        Anon-->>Gateway: Clean, policy-compliant dataset rows
        Gateway->>Audit: Record sanitized event to audit_logs
        Gateway-->>Agent: JSON-RPC 2.0 Success (Policy-Compliant Rows)
    end
```

---

## 3. User Interaction Protocol: Clickable UI vs. Ephemeral Form

```mermaid
flowchart TD
    START(["User Wants to View, Pick, Edit, or Add Records"]) --> DECISION{"Is it a brand new multi-field record\nOR complex nested schema?"}

    %% In-Chat Clickable UI Branch
    DECISION -->|NO: Single Field, Status, Pick, or Confirm| IN_CHAT["🔘 Clickable UI (Native In-Chat Interface)"]
    IN_CHAT --> ACTIONS["- Select a record from a filtered list\n- Pick a single field to modify (e.g., status, score)\n- Tap confirmation: [✅ Yes, Confirm] [❌ Cancel]\n- Always provide 'Other / Custom Input' option"]
    ACTIONS --> MUTATION["Programmatic Execution via edit_dataset() Tool"]
    MUTATION --> VERIFY["⚡ Verification Protocol:\n1. Call query_dataset() to verify disk persistence\n2. Confirm verified values back to user in chat"]

    %% Ephemeral Session Form Branch
    DECISION -->|YES: New Record / Massive Schema| GEN_FORM["🌐 generate_data_entry_form() Tool"]
    GEN_FORM --> TOKEN_GEN["Generate 32-hex Ephemeral Session Token\n(Stored in Fast Memory + FormDataEntrySession)\nStrict 300s (5-Minute) Lifespan"]
    TOKEN_GEN --> LINK["Return Link to Human:\n👉 [➕ Open Session Form](http://localhost:8000/forms/view?token=...)"]
    LINK --> USER_FILL["End-User opens standalone web form in browser"]

    USER_FILL --> SUBMIT_CHOICE{"User Submits or Closes Window?"}

    SUBMIT_CHOICE -->|Window Closed| CLOSE_ENDPOINT["POST /forms/close-window\nInstant Session Revocation & Deletion"]
    SUBMIT_CHOICE -->|5 Minutes Elapsed| EXPIRY["Session Expired\nReturns Custom 404 Form Deleted Notice"]
    SUBMIT_CHOICE -->|Form Submitted| SANITIZE["1. Sanitize Formula Injections (=, +, -, @)\n2. Commit Row to DB ExtractedContent JSON\n3. Update Raw File in Supabase / Local Disk\n4. Permanently Delete Session Record"]

    SANITIZE --> VERIFY
```

---

## 4. Anti-Indirect-Leakage & Anonymisation Engine

```mermaid
flowchart LR
    subgraph INCOMING["Incoming Query Request"]
        REQ1["SELECT name, salary"]
        REQ2["WHERE salary > 100000"]
        REQ3["SELECT AVG(salary)"]
    end

    subgraph LEAK_GUARD["Anti-Indirect-Leakage Guard (StructuredQueryEngine)"]
        DENIED_COLS["Denied Column Policy:\nsalary = DENY"]
        CHK1{"Projection Check:\nContains salary?"}
        CHK2{"Filter Check:\nFilters on salary?"}
        CHK3{"Aggregation Check:\nAggregates on salary?"}
    end

    subgraph BLOCK["Blocked with Audit Event"]
        DENY_RESP["❌ REJECTED\n'Access to restricted column salary is denied\nto prevent indirect information leakage'"]
    end

    subgraph ALLOWED["Allowed Projections: (name, email, department)"]
        TRANS_ENGINE["Anonymisation Engine (anonymisation/engine.py)"]
        
        MASK_ACTION["MASK: email -> j***@domain.com"]
        REDACT_ACTION["REDACT: ssn -> [REDACTED: SSN]"]
        PSEUDO_ACTION["PSEUDONYMIZE: name -> Person_042\n(HMAC-SHA256 with Workspace Secret Salt)"]
        REMOVE_ACTION["REMOVE: drop column from output JSON"]
    end

    REQ1 --> CHK1
    REQ2 --> CHK2
    REQ3 --> CHK3

    CHK1 -->|Matches salary| DENY_RESP
    CHK2 -->|Matches salary| DENY_RESP
    CHK3 -->|Matches salary| DENY_RESP

    DENIED_COLS -.-> CHK1
    DENIED_COLS -.-> CHK2
    DENIED_COLS -.-> CHK3

    ALLOWED --> TRANS_ENGINE
    TRANS_ENGINE --> MASK_ACTION
    TRANS_ENGINE --> REDACT_ACTION
    TRANS_ENGINE --> PSEUDO_ACTION
    TRANS_ENGINE --> REMOVE_ACTION
```

---

## 5. Relational Database Schema & Entities

```mermaid
erDiagram
    User ||--o{ Workspace : "owns"
    User ||--o{ WorkspaceMember : "belongs to"
    User ||--o{ MCPCredential : "owns account key"
    User ||--o{ Note : "creates"
    User ||--o{ UserPersonalization : "has profile"

    Workspace ||--o{ WorkspaceMember : "contains"
    Workspace ||--o{ FileRecord : "stores"
    Workspace ||--o{ ResourcePolicy : "governs"
    Workspace ||--o{ OperationPolicy : "restricts"
    Workspace ||--o{ AnonymisationRule : "anonymises"
    Workspace ||--o{ MCPCredential : "authenticates"
    Workspace ||--o{ Note : "contains"
    Workspace ||--o{ AuditLog : "records"
    Workspace ||--o{ FormDataEntrySession : "manages"

    FileRecord ||--|| ExtractedContent : "has extracted text/json"
    Note ||--o{ FileRecord : "references"

    User {
        string id PK
        string username UK
        string password_hash
        boolean is_superuser
        boolean is_active
        datetime created_at
    }

    Workspace {
        string id PK
        string name
        string description
        string owner_id FK
        boolean is_active
        datetime created_at
    }

    FileRecord {
        string id PK
        string workspace_id FK
        string original_filename
        string storage_path
        string file_type
        int file_size
        string status
    }

    ExtractedContent {
        string id PK
        string file_id FK
        string workspace_id FK
        text plain_text
        json structured_data
        json detected_entities
    }

    OperationPolicy {
        string id PK
        string workspace_id FK
        string operation
        string decision
    }

    ResourcePolicy {
        string id PK
        string workspace_id FK
        string resource_id
        string operation
        string decision
    }

    AnonymisationRule {
        string id PK
        string workspace_id FK
        string entity_type
        string field_name
        string transformation
    }

    MCPCredential {
        string id PK
        string scope_type
        string credential_prefix
        string secret_hash
        json permissions
        datetime expires_at
        datetime revoked_at
    }

    AuditLog {
        string id PK
        string workspace_id FK
        string actor_type
        string operation
        string decision
        json request_metadata
        datetime timestamp
    }

    FormDataEntrySession {
        string id PK
        string workspace_id FK
        string file_id FK
        string action
        json filters
        boolean is_used
        datetime expires_at
    }
```
