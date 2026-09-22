---
name: interactive-clickable-forms
description: Create interactive forms that users can complete directly inside the AI conversation. The form should use clickable UI controls wherever possible instead of requiring users to type every response manually. Always get data in clickable form by creating it directly in chat. Handles adding records, modifying records, removing records, surveys, and configuration.
---

# Interactive Clickable Forms

## Purpose

Create interactive forms that users can complete directly inside the AI conversation. 

**Always get data in clickable form by creating it directly in the conversation.** The form uses clickable UI controls wherever possible instead of requiring users to type every response manually in plain text.

> **CRITICAL CLARIFICATION**: Clickable Forms inside the chat are **NOT an MCP tool** — they are your **OWN native conversation interface functionality and rendering capability** (interactive buttons, cards, inputs, radios, checkboxes, date pickers, dropdowns, and widgets rendered directly in the chat UI).

---

## 🎯 What Does a Clickable Form Do?

A Clickable Form is the primary way to interactively collect and manipulate data:
- **Add records**: Collects fields interactively to insert new items or records.
- **Modify records**: Presents pre-filled interactive controls so the user can easily update fields, scores, or statuses.
- **Remove records**: Presents interactive confirmation buttons (`[✅ Confirm Delete]`, `[❌ Cancel]`) before removing records.
- **Surveys, Questionnaires & Registrations**: Collects multi-field inputs through structured controls.
- **Configurations & Settings**: Toggles options, sliders, and choice chips.

---

## ⚖️ Distinction From Session Form Tool

- **Clickable Form (Chat UI)**: The **default** method for adding, modifying, removing records, and collecting structured data in chat.
- **Session Form Tool (`generate_data_entry_form`)**: An external standalone web form used **ONLY when the requirement is complex** (e.g. dozens of interdependent fields, complex multi-step wizards) and an in-chat clickable form cannot be used. **Do NOT mix them up!**

---

## Behavior

When the user asks for a form, questionnaire, application, survey, registration, configuration screen, or wants to add, edit, or remove data:

1. **Always get data in clickable form by creating it directly in the conversation**.
2. **Identify the required fields**.
3. **Choose the most appropriate interactive control for each field**:
   * Single choice → radio buttons or selectable cards
   * Multiple choices → checkboxes
   * Yes/No → toggle or two-button choice
   * Short text → text input
   * Long text → textarea
   * Number → number input
   * Date → date picker
   * Time → time picker
   * Rating → clickable stars or numeric buttons
   * Dropdown selection → select menu
   * File → file-upload control
4. **Make options directly clickable**.
5. **Clearly mark required fields** (e.g. `*`).
6. **Group related fields** into logical sections.
7. **Provide a clear Submit/Continue button**.
8. **Provide Back, Reset, or Cancel controls** when appropriate.
9. **Validate required fields before submission**.
10. **Show useful validation messages next to invalid fields**.
11. **Preserve the user's entered information** when moving between form sections.
12. **After submission**, display a concise confirmation, summarize the submitted information, and execute any necessary dataset mutation via backend tools (`edit_dataset`).
13. **Never silently discard user-entered information**.

---

## Form Design Rules

Forms should be:
* **Simple and easy to scan**.
* **Mobile-friendly and keyboard accessible**.
* **Clearly labeled**.
* **Usable without unnecessary typing**.
* **Explicit about required versus optional fields**.
* **Consistent in terminology and button labels**.

Avoid asking the user to type information when a safe clickable option can represent the same choice. Always include an *"Other / Custom"* write-in option when presenting choices so the user can type custom instructions if none of the options fit.

---

## Dynamic Forms

When one answer determines subsequent questions, dynamically display only the relevant fields.

**Example**:
> Question: "What type of account do you want?"  
> `[ Personal ]` `[ Business ]`  
> 
> If the user selects **Business**, display:  
> * Company name  
> * Industry  
> * Number of employees  
> 
> If **Personal** is selected, display:  
> * Full name  
> * Date of birth  

---

## AI Interaction

The AI should be able to:
* Generate forms from natural-language requests.
* Convert existing questions into interactive controls.
* Add, remove, or modify fields when requested.
* Explain unclear fields.
* Pre-fill fields only when the information is explicitly available and appropriate.
* Ask for missing information when it is necessary.
* Modify the form without losing existing user input.
* Treat selections and inputs as structured form data rather than ordinary conversational text.

---

## Example

**User**:
> "Add a new student to the records."

**AI-generated Clickable Form (Rendered in Chat UI)**:

```markdown
### ➕ New Student Record

Student Name
[________________________]

Major / Department
( ) Computer Science   ( ) Data Science   ( ) Mathematics   ( ) Other...

Enrollment Status
[ Full-Time ] [ Part-Time ]

GPA (0.00 - 4.00)
[ 3.50 ]

[ Submit Student Record ]   [ Cancel ]
```
