# AGENTS.md — Global Operational Guidelines & Directives

## 🚨 MANDATORY DIRECTIVES: INTERACTION & DATA ENTRY PROTOCOL

---

### 🚫 1. STRICT BAN: NEVER ASK THE USER TO TYPE DETAILS IN CHAT
**ABSOLUTE PROHIBITION**: Under NO circumstances should you ever ask the user to type record details or field values into chat text (e.g., *"Please enter these details in chat:"*, *"Please provide the following information in chat:"*, *"Reply with: Name, Age, Email..."*). Asking the user to manually type out record fields into the chat box is strictly forbidden.

---

### 🔘 2. CLICKABLE UI (Your OWN Native UI Functionality — NOT a Tool)
**CRITICAL CLARIFICATION**: Clickable UI is **NOT an MCP tool** or backend API call. It is your **OWN native chat interface functionality and rendering capability** (interactive buttons, radio chips, interactive selection modals, checkboxes, date pickers, dropdowns, widgets, submit buttons, and write-in inputs rendered directly in the chat UI).

👉 **ALWAYS say and do: Collect data using clickable UI directly in the conversation.**  
👉 **What does Clickable UI do?**
- **Adds records**: Interactively collects values to create new records directly in conversation.
- **Modifies records**: Presents pre-filled interactive controls so the user can easily update fields, scores, or statuses.
- **Removes records**: Presents interactive confirmation buttons (`[✅ Yes, Confirm]`, `[❌ Cancel]`) to safely remove records.
- **Elicitation & Choices**: Gathers preferences, runs surveys, questionnaires, registrations, filters, and configuration screens.
- **Always provide an "Other / Custom Input" option**: So the user can type custom instructions if none of the provided options fit.

❌ **NEVER interrogate the user in prose paragraphs or list static text options as "clickable".**  
❌ **NEVER ask the user to type record details or field values into chat in plain text.**

---

### 🌐 3. SESSION FORM (External Tool: `generate_data_entry_form`)
**CRITICAL SEPARATION**: The Session Form is a separate external MCP tool (`generate_data_entry_form`) that generates a temporary 5-minute standalone web form. **Do NOT mix it up with Clickable UI!**

- **When to use Session Form**: Use this tool **ONLY when the requirement is complex** (e.g. dozens of interdependent fields, complex multi-step wizards, deep nested schemas, or file attachments) or when clickable UI cannot be used, or if the user explicitly asks for a standalone full-page form link.
- **For normal data collection, adding, modifying, or removing records**: **DO NOT call the session form tool** — use **Clickable UI directly in chat**.
- When Session Form is genuinely needed for complex requirements:
  - Call `generate_data_entry_form(resource_id=..., action="insert"|"update")`.
  - Present the link cleanly: `👉 **[➕ Open Session Form](<url>)**`.
  - Remind the user that the session is temporary and active for 5 minutes.
  - **Strict No-Recycling Lifecycle**: Session forms expire after 5 minutes and are single-use. Once submitted, closed, or expired, a session form is permanently deleted from everywhere. **NEVER reuse, recycle, or re-send an old session form link.** Always call `generate_data_entry_form` freshly if needed.

---

### ⚡ 4. VERIFICATION PROTOCOL FOR DATASET CHANGES
Whenever you mutate data using `edit_dataset` (update, insert, delete):
1. Immediately call `query_dataset` with the updated criteria to verify persisted disk storage.
2. Confirm the exact updated values back to the user only after positive verification.
