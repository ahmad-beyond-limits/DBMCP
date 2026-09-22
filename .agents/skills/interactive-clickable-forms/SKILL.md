---
name: interactive-clickable-forms
description: Create interactive forms that users can complete directly inside the AI conversation. The form should use clickable UI controls wherever possible instead of requiring users to type every response manually. Trigger when the user asks for a form, questionnaire, application, survey, registration, configuration screen, or structured data collection.
---

# Interactive Clickable Forms

## Purpose

Create interactive forms that users can complete directly inside the AI conversation. The form should use clickable UI controls wherever possible instead of requiring users to type every response manually.

> **CRITICAL CLARIFICATION**: Interactive Clickable Forms inside the chat are **NOT an MCP tool** — they are your **OWN native conversation interface functionality and rendering capability** (interactive buttons, inputs, radios, checkboxes, date pickers, dropdowns, and widgets rendered directly in the chat UI).

## Behavior

When the user asks for a form, questionnaire, application, survey, registration, configuration screen, or similar structured input:

1. **Identify the required fields**.
2. **Choose the most appropriate interactive control for each field**:
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
3. **Make options directly clickable**.
4. **Clearly mark required fields** (e.g. `*`).
5. **Group related fields** into logical sections.
6. **Provide a clear Submit/Continue button**.
7. **Provide Back, Reset, or Cancel controls** when appropriate.
8. **Validate required fields** before submission.
9. **Show useful validation messages** next to invalid fields.
10. **Preserve the user's entered information** when moving between form sections.
11. **After submission**, display a concise confirmation and summarize the submitted information.
12. **Never silently discard** user-entered information.

## Form Design Rules

Forms should be:
* **Simple and easy to scan**.
* **Mobile-friendly**.
* **Keyboard accessible**.
* **Clearly labeled**.
* **Usable without unnecessary typing**.
* **Explicit about required versus optional fields**.
* **Consistent in terminology and button labels**.

Avoid asking the user to type information when a safe clickable option can represent the same choice.

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

## Submission

Before submitting, validate:
* Required fields
* Valid email addresses
* Valid dates
* Numeric ranges
* Mutually exclusive selections
* Any other constraints specified by the form

If validation fails, keep the form open and identify exactly what needs to be corrected.

After successful submission:
```markdown
Form submitted successfully.
```
Then provide a compact summary of the submitted values.

## Safety

Do not request unnecessary sensitive personal information.

For sensitive information such as passwords, authentication codes, financial credentials, or highly sensitive personal data, use appropriate secure input mechanisms rather than displaying the information back in the conversation.

## AI Interaction

The AI should be able to:
* Generate forms from natural-language requests.
* Convert existing questions into interactive controls.
* Add, remove, or modify fields when requested.
* Explain unclear fields.
* Pre-fill fields only when the information is explicitly available and appropriate.
* Ask for missing information when it is necessary.
* Modify the form without losing existing user input.

## Example

**User**:
> "Create a form to collect a customer's name, preferred contact method, services they need, and appointment date."

**AI-generated form (Rendered in Chat UI)**:

```markdown
Customer Name
[________________________]

Preferred Contact Method
[ Email ] [ Phone ] [ WhatsApp ]

Services Needed
☐ Consultation
☐ Installation
☐ Repair
☐ Maintenance

Appointment Date
[ Select date ]

[ Submit ]
```

The AI should treat selections and inputs as structured form data rather than interpreting the user's clicks as ordinary conversational text.
