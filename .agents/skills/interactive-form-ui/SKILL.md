---
name: interactive-form-ui
description: When a user asks to add, create, modify, change, update, improve, or build something that involves entering information, choosing options, submitting data, editing values, or performing a multi-field interaction, interpret the request as a request for a directly interactive form UI.
---

# Skill: Interactive Form UI

## Purpose

When a user asks to **add, create, modify, change, update, improve, or build something that involves entering information, choosing options, submitting data, editing values, or performing a multi-field interaction**, interpret the request as a request for a **directly interactive form UI** unless the user explicitly asks for source code, HTML, documentation, or an explanation.

The user should **not have to say “make it clickable,” “make it interactive,” “create a UI,” or “make a form.”**

The assistant must infer this from the requested interaction.

---

## Core Principle

### The user describes WHAT they want to accomplish.

### The AI decides HOW that interaction should be represented.

Do not force the user to specify UI implementation details.

For example, if the user says:

> “I want to add a customer.”

The assistant should understand that the appropriate result is an interactive customer-entry UI.

If the user says:

> “Add a way to collect name, email and phone.”

Create the interactive UI directly.

If the user says:

> “I want to modify the customer information.”

Create or modify the interactive editing UI directly.

If the user says:

> “Add a field for status.”

Add an actual interactive control to the existing UI.

The user should never need to explain:

> “Please create an HTML form with input elements and a submit button.”

That is an implementation detail and should be inferred.

---

# What MUST NOT Happen

Never respond to an interaction request by merely describing controls.

Bad:

> Enter your name here:
> [--------------------]

Bad:

> Click the Submit button.

Bad:

> You can enter the email in the field below.

Bad:

> Here is some HTML for the form.

Bad:

> `<input type="text">`

Bad:

> Step 1: enter your name.
> Step 2: click submit.

These responses are not the requested experience.

The assistant must create the **actual interactive UI** whenever the environment supports interactive UI.

---

# What “Form” Means in This Skill

A form is not merely an HTML `<form>` element.

“Form UI” means a **usable interactive interface for collecting or manipulating structured information**.

It may contain:

* text fields
* number fields
* email fields
* date/time controls
* dropdowns
* radio choices
* checkboxes
* toggles
* sliders
* searchable selections
* multi-select controls
* file selection where supported
* add/remove rows
* repeatable sections
* conditional fields
* validation
* submit/save/apply actions
* cancel/reset actions
* edit controls
* confirmation states
* success/error states
* previews
* calculations based on entered values
* dynamic fields

The exact controls should be inferred from the data being requested.

---

# Interaction-First Rule

Before creating the UI, determine:

1. What information is being entered?
2. What information is being selected?
3. What information is being changed?
4. What action happens after the interaction?
5. What fields depend on other fields?
6. What validation is naturally required?
7. What should happen after submission?

Then create the appropriate interactive experience.

Do NOT ask the user to specify obvious UI mechanics.

---

# Infer Controls From Meaning

The assistant should automatically choose appropriate controls.

Examples:

### User says:

> Add a priority.

Use an interactive selection such as:

* Low
* Medium
* High

Do not create a generic text box unless free-form priority text actually makes sense.

### User says:

> Add whether the customer is active.

Use a checkbox/toggle.

### User says:

> Add the customer's country.

Use a selection control when the set of countries is known or appropriate.

### User says:

> Add birthday.

Use a date control.

### User says:

> Add a description.

Use a multiline text area.

### User says:

> Add price.

Use a numeric input with appropriate formatting.

### User says:

> Add several products.

Use a repeatable product-entry structure rather than one giant text field.

---

# Direct Manipulation Requirement

Whenever an interactive UI is requested, the resulting UI must be usable **inside the current experience** whenever the platform supports it.

The user should be able to:

* click controls
* type values
* select options
* change values
* submit
* reset
* add/remove items
* see validation
* see resulting state

Do not make the user copy code into another environment merely to use the interface.

---

# Never Turn UI Into Instructions

The assistant must distinguish between:

### Interactive UI

> A real text input that accepts typing.

and:

### Instructions

> “Enter your name in the field.”

The first is the desired result.

The second is merely an explanation.

When the user asks to create/add/modify an interaction, prioritize the first.

---

# No Fake Interactivity

Do not create visual elements that look interactive but do nothing.

Every visible control must have a meaningful action.

If a button says:

> Submit

it must actually perform the appropriate local submission behavior or clearly represent the supported action.

If an action cannot actually be performed because an external service/backend is required, do not pretend that it happened.

Instead, provide the closest functional local interaction and clearly distinguish local behavior from unavailable external behavior.

---

# Do Not Over-Ask

Do not ask:

> “Would you like me to create an interactive form?”

when the user's request already implies one.

Do not ask:

> “Should I use HTML?”

Do not ask:

> “Should I add input fields?”

Do not ask:

> “Should the button be clickable?”

These are implementation decisions the assistant should make.

Only ask a question when the missing information materially changes what the UI should contain or do.

---

# “Add This” Means Modify the Existing UI

If the user says:

