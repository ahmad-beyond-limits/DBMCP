---
name: session-form-tool
description: External web form generator using MCP tool 'generate_data_entry_form'. Use ONLY when the user explicitly requests an external browser form link or standalone web page. For normal requests, render Clickable UI directly in conversation.
---

# Session Form Tool (`generate_data_entry_form`)

## Purpose

The **Session Form** is an external MCP tool (`generate_data_entry_form`) that generates a standalone, temporary 5-minute browser web form. 

> 🚨 **PRIMARY RULE**:
> - Default to rendering **Clickable UI directly in conversation** using the in-chat component syntax (`[________________________]`, `[ Option ]`, `[Select ▼]`).
> - **DO NOT create or write `.html` files** on disk.
> - Call `generate_data_entry_form` **ONLY when the user explicitly requests an external web link or standalone full-page form window**.

---

## When to Call `generate_data_entry_form`

Call `generate_data_entry_form` only when:
1. The user explicitly asks for an external link or browser form:
   - *"Give me a web link to enter data"*
   - *"Open a standalone form in browser"*
2. Otherwise, always render the **Clickable UI directly inside the chat conversation**.

---

## How to Call and Present the Session Form

1. Call the tool:
   ```json
   generate_data_entry_form(
       "resource_id": "<file_or_table_id>",
       "action": "insert"
   )
   ```
2. Present the returned link directly as an action button:
   `👉 **[➕ Open Interactive Data Entry Form](<session_url>)**`
3. Remind the user:
   - The session form is temporary and active for **5 minutes**.
   - Submitting the form automatically persists the record to the dataset.
4. **Strict No-Recycling Lifecycle**:
   - Once submitted, closed, or expired after 5 minutes, the session form is permanently deleted from everywhere.
   - **NEVER reuse, recycle, or re-send an old session form link.**
