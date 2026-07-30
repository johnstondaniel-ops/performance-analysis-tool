import { v4 as uuidv4 } from 'uuid'

export const DEFAULT_TRACK_DEFINITIONS = [
  {
    schemaCategory: 'stage_space',
    label: 'Stage / Space',
    description: 'Stage-auditorium relationship, type of stage, use of audience space',
    color: '#7c65c1',
    guidingQuestions: [
      'What is the size and type of stage? (proscenium, thrust, arena, traverse…)',
      'What is the relationship between stage and auditorium — distance, sightlines, intimacy?',
      'Is the set visible before the performance begins, or is it hidden?',
      'Do performers use the audience space at any point?',
    ],
  },
  {
    schemaCategory: 'decor_set_lighting',
    label: 'Decor, Set & Lighting',
    description: 'Set elements, changes, lighting shifts and underlying system',
    color: '#e8c547',
    guidingQuestions: [
      'Describe the key elements of the set. What is dominant?',
      'What changes to the set take place, and when?',
      'What are the major lighting shifts? What mood or meaning do they create?',
      'Is there an underlying system or logic to the lighting design?',
    ],
  },
  {
    schemaCategory: 'objects_props',
    label: 'Objects & Props',
    description: 'List of objects, realistic/stylised, character/situation associations',
    color: '#f97316',
    guidingQuestions: [
      'List the significant objects present on stage.',
      'Are they realistic, stylised, or transformable?',
      'Which objects are associated with particular characters or situations?',
      'Do any objects carry symbolic or referential meaning beyond the literal?',
    ],
  },
  {
    schemaCategory: 'actors_appearance',
    label: 'Actors — Appearance',
    description: 'Costume, hair, makeup, masks, vocal quality, changes during action',
    color: '#22d3ee',
    guidingQuestions: [
      'Describe costumes, hair, makeup, and any masks.',
      'What vocal qualities are notable — accent, register, pace, tone?',
      'What changes to appearance are made during the performance, and when?',
      'What contrasts or links between characters are established through appearance?',
    ],
  },
  {
    schemaCategory: 'actors_movement',
    label: 'Actors — Movement & Blocking',
    description: 'Entrances/exits, significant gesture, juxtapositions of actors/objects',
    color: '#4ade80',
    guidingQuestions: [
      'How many performers are using the space? How is it shared or divided?',
      'What significant gestures or movements stand out?',
      'Note important juxtapositions — actor/actor, actor/object, actor/set element.',
      'How are entrances and exits used? Are offstage spaces positively or negatively valued?',
    ],
  },
  {
    schemaCategory: 'music_sound',
    label: 'Music & Sound',
    description: 'Music and sound effects — what is used and when introduced',
    color: '#f472b6',
    guidingQuestions: [
      'What music is used, and when is it introduced?',
      'What sound effects are used, and when?',
      'Is sound live or recorded? Diegetic or non-diegetic?',
      'What atmosphere or meaning does the sound design create?',
    ],
  },
]

export const PARADIGM_COLORS = [
  '#e8c547', '#a78bfa', '#f97316', '#22d3ee',
  '#4ade80', '#f472b6', '#fb7185', '#34d399',
]

export function createNewMap(title, date = '', venue = '') {
  const id = uuidv4()
  const tracks = DEFAULT_TRACK_DEFINITIONS.map((def, i) => ({
    id: uuidv4(),
    label: def.label,
    schemaCategory: def.schemaCategory,
    color: def.color,
    order: i,
    visible: true,
    isDefault: true,
  }))

  return {
    id,
    title,
    date,
    venue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tracks: tracks.map(t => ({ ...t, generalNote: '' })),
    timeMarkers: [],
    observations: {},
    paradigms: [],
    segmentNotes: {},
    narrativeOverview: '',
    segmentationAnalysis: '',
    globalStatement: '',
    originalImpression: '',
  }
}
