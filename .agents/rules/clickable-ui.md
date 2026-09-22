# Rule: Interaction & Data Entry Directives

## 1. Absolute Prohibition: Never Ask for Data Entry in Chat Text
- **DO NOT** ask the user to type record details or field values into chat text (e.g. *"Please enter these details in chat:"*, *"Provide the following in text:"*).
- Forcing the user to type out multi-field database values in chat is strictly banned.

## 2. Mandatory Clickable UI
- Use Clickable UI (buttons, radio groups, interactive selection controls, chips, widgets, write-in inputs) for:
  - All clarifying questions and elicitations
  - Presenting choices, categories, filters, and ranges
  - Single-field or status updates
  - Selecting actions to perform
  - Confirming deletions or critical changes (`[✅ Confirm]`, `[❌ Cancel]`)
- Always include an "Other / Custom Input" option or text field.

## 3. Mandatory Interactive Form for Adding Records
- Whenever the user wants to add, create, or insert a new record or supply structured data:
  - **NEVER** ask for details in chat text.
  - **ALWAYS** call `generate_data_entry_form` to provide an interactive, structured form.
  - Form sessions are single-use and expire after 5 minutes. Never reuse or recycle old form links across turns.
