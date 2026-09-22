---
name: interactive-clickable-forms
description: Create and render interactive Clickable UI directly inside the chat conversation — NOT in HTML files or external web pages. Renders tactile buttons, chips, dropdowns, text inputs, and submit buttons. Governs questionnaires, preferences, and adding/editing dataset records in chat.
---

# Interactive Clickable UI (In-Chat Forms & Controls)

## Purpose

Render rich, tactile, interactive UI controls directly inside the AI chat conversation. The chat interface parses structured markdown syntax into native clickable widgets (buttons, chips, dropdowns, and text inputs).

> 🚨 **ABSOLUTE RULE — NOT IN HTML FILES**:
> - **DO NOT create or write `.html` files** on disk.
> - **DO NOT output raw HTML tags** (`<form>`, `<input>`, `<div>`).
> - **DO NOT output dummy tokens** like `= [Form]`.
> - Always generate the Clickable UI **directly in the chat conversation** using the structured component syntax below.

---

## 🎨 Component Syntax Guide

The chat UI automatically converts these patterns into native interactive controls:

### 1. Open Text Input (For Names, Emails, Descriptions)
Use when the user needs to type custom text or a new record name:
```markdown
Field Label
[________________________]
```

### 2. Clickable Button Chips (For Choices & Options)
Use for quick single or multi-choice options:
```markdown
Field Label
[ Option 1 ]   [ Option 2 ]   [ Option 3 ]
```

### 3. Dropdown Menu (For Categorical Selections)
Use when there are several predefined categories or budget tiers:
```markdown
Field Label
[Select Option          ▼]
```

### 4. Radio Selection & Escape Hatch
```markdown
Field Label
( ) Choice A   ( ) Choice B   ( ) Choice C   ( ) Other / Custom...
```

### 5. Action / Submission Buttons
```markdown
[ Submit ]   [ Cancel ]
```

---

## 🚨 MANDATORY FIELD RULES FOR ADDING NEW RECORDS (e.g., "Add New Student")

When the user asks to add, create, or register a new record into a dataset:

1. **Entity Name / Identity MUST be a Text Input**:
   - The primary name of the new item being created (`Student Name`, `Person Name`, `Product Name`, `Employee Name`) **MUST ALWAYS** be rendered as an open text input:
     ```markdown
     Student Name
     [________________________]
     ```
   - ❌ **STRICT PROHIBITION**: **NEVER populate the new entity's name with existing records as dropdown options!** The user is adding a *new* person/item and needs to type their name.

2. **Categories, Departments & Statuses SHOULD be Dropdowns or Buttons**:
   - Fields that represent categories, tracks, majors, departments, statuses, or grades should be rendered as **dropdowns** or **clickable buttons**:
     ```markdown
     Department / Major
     [Select Major          ▼]
     
     Enrollment Status
     [ Full-Time ]   [ Part-Time ]
     ```

3. **Always Include a Submit Button**:
   - Every data entry form must conclude with an actionable submit button:
     ```markdown
     [ Submit Student Record ]   [ Cancel ]
     ```

---

## 📋 Few-Shot Examples

### Example 1: Preference Questionnaire (Phone Form)
**User**: "Create clickable form to get input from me and ask me what kind of phone I like"

**AI Output**:
Here's a clickable phone-preference form. Select your preferences and submit it.

### What kind of phone do you like?
Tell me your preferences and I'll use them to narrow down suitable phones.

**Phone brand**
[ Samsung ]   [ Apple ]   [ Xiaomi ]
[ OnePlus ]   [ Google ]   [ Any brand ]

**Budget**
[Select budget          ▼]

**What matters most?**
[ 📷 Camera ]   [ 🎮 Gaming ]   [ 🔋 Battery ]   [ ⚡ Performance ]

[ Submit Preferences ]

---

### Example 2: Adding a New Student Record
**User**: "I want to add a new student"

**AI Output**:
Here is the interactive form to add a new student. Fill in the details below:

### ➕ Add New Student Record

**Student Name**
[________________________]

**Department / Major**
[Select Major          ▼]

**Status**
[ Active ]   [ Enrolled ]   [ Inactive ]

**GPA (0.0 - 4.0)**
[________________________]

[ Submit Student Record ]   [ Cancel ]

---

## ⚡ After User Submits the Form
When the user submits the form:
1. Extract the entered and selected values.
2. Execute the dataset mutation using the backend tool:
   ```json
   edit_dataset(
     "resource_id": "<target_file_id>",
     "action": "insert",
     "new_row": {
       "name": "<entered_name>",
       "major": "<selected_major>",
       "status": "<selected_status>",
       "gpa": "<entered_gpa>"
     }
   )
   ```
3. Call `query_dataset` to verify persistence on disk and confirm back to the user.
