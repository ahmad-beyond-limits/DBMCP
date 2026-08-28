"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  AuditLog,
  ExtractedContent,
  FileRecord,
  MCPCredential,
  MCPCredentialCreated,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";
import {
  FolderGit2,
  FileText,
  Shield,
  EyeOff,
  Key,
  ScrollText,
  Terminal,
  Settings,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Share2,
  CheckSquare,
  Square,
  Lock,
  Sliders,
  Database,
  Table,
  Filter,
  Eye,
  Columns,
  Sparkles,
  Loader2,
  Edit3,
  BookOpen,
  Download,
  FileCode,
  Layers,
} from "lucide-react";

const ABOX_AI_SKILLS_MARKDOWN = `# ABOX Policy-Enforced Data Gateway: AI Agent Skills & Operational Protocol

You are connected to an ABOX Policy-Enforced Data Workspace via the Model Context Protocol (MCP).
Use these instructions to interact accurately, securely, and effectively with workspace resources.

---

## 🛠️ Complete MCP Tool Suite & Capabilities

1. \`workspace_info()\`
   - Inspect workspace name, active policies, security boundary status, and available tools.

2. \`list_resources()\`
   - Discover all accessible files (CSV, Excel .xlsx, PDF, Word .docx, JSON) permitted for your session.

3. \`get_resource_metadata(resource_id)\`
   - Check file size, detected MIME type, formatting, and processing status.

4. \`get_dataset_schema(resource_id)\`
   - Retrieve table column names, detected data types, and total row count for structured datasets.

5. \`query_dataset(resource_id, columns, filters, limit, aggregation)\`
   - Execute exact-match filtering and aggregations over CSV, Excel (.xlsx), or JSON data files.
   - Supports comparison operators: \`{"column": {"$gt": 50}}\`, \`{"status": {"$ne": "archived"}}\`, \`{"tag": {"$in": ["A", "B"]}}\`.

6. \`edit_dataset(resource_id, action, filters, updates, new_row)\`
   - Safely modify records in dataset files:
     - \`action: "update"\`: modifies matching rows with key-value pairs in \`updates\`.
     - \`action: "insert"\`: appends \`new_row\` object to the dataset.
     - \`action: "delete"\`: removes rows matching \`filters\`.

7. \`search(query, limit)\`
   - Perform semantic and keyword searches across permitted documents with policy-compliant results.

8. \`read_resource(resource_id)\`
   - Read extracted document text with automatic real-time PII anonymisation and policy redaction applied.

---

## ⚡ MANDATORY OPERATIONAL DIRECTIVES FOR AI AGENTS

### 1. RECONFIRM & VERIFY EVERY DATA MUTATION (CRITICAL)
- **MANDATORY RULE**: Whenever you execute \`edit_dataset\` (action: \`update\`, \`insert\`, or \`delete\`), you MUST IMMEDIATELY execute a follow-up \`query_dataset\` on that same \`resource_id\` using the updated filter criteria.
- **VERIFICATION WORKFLOW**:
  1. Call \`edit_dataset(...)\` to perform the requested modification.
  2. Call \`query_dataset(resource_id=..., filters=...)\` to fetch the updated records from disk.
  3. Verify that the values returned by \`query_dataset\` match the intended changes.
  4. Only after positive verification, confirm the result to the user with the exact updated values and affected record count.
- Never report that data has been changed without performing this verification query.

### 2. ALWAYS INSPECT DATASET SCHEMA BEFORE QUERYING
- Do not guess or assume column names.
- Always call \`get_dataset_schema(resource_id)\` first when working with a new dataset to inspect exact column headers and case-sensitivity.

### 3. PRECISE FILTERING & CLEAN ENCODING
- Ensure filter values match the column data type (e.g. integer \`101\` vs string \`"101"\`).
- For text fields, use exact matching. If a query returns no rows, check case and whitespace.

### 4. RESPECT POLICY BOUNDARIES & PRIVACY REDACTIONS
- If a resource returns \`Policy Error: Access Denied\` or a field contains \`[REDACTED]\` / \`[MASKED]\`, this is an intentional workspace privacy rule configured by the owner.
- Explain the policy constraint clearly to the user instead of attempting to bypass it.
`;

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "documents" | "links" | "privacy" | "activity" | "playground" | "settings"
  >("documents");

  // State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [policies, setPolicies] = useState<{
    resource_policies: any[];
    operation_policies: any[];
    anonymisation_rules: any[];
  }>({ resource_policies: [], operation_policies: [], anonymisation_rules: [] });
  const [mcpCredentials, setMCPCredentials] = useState<MCPCredential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Modals & Action States
  const [selectedFileContent, setSelectedFileContent] = useState<ExtractedContent | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [createdCredential, setCreatedCredential] = useState<MCPCredentialCreated | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");

  // Simplified 3-Step Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);

  // 🌟 Advanced Power Query / Excel Spreadsheet "Share MCP Link" Wizard State 🌟
  const [shareWizardOpen, setShareWizardOpen] = useState(false);
  const [shareStep, setShareStep] = useState<1 | 2>(1);
  const [shareName, setShareName] = useState("Claude Assistant");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // Power Query Transformation States (Dynamically populated from the real file content)
  const [activeTransformFileId, setActiveTransformFileId] = useState<string>("");
  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [customColumnsToHide, setCustomColumnsToHide] = useState("");
  const [columnActions, setColumnActions] = useState<Record<string, "KEEP" | "MASK" | "REMOVE">>({});
  const [generatingLink, setGeneratingLink] = useState(false);
  const [dynamicColumns, setDynamicColumns] = useState<Array<{ name: string; letter: string; type: string; sample: string[] }>>([]);
  const [dynamicRowsCount, setDynamicRowsCount] = useState<number>(0);
  const [loadingTransformFile, setLoadingTransformFile] = useState(false);
  const [isTableDetected, setIsTableDetected] = useState(true);

  // Multi-Sheet, Editable Spreadsheet & Table Detection States
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [rawStructuredData, setRawStructuredData] = useState<any>(null);
  const [editableRows, setEditableRows] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [studioMobileTab, setStudioMobileTab] = useState<"sidebar" | "sheet">("sheet");

  // Privacy Tab Inspector State
  const [selectedMcpPrivacyCredId, setSelectedMcpPrivacyCredId] = useState<string>("ALL");

  // Wizard Granular Permissions State
  const [shareCanRead, setShareCanRead] = useState(true);
  const [shareCanSearch, setShareCanSearch] = useState(true);
  const [shareCanQuery, setShareCanQuery] = useState(true);
  const [shareCanEdit, setShareCanEdit] = useState(false);

  // Edit Permissions Modal State
  const [editPermsModalOpen, setEditPermsModalOpen] = useState(false);
  const [editingCredId, setEditingCredId] = useState<string>("");
  const [editingCredName, setEditingCredName] = useState<string>("");
  const [editingCanRead, setEditingCanRead] = useState(true);
  const [editingCanSearch, setEditingCanSearch] = useState(true);
  const [editingCanQuery, setEditingCanQuery] = useState(true);
  const [editingCanEdit, setEditingCanEdit] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // AI Agent Skills Guide Modal
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [copiedSkills, setCopiedSkills] = useState(false);

  // Playground States
  const [playgroundToken, setPlaygroundToken] = useState("");
  const [playgroundTool, setPlaygroundTool] = useState("workspace_info");
  const [playgroundArgs, setPlaygroundArgs] = useState("{}");
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();
    }
  }, [workspaceId]);

  // Load real dynamic data columns whenever activeTransformFileId changes
  useEffect(() => {
    if (activeTransformFileId && workspaceId && shareWizardOpen) {
      loadDynamicFileSchema(activeTransformFileId);
    }
  }, [activeTransformFileId, shareWizardOpen]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const [ws, fList, pols, creds, logs, mems] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getFiles(workspaceId),
        api.getPolicies(workspaceId),
        api.getMCPCredentials(workspaceId),
        api.getAuditLogs(workspaceId, 100),
        api.getMembers(workspaceId),
      ]);
      setWorkspace(ws);
      setFiles(fList);
      setPolicies(pols);
      setMCPCredentials(creds);
      setAuditLogs(logs);
      setMembers(mems);
      setSelectedFileIds(fList.map((f) => f.id));
      
      const firstDataFile = fList.find((f) => isDataFile(f));
      if (firstDataFile) {
        setActiveTransformFileId(firstDataFile.id);
      } else if (fList.length > 0) {
        setActiveTransformFileId(fList[0].id);
      }
    } catch (err: any) {
      notify("error", err.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  const loadDynamicFileSchema = async (fileId: string) => {
    setLoadingTransformFile(true);
    try {
      const content = await api.getFileContent(workspaceId, fileId);
      const struct = content.structured_data;
      setRawStructuredData(struct);

      if (struct && struct.columns && struct.columns.length > 0) {
        const sheets = struct.sheets ? Object.keys(struct.sheets) : (struct.sheet_names || []);
        setAvailableSheets(sheets);
        
        const currentSheet = sheets.length > 0 ? sheets[0] : "";
        setActiveSheetName(currentSheet);

        const sheetData = currentSheet && struct.sheets && struct.sheets[currentSheet] ? struct.sheets[currentSheet] : struct;
        const cols: string[] = sheetData.columns || struct.columns || [];
        const rows: any[] = sheetData.rows || struct.rows || [];
        const schema: Record<string, string> = sheetData.schema || struct.schema || {};
        
        setHeaderRowIndex(sheetData.header_row_index !== undefined ? sheetData.header_row_index : 0);
        setIsTableDetected(sheetData.table_detected !== false && cols.length > 0);
        setEditableRows(rows);

        const parsed = cols.map((colName, idx) => {
          const letter = String.fromCharCode(65 + (idx % 26)) + (idx >= 26 ? Math.floor(idx / 26) : "");
          const colType = schema[colName] || (
            colName.toLowerCase().includes("email") ? "email" :
            colName.toLowerCase().includes("ssn") || colName.toLowerCase().includes("id") ? "tax_id" :
            colName.toLowerCase().includes("score") || colName.toLowerCase().includes("salary") || colName.toLowerCase().includes("age") ? "number" :
            "string"
          );
          const sample = rows.slice(0, 8).map((r) => String(r[colName] !== undefined && r[colName] !== null ? r[colName] : ""));
          return {
            name: colName,
            letter,
            type: colType,
            sample,
          };
        });

        setDynamicColumns(parsed);
        setDynamicRowsCount(rows.length || 0);
        if (parsed.length > 0) {
          setSelectedColumnName(parsed[0].name);
        }
      } else {
        setDynamicColumns([]);
        setDynamicRowsCount(0);
        setEditableRows([]);
        setAvailableSheets([]);
        setIsTableDetected(false);
      }
    } catch (err) {
      setDynamicColumns([]);
      setDynamicRowsCount(0);
      setEditableRows([]);
      setAvailableSheets([]);
      setIsTableDetected(false);
    } finally {
      setLoadingTransformFile(false);
    }
  };

  const handleSelectSheet = (sheetName: string) => {
    if (!rawStructuredData || !rawStructuredData.sheets || !rawStructuredData.sheets[sheetName]) return;
    setActiveSheetName(sheetName);
    const sheetData = rawStructuredData.sheets[sheetName];
    const cols: string[] = sheetData.columns || [];
    const rows: any[] = sheetData.rows || [];
    const schema: Record<string, string> = sheetData.schema || {};
    
    setHeaderRowIndex(sheetData.header_row_index !== undefined ? sheetData.header_row_index : 0);
    setIsTableDetected(sheetData.table_detected !== false && cols.length > 0);
    setEditableRows(rows);

    const parsed = cols.map((colName, idx) => {
      const letter = String.fromCharCode(65 + (idx % 26)) + (idx >= 26 ? Math.floor(idx / 26) : "");
      const colType = schema[colName] || "string";
      const sample = rows.slice(0, 8).map((r) => String(r[colName] !== undefined && r[colName] !== null ? r[colName] : ""));
      return {
        name: colName,
        letter,
        type: colType,
        sample,
      };
    });

    setDynamicColumns(parsed);
    setDynamicRowsCount(rows.length || 0);
    if (parsed.length > 0) {
      setSelectedColumnName(parsed[0].name);
    }
  };

  const handleCellChange = (rowIdx: number, colName: string, value: string) => {
    setEditableRows((prev) => {
      const copy = [...prev];
      if (copy[rowIdx]) {
        copy[rowIdx] = { ...copy[rowIdx], [colName]: value };
      }
      return copy;
    });
  };

  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    availableColumns.forEach((c) => {
      newRow[c.name] = "";
    });
    setEditableRows((prev) => [...prev, newRow]);
    notify("success", "Added new row to editable spreadsheet.");
  };

  const notify = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper to distinguish tabular data files (CSV, XLSX, XLS, JSON) from non-data documents
  const isDataFile = (file: FileRecord) => {
    const ext = (file.original_filename || "").toLowerCase();
    const type = (file.file_type || "").toUpperCase();
    return (
      type === "CSV" ||
      type === "JSON" ||
      type === "XLSX" ||
      type === "XLS" ||
      ext.endsWith(".csv") ||
      ext.endsWith(".xlsx") ||
      ext.endsWith(".xls") ||
      ext.endsWith(".json")
    );
  };

  // File Upload Flow
  const handleExecuteUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadFile(workspaceId, uploadFile);
      notify("success", `File '${uploadFile.name}' processed successfully.`);
      setFiles((prev) => [uploaded, ...prev]);
      setSelectedFileIds((prev) => [...prev, uploaded.id]);
      if (isDataFile(uploaded)) {
        setActiveTransformFileId(uploaded.id);
      }
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      setUploadStep(1);
    } catch (err: any) {
      notify("error", err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleViewContent = async (file: FileRecord) => {
    try {
      setSelectedFileName(file.original_filename);
      const content = await api.getFileContent(workspaceId, file.id);
      setSelectedFileContent(content);
    } catch (err: any) {
      notify("error", err.message || "Failed to read content");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.deleteFile(workspaceId, fileId);
      notify("success", "File deleted.");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file");
    }
  };

  // Generate MCP Link with Power Query & Document Policies
  const handleGenerateShareLink = async () => {
    if (!shareName.trim()) return;

    setGeneratingLink(true);
    try {
      const permissions = {
        read_resource: shareCanRead,
        search: shareCanSearch,
        query_dataset: shareCanQuery,
        edit_dataset: shareCanEdit,
      };

      const created = await api.createMCPCredential(workspaceId, shareName.trim(), 30, permissions);

      // 1. Enforce excluded files if any
      const excludedFiles = files.filter((f) => !selectedFileIds.includes(f.id));
      for (const file of excludedFiles) {
        try {
          await api.createResourcePolicy(workspaceId, file.id, "read_resource", "DENY");
        } catch (e) {}
      }

      // 2. Power Query Column Transformations (Only applied if tabular data files are shared)
      const hasDataFilesSelected = files.filter((f) => selectedFileIds.includes(f.id)).some(isDataFile);
      if (hasDataFilesSelected) {
        for (const [col, action] of Object.entries(columnActions)) {
          if (action === "REMOVE") {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "REMOVE");
            } catch (e) {}
          } else if (action === "MASK") {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "MASK");
            } catch (e) {}
          }
        }

        if (customColumnsToHide.trim()) {
          const columns = customColumnsToHide.split(",").map((c) => c.trim()).filter(Boolean);
          for (const col of columns) {
            try {
              await api.createAnonymisationRule(workspaceId, "custom_column", col, "REMOVE");
            } catch (e) {}
          }
        }
      }

      setMCPCredentials((prev) => [
        {
          id: created.id,
          workspace_id: created.workspace_id,
          name: created.name,
          credential_prefix: created.credential_prefix,
          created_at: created.created_at,
          expires_at: created.expires_at,
          last_used_at: null,
          revoked_at: null,
          is_active: true,
          permissions: created.permissions,
        },
        ...prev,
      ]);

      const updatedPolicies = await api.getPolicies(workspaceId);
      setPolicies(updatedPolicies);

      setCreatedCredential(created);
      setPlaygroundToken(created.raw_token);
      setShareWizardOpen(false);
      setShareStep(1);
      setShareName("Claude Assistant");
      setShareCanRead(true);
      setShareCanSearch(true);
      setShareCanQuery(true);
      setShareCanEdit(false);
      notify("success", "Shareable ABOX MCP Link generated with custom permissions!");
    } catch (err: any) {
      notify("error", err.message || "Failed to generate link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenEditPermissions = (cred: MCPCredential) => {
    setEditingCredId(cred.id);
    setEditingCredName(cred.name);
    const p = cred.permissions || {};
    setEditingCanRead(p.read_resource !== false);
    setEditingCanSearch(p.search !== false);
    setEditingCanQuery(p.query_dataset !== false);
    setEditingCanEdit(p.edit_dataset === true);
    setEditPermsModalOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!editingCredId) return;
    setSavingPerms(true);
    try {
      const updated = await api.updateMCPCredential(workspaceId, editingCredId, {
        name: editingCredName.trim(),
        permissions: {
          read_resource: editingCanRead,
          search: editingCanSearch,
          query_dataset: editingCanQuery,
          edit_dataset: editingCanEdit,
        },
      });

      setMCPCredentials((prev) =>
        prev.map((c) => (c.id === editingCredId ? { ...c, name: updated.name, permissions: updated.permissions } : c))
      );
      setEditPermsModalOpen(false);
      notify("success", "Permissions updated successfully.");
    } catch (err: any) {
      notify("error", err.message || "Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDeleteMCP = async (credentialId: string) => {
    if (!confirm("Are you sure you want to permanently delete this MCP link from the workspace?")) return;
    try {
      await api.deleteMCPCredential(workspaceId, credentialId);
      setMCPCredentials((prev) => prev.filter((c) => c.id !== credentialId));
      notify("success", "MCP Link permanently deleted.");
    } catch (err: any) {
      notify("error", err.message || "Failed to delete link");
    }
  };

  const handleRotateMCP = async (credentialId: string) => {
    if (!confirm("Rotating will revoke the current token and generate a replacement. Continue?")) return;
    try {
      const rotated = await api.rotateMCPCredential(workspaceId, credentialId);
      setCreatedCredential(rotated);
      setPlaygroundToken(rotated.raw_token);
      const updated = await api.getMCPCredentials(workspaceId);
      setMCPCredentials(updated);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRevokeMCP = async (credentialId: string) => {
    if (!confirm("Revoking will immediately disable this link. Continue?")) return;
    try {
      await api.revokeMCPCredential(workspaceId, credentialId);
      notify("success", "Link revoked.");
      setMCPCredentials((prev) =>
        prev.map((c) => (c.id === credentialId ? { ...c, is_active: false, revoked_at: new Date().toISOString() } : c))
      );
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const member = await api.addMember(workspaceId, newMemberUsername.trim(), newMemberRole);
      notify("success", `Added user '${newMemberUsername}'.`);
      setMembers((prev) => [...prev, member]);
      setNewMemberUsername("");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(workspaceId, memberId);
      notify("success", "Member removed.");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmName = prompt(`Type "${workspace?.name}" to confirm deletion:`);
    if (confirmName !== workspace?.name) {
      alert("Name does not match. Deletion cancelled.");
      return;
    }
    try {
      await api.deleteWorkspace(workspaceId);
      router.push("/dashboard");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleExecutePlayground = async () => {
    if (!playgroundToken.trim()) {
      notify("error", "Please provide a valid token (mcp_live_...)");
      return;
    }
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(playgroundArgs);
      } catch {
        throw new Error("Invalid JSON in arguments");
      }

      let res;
      if (playgroundTool === "tools/list" || playgroundTool === "initialize") {
        res = await api.executeMCPTool(playgroundToken, playgroundTool, {});
      } else {
        res = await api.executeMCPTool(playgroundToken, "tools/call", {
          name: playgroundTool,
          arguments: parsedArgs,
        });
      }
      setPlaygroundResult(res);
      const updatedLogs = await api.getAuditLogs(workspaceId, 50);
      setAuditLogs(updatedLogs);
    } catch (err: any) {
      setPlaygroundResult({ error: err.message });
      notify("error", err.message);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  if (loading || !workspace) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Loading workspace...</div>
      </div>
    );
  }

  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));
  const selectedDataFiles = selectedFiles.filter(isDataFile);
  const hasDataFilesSelected = selectedDataFiles.length > 0;
  const activeTransformFile = selectedDataFiles.find((f) => f.id === activeTransformFileId) || selectedDataFiles[0];

  // Dynamic Columns parsed from the actual file in this specific workspace
  const availableColumns = dynamicColumns.length > 0 ? dynamicColumns : [
    { name: "column_1", letter: "A", type: "string", sample: ["Data Row 1", "Data Row 2", "Data Row 3"] },
  ];

  return (
    <div style={{
      maxWidth: "1160px",
      margin: "0 auto",
      padding: "clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem) 5rem clamp(1rem, 3vw, 1.5rem)",
    }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 200,
          background: "#2E3032",
          color: "#FFFFFF",
          padding: "0.75rem 1.25rem",
          borderRadius: "var(--radius-pill)",
          boxShadow: "var(--shadow-lg)",
          fontWeight: 450,
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          maxWidth: "calc(100vw - 4rem)",
        }}>
          {notification.type === "success" ? <ShieldCheck size={16} strokeWidth={1.5} /> : <AlertTriangle size={16} strokeWidth={1.5} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Banner: Clean Typography & MAIN ACTION BUTTONS */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
            <Link href="/dashboard" className="slash-tag" style={{ textDecoration: "none", margin: 0 }}>
              WORKSPACES
            </Link>
            <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>/</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
              {workspace.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 className="font-hero" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              {workspace.name}
            </h1>
            <span className={`badge-status ${workspace.is_active ? "badge-status-allow" : "badge-status-deny"}`}>
              {workspace.is_active ? "Active Vault" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadDescription("");
              setUploadStep(1);
              setUploadModalOpen(true);
            }}
            className="pill-btn pill-btn-glass"
            style={{ padding: "0.65rem 1.25rem", fontSize: "0.88rem" }}
          >
            <Upload size={15} strokeWidth={1.5} />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => {
              setSelectedFileIds(files.map((f) => f.id));
              setShareStep(1);
              const firstDataFile = files.find(isDataFile);
              if (firstDataFile) {
                setActiveTransformFileId(firstDataFile.id);
                loadDynamicFileSchema(firstDataFile.id);
              }
              setShareWizardOpen(true);
            }}
            className="pill-btn pill-btn-solid"
            style={{ padding: "0.65rem 1.25rem", fontSize: "0.88rem" }}
          >
            <Share2 size={15} strokeWidth={1.5} />
            <span>Share MCP Link</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div className="pill-tabs-bar" style={{ display: "flex", flexWrap: "nowrap" }}>
          {[
            { id: "documents", label: `Documents (${files.length})`, icon: <FileText size={14} strokeWidth={1.5} /> },
            { id: "links", label: `AI Links (${mcpCredentials.length})`, icon: <Key size={14} strokeWidth={1.5} /> },
            { id: "privacy", label: `Privacy Rules (${policies.resource_policies.length + policies.anonymisation_rules.length})`, icon: <Shield size={14} strokeWidth={1.5} /> },
            { id: "activity", label: `Activity Trail (${auditLogs.length})`, icon: <ScrollText size={14} strokeWidth={1.5} /> },
            { id: "playground", label: "Test Console", icon: <Terminal size={14} strokeWidth={1.5} /> },
            { id: "settings", label: "Settings", icon: <Settings size={14} strokeWidth={1.5} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pill-tab ${activeTab === tab.id ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DOCUMENTS                                                          */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div>
          {files.length === 0 ? (
            <div className="frosted-panel" style={{ textAlign: "center", padding: "clamp(3rem, 6vw, 5rem) 1.5rem" }}>
              <div className="icon-circle-btn" style={{ width: "56px", height: "56px", margin: "0 auto 1.25rem auto" }}>
                <FileText size={24} strokeWidth={1.5} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 400, marginBottom: "0.4rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                No documents uploaded yet
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 1.75rem auto", lineHeight: 1.6, fontWeight: 400 }}>
                Upload Excel spreadsheets (.xlsx), CSV data tables, PDFs, or JSON datasets. AI models can safely query them under policy control.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="pill-btn pill-btn-solid"
              >
                <Upload size={15} strokeWidth={1.5} />
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="frosted-panel" style={{ overflowX: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td style={{ fontWeight: 450, color: "var(--text-primary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <FileText size={16} strokeWidth={1.5} color={isDataFile(file) ? "#2E3032" : "#989B9D"} />
                          <span>{file.original_filename}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-status">
                          {file.file_type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>
                        {(file.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td>
                        <span className={`badge-status ${file.status === "READY" ? "badge-status-allow" : file.status === "FAILED" ? "badge-status-deny" : "badge-status-transform"}`}>
                          {file.status === "READY" ? "Ready for AI" : file.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "0.82rem" }}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          {file.file_type !== "PDF" && (
                            <button
                              onClick={() => handleViewContent(file)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.3rem 0.8rem", fontSize: "0.78rem" }}
                            >
                              View Content
                            </button>
                          )}
                          {workspace.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.3rem 0.6rem", color: "var(--status-deny)" }}
                              title="Delete file"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI LINKS                                                           */}
      {/* ========================================================================= */}
      {activeTab === "links" && (
        <div>
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div className="slash-tag">AI CONNECTIONS</div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Active MCP Sharing Links
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "600px", lineHeight: 1.5, fontWeight: 400 }}>
                  Create as many distinct MCP links as you need. Each link has dedicated document permissions, custom data masking policies, and AI mutation rights.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setSkillsModalOpen(true)}
                  className="pill-btn pill-btn-glass"
                  style={{ gap: "0.4rem" }}
                  title="View AI Agent instructions and operational directives"
                >
                  <BookOpen size={14} strokeWidth={1.5} />
                  <span>AI Skills Guide</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedFileIds(files.map((f) => f.id));
                    setShareStep(1);
                    const firstDataFile = files.find(isDataFile);
                    if (firstDataFile) {
                      setActiveTransformFileId(firstDataFile.id);
                      loadDynamicFileSchema(firstDataFile.id);
                    }
                    setShareWizardOpen(true);
                  }}
                  className="pill-btn pill-btn-solid"
                >
                  <Plus size={15} strokeWidth={1.5} />
                  <span>Create New MCP Link</span>
                </button>
              </div>
            </div>
          </div>

          <div className="frosted-panel" style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Link Name / Agent</th>
                  <th>Key Identifier</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mcpCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-tertiary)" }}>
                      No links created yet. Click &quot;Create New MCP Link&quot; above to connect Claude Desktop or an AI agent.
                    </td>
                  </tr>
                ) : (
                  mcpCredentials.map((cred) => (
                    <tr key={cred.id}>
                      <td style={{ fontWeight: 450, color: "var(--text-primary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Key size={15} strokeWidth={1.5} color="var(--text-primary)" />
                          <span>{cred.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            background: cred.permissions?.read_resource !== false ? "rgba(46, 48, 50, 0.06)" : "rgba(220, 38, 38, 0.08)",
                            color: cred.permissions?.read_resource !== false ? "var(--text-secondary)" : "var(--status-deny)",
                          }}>
                            {cred.permissions?.read_resource !== false ? "Read: ON" : "Read: OFF"}
                          </span>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            background: cred.permissions?.search !== false ? "rgba(46, 48, 50, 0.06)" : "rgba(220, 38, 38, 0.08)",
                            color: cred.permissions?.search !== false ? "var(--text-secondary)" : "var(--status-deny)",
                          }}>
                            {cred.permissions?.search !== false ? "Search: ON" : "Search: OFF"}
                          </span>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            background: cred.permissions?.query_dataset !== false ? "rgba(46, 48, 50, 0.06)" : "rgba(220, 38, 38, 0.08)",
                            color: cred.permissions?.query_dataset !== false ? "var(--text-secondary)" : "var(--status-deny)",
                          }}>
                            {cred.permissions?.query_dataset !== false ? "Query: ON" : "Query: OFF"}
                          </span>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            background: cred.permissions?.edit_dataset ? "rgba(234, 179, 8, 0.15)" : "rgba(46, 48, 50, 0.06)",
                            color: cred.permissions?.edit_dataset ? "#B45309" : "var(--text-tertiary)",
                            fontWeight: cred.permissions?.edit_dataset ? 600 : 400,
                          }}>
                            {cred.permissions?.edit_dataset ? "Edit Data: ENABLED" : "Edit Data: BLOCKED"}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {cred.credential_prefix}...
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "0.82rem" }}>
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge-status ${cred.revoked_at ? "badge-status-deny" : cred.is_active ? "badge-status-allow" : "badge-status-transform"}`}>
                          {cred.revoked_at ? "Revoked" : cred.is_active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {workspace.role === "OWNER" && (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button
                              onClick={() => handleOpenEditPermissions(cred)}
                              className="pill-btn pill-btn-glass"
                              style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <Sliders size={12} strokeWidth={1.5} />
                              Edit Permissions
                            </button>
                            {cred.is_active && (
                              <>
                                <button
                                  onClick={() => handleRotateMCP(cred.id)}
                                  className="pill-btn pill-btn-glass"
                                  style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem" }}
                                >
                                  Rotate Key
                                </button>
                                <button
                                  onClick={() => handleRevokeMCP(cred.id)}
                                  className="pill-btn pill-btn-glass"
                                  style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", color: "var(--status-deny)" }}
                                >
                                  Revoke
                                </button>
                              </>
                            )}
                            {!cred.is_active && (
                              <button
                                onClick={() => handleDeleteMCP(cred.id)}
                                className="pill-btn pill-btn-glass"
                                style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", color: "var(--status-deny)", display: "flex", alignItems: "center", gap: "0.3rem" }}
                                title="Permanently delete revoked link"
                              >
                                <Trash2 size={12} strokeWidth={1.5} />
                                Delete Link
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRIVACY RULES & MCP PERMISSIONS INSPECTOR                          */}
      {/* ========================================================================= */}
      {activeTab === "privacy" && (() => {
        const selectedCred = mcpCredentials.find((c) => c.id === selectedMcpPrivacyCredId);
        const isGlobal = selectedMcpPrivacyCredId === "ALL" || !selectedCred;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Top Selector Card: Select MCP Link to Inspect */}
            <div className="frosted-panel" style={{ padding: "1.5rem 2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div className="slash-tag">MCP ACCESS &amp; PRIVACY MATRIX</div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    Security &amp; Privacy Inspector
                  </h3>
                  <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginTop: "0.2rem", maxWidth: "600px" }}>
                    Select an MCP Link below to verify exactly which documents, tables, columns, and AI tools that token has access to.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenShareWizard()}
                  className="pill-btn pill-btn-solid"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Share2 size={13} strokeWidth={1.5} />
                  <span>Create New MCP Link</span>
                </button>
              </div>

              {/* MCP Credential Selector Pills */}
              <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelectedMcpPrivacyCredId("ALL")}
                  className={`pill-tab ${isGlobal ? "active" : ""}`}
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <ShieldCheck size={14} strokeWidth={1.5} />
                  <span>Workspace Global Policies</span>
                </button>

                {mcpCredentials.map((cred) => (
                  <button
                    key={cred.id}
                    type="button"
                    onClick={() => setSelectedMcpPrivacyCredId(cred.id)}
                    className={`pill-tab ${selectedMcpPrivacyCredId === cred.id ? "active" : ""}`}
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <Key size={13} strokeWidth={1.5} />
                    <span>{cred.name}</span>
                    <span className={`badge-status ${cred.is_active ? "badge-status-allow" : "badge-status-deny"}`} style={{ fontSize: "0.62rem", padding: "0.05rem 0.35rem" }}>
                      {cred.is_active ? "Active" : "Revoked"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Inspection Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "1.5rem" }}>
              
              {/* 1. MCP Tool Capabilities & Permissions Card */}
              <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column" }}>
                <div className="slash-tag">AI TOOL PERMISSIONS</div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  {isGlobal ? "Global Tool Policies" : `Authorized Tools for ${selectedCred?.name}`}
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                  Defines the MCP protocol tools permitted for this session.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
                  {/* Read */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(40, 40, 40, 0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>Read Documents</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>read_resource</div>
                    </div>
                    <span className={`badge-status ${(!selectedCred || selectedCred.permissions?.read_resource !== false) ? "badge-status-allow" : "badge-status-deny"}`}>
                      {(!selectedCred || selectedCred.permissions?.read_resource !== false) ? "Allowed" : "Blocked"}
                    </span>
                  </div>

                  {/* Search */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(40, 40, 40, 0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>Full-Text Search</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>search</div>
                    </div>
                    <span className={`badge-status ${(!selectedCred || selectedCred.permissions?.search !== false) ? "badge-status-allow" : "badge-status-deny"}`}>
                      {(!selectedCred || selectedCred.permissions?.search !== false) ? "Allowed" : "Blocked"}
                    </span>
                  </div>

                  {/* Query */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(40, 40, 40, 0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>Query Tables &amp; Schema</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>query_dataset</div>
                    </div>
                    <span className={`badge-status ${(!selectedCred || selectedCred.permissions?.query_dataset !== false) ? "badge-status-allow" : "badge-status-deny"}`}>
                      {(!selectedCred || selectedCred.permissions?.query_dataset !== false) ? "Allowed" : "Blocked"}
                    </span>
                  </div>

                  {/* Edit */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: selectedCred?.permissions?.edit_dataset ? "rgba(234, 179, 8, 0.08)" : "var(--bg-page)", borderRadius: "var(--radius-sm)", border: selectedCred?.permissions?.edit_dataset ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(40, 40, 40, 0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: selectedCred?.permissions?.edit_dataset ? "#B45309" : "var(--text-primary)" }}>AI Data Edit &amp; Mutation</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>edit_dataset</div>
                    </div>
                    <span className={`badge-status ${selectedCred?.permissions?.edit_dataset ? "badge-status-transform" : "badge-status-deny"}`}>
                      {selectedCred?.permissions?.edit_dataset ? "Enabled" : "Blocked (Read-Only)"}
                    </span>
                  </div>
                </div>

                {selectedCred && (
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(40, 40, 40, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Prefix: <code>{selectedCred.credential_prefix}...</code></span>
                    <button
                      onClick={() => handleOpenEditPermissions(selectedCred)}
                      className="pill-btn pill-btn-glass"
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.74rem" }}
                    >
                      Change Permissions
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Accessible Files & Resource Scope Card */}
              <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column" }}>
                <div className="slash-tag">RESOURCE SCOPE</div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Accessible Files ({files.length})
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                  Documents and datasets in this workspace that can be served via MCP.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto", flex: 1 }}>
                  {files.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "2rem 0" }}>
                      No files uploaded yet.
                    </div>
                  ) : (
                    files.map((f) => {
                      const isData = isDataFile(f);
                      return (
                        <div
                          key={f.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.6rem 0.85rem",
                            background: "var(--bg-page)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid rgba(40, 40, 40, 0.04)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                            <FileText size={14} strokeWidth={1.5} color="#2E3032" />
                            <span style={{ fontSize: "0.84rem", fontWeight: 450, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {f.original_filename}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                            <span className="badge-status" style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                              {isData ? "TABLE" : "DOCUMENT"}
                            </span>
                            <span className="badge-status badge-status-allow" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                              Accessible
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Active Anonymisation & Column Redaction Matrix Card */}
              <div className="frosted-panel" style={{ padding: "1.5rem 1.75rem", gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div className="slash-tag">DATA PRIVACY MATRIX</div>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                      Active Column Masking &amp; Anonymisation Rules
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Real-time redactions executed before any AI query response is transmitted.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                  {policies.anonymisation_rules.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", fontStyle: "italic", padding: "1rem 0" }}>
                      No custom masking rules active. Standard PII detectors remain enabled by default.
                    </div>
                  ) : (
                    policies.anonymisation_rules.map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 1rem",
                          background: "var(--bg-page)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(40, 40, 40, 0.04)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.86rem", color: "var(--text-primary)" }}>{rule.entity_type}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            {rule.field_name ? `Target Column: ${rule.field_name}` : "All detected occurrences"}
                          </div>
                        </div>
                        <span className="badge-status badge-status-transform">
                          {rule.transformation}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVITY TRAIL                                                     */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="frosted-panel" style={{ overflow: "hidden" }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}>
            <div>
              <div className="slash-tag">AUDIT TRAIL</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Activity &amp; Query Log</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem", fontWeight: 400 }}>
                Every tool call, query, and data mutation is logged securely without exposing secrets.
              </p>
            </div>
            <button onClick={loadWorkspaceData} className="pill-btn pill-btn-glass" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              <RefreshCw size={13} strokeWidth={1.5} />
              Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operation</th>
                  <th>Caller</th>
                  <th>Decision</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "4rem", color: "var(--text-tertiary)" }}>
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>
                        {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        {log.operation}
                      </td>
                      <td>
                        <span className="badge-status">
                          {log.actor_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${log.decision === "ALLOW" ? "badge-status-allow" : "badge-status-deny"}`}>
                          {log.decision}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", maxWidth: "320px", fontSize: "0.82rem" }}>
                        {log.reason || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TEST CONSOLE (PLAYGROUND)                                          */}
      {/* ========================================================================= */}
      {activeTab === "playground" && (
        <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
          <div className="slash-tag">DEVELOPER CONSOLE</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            MCP Tool Test Console
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", fontWeight: 400 }}>
            Test live JSON-RPC requests directly against your MCP gateway, including queries and data edits.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.75rem" }}>
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Bearer MCP Token
                </label>
                <input
                  type="text"
                  className="modern-input"
                  placeholder="mcp_live_..."
                  value={playgroundToken}
                  onChange={(e) => setPlaygroundToken(e.target.value)}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Tool Name
                </label>
                <select
                  className="modern-input"
                  value={playgroundTool}
                  onChange={(e) => {
                    setPlaygroundTool(e.target.value);
                    if (e.target.value === "read_resource") {
                      const firstFile = files[0]?.id || "";
                      setPlaygroundArgs(JSON.stringify({ resource_id: firstFile }, null, 2));
                    } else if (e.target.value === "search") {
                      setPlaygroundArgs(JSON.stringify({ query: "example" }, null, 2));
                    } else if (e.target.value === "query_dataset") {
                      const firstData = files.find(isDataFile)?.id || "";
                      setPlaygroundArgs(JSON.stringify({ resource_id: firstData, limit: 10 }, null, 2));
                    } else if (e.target.value === "edit_dataset") {
                      const firstData = files.find(isDataFile)?.id || "";
                      setPlaygroundArgs(JSON.stringify({
                        resource_id: firstData,
                        action: "update",
                        filters: { id: "101" },
                        updates: { status: "ACTIVE" },
                      }, null, 2));
                    } else {
                      setPlaygroundArgs("{}");
                    }
                  }}
                >
                  <option value="workspace_info">workspace_info</option>
                  <option value="list_resources">list_resources</option>
                  <option value="get_resource_metadata">get_resource_metadata</option>
                  <option value="search">search</option>
                  <option value="read_resource">read_resource</option>
                  <option value="get_dataset_schema">get_dataset_schema</option>
                  <option value="query_dataset">query_dataset</option>
                  <option value="edit_dataset">edit_dataset (Update / Insert / Delete)</option>
                  <option value="tools/list">tools/list (Protocol Schema)</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.4rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  Arguments (JSON)
                </label>
                <textarea
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", height: "120px", resize: "vertical" }}
                  value={playgroundArgs}
                  onChange={(e) => setPlaygroundArgs(e.target.value)}
                />
              </div>

              <button
                onClick={handleExecutePlayground}
                disabled={playgroundLoading}
                className="pill-btn pill-btn-solid"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                <Terminal size={15} strokeWidth={1.5} />
                {playgroundLoading ? "Running..." : "Run MCP Request"}
              </button>
            </div>

            <div style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(40, 40, 40, 0.06)",
              background: "#2E3032",
              color: "#FFFFFF",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                padding: "0.75rem 1.25rem",
                background: "rgba(255, 255, 255, 0.05)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "0.75rem",
                fontFamily: "JetBrains Mono, monospace",
                color: "rgba(255, 255, 255, 0.6)",
              }}>
                response.json
              </div>

              <div style={{
                flex: 1,
                padding: "1.25rem",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.82rem",
                overflowY: "auto",
                maxHeight: "340px",
              }}>
                {playgroundResult ? (
                  <pre style={{ color: "#FFE63C" }}>{JSON.stringify(playgroundResult, null, 2)}</pre>
                ) : (
                  <div style={{ color: "rgba(255, 255, 255, 0.4)", fontStyle: "italic", paddingTop: "2rem", textAlign: "center" }}>
                    Results from the MCP gateway will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SETTINGS                                                           */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "1.5rem" }}>
          {/* Members */}
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
            <div className="slash-tag">TEAM ACCESS</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Workspace Access
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem", fontWeight: 400 }}>
              Share this workspace with colleagues by username.
            </p>

            {workspace.role === "OWNER" && (
              <form onSubmit={handleAddMember} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  required
                  className="modern-input"
                  placeholder="Username"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  style={{ flex: "1 1 140px" }}
                />
                <select
                  className="modern-input"
                  style={{ width: "110px" }}
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button type="submit" className="pill-btn pill-btn-solid" style={{ padding: "0.5rem 1.1rem" }}>
                  Add
                </button>
              </form>
            )}

            <div>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid rgba(40, 40, 40, 0.04)",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 450, fontSize: "0.9rem", color: "var(--text-primary)" }}>{m.username || m.user_id}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>Joined {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="badge-status">{m.role}</span>
                    {workspace.role === "OWNER" && m.user_id !== workspace.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        style={{ color: "var(--text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="frosted-panel" style={{ padding: "clamp(1.5rem, 3vw, 2rem)", border: "1px solid rgba(194, 65, 12, 0.15)", background: "var(--status-deny-bg)" }}>
            <div className="slash-tag" style={{ color: "var(--status-deny)" }}>DANGER ZONE</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 400, color: "var(--status-deny)", marginBottom: "0.3rem", letterSpacing: "-0.02em" }}>
              Delete Workspace
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#9a3412", marginBottom: "1.5rem", fontWeight: 400 }}>
              Permanently delete this workspace and all associated files.
            </p>

            {workspace.role === "OWNER" && (
              <button
                onClick={handleDeleteWorkspace}
                className="pill-btn pill-btn-glass"
                style={{ color: "var(--status-deny)", borderColor: "rgba(194, 65, 12, 0.25)" }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Delete Workspace Permanently
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-STEP UPLOAD MODAL                                                       */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "520px",
            padding: "clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2.25rem)",
            position: "relative",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            maxHeight: "92vh",
            overflowY: "auto",
          }}>
            <button
              onClick={() => setUploadModalOpen(false)}
              className="icon-circle-btn"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "32px",
                height: "32px",
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            <div className="slash-tag">DOCUMENT INGESTION</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Upload Document to Workspace
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5, fontWeight: 400 }}>
              Follow simple steps to add files for your AI agents to query.
            </p>

            {/* Step 1: File selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2E3032", color: "#FFFFFF", fontSize: "0.72rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  1
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                  Choose Your File
                </span>
              </div>

              {!uploadFile ? (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem 1rem",
                  border: "1px dashed rgba(40, 40, 40, 0.12)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-page)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}>
                  <Upload size={22} strokeWidth={1.5} color="var(--text-primary)" style={{ marginBottom: "0.5rem" }} />
                  <span style={{ fontWeight: 450, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    Click to browse or drag file here
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                    Excel (.xlsx, .xls), CSV, JSON, PDF, DOCX, TXT (up to 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.csv,.json,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1.1rem",
                  background: "var(--bg-page)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(40, 40, 40, 0.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <FileText size={18} strokeWidth={1.5} color="var(--text-primary)" />
                    <div>
                      <div style={{ fontWeight: 450, fontSize: "0.88rem", color: "var(--text-primary)" }}>{uploadFile.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{(uploadFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
                  >
                    <X size={15} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Description for AI */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2E3032", color: "#FFFFFF", fontSize: "0.72rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  2
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                  Add Description for AI (Optional)
                </span>
              </div>
              <textarea
                className="modern-input"
                placeholder="e.g. Q3 Sales Data - AI can use this for revenue calculations and customer summaries."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                style={{ height: "70px", resize: "none", fontSize: "0.85rem" }}
              />
            </div>

            {/* Step 3: Action */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploading}
                onClick={handleExecuteUpload}
                className="pill-btn pill-btn-solid"
              >
                {uploading ? "Processing Document..." : "Upload & Save"}
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 ABOX SHARE MCP LINK WIZARD (TRANSFORMATION ONLY FOR TABULAR DATA)       */}
      {/* ========================================================================= */}
      {shareWizardOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.4)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 160,
          padding: "clamp(0.5rem, 2vw, 1.5rem)",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: shareStep === 2 && hasDataFilesSelected ? "98vw" : "560px",
            height: shareStep === 2 && hasDataFilesSelected ? "94vh" : "auto",
            maxHeight: "96vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            transition: "all 0.25s ease",
          }}>
            {/* Header with Step Tracker */}
            <div style={{
              padding: "1rem clamp(1rem, 2.5vw, 1.75rem)",
              borderBottom: "1px solid rgba(40, 40, 40, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              background: "#FFFFFF",
            }}>
              <div>
                <div className="slash-tag" style={{ margin: 0, marginBottom: "0.2rem" }}>
                  {hasDataFilesSelected
                    ? `STEP ${shareStep} OF 2: ${shareStep === 1 ? "SELECT FILES" : "DATA & COLUMN TRANSFORMATION STUDIO"}`
                    : "ABOX LINK CONFIGURATION"}
                </div>
                <h2 style={{ fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {shareStep === 1
                    ? "Configure AI Link & File Scope"
                    : "Data & Column Transformation Studio"}
                </h2>
              </div>

              <button
                onClick={() => setShareWizardOpen(false)}
                className="icon-circle-btn"
                style={{ width: "32px", height: "32px" }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: shareStep === 2 && hasDataFilesSelected ? "1rem clamp(0.75rem, 2vw, 1.5rem)" : "1.25rem clamp(1rem, 3vw, 2rem)", display: "flex", flexDirection: "column" }}>
              {/* ========================================================================= */}
              {/* STEP 1: LINK IDENTITY & FILE SELECTION */}
              {/* ========================================================================= */}
              {shareStep === 1 && (
                <div>
                  <div style={{ marginBottom: "1.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                      1. Link Label / Purpose
                    </label>
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="e.g. Claude Support Bot or Financial Analyst"
                      value={shareName}
                      onChange={(e) => setShareName(e.target.value)}
                    />
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                      Give this link a clear name so you can track its activity in the audit trail.
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                        2. Select Files to Include ({selectedFileIds.length}/{files.length})
                      </label>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds(files.map((f) => f.id))}
                          style={{ fontSize: "0.75rem", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontWeight: 500 }}
                        >
                          Select All
                        </button>
                        <span style={{ color: "var(--text-tertiary)" }}>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds([])}
                          style={{ fontSize: "0.75rem", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      background: "var(--bg-page)",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(40, 40, 40, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}>
                      {files.length === 0 ? (
                        <div style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", textAlign: "center", padding: "1.5rem" }}>
                          No documents uploaded yet. Upload a file first.
                        </div>
                      ) : (
                        files.map((f) => {
                          const isChecked = selectedFileIds.includes(f.id);
                          const isData = isDataFile(f);
                          return (
                            <div
                              key={f.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedFileIds(selectedFileIds.filter((id) => id !== f.id));
                                } else {
                                  setSelectedFileIds([...selectedFileIds, f.id]);
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "var(--radius-sm)",
                                background: isChecked ? "#FFFFFF" : "transparent",
                                border: isChecked ? "1px solid rgba(40, 40, 40, 0.05)" : "1px solid transparent",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                                {isChecked ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" />}
                                <FileText size={15} strokeWidth={1.5} color={isData ? "#2E3032" : "#989B9D"} />
                                <span style={{ fontSize: "0.88rem", fontWeight: isChecked ? 450 : 400, color: "var(--text-primary)" }}>
                                  {f.original_filename}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span className="badge-status" style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}>
                                  {isData ? "DATA" : "DOC"}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>
                                  {(f.file_size / 1024).toFixed(0)} KB
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!hasDataFilesSelected && selectedFiles.length > 0 && (
                      <div style={{
                        marginTop: "1rem",
                        padding: "0.75rem 1rem",
                        background: "rgba(0,0,0,0.02)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}>
                        <ShieldCheck size={16} strokeWidth={1.5} color="#2E3032" />
                        <span>Selected files are documents (PDF/Word/Text). They will be served safely via standard MCP resources with no column transformation needed.</span>
                      </div>
                    )}
                  </div>

                  {/* 3. Granular Tool Permissions & AI Capabilities */}
                  <div style={{ marginTop: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                      3. MCP Tool Permissions & AI Capabilities
                    </label>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                      Choose which tools this MCP credential can execute:
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
                      {/* Read Documents */}
                      <div
                        onClick={() => setShareCanRead(!shareCanRead)}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "var(--radius-md)",
                          background: shareCanRead ? "#FFFFFF" : "var(--bg-page)",
                          border: shareCanRead ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {shareCanRead ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" style={{ marginTop: "2px" }} /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginTop: "2px" }} />}
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Read Documents</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>read_resource tool</div>
                        </div>
                      </div>

                      {/* Search */}
                      <div
                        onClick={() => setShareCanSearch(!shareCanSearch)}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "var(--radius-md)",
                          background: shareCanSearch ? "#FFFFFF" : "var(--bg-page)",
                          border: shareCanSearch ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {shareCanSearch ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" style={{ marginTop: "2px" }} /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginTop: "2px" }} />}
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Full-Text Search</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>search tool</div>
                        </div>
                      </div>

                      {/* Query Tables */}
                      <div
                        onClick={() => setShareCanQuery(!shareCanQuery)}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "var(--radius-md)",
                          background: shareCanQuery ? "#FFFFFF" : "var(--bg-page)",
                          border: shareCanQuery ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {shareCanQuery ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" style={{ marginTop: "2px" }} /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginTop: "2px" }} />}
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Query Tables &amp; Schema</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>query_dataset tool</div>
                        </div>
                      </div>

                      {/* Edit / Mutate Data */}
                      <div
                        onClick={() => setShareCanEdit(!shareCanEdit)}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "var(--radius-md)",
                          background: shareCanEdit ? "rgba(234, 179, 8, 0.08)" : "var(--bg-page)",
                          border: shareCanEdit ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(40, 40, 40, 0.04)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {shareCanEdit ? <CheckSquare size={16} strokeWidth={1.5} color="#B45309" style={{ marginTop: "2px" }} /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginTop: "2px" }} />}
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 450, color: shareCanEdit ? "#B45309" : "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <span>AI Data Edit / Mutation</span>
                            {shareCanEdit && <span className="badge-status badge-status-transform" style={{ fontSize: "0.65rem", padding: "0.05rem 0.35rem" }}>Active</span>}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {shareCanEdit ? "edit_dataset tool authorized" : "edit_dataset blocked (Read-only)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 2: FULLSCREEN INTERACTIVE SPREADSHEET & TRANSFORMATION STUDIO        */}
              {/* ========================================================================= */}
              {shareStep === 2 && hasDataFilesSelected && (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  {/* Top Bar: Active File Selector & Mobile Tab Toggle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", overflowX: "auto" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 450, color: "var(--text-secondary)", textTransform: "uppercase", marginRight: "0.3rem" }}>
                        Active Data File:
                      </span>
                      {selectedDataFiles.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setActiveTransformFileId(f.id);
                            loadDynamicFileSchema(f.id);
                          }}
                          className={`pill-tab ${activeTransformFile?.id === f.id ? "active" : ""}`}
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem", gap: "0.4rem", display: "flex", alignItems: "center" }}
                        >
                          <Table size={13} strokeWidth={1.5} color="#2E3032" />
                          <span>{f.original_filename}</span>
                        </button>
                      ))}
                    </div>

                    {/* Mobile Switcher (Visible on mobile/tablets) */}
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <button
                        type="button"
                        onClick={() => setStudioMobileTab("sidebar")}
                        className={`pill-tab ${studioMobileTab === "sidebar" ? "active" : ""}`}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
                      >
                        Columns &amp; Sheets
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioMobileTab("sheet")}
                        className={`pill-tab ${studioMobileTab === "sheet" ? "active" : ""}`}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
                      >
                        Spreadsheet Grid
                      </button>
                    </div>
                  </div>

                  {loadingTransformFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: "4rem 0", gap: "0.6rem", color: "var(--text-secondary)" }}>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Reading Excel / CSV table columns &amp; sample data...</span>
                    </div>
                  ) : activeTransformFile && (
                    <div className="spreadsheet-studio-container">
                      {/* ========================================================================= */}
                      {/* LEFT SIDEBAR: SHEETS, DETECTED COLUMNS, TABLE DETECTOR                    */}
                      {/* ========================================================================= */}
                      <div className="spreadsheet-sidebar" style={{
                        display: studioMobileTab === "sidebar" || (typeof window !== "undefined" && window.innerWidth >= 900) ? "flex" : "none"
                      }}>
                        {/* 1. Multi-Sheet Selector (If Excel has multiple worksheets) */}
                        {availableSheets.length > 1 && (
                          <div style={{
                            background: "var(--bg-page)",
                            padding: "0.85rem 1rem",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid rgba(40, 40, 40, 0.04)",
                          }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                              <Layers size={13} strokeWidth={1.5} color="#2E3032" />
                              <span>Worksheets ({availableSheets.length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {availableSheets.map((sName) => (
                                <button
                                  key={sName}
                                  type="button"
                                  onClick={() => handleSelectSheet(sName)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.45rem 0.65rem",
                                    borderRadius: "var(--radius-sm)",
                                    background: activeSheetName === sName ? "#FFFFFF" : "transparent",
                                    border: activeSheetName === sName ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid transparent",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    fontWeight: activeSheetName === sName ? 500 : 400,
                                    color: "var(--text-primary)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <Table size={12} strokeWidth={1.5} color={activeSheetName === sName ? "#2E3032" : "var(--text-tertiary)"} />
                                    <span>{sName}</span>
                                  </div>
                                  {activeSheetName === sName && (
                                    <span className="badge-status badge-status-allow" style={{ fontSize: "0.62rem", padding: "0.05rem 0.35rem" }}>
                                      Active
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Smart Table Detection & Header Row Selector */}
                        <div style={{
                          background: "var(--bg-page)",
                          padding: "0.85rem 1rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(40, 40, 40, 0.04)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Sliders size={13} strokeWidth={1.5} color="#2E3032" />
                              <span>Table Header Detector</span>
                            </div>
                            <span className="badge-status badge-status-allow" style={{ fontSize: "0.62rem", padding: "0.05rem 0.35rem" }}>
                              {isTableDetected ? "Table Detected" : "Raw Data"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                            Header row automatically detected. You can change row offset manually:
                          </div>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            {[0, 1, 2, 3].map((rowIdx) => (
                              <button
                                key={rowIdx}
                                type="button"
                                onClick={() => setHeaderRowIndex(rowIdx)}
                                style={{
                                  flex: 1,
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.4rem",
                                  borderRadius: "var(--radius-sm)",
                                  border: headerRowIndex === rowIdx ? "1px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.06)",
                                  background: headerRowIndex === rowIdx ? "#2E3032" : "#FFFFFF",
                                  color: headerRowIndex === rowIdx ? "#FFFFFF" : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 450,
                                }}
                              >
                                Row {rowIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Detected Columns List */}
                        <div style={{
                          background: "var(--bg-page)",
                          padding: "0.85rem 1rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(40, 40, 40, 0.04)",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                            <div style={{ fontSize: "0.74rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Columns size={13} strokeWidth={1.5} color="#2E3032" />
                              <span>Detected Columns ({availableColumns.length})</span>
                            </div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>Click to Inspect</span>
                          </div>

                          {/* Column Selection List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", overflowY: "auto", maxHeight: "260px", paddingRight: "0.2rem" }}>
                            {availableColumns.map((col) => {
                              const action = columnActions[col.name] || "KEEP";
                              const isSelected = selectedColumnName === col.name;
                              return (
                                <div
                                  key={col.name}
                                  onClick={() => setSelectedColumnName(col.name)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.5rem 0.65rem",
                                    background: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                                    borderRadius: "var(--radius-sm)",
                                    border: isSelected ? "1.5px solid #2E3032" : "1px solid rgba(40, 40, 40, 0.05)",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                                    <span style={{
                                      width: "18px",
                                      height: "18px",
                                      borderRadius: "3px",
                                      background: isSelected ? "#2E3032" : "rgba(0,0,0,0.04)",
                                      color: isSelected ? "#FFFFFF" : "var(--text-tertiary)",
                                      fontFamily: "JetBrains Mono, monospace",
                                      fontSize: "0.68rem",
                                      fontWeight: 500,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}>
                                      {col.letter}
                                    </span>
                                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                                      <div style={{ fontSize: "0.8rem", fontWeight: isSelected ? 500 : 400, color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                        {col.name}
                                      </div>
                                      <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
                                        {col.type}
                                      </div>
                                    </div>
                                  </div>

                                  <span style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 450,
                                    padding: "0.1rem 0.45rem",
                                    borderRadius: "var(--radius-pill)",
                                    background: action === "REMOVE" ? "var(--status-deny-bg)" : action === "MASK" ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.04)",
                                    color: action === "REMOVE" ? "var(--status-deny)" : action === "MASK" ? "#2E3032" : "var(--text-secondary)",
                                    flexShrink: 0,
                                  }}>
                                    {action === "REMOVE" ? "Drop" : action === "MASK" ? "Mask" : "Keep"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Custom Drop Input */}
                          <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid rgba(40, 40, 40, 0.04)" }}>
                            <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 450 }}>
                              Custom columns to drop:
                            </label>
                            <input
                              type="text"
                              className="modern-input"
                              placeholder="e.g. credit_card, ssn"
                              value={customColumnsToHide}
                              onChange={(e) => setCustomColumnsToHide(e.target.value)}
                              style={{ fontSize: "0.76rem", padding: "0.35rem 0.6rem" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ========================================================================= */}
                      {/* RIGHT SPREADSHEET CANVAS: INTERACTIVE CELL EDITING & ACTIONS               */}
                      {/* ========================================================================= */}
                      <div className="spreadsheet-main-area" style={{
                        display: studioMobileTab === "sheet" || (typeof window !== "undefined" && window.innerWidth >= 900) ? "flex" : "none"
                      }}>
                        <div style={{
                          background: "#FFFFFF",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(40, 40, 40, 0.06)",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}>
                          {/* Active Column Transformation Toolbar */}
                          <div style={{
                            padding: "0.75rem 1.15rem",
                            background: "#FBFBFC",
                            borderBottom: "1px solid rgba(40, 40, 40, 0.05)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.6rem",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.74rem", fontWeight: 450, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                Selected Column:
                              </span>
                              <span style={{
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 500,
                                fontSize: "0.84rem",
                                color: "var(--text-primary)",
                                background: "#FFFFFF",
                                border: "1px solid rgba(40, 40, 40, 0.08)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                              }}>
                                {selectedColumnName || "—"}
                              </span>
                            </div>

                            {/* Action Buttons & Add Row */}
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                disabled={!selectedColumnName}
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "KEEP" })}
                                style={{
                                  fontSize: "0.74rem",
                                  padding: "0.28rem 0.65rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "#2E3032" : "rgba(40, 40, 40, 0.06)",
                                  background: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "#2E3032" : "#FFFFFF",
                                  color: (columnActions[selectedColumnName] || "KEEP") === "KEEP" ? "#FFFFFF" : "var(--text-secondary)",
                                  fontWeight: 450,
                                  cursor: "pointer",
                                }}
                              >
                                Keep Original
                              </button>

                              <button
                                type="button"
                                disabled={!selectedColumnName}
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "MASK" })}
                                style={{
                                  fontSize: "0.74rem",
                                  padding: "0.28rem 0.65rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: columnActions[selectedColumnName] === "MASK" ? "#2E3032" : "rgba(40, 40, 40, 0.06)",
                                  background: columnActions[selectedColumnName] === "MASK" ? "rgba(0,0,0,0.06)" : "#FFFFFF",
                                  color: "var(--text-primary)",
                                  fontWeight: 450,
                                  cursor: "pointer",
                                }}
                              >
                                ✦ Mask Column
                              </button>

                              <button
                                type="button"
                                disabled={!selectedColumnName}
                                onClick={() => setColumnActions({ ...columnActions, [selectedColumnName]: "REMOVE" })}
                                style={{
                                  fontSize: "0.74rem",
                                  padding: "0.28rem 0.65rem",
                                  borderRadius: "var(--radius-pill)",
                                  border: "1px solid",
                                  borderColor: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny)" : "rgba(40, 40, 40, 0.06)",
                                  background: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny-bg)" : "#FFFFFF",
                                  color: columnActions[selectedColumnName] === "REMOVE" ? "var(--status-deny)" : "var(--text-secondary)",
                                  fontWeight: 450,
                                  cursor: "pointer",
                                }}
                              >
                                Drop Column
                              </button>

                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="pill-btn pill-btn-glass"
                                style={{ fontSize: "0.74rem", padding: "0.28rem 0.65rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                              >
                                <span>+ Add Row</span>
                              </button>
                            </div>
                          </div>

                          {/* Proper Interactive Spreadsheet Canvas */}
                          <div style={{ flex: 1, overflow: "auto", position: "relative", minHeight: "260px" }}>
                            <table className="spreadsheet-grid-table">
                              <thead>
                                <tr>
                                  <th className="spreadsheet-row-index">#</th>
                                  {availableColumns.map((col) => {
                                    const action = columnActions[col.name] || "KEEP";
                                    const isSelected = selectedColumnName === col.name;
                                    return (
                                      <th
                                        key={col.name}
                                        onClick={() => setSelectedColumnName(col.name)}
                                        style={{
                                          background: isSelected ? "#EAEAEA" : "#F7F7F8",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                            <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace" }}>{col.letter}</span>
                                            <span style={{
                                              fontWeight: 500,
                                              fontSize: "0.82rem",
                                              color: action === "REMOVE" ? "var(--status-deny)" : "var(--text-primary)",
                                              textDecoration: action === "REMOVE" ? "line-through" : "none",
                                            }}>
                                              {col.name}
                                            </span>
                                          </div>
                                          <span style={{
                                            fontSize: "0.62rem",
                                            fontWeight: 500,
                                            padding: "0.08rem 0.35rem",
                                            borderRadius: "3px",
                                            background: action === "REMOVE" ? "var(--status-deny)" : action === "MASK" ? "#B45309" : "#2E3032",
                                            color: "#FFFFFF",
                                          }}>
                                            {action === "REMOVE" ? "DROP" : action === "MASK" ? "MASK" : "KEEP"}
                                          </span>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>

                              <tbody>
                                {(editableRows.length > 0 ? editableRows : Array.from({ length: dynamicRowsCount || 3 })).map((rowObj, rowIdx) => (
                                  <tr key={rowIdx}>
                                    <td className="spreadsheet-row-index">
                                      {rowIdx + 1}
                                    </td>

                                    {availableColumns.map((col) => {
                                      const action = columnActions[col.name] || "KEEP";
                                      const isSelectedCol = selectedColumnName === col.name;
                                      const rawVal = rowObj && typeof rowObj === "object" && rowObj[col.name] !== undefined
                                        ? String(rowObj[col.name])
                                        : (col.sample[rowIdx] !== undefined ? col.sample[rowIdx] : "");

                                      const isEditingThisCell = editingCell?.rowIndex === rowIdx && editingCell?.colName === col.name;

                                      let displayVal = rawVal;
                                      if (action === "REMOVE") {
                                        displayVal = "[DROPPED BY POLICY]";
                                      } else if (action === "MASK") {
                                        if (col.type === "email" && rawVal.includes("@")) {
                                          displayVal = rawVal.replace(/(^.).*(@.*)/, "$1***$2");
                                        } else if (rawVal.length > 4) {
                                          displayVal = `***${rawVal.slice(-3)}`;
                                        } else {
                                          displayVal = "***";
                                        }
                                      }

                                      if (isEditingThisCell) {
                                        return (
                                          <td key={col.name} className="cell-editing">
                                            <input
                                              autoFocus
                                              className="spreadsheet-cell-input"
                                              value={rawVal}
                                              onChange={(e) => handleCellChange(rowIdx, col.name, e.target.value)}
                                              onBlur={() => setEditingCell(null)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === "Escape") {
                                                  setEditingCell(null);
                                                }
                                              }}
                                            />
                                          </td>
                                        );
                                      }

                                      return (
                                        <td
                                          key={col.name}
                                          onClick={() => setSelectedColumnName(col.name)}
                                          onDoubleClick={() => setEditingCell({ rowIndex: rowIdx, colName: col.name })}
                                          title="Double-click to edit cell directly"
                                          style={{
                                            background: isSelectedCol ? "rgba(46, 48, 50, 0.02)" : "#FFFFFF",
                                            color: action === "REMOVE" ? "var(--text-tertiary)" : "var(--text-primary)",
                                            fontStyle: action === "REMOVE" ? "italic" : "normal",
                                            fontWeight: action === "MASK" ? 500 : 400,
                                            cursor: "cell",
                                            fontFamily: "JetBrains Mono, monospace",
                                          }}
                                        >
                                          {displayVal || <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>null</span>}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Studio Footer Status */}
                          <div style={{
                            padding: "0.55rem 1.15rem",
                            background: "#F8F9FA",
                            borderTop: "1px solid rgba(40, 40, 40, 0.05)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.72rem",
                            color: "var(--text-secondary)",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span>Sheet: <strong>{activeSheetName || "Default"}</strong> ({editableRows.length} rows loaded)</span>
                              <span>•</span>
                              <span style={{ color: "var(--text-tertiary)" }}>Double-click any cell to edit value</span>
                            </div>
                            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                              ✓ Live Workspace Isolated &amp; Policy Enforced
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{
              padding: "1rem clamp(1rem, 3vw, 2rem)",
              borderTop: "1px solid rgba(40, 40, 40, 0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--bg-page)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}>
              {shareStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setShareStep(1)}
                  className="pill-btn pill-btn-glass"
                  style={{ gap: "0.4rem" }}
                >
                  <ArrowLeft size={14} strokeWidth={1.5} />
                  <span>Back to File Selection</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShareWizardOpen(false)}
                  className="pill-btn pill-btn-glass"
                >
                  Cancel
                </button>
              )}

              {shareStep === 1 && hasDataFilesSelected ? (
                <button
                  type="button"
                  disabled={selectedFileIds.length === 0 || !shareName.trim()}
                  onClick={() => setShareStep(2)}
                  className="pill-btn pill-btn-solid"
                >
                  <span>Next: Power Query Transformation</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={generatingLink || selectedFileIds.length === 0 || !shareName.trim()}
                  onClick={handleGenerateShareLink}
                  className="pill-btn pill-btn-solid"
                >
                  <Key size={14} strokeWidth={1.5} />
                  <span>{generatingLink ? "Generating Link..." : "Generate ABOX MCP Link"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW EXTRACTED CONTENT (NON-PDF ONLY)                              */}
      {/* ========================================================================= */}
      {selectedFileContent && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "800px",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            padding: "clamp(1.5rem, 3vw, 2.25rem)",
            position: "relative",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
          }}>
            <button
              onClick={() => setSelectedFileContent(null)}
              className="icon-circle-btn"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "32px",
                height: "32px",
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            <div className="slash-tag">PARSED CONTENT</div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {selectedFileName}
            </h3>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <span className="badge-status badge-status-allow">Indexed</span>
              <span className="badge-status badge-status-transform">
                Detected PII: {selectedFileContent.detected_entities?.length || 0}
              </span>
            </div>

            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.1rem",
              background: "var(--bg-page)",
              border: "1px solid rgba(40, 40, 40, 0.04)",
              borderRadius: "var(--radius-md)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.82rem",
              lineHeight: 1.65,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              marginBottom: "1rem",
            }}>
              {selectedFileContent.plain_text}
            </div>

            {selectedFileContent.detected_entities && selectedFileContent.detected_entities.length > 0 && (
              <div style={{
                maxHeight: "100px",
                overflowY: "auto",
                background: "var(--bg-page)",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(40, 40, 40, 0.04)",
              }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                  Detected Entities in Document:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {selectedFileContent.detected_entities.map((e, idx) => (
                    <span key={idx} className="badge-status badge-status-transform" style={{ fontSize: "0.72rem" }}>
                      {e.entity_type}: {e.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONE-TIME TOKEN REVEAL                                              */}
      {/* ========================================================================= */}
      {createdCredential && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.35)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "620px",
            padding: "clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 2.25rem)",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            maxHeight: "92vh",
            overflowY: "auto",
          }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="slash-tag" style={{ justifyContent: "center" }}>ABOX MCP LINK READY</div>
              <h3 style={{ fontSize: "1.45rem", fontWeight: 400, marginBottom: "0.3rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Your Shareable MCP Token
              </h3>
              <p style={{
                fontSize: "0.82rem",
                color: "var(--status-deny)",
                background: "var(--status-deny-bg)",
                padding: "0.4rem 0.9rem",
                borderRadius: "var(--radius-pill)",
                display: "inline-block",
                border: "1px solid rgba(194, 65, 12, 0.15)",
              }}>
                Copy this token now. It cannot be recovered after closing this window.
              </p>
            </div>

            {/* Claude.ai Web Remote Connector URL */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                1. Claude.ai Web Remote Connector URL
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  readOnly
                  value={`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", background: "var(--bg-page)", flex: "1 1 200px" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp?token=${createdCredential.raw_token}`);
                    notify("success", "Claude.ai Connector URL copied!");
                  }}
                  className="pill-btn pill-btn-solid"
                  style={{ padding: "0 1.15rem" }}
                >
                  <Copy size={14} strokeWidth={1.5} />
                  <span>Copy URL</span>
                </button>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                Paste this into Claude.ai with <strong>Authentication: None</strong> to connect directly and securely.
              </div>
            </div>

            {/* Copyable Bearer Token */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                2. Bearer Authentication Token
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  readOnly
                  value={createdCredential.raw_token}
                  className="modern-input"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", flex: "1 1 200px" }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredential.raw_token);
                    setCopiedToken(true);
                    notify("success", "Token copied to clipboard.");
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="pill-btn pill-btn-glass"
                  style={{ padding: "0 1.15rem" }}
                >
                  {copiedToken ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Claude Desktop Config Snippet */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                3. Claude Desktop / Cursor JSON Config
              </div>
              <div style={{
                padding: "0.85rem 1.1rem",
                background: "#2E3032",
                borderRadius: "var(--radius-md)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.78rem",
                overflowX: "auto",
                color: "#FFE63C",
              }}>
                <pre>{JSON.stringify({
                  mcpServers: {
                    [workspace.name.toLowerCase().replace(/\s+/g, "-")]: {
                      url: `${process.env.NEXT_PUBLIC_API_URL || "https://dbmcp.onrender.com"}/mcp`,
                      headers: {
                        Authorization: `Bearer ${createdCredential.raw_token}`,
                      },
                    },
                  },
                }, null, 2)}</pre>
              </div>
            </div>

            {/* 4. AI Agent Skills File & Instructions */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.4rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                  4. AI Agent Skills & Instructions
                </div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ABOX_AI_SKILLS_MARKDOWN);
                      notify("success", "AI Skills markdown copied to clipboard!");
                    }}
                    className="pill-btn pill-btn-glass"
                    style={{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", gap: "0.3rem" }}
                  >
                    <Copy size={12} strokeWidth={1.5} />
                    Copy Skills Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([ABOX_AI_SKILLS_MARKDOWN], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "ABOX_AGENT_SKILLS.md";
                      a.click();
                      URL.revokeObjectURL(url);
                      notify("success", "Downloaded ABOX_AGENT_SKILLS.md");
                    }}
                    className="pill-btn pill-btn-glass"
                    style={{ padding: "0.2rem 0.65rem", fontSize: "0.74rem", gap: "0.3rem" }}
                  >
                    <Download size={12} strokeWidth={1.5} />
                    Download .md
                  </button>
                </div>
              </div>
              <div style={{
                padding: "0.75rem 0.95rem",
                background: "var(--bg-page)",
                border: "1px solid rgba(40, 40, 40, 0.05)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.76rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.15rem" }}>
                  ⚡ Mandatory AI Verification Directive:
                </div>
                <div>
                  Whenever the AI executes <code>edit_dataset</code>, it is strictly instructed to immediately run <code>query_dataset</code> to verify that the change persisted in storage before replying to the user.
                </div>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredential(null)}
              className="pill-btn pill-btn-solid"
              style={{ width: "100%", padding: "0.75rem" }}
            >
              Done, I Have Saved This Token
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MCP LINK PERMISSIONS & CAPABILITIES                          */}
      {/* ========================================================================= */}
      {editPermsModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.4)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 160,
          padding: "1rem",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "540px",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            padding: "clamp(1.5rem, 3vw, 2rem)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <div className="slash-tag" style={{ margin: 0, marginBottom: "0.2rem" }}>LINK SECURITY POLICY</div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Edit MCP Link Permissions
                </h2>
              </div>
              <button
                onClick={() => setEditPermsModalOpen(false)}
                className="icon-circle-btn"
                style={{ width: "32px", height: "32px" }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            {/* Link Name */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.35rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                Link Name
              </label>
              <input
                type="text"
                className="modern-input"
                value={editingCredName}
                onChange={(e) => setEditingCredName(e.target.value)}
              />
            </div>

            {/* Permissions */}
            <div style={{ marginBottom: "1.75rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", marginBottom: "0.45rem", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                Authorized MCP Tools
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Read Documents */}
                <div
                  onClick={() => setEditingCanRead(!editingCanRead)}
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    background: editingCanRead ? "#FFFFFF" : "var(--bg-page)",
                    border: editingCanRead ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {editingCanRead ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" />}
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Read Documents (read_resource)</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Access text/summary of allowed documents</div>
                    </div>
                  </div>
                  <span className={`badge-status ${editingCanRead ? "badge-status-allow" : "badge-status-deny"}`}>
                    {editingCanRead ? "Allowed" : "Blocked"}
                  </span>
                </div>

                {/* Full-Text Search */}
                <div
                  onClick={() => setEditingCanSearch(!editingCanSearch)}
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    background: editingCanSearch ? "#FFFFFF" : "var(--bg-page)",
                    border: editingCanSearch ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {editingCanSearch ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" />}
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Keyword Search (search)</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Perform semantic and keyword search across documents</div>
                    </div>
                  </div>
                  <span className={`badge-status ${editingCanSearch ? "badge-status-allow" : "badge-status-deny"}`}>
                    {editingCanSearch ? "Allowed" : "Blocked"}
                  </span>
                </div>

                {/* Query Data Tables */}
                <div
                  onClick={() => setEditingCanQuery(!editingCanQuery)}
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    background: editingCanQuery ? "#FFFFFF" : "var(--bg-page)",
                    border: editingCanQuery ? "1px solid rgba(40, 40, 40, 0.12)" : "1px solid rgba(40, 40, 40, 0.04)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {editingCanQuery ? <CheckSquare size={16} strokeWidth={1.5} color="#2E3032" /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" />}
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 450, color: "var(--text-primary)" }}>Query Tables & Schema (query_dataset)</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Execute structured table filtering and aggregations</div>
                    </div>
                  </div>
                  <span className={`badge-status ${editingCanQuery ? "badge-status-allow" : "badge-status-deny"}`}>
                    {editingCanQuery ? "Allowed" : "Blocked"}
                  </span>
                </div>

                {/* Edit / Mutate Data */}
                <div
                  onClick={() => setEditingCanEdit(!editingCanEdit)}
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    background: editingCanEdit ? "rgba(234, 179, 8, 0.08)" : "var(--bg-page)",
                    border: editingCanEdit ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(40, 40, 40, 0.04)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {editingCanEdit ? <CheckSquare size={16} strokeWidth={1.5} color="#B45309" /> : <Square size={16} strokeWidth={1.5} color="var(--text-tertiary)" />}
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 450, color: editingCanEdit ? "#B45309" : "var(--text-primary)" }}>
                        AI Data Mutation / Edit (edit_dataset)
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                        Allow AI to update, insert, or modify records in dataset files
                      </div>
                    </div>
                  </div>
                  <span className={`badge-status ${editingCanEdit ? "badge-status-transform" : "badge-status-deny"}`}>
                    {editingCanEdit ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setEditPermsModalOpen(false)}
                className="pill-btn pill-btn-glass"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPerms}
                onClick={handleSavePermissions}
                className="pill-btn pill-btn-solid"
              >
                {savingPerms ? "Saving Changes..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AI AGENT SKILLS & OPERATIONAL GUIDE                                */}
      {/* ========================================================================= */}
      {skillsModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(46, 48, 50, 0.4)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 160,
          padding: "clamp(0.5rem, 2vw, 1.5rem)",
        }}>
          <div className="frosted-panel" style={{
            width: "100%",
            maxWidth: "760px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "1.5rem 2rem 1.25rem 2rem",
              borderBottom: "1px solid rgba(40, 40, 40, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div className="slash-tag" style={{ margin: 0, marginBottom: "0.2rem" }}>MCP PROTOCOL SKILLS FILE</div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  AI Agent Skills & Operational Guide
                </h2>
              </div>
              <button
                onClick={() => setSkillsModalOpen(false)}
                className="icon-circle-btn"
                style={{ width: "32px", height: "32px" }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "1.5rem 2rem",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}>
              {/* Highlight Banner */}
              <div style={{
                padding: "1rem 1.25rem",
                background: "rgba(255, 230, 60, 0.15)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}>
                <ShieldCheck size={18} strokeWidth={1.5} color="#B45309" style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.86rem", color: "#92400E", marginBottom: "0.2rem" }}>
                    Embedded Protocol Verification Directives
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#78350F", lineHeight: 1.5 }}>
                    When an AI agent connects via MCP, it automatically receives these operational directives. The AI is strictly required to always execute a follow-up <code>query_dataset</code> after any <code>edit_dataset</code> mutation to verify and confirm persisted changes before answering the user.
                  </div>
                </div>
              </div>

              {/* Raw Markdown Code View */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 450, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    ABOX_AGENT_SKILLS.md Content
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ABOX_AI_SKILLS_MARKDOWN);
                        setCopiedSkills(true);
                        notify("success", "Skills file copied to clipboard!");
                        setTimeout(() => setCopiedSkills(false), 2000);
                      }}
                      className="pill-btn pill-btn-glass"
                      style={{ padding: "0.3rem 0.85rem", fontSize: "0.78rem" }}
                    >
                      {copiedSkills ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
                      <span>{copiedSkills ? "Copied" : "Copy Markdown"}</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([ABOX_AI_SKILLS_MARKDOWN], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "ABOX_AGENT_SKILLS.md";
                        a.click();
                        URL.revokeObjectURL(url);
                        notify("success", "Downloaded ABOX_AGENT_SKILLS.md");
                      }}
                      className="pill-btn pill-btn-solid"
                      style={{ padding: "0.3rem 0.85rem", fontSize: "0.78rem" }}
                    >
                      <Download size={13} strokeWidth={1.5} />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: "1rem 1.25rem",
                  background: "#2E3032",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.76rem",
                  color: "#ECECED",
                  lineHeight: 1.6,
                  maxHeight: "360px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}>
                  {ABOX_AI_SKILLS_MARKDOWN}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1rem 2rem",
              borderTop: "1px solid rgba(40, 40, 40, 0.05)",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setSkillsModalOpen(false)}
                className="pill-btn pill-btn-solid"
                style={{ padding: "0.55rem 1.5rem" }}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
