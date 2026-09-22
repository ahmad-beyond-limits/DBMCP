# AGENTS.md — Global Operational Guidelines & Directives

## 🚨 MANDATORY DIRECTIVES: CLICKABLE UI & DATA ENTRY PROTOCOL

---

### 🚫 1. STRICT BANS
1. **NEVER ASK THE USER TO TYPE RECORD DETAILS IN PROSE TEXT**: Under NO circumstances should you ask the user to type out database values, comma-separated fields, or record details into raw chat text (e.g. *"Please enter these details in chat: Name, Age, Email..."*).
2. **NEVER CREATE OR WRITE HTML FILES FOR FORMS**: Do NOT create separate `.html` files, scripts, or write HTML files to disk when asked to gather input or create a form.
3. **NEVER OUTPUT RAW HTML TAGS OR FAKE PLACEHOLDERS**: Do NOT output raw HTML tags (`<form>`, `<input>`, `<div>`) or dead placeholders like `= [Form]`.

---

### 🔘 2. CLICKABLE UI (Rendered Directly in Conversation)
The chat interface has native capability to render structured markdown into real tactile interactive UI controls (buttons, chips, dropdowns, text inputs, and submit buttons).

👉 **Component Syntax**:
- **Text Input**:
  ```markdown
  Field Label
  [________________________]
  ```
- **Clickable Buttons / Chips**:
  ```markdown
  Field Label
  [ Option 1 ]   [ Option 2 ]   [ Option 3 ]
  ```
- **Dropdown Menu**:
  ```markdown
  Field Label
  [Select Option          ▼]
  ```
- **Submit / Cancel Buttons**:
  ```markdown
  [ Submit Record ]   [ Cancel ]
  ```

---

### 📋 3. MANDATORY FIELD RULES FOR ADDING NEW RECORDS (e.g., "Add New Student")
Whenever the user asks to add or insert a new record:
1. **Entity Name / New Identity MUST be a Text Input**:
   - The primary name of the new item being created (`Student Name`, `Person Name`, `Employee Name`) **MUST ALWAYS** be rendered as an open text input:
     ```markdown
     Student Name
     [________________________]
     ```
   - ❌ **STRICT PROHIBITION**: **NEVER populate the new entity's name with existing records as dropdown options!** The user is adding a *new* record and must type their name.
2. **Categories, Departments & Statuses SHOULD be Dropdowns or Buttons**:
   - Fields that represent categories, tracks, majors, departments, statuses, or grades should be rendered as **dropdowns** or **clickable buttons**:
     ```markdown
     Department / Major
     [Select Major          ▼]

     Enrollment Status
     [ Full-Time ]   [ Part-Time ]
     ```
3. **Always Include a Submit Button**:
   - Always conclude the form with an actionable button:
     ```markdown
     [ Submit Student Record ]   [ Cancel ]
     ```

---

### ⚡ 4. VERIFICATION PROTOCOL FOR DATASET CHANGES
Whenever you mutate data using `edit_dataset` (update, insert, delete):
1. Immediately call `query_dataset` with the updated criteria to verify persisted disk storage.
2. Confirm the exact updated values back to the user only after positive verification.
