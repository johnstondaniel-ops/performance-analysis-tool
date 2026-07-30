# Performance Analysis Schema Mapping Tool

A web-based tool that helps university students map, organise, and interpret the elements of a live performance using Gay McAuley's performance analysis schema — so they can write stronger, evidence-grounded analyses.

## The Problem

Performance analysis requires students to track many simultaneous elements across time — space, light, sound, movement, costume — and then identify the interpretive patterns (paradigms) that connect them. Without a structured tool, this process is overwhelmed by memory decay, sampling bias, and the difficulty of moving from raw observation to meaningful argument.

## The Vision

A two-stage digital tool that:
1. Gives students a **multi-track timeline** (like a DAW) to map observations across McAuley's five performance element categories as the performance unfolds
2. Lets students **sort observations into paradigm clusters** — the synchronic patterns that underpin their interpretive argument

The finished map is shareable, exportable, and serves as a direct scaffold for the written analysis essay.

## Success Criteria

- A student can set up a map for a new performance in under 2 minutes
- Observations can be entered and positioned on a track without technical friction
- The paradigm sorting stage produces a clear visual grouping that a student can directly reference while writing
- A completed map can be exported as PDF/image or shared via link in one click
- The tool reflects the creative, expressive nature of the subject matter — it doesn't feel like a spreadsheet

## Out of Scope

- AI-generated analysis or essay drafts
- Video playback or timestamping synced to actual recordings
- Discussion forums or class collaboration features
- Mobile/tablet support (desktop/laptop web browser only, for now)
- Institutional LMS integration (e.g. Canvas, Moodle)
- User accounts, login, or authentication

## Open Questions

- [ ] Which institution and course is this being built for? Is there a specific faculty stakeholder?
- [ ] What is Gay McAuley's exact preferred grouping of schema elements into tracks? (The schema lists sub-categories — needs decision on how to flatten/group these into tracks)
- [ ] Should the Narrative/Segmentation stage (McAuley Stage 2) be represented in the tool, or is that purely a written exercise outside the tool?
- [ ] How long should a shared link persist? (7 days? Forever? Needs decision)
- [ ] What export format is most useful — full map as image, or a structured PDF with observations listed by track?
- [ ] Should teachers be able to add comments or annotations to a shared map, or is sharing read-only?
- [ ] Are there any accessibility requirements (WCAG compliance, screen reader support)?
- [ ] What happens if a student loses their link — is there any recovery mechanism?
