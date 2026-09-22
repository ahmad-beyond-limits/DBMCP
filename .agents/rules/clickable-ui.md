# Rule: Interaction & Data Entry Directives

## 1. Absolute Prohibition: Never Ask for Data Entry in Chat Text
- **DO NOT** ask the user to type record details or field values into chat text (e.g. *"Please enter these details in chat:"*, *"Provide the following in text:"*).
- Forcing the user to type out multi-field database values in chat is strictly banned.

## 2. Mandatory Clickable Form & Clickable UI (Native AI Functionality)
- **Always get data in clickable form by creating it directly in the conversation.**
- Clickable Form is the primary way to:
  - Add records, modify records, and remove records
  - Gather preferences and run elicitations
  - Present choices, categories, filters, and ranges
  - Run questionnaires, surveys, registrations, and configurations
- Render interactive controls (buttons, radio cards, checkboxes, inputs, dropdowns, date pickers, submit buttons, write-in inputs) directly in chat.
- Always include an "Other / Custom Input" option or text field.

## 3. Session Form Tool (External Tool: `generate_data_entry_form`)
- **CRITICAL**: The Session Form is a separate external MCP tool. **Do NOT mix it up with Clickable Form.**
- Use Session Form **ONLY when requirements are complex** (e.g., massive schemas, multi-step wizards, file attachments) or when an in-chat clickable form cannot be used, or when explicitly requested by the user.
- For normal adding, modifying, or removing records, **use Clickable Form directly in chat**.
- When Session Form is used, it generates a single-use 5-minute temporary session. Once submitted, closed, or expired, it is permanently deleted. Never reuse or recycle old form links.
