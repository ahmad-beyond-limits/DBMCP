---
name: clickable-options-ui
description: Render choices, options, ranges, filters, and menus as interactive, clickable UI controls (buttons, radio groups, checkboxes, selects, or widgets) inside the chat interface. Ensures users can physically tap/click choices or provide a custom write-in input if none of the provided options fit. Governs converting multiple-choice elicitation into real tactile UI elements rather than plain text, bullet points, or markdown lists.
---

# Clickable Options UI

## Purpose

Whenever the user asks to show options, choices, selections, ranges, filters, or menus that they intend to select inside the chat interface, render them as actual interactive, clickable UI controls.

Never present the options as ordinary prose, bullet points, numbered lists, or Markdown text when the user asks for choices or when presenting an elicitation.

## Core Requirement

"Clickable" means the user must be able to tap or click an actual rendered control in the UI.

- Plain text that looks like an option is **NOT** clickable.
- Markdown links (`[Option](...)`) are **NOT** an acceptable substitute unless specifically requesting external URL navigation.
- A static list such as:
  * Under $50
  * $50–$100
  * $100–$200
  does **NOT** satisfy this skill.

Instead, use an interactive UI component with real `<button>`, radio, checkbox, select, or equivalent functional controls.

## 🚫 Strict Prohibition: Never Ask for Data Entry in Chat Text

**ABSOLUTELY NEVER ask the user to type record details or field values into chat text** (e.g. *"Please enter these details in chat:"*, *"Provide the following in text:"*, *"Reply with Name, Age, Email..."*). Forcing the user to manually type out database values into the chat is strictly banned.

## ⚖️ The Two Interaction Channels

### 1. Clickable UI (Rendered Directly in Conversation — NOT in HTML Files)
**CRITICAL CLARIFICATION**: Clickable UI is your **native chat interface functionality and rendering capability** (interactive buttons, radio chips, dropdowns, and text inputs rendered directly in the chat UI).
- 🚨 **ABSOLUTE RULE**: **NEVER create or write `.html` files**, scripts, or raw HTML tags for forms.
- **When adding new records (e.g. "Add a new student")**:
  - The entity name/identity (`Student Name`) **MUST ALWAYS** be an open text input:
    ```markdown
    Student Name
    [________________________]
    ```
  - ❌ **NEVER** populate the new entity's name with existing records as dropdown options!
  - Categories, departments, and statuses should be **dropdowns** or **clickable buttons**:
    ```markdown
    Department / Major
    [Select Major          ▼]
    
    Status
    [ Active ]   [ Inactive ]
    ```
  - Always conclude with an actionable submit button: `[ Submit Record ]   [ Cancel ]`.

### 2. Standalone Web Form (`generate_data_entry_form`)
- External MCP tool that generates a temporary 5-minute browser web form.
- Use ONLY when the user explicitly requests an external browser form link or standalone web page.

## Fallback & Custom Input (When None of the Options Apply)

Always provide a way for the user to specify what they want to do if they do not accept any of the provided choices:
1. **"Other / Custom Input" Option**: Include an interactive option or text input field allowing the user to type their custom preference or instructions.
2. **Flexible Path**: If the user's intent is outside the predefined set, the UI must allow them to express custom instructions without feeling trapped in rigid multiple-choice constraints.

## Required Implementation

For bespoke option-selection experiences, use an interactive UI widget, app block, or rich client controls.

Every option must be represented by a real semantic interactive control, preferably:
* `<button type="button">` with hover, active, and selected styling
* `<input type="radio">` with a visible `<label>`
* `<input type="checkbox">` with a visible `<label>`
* `<select>` with real `<option>` elements
* An inline text field (`<input type="text" placeholder="Other / Specify...">`) for custom input

Do not use unstyled, non-interactive `<div>` or `<span>` elements as the only interaction mechanism.

## Functional Verification

Before returning the UI, verify all of the following:

1. Every displayed option is an actual interactive control.
2. Clicking/tapping an option produces a visible state change or selection.
3. The selected value is stored in the UI state.
4. The UI provides immediate feedback showing which option was selected when appropriate.
5. Controls are keyboard accessible and have visible focus states.
6. Touch targets are sufficiently large (minimum 44x44px) for mobile use.
7. No option is merely decorative text.
8. There is a clear "Other" or custom input place for user-defined alternatives.
9. There are no unfinished or non-functional controls.
10. If the user asks whether the options are clickable, do not claim they are unless they are actually rendered as interactive controls.

## Selection Behavior

- **Mutually Exclusive Choices**: Use radio-style behavior or toggle buttons with clear selected state.
- **Multiple Selections**: Use checkboxes or multi-select pill buttons.
- **Single-Choice Question (e.g. "What is your phone price range?")**:
  Each price range should be an individually selectable button/radio option.
- **Feedback**: After selection, provide clear visual confirmation such as:
  `Selected: PKR 50,000–80,000` or visibly highlight the selected control.

## Error Prevention

- If the user previously noted that options were not clickable, treat that as a hard requirement for all subsequent option UI.
- Do not fall back to a plain text list.
- Do not describe a plain text list as "clickable".
- Do not rely on the user clicking ordinary Markdown text.
- Do not assume that visually styled text is interactive.

## Final Check

Before sending the response, verify:
> "Can the user physically click or tap each option in the rendered interface, or type in a custom choice if they reject the options?"

If the answer is no, the response does not satisfy this skill and must be converted to an actual interactive UI before being returned.