> “Add a phone number.”

Interpret this as:

> Add a phone-number control to the existing interactive interface.

Do not create a separate explanation.

If the user says:

> “Add validation.”

Modify the existing UI so validation actually occurs.

If the user says:

> “Add another option.”

Modify the relevant selection control.

If the user says:

> “Change this to a dropdown.”

Replace the existing interaction with a dropdown.

If the user says:

> “Remove the email field.”

Actually remove it from the UI.

---

# Preserve Existing UI

When modifying an existing interactive UI:

* preserve existing fields
* preserve existing behavior
* preserve user-entered values where practical
* change only what the user requested
* do not regenerate an unrelated interface
* do not replace a functional UI with plain HTML or prose
* do not downgrade interactive controls into static examples

Treat the existing UI as an application that is being incrementally modified.

---

# Prefer Application-Like Behavior

Interactive forms should feel like small applications rather than documents.

For example:

A user asking to create an invoice-entry experience should receive:

* customer selection
* line-item controls
* quantity controls
* price controls
* calculated totals
* add/remove item actions
* validation
* save/submit behavior

Not:

> Customer: [________]

> Product: [________]

> Quantity: [____]

> Click submit.

The UI itself should perform the interaction.

---

# State and Feedback

Interactive forms should provide appropriate feedback.

Examples:

* required-field validation
* invalid email feedback
* numeric validation
* disabled states where appropriate
* success messages
* error messages
* calculated values
* conditional sections
* confirmation states

Feedback should occur within the UI rather than requiring the assistant to explain what happened afterward.

---

# Responsive and Accessible

The generated UI should:

* work on narrow screens
* use real semantic controls
* have visible labels
* support keyboard navigation
* have usable touch targets
* provide visible focus states
* provide accessible status/error messaging
* avoid relying on hover for essential functionality

Do not sacrifice usability merely to make the interface visually impressive.

---

# Avoid Generic HTML-Form Thinking

Do not interpret every request as:

```text
<label>
<input>
<label>
<input>
<button>Submit</button>
```

That is only one possible implementation.

Instead, think:

```text
USER INTENT
    ↓
DATA / ACTION MODEL
    ↓
APPROPRIATE INTERACTION
    ↓
LIVE UI
    ↓
VALIDATION / STATE
    ↓
RESULT
```

The objective is the interaction, not the HTML element.

---

# Examples

## Example 1

User:

> I want to add a new employee.

Expected behavior:

Create an employee-entry UI with appropriate fields such as:

* name
* email
* role
* department
* start date
* status

and an actual save/add action.

Do not reply:

> Please enter the employee's name.

---

## Example 2

User:

> Add a way to select the customer's plan.

Expected behavior:

Modify the existing UI with an appropriate plan selector.

Do not reply:

> Select the plan from the field below.

---

## Example 3

User:

> I need to edit an order.

Expected behavior:

Create/modify an interactive order-editing UI.

The user should be able to change the order values directly.

---

## Example 4

User:

> Add an option for recurring billing.

Expected behavior:

Add an actual recurring-billing control, potentially including:

* recurring toggle
* frequency
* interval
* relevant conditional settings

Do not create a text field saying:

> Recurring billing: [yes/no]

unless that is genuinely the most appropriate interaction.

---

## Example 5

User:

> Make the form better.

Expected behavior:

Improve the actual interactive experience.

Possible improvements include:

* clearer grouping
* better controls
* validation
* conditional fields
* sensible defaults
* better feedback
* responsive layout

Do not merely rewrite the HTML or describe improvements.

---

# When Source Code Is Explicitly Requested

If the user explicitly asks for:

* HTML
* CSS
* JavaScript
* React
* source code
* a component
* an implementation file

then provide source code instead of an inline interactive UI, because the requested deliverable has changed.

However, if the user says:

> “Create this form”

without asking for code, prefer the interactive UI.

---

# When an Interactive UI Tool Is Available

If the environment provides a native interactive UI/app-block mechanism, use it.

Do not substitute:

* markdown
* ASCII boxes
* pseudo-buttons
* static HTML snippets
* instructions
* screenshots
* descriptions

for an available interactive UI.

The final result should be rendered as an actual interactive experience.

---

# Mental Model

The assistant should internally translate:

> “I want to add X”

into:

> “What interaction would let the user accomplish X?”

Then build that interaction.

Not:

> “What sentence can I write telling the user how to do X?”

Not:

> “What HTML tags describe X?”

Not:

> “What code can I show the user?”

The priority is:

**Intent → Interaction → UI → Behavior**

not:

**Intent → Explanation**

---

# Success Criterion

The skill is successful when a user can say something natural such as:

> “I want to add a customer.”

> “Add a deadline.”

> “Let me edit this.”

> “Add another option.”

> “I want to collect payment information.”

> “Change this field.”

> “Add a way to filter these.”

without needing to say:

> “Make it a clickable form.”

The assistant should infer that an interactive UI is required from the user's intent.

The user should describe the **thing they want to accomplish**, not the UI implementation vocabulary required to make the assistant understand them.
