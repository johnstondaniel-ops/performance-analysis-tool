# Paradigm Sorting

## Goal

Help students move from diachronic observation (what happened across time) to synchronic interpretation (what patterns and clusters of meaning emerge) — operationalising McAuley's Stage 3 (The Paradigmatic Axis) and bridging toward Stage 4 (Global Statement).

## The Concept

As McAuley writes: "the data that has been collected... will be spaced out along the diachronic axis of the performance, but in order to make sense of it all it is necessary to find the significant repetitions, redundancies, contrasts, etc. which constitute the synchronic axis."

Paradigm sorting is the moment a student stops describing and starts interpreting. They pull observations from across all tracks and time points, group them into named clusters, and those clusters become the evidence base for their analytical argument.

## Interface

- Accessed via a **"Paradigm View"** toggle/tab from within the map
- All observations from the map are displayed as **cards** (showing the observation text, its track label, and its time marker)
- Students create named **paradigm groups** — colour-coded containers (e.g. "Puppetry / mechanisation", "Horizontal vs vertical tension", "Absence and presence")
- Students **drag cards into groups**
- One observation can belong to **multiple paradigms** (many-to-many)
- Unassigned observations remain in a holding area until grouped or deliberately left out

## User Flow

1. Student opens their map and switches to Paradigm View
2. All observations appear as cards in an unassigned holding area
3. Student clicks "Add Paradigm Group" and gives it a name and colour
4. Student drags observation cards into one or more groups
5. Student can rename paradigm groups at any time
6. Student can remove a card from a group (it returns to unassigned)
7. Student can add notes to a paradigm group (a free text field describing the interpretive claim)
8. Paradigm view is included in export and share

## Acceptance Criteria

- [ ] All observations from the map appear as cards in the paradigm view
- [ ] Each card shows: observation text, track label, time marker label
- [ ] Student can create a named, colour-coded paradigm group
- [ ] Student can drag observation cards into paradigm groups
- [ ] One card can exist in multiple paradigm groups simultaneously
- [ ] Unassigned cards remain visible in a holding area
- [ ] Student can add a free text note to each paradigm group
- [ ] Student can rename or delete a paradigm group
- [ ] Paradigm view is included in export (PDF/image)
- [ ] Changes to paradigms are auto-saved

## Edge Cases

- A map with no observations should show an empty paradigm view with a prompt to return to Stage 1
- Deleting a paradigm group should return its cards to unassigned (not delete the underlying observations)
- If the underlying observation is edited in the map view, the card in paradigm view should reflect the update
- Very large numbers of observations (50+) should remain navigable — consider search or filter by track

## Connection to the Essay

The paradigm view is the bridge to writing. A student with three or four well-populated paradigm groups has, in effect, the sections of their essay already structured. The tool does not generate the essay — but the paradigm groups become their argument structure, and the observation cards within each group become their evidence.
