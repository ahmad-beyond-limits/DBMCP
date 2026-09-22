---
name: elicitation
description: Use whenever a task is ambiguous, underspecified, or hinges on preferences/constraints the person hasn't given you yet — picking a product, drafting something in an unspecified style, planning a trip, scoping a project, building a form/quiz/onboarding flow, or any "help me figure out X" request. Governs whether to ask at all, and if so, how to structure the ask as a short interactive choice (buttons, numbered options, a small multi-step flow) instead of a paragraph of clarifying questions. Trigger any time you're about to write two or more clarifying questions in prose — that's the signal this should become a structured elicitation instead.
---

# Elicitation

Elicitation is the deliberate, structured gathering of missing information from a
person before or during a task — as opposed to guessing, or asking in one long
paragraph and hoping they parse it. Done well, it feels like a couple of taps.
Done badly, it feels like an interrogation or a form nobody wanted to fill out.

The goal of this skill is to make the *ask* itself as low-effort as the thing
being asked about is high-value.

## Step 1: Decide whether to ask at all

Asking is not free — it costs the person a turn, and every unnecessary question
erodes trust that you can just handle things. Default to attempting the task
with a stated, sensible assumption. Only stop to elicit when the missing piece
would actually change the substance of what you produce, not just its polish.

Good reasons to elicit:
- The answer branches the output in a meaningfully different direction (a $300
  phone recommendation looks nothing like a $1,200 one).
- You'd otherwise be guessing at something the person clearly has an opinion
  on (budget, audience, platform, deadline, must-have constraints).
- There are several valid options and no default is obviously right.

Bad reasons to elicit:
- You could infer it from context already given.
- It's a preference that doesn't meaningfully change the result (exact shade
  of blue when "a blue theme" was already said).
- You're front-loading every parameter a task could ever have, "to be safe."

If there's exactly one missing piece and it's low-stakes, it's often faster to
just state your assumption inline and proceed than to interrupt for it. Reach
for structured elicitation once you need two or more pieces of information, or
the task genuinely can't proceed sensibly without an answer.

## Step 2: Scope the questions

Ask only what changes the next step, not everything the task could ever touch.
Order questions by leverage — the one that most reshapes the output goes first,
since an early answer sometimes makes later questions moot.

Keep a single sitting to about 3-5 questions at most. Beyond that, a person's
attention drops off and answers get careless. If a task genuinely needs more
than that, split it into a short flow with visible progress ("2 of 3") rather
than a wall of questions at once — see Step 4.

## Step 3: Design each question

- **Prefer picking from options over open text** when the space of likely
  answers is small and known. Tapping "Under $400" is faster and lower-effort
  than typing a budget out, and it's easier for you to act on reliably.
- **3-5 options is the sweet spot.** Fewer feels like a false binary when more
  clearly exist; more starts to read like a dropdown menu.
- **Order options by likelihood, not alphabetically or by size** — put what a
  typical person would pick near the top so scanning is fast.
- **Always leave an escape hatch**: "not sure yet," "something else" with a
  free-text fallback, or a way to skip. A forced choice among options that
  don't fit the person's actual situation is worse than not asking.
- **Phrase in the person's language, not your internal categories.** "What's
  your budget?" lands; "please specify a price tier" doesn't.
- **Pre-select or default the most common answer** when one clearly exists, so
  someone who doesn't have a strong opinion can just continue.

## Step 4: Pick the format

If your environment gives you a way to render tappable choices — buttons,
cards, a select widget — use it. The whole point of elicitation is cutting the
person's effort down to a tap; falling back to prose when a real widget is
available defeats that.

If no such tool is available, the fallback is a short numbered list in plain
text, with an explicit invitation to just reply with a number or a few words:

```
Quick one first — what's your budget?
1. Under $400
2. $400-800
3. $800+
4. Not sure yet
(Or just tell me in your own words.)
```

This is still far faster to answer than an open "what are your requirements?"
paragraph, because it does the work of narrowing the answer space for them.

For a multi-step flow (several related questions in sequence), show where the
person is in it ("1 of 3") and let them skip or go back. Nobody should feel
locked into a wizard — if they say "not sure" or try to skip ahead, let them.

## Step 5: After the answer comes back

Use it and move on. Don't re-summarize the answer at length before proceeding,
and don't re-ask something already covered earlier in the conversation — carry
prior answers forward silently.

If the answer is "not sure" or "skip," don't stall waiting for certainty: pick
a reasonable default, say what you assumed in passing, and keep going. The
person can always correct you, and that's cheaper than blocking on an answer
they may not have.

## Anti-patterns

- **Interrogation** — asking every possible parameter before doing anything,
  when most of them don't change the outcome.
- **Fake choice** — options that don't actually lead to different outputs.
- **No way out** — a multiple-choice question where none of the options fit
  and there's no free-text or "something else" option.
- **Wizard lock-in** — a multi-step flow with no visible progress and no way
  to skip or back out.
- **Re-litigating** — asking again for something the person already told you,
  even implicitly, earlier in the conversation.
- **Asking to be safe** — treating elicitation as a way to avoid committing to
  an answer, rather than a way to get a better one.

## Example

Avoid piling clarifying questions into prose:

> Before I recommend a phone, can you tell me: 1) your budget, 2) what you
> mainly use your phone for, 3) iOS or Android, and 4) how important camera
> quality is to you?

Instead, ask one well-scoped question at a time (as a real widget if you have
one, otherwise the numbered-list fallback from Step 4), moving to the next
only once the first is answered — and stop asking as soon as you have enough
to give a genuinely good answer, even if that's after one question rather than
all four.
