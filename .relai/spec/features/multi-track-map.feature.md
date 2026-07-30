# Multi-Track Performance Map

## Goal

Give students a structured, visual way to record observations across all elements of a performance on a shared timeline — operationalising the diachronic axis of McAuley's Stage 1 (Material Signifiers).

## The DAW Metaphor

The interface looks and behaves like a Digital Audio Workstation (DAW) — but instead of audio tracks, each horizontal row represents a performance element category. Time flows left to right. Students populate cells at the intersection of a track and a time marker.

This metaphor captures the core insight of McAuley's schema: multiple sign systems operate simultaneously across the duration of a performance.

## Default Tracks (McAuley's Schema)

The following tracks are present by default, drawn from McAuley's five categories:

| Track | McAuley Category | Notes |
|---|---|---|
| Stage / Space | (a) Stage-auditorium relationship | Type of stage, proxemics, use of audience space |
| Decor, Set & Lighting | (b) Decor/Objects — set + lighting | Set changes, lighting shifts, underlying system |
| Objects & Props | (b) Decor/Objects — objects | List of objects, associations, realistic/stylised |
| Actors — Appearance | (c) Physical features | Costume, hair, makeup, masks, vocal quality, changes |
| Actors — Movement & Blocking | (d) Utilisation of scenic space | Entrances/exits, significant gesture, juxtapositions |
| Music & Sound | (e) Music and sound effects | What music/sound, when introduced |

Students can:
- **Hide** any default track they don't need
- **Reorder** tracks by dragging
- **Add custom tracks** with a user-defined label

## Time Markers

- The horizontal axis is defined by **user-created time markers** — there is no clock or fixed timescale
- Students create markers with a free-text label (e.g. "Pre-show", "Act 1 Sc 1", "Interval", "Climax", "Curtain call")
- Markers can be reordered by dragging
- There is no minimum or maximum number of markers

## Observations

- Each cell (track × time marker intersection) holds a **free text observation**
- Clicking a cell opens an inline text editor
- Cells can be left empty — sparse maps are valid
- Observations are the raw material for paradigm sorting in Stage 2

## User Flow

1. Student clicks "New Map"
2. Enters performance title (required), date and venue (optional)
3. Multi-track canvas loads with default tracks and a prompt to add the first time marker
4. Student adds time markers across the top
5. Student clicks into cells and types observations
6. Student can add/hide/reorder tracks at any time
7. Map is auto-saved continuously
8. A unique URL is generated on map creation and displayed persistently

## Acceptance Criteria

- [ ] Default tracks load on map creation, matching McAuley's five categories
- [ ] Student can create, label, and reorder time markers
- [ ] Student can enter free text in any track/time-marker cell
- [ ] Student can add a custom track with a user-defined label
- [ ] Student can hide/show any track
- [ ] Map auto-saves — no explicit save button required
- [ ] A unique shareable URL is visible at all times
- [ ] The canvas handles at least 20 time markers and 12 tracks without layout breakdown
- [ ] Export (PDF/image) captures the full canvas including all tracks and markers

## Edge Cases

- Empty map (no observations) should still be exportable
- Very long observation text should wrap within the cell, not overflow
- Duplicate track labels should be allowed (user's choice)
- If a time marker is deleted, the observations attached to it should be preserved (moved to an "unassigned" state or soft-deleted — TBD)
