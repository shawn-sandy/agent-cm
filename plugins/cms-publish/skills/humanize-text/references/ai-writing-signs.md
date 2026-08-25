# AI Writing Signs — Detection and Rewrite Catalog

Distilled from Wikipedia's "Signs of AI writing" field guide
(https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

Source material is licensed CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/); this adaptation is shared
under the same terms.

## Table of Contents

- [Category 1 — Stock vocabulary](#category-1--stock-vocabulary)
- [Category 2 — Phrasing and structure](#category-2--phrasing-and-structure)
- [Category 3 — Tone and content](#category-3--tone-and-content)
- [Category 4 — Formatting and punctuation](#category-4--formatting-and-punctuation)
- [Voice targets](#voice-targets)
- [Density scoring](#density-scoring)

**The density principle.** No single word proves AI authorship — humans write
"delve" too. The signal is clustering: several tells from several categories in
the same passage. Judge density before rewriting: a lone flagged word in
otherwise natural prose is a weak signal and may not need touching; three
categories firing in one paragraph is a strong signal and warrants
restructuring. Never rewrite isolated common words in text that otherwise reads
naturally.

## Category 1 — Stock vocabulary

Words that cluster in AI output far above their natural frequency. Grouped by
model era because the fashionable words shift as models are retrained.

| Era | Flagged terms |
|---|---|
| 2023 – mid-2024 | delve, intricate, pivotal, testament, tapestry, interplay, realm, landscape (figurative), vibrant, crucial, foster, leverage (verb), robust, seamless, multifaceted, holistic, invaluable, comprehensive |
| mid-2024 – mid-2025 | align with, enhance, showcase / showcasing, underscore / underscores, elevate, streamline, boast / boasts, navigate (figurative), delve (residual) |
| mid-2025 onward | emphasizing, highlighting, enhance, underscore |

**Rewrite strategy:** swap for the plain word the sentence actually needs —
"delve into" → "look at" or "cover"; "leverage" → "use"; "showcase" → "show";
"underscores" → "shows". Pure intensifiers ("truly", "invaluable",
"comprehensive" as filler) are deleted, not replaced. If the sentence says
nothing once the stock word is gone, cut the sentence.

## Category 2 — Phrasing and structure

| Tell | Examples | Rewrite strategy |
|---|---|---|
| Copula avoidance | "serves as", "functions as", "stands as", "marks", "features", "boasts", "maintains" (where "is/are/has" fits) | Use "is", "are", "has". "The gallery serves as a hub" → "The gallery is a hub". |
| Negative parallelism | "not just X, but Y", "not only X but also Y", "it's not about X — it's about Y" | State the point directly. "It doesn't just compile — it optimizes" → "It compiles and optimizes". |
| Rule of three | adjective triads ("fast, flexible, and reliable"), forced three-item lists | Keep the one or two items that carry weight; cut the padding item. |
| Elegant variation | cycling synonyms to avoid repeating a word ("creative" → "artistic" → "imaginative" for the same thing) | Repeat the natural word. Repetition reads as human; forced synonyms read as generated. |
| Vague -ing analysis clauses | trailing ", highlighting…", ", emphasizing…", ", underscoring…", ", reflecting…", ", showcasing…", ", contributing to…" | Cut the clause, or replace it with a concrete fact. If there is no fact, the clause was empty. |
| Formulaic openers and closers | "In conclusion", "In summary", "Overall,", "In today's fast-paced world", "Despite its challenges…" + vague future outlook | Delete the frame; end on the last substantive point. |

## Category 3 — Tone and content

| Tell | Examples | Rewrite strategy |
|---|---|---|
| Promotional puffery | "vibrant", "nestled", "rich cultural heritage", "groundbreaking", "renowned", "diverse array", "plays a vital role", "continues to captivate" | Drop the evaluative adjective, keep the noun the source gave you. "A vibrant community of developers" → "A community of developers". Substitute a concrete figure **only if the source supplies one** — never supply the number yourself. |
| Undue significance | "pivotal moment", "indelible mark", "enduring legacy", "key turning point", "reflects broader trends" | Say what happened; let the reader judge importance. Delete significance claims with no evidence behind them. |
| Vague attribution (weasel words) | "observers note", "experts argue", "many believe", "industry reports suggest", "widely regarded as" | Name the source when the text or context supplies it — one source is "X says", not "experts say". When no source is available, keep the claim and flag the attribution as unresolved in the findings; never delete a substantive claim to remove a weasel word, and never invent an authority. |
| Empty summary sentences | a closing sentence that restates the paragraph it ends | Cut it. |
| Chat and assistant artifacts | "Let's explore", "It's worth noting that", "It is important to note", "As an AI", knowledge-cutoff disclaimers | Delete. These address a chat user, not a reader. |
| Hedging stacks | "may potentially", "could possibly", "it seems that perhaps" | Keep one hedge at most; prefer the plain claim when the fact supports it. |

## Category 4 — Formatting and punctuation

| Tell | Examples | Rewrite strategy |
|---|---|---|
| Em-dash overuse | multiple em-dashes per paragraph, em-dash as universal connector | Replace with commas, periods, or parentheses; keep at most one em-dash where it genuinely earns its place. |
| Title Case headings | "Impact Of Technology And Digitalization" | Sentence case: "Impact of technology and digitalization". |
| Excessive boldface | bolded phrases scattered through prose for emphasis | Unbold; let the sentence carry the emphasis. |
| Bullet-point prose | bullets or inline-header lists where flowing prose reads better | Merge into sentences when items are short and related. |
| Emoji as structure | emoji as section markers or list decoration | Delete in professional or encyclopedic prose. |
| Heading-level skips and rules | jumping H2 → H4, horizontal rules before headings | Fix the hierarchy; remove decorative rules. |

## Voice targets

The default rewrite preserves the author's existing voice and register — remove
tells, change nothing else. When the user names a voice target, apply its
guidance on top of the tell removal:

- **casual** — contractions welcome; shorter sentences; first and second person
  allowed; plain vocabulary over formal ("use" not "utilize", "so" not
  "therefore").
- **formal** — no contractions; precise verbs; measured claims; complete
  clauses; third person unless the source uses first.
- **punchy** — short sentences; active voice; front-load the claim; cut
  qualifiers and throat-clearing; one idea per sentence.

A voice target never licenses changing facts, quotes, code, or the order of
substantive claims.

## Density scoring

For the HUMANIZE REPORT block:

Score on the number of categories that fire. The bands are disjoint — exactly
one applies to any input:

- **LOW** — tells in 0 or 1 category. Text is mostly natural; fix only the
  clear hits.
- **MEDIUM** — tells in exactly 2 categories, or repeated hits within a
  single category. Substitute throughout; restructure the worst sentences.
- **HIGH** — tells in 3 or more categories. Substitute and restructure: vary
  sentence rhythm, break parallel triads, rebuild formulaic paragraphs.

Dense clustering inside one paragraph raises the score by one band (LOW → MEDIUM,
MEDIUM → HIGH); HIGH is already the ceiling.
