---
name: session-form-tool
description: Generate a standalone temporary 5-minute session form using the tool 'generate_data_entry_form'. Use ONLY when requirements are complex, extensive, or when an in-chat clickable form cannot be used.
---

# Session Form Tool

## Purpose

The **Session Form** is an external MCP tool (`generate_data_entry_form`) that generates a dedicated, temporary 5-minute standalone web form. 

Use this tool **ONLY when the requirement is complex, requires a standalone full-page screen, or when an in-chat clickable form cannot be used**.

---

## ⚖️ Crucial Distinction: Clickable Form vs. Session Form

| Feature | 🔘 Clickable Form (Chat UI) | 🌐 Session Form Tool (`generate_data_entry_form`) |
| :--- | :--- | :--- |
| **What is it?** | Your **OWN native chat UI capability** (NOT a tool). | An **external MCP tool** that returns a temporary web URL. |
| **Primary Use** | **Default for almost everything.** Always get data in clickable form by creating it directly in the conversation. | **Only for complex requirements** or when an in-chat clickable form cannot be used. |
| **Capabilities** | **Adds records, modifies records, and removes records.** Also handles surveys, questions, filters, options, and structured forms. | Complex, multi-step, large-scale schemas, bulk field entries, or file-heavy datasets. |
| **Where it renders** | Directly inside the chat conversation with interactive controls (buttons, chips, inputs, dropdowns). | Opens in a separate browser window / full-page web screen. |
| **Lifespan** | Stays within conversation history. | **Strict 5-minute temporary session.** Deleted once submitted, closed, or expired. |

---

## When to Use the Session Form Tool

Use `generate_data_entry_form` **ONLY** when:
1. **The requirement is complex**:
   - High-density schemas with dozens of interdependent fields.
   - Complex multi-step wizard workflows requiring tabbed navigation.
   - Advanced data types requiring specialized external browser pickers or file attachments.
2. **Clickable Form cannot be used**:
   - The conversational context or environment constraints make in-chat form rendering impractical.
3. **Explicit User Request**:
   - The user explicitly asks for a dedicated standalone web link or external full-page form window.

> ⚠️ **IMPORTANT**: For normal data entry, creating records, updating records, deleting records, surveys, or questionnaires, **DO NOT open a session form**. Instead, **get data in clickable form by creating it directly in the conversation**!

---

## How to Call and Present the Session Form

When a complex requirement truly calls for a session form:
1. Call the tool:
   ```json
   generate_data_entry_form(
       resource_id="<file_or_table_id>",
       action="insert", // or "update"
       filter={"id": 123} // if updating a specific record
   )
   ```
2. Present the returned link as a clear clickable action button:
   `👉 **[➕ Open Interactive Session Form](<session_url>)**`
3. Remind the user:
   - The session form is temporary and expires in **5 minutes**.
   - Closing the window or submitting the form revokes and deletes the session.
4. **Strict No-Recycling Lifecycle**:
   - Once submitted, closed, or expired after 5 minutes, the session form is permanently deleted from everywhere.
   - **NEVER reuse, recycle, or re-send an old session form link.**
   - If a new session form is needed later, always call `generate_data_entry_form` freshly.
