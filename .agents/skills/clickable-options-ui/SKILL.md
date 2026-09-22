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

## ⚖️ When to Use Clickable Options vs. Interactive Form

**Form is NOT the default option to modify, add, or delete data.** Always apply this clear distinction:

### 1. When to Use Clickable Options UI:
- **Single-attribute / Single-field updates**: When the user wants to change a single value for a record (e.g., change a student's status to Active/Inactive, update a grade to A, change a department, toggle a boolean).
- **Doing one thing**: Selecting a single action to perform on a record (e.g., `[Update Status]`, `[Edit Score]`, `[Delete Record]`, `[View Profile]`).
- **Choosing from a list or discrete set**: Selecting a student/record from search results, picking a filter, or choosing between 2–6 known values.
- **Confirming deletions or mutations**: Displaying action buttons (`[✅ Yes, Delete]`, `[❌ Cancel]`) rather than opening a form.
- **Always provide a custom input place**: Whenever offering clickable options, include an *"Other / Custom"* option or text input where the user can state what they want if none of the provided choices fit.

### 2. When to Use Interactive Form (`generate_data_entry_form`):
- **Many fields at once**: When creating or inserting a brand new record with many fields/columns (e.g., adding a full student record with Name, ID, Email, Major, GPA, Phone, Address, Enrollment Date).
- **Complicated multi-column updates**: When the user explicitly wants to edit multiple interdependent columns simultaneously requiring structured validation.
- **DO NOT create a form by default**: If the user wants to update one field or take a single action, do NOT pop up a full-page form session. Use Clickable Options instead.

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
