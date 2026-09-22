# AGENTS.md — Global Operational Guidelines & Directives

## 🚨 MANDATORY DIRECTIVES: INTERACTION & DATA ENTRY PROTOCOL

---

### 🚫 1. STRICT BAN: NEVER ASK THE USER TO TYPE DETAILS IN CHAT
**ABSOLUTE PROHIBITION**: Under NO circumstances should you ever ask the user to type record details or field values into chat text (e.g., *"Please enter these details in chat:"*, *"Please provide the following information in chat:"*, *"Reply with: Name, Age, Email..."*). Asking the user to manually type out record fields into the chat box is strictly forbidden.

---

### 🔘 2. CLICKABLE UI & CONVERSATIONAL FORMS (Your OWN Native UI Functionality — NOT a Tool)
**CRITICAL CLARIFICATION**: Clickable UI and in-chat interactive forms are **NOT an MCP tool** or backend API call. They are your **OWN native chat interface functionality and rendering capability** (interactive buttons, radio chips, interactive selection modals, checkboxes, date pickers, dropdowns, widgets, and write-in inputs rendered directly in the chat UI).

**ALWAYS use Clickable UI & Conversational Forms by default** for:
- Asking clarifying questions or gathering preferences (Elicitation)
- Questionnaires, surveys, registrations, configuration screens, or structured input in conversation
- Presenting options, categories, ranges, filters, or next steps
- Updating a single attribute/field of an existing record (e.g. status, score, department, grade)
- Selecting an action to take (e.g. `[Update Status]`, `[Edit Score]`, `[Delete Record]`, `[View Profile]`)
- Confirming a deletion or mutation (`[✅ Yes, Confirm]`, `[❌ Cancel]`)

👉 **Render actual interactive, clickable controls (buttons, radio chips, interactive selection modals, widgets) directly in the UI.**  
👉 **ALWAYS provide an "Other / Custom Input" write-in option** so the user can type custom instructions if none of the provided choices fit.  
❌ **NEVER interrogate the user in prose paragraphs or list static text options as "clickable".**

---

### 📝 3. INTERACTIVE FORM (For Adding New Records or Multi-Field Data Entry)
Whenever the user wants to add, create, or insert a record, or enter data across multiple fields:
- **DO NOT ask the user to type the details into chat in text!**
- **IMMEDIATELY call `generate_data_entry_form(resource_id=..., action="insert")`** to give the user a dedicated web screen with structured input fields, data type validation, and a Submit button.
- Present the generated link cleanly:  
  `👉 **[➕ Open Interactive Data Entry Form](<url>)**`
- Remind the user that the session is temporary and active for 5 minutes.
- **Strict No-Recycling Lifecycle**: Form sessions expire after 5 minutes and are single-use. Once submitted, closed, or expired, a form is permanently deleted from everywhere. **NEVER reuse, recycle, or re-send an old form link.** Always call `generate_data_entry_form` freshly for each new data entry request.

---

### ⚡ 4. VERIFICATION PROTOCOL FOR DATASET CHANGES
Whenever you mutate data using `edit_dataset` (update, insert, delete):
1. Immediately call `query_dataset` with the updated criteria to verify persisted disk storage.
2. Confirm the exact updated values back to the user only after positive verification.
