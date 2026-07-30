import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import {
  DndContext, DragOverlay, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { loadMap, saveMap } from '../utils/storage.js'
import { DEFAULT_TRACK_DEFINITIONS } from '../utils/defaults.js'
import { exportMapAsPDF, exportMapAsImage } from '../utils/export.js'

function formatDateAU(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ── Draggable + droppable observation cell ──────────────────────────────────
function ObservationCell({ trackId, markerId, value, onChange, color, isDraggingAny }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  const dragId = `drag:${trackId}:${markerId}`
  const dropId = `drop:${trackId}:${markerId}`

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dragId,
    disabled: !value?.trim(),
  })

  useEffect(() => { setDraft(value || '') }, [value])

  function commit() {
    setEditing(false)
    if (draft !== (value || '')) onChange(draft)
  }

  const showDropRing = isOver && isDraggingAny && !isDragging

  return (
    <div ref={setDropRef} className="relative min-h-[80px] group/cell">
      {/* Drop indicator ring */}
      {showDropRing && (
        <div className="absolute inset-0 rounded pointer-events-none z-10 border-2" style={{ borderColor: color + 'aa', background: color + '10' }} />
      )}

      {/* Drag handle (only when cell has content) */}
      {value?.trim() && !editing && (
        <div
          ref={setDragRef} {...attributes} {...listeners}
          className={`absolute top-1 right-1 z-20 cursor-grab active:cursor-grabbing select-none text-sm transition-opacity ${
            isDragging ? 'opacity-60' : 'opacity-0 group-hover/cell:opacity-100'
          }`}
          style={{ color: color + 'bb' }}
          title="Drag to move"
        >⠿</div>
      )}

      {editing ? (
        <textarea
          autoFocus value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) } }}
          className="w-full h-full min-h-[80px] bg-void/80 text-ash text-xs p-2 resize-none border-0 rounded focus:outline-none"
          style={{ borderTop: `2px solid ${color}` }}
        />
      ) : (
        <div
          onClick={() => !isDragging && setEditing(true)}
          className="min-h-[80px] p-2 pr-5 cursor-text text-xs text-ash/80 hover:bg-flat/40 rounded transition-colors leading-relaxed"
          style={{
            borderTop: `2px solid ${draft ? color : isDraggingAny && !isDragging ? 'transparent' : 'transparent'}`,
            opacity: isDragging ? 0.3 : 1,
          }}
        >
          {draft || <span className="text-mist/20">{isDraggingAny ? '' : 'click to add'}</span>}
        </div>
      )}
    </div>
  )
}

// ── General note cell (notes column in full map) ────────────────────────────
function NoteCell({ value, onChange, color }) {
  const [draft, setDraft] = useState(value || '')
  const timerRef = useRef(null)

  useEffect(() => { setDraft(value || '') }, [value])

  function handleChange(val) {
    setDraft(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(val), 700)
  }

  return (
    <textarea
      value={draft}
      onChange={e => handleChange(e.target.value)}
      onBlur={() => onChange(draft)}
      placeholder="Initial observations…"
      className="w-full min-h-[80px] bg-transparent text-xs text-ash/80 p-2 resize-none border-0 focus:outline-none leading-relaxed placeholder-mist/20"
      style={{ borderTop: `2px solid ${draft ? color + '88' : 'transparent'}` }}
    />
  )
}

// ── Sortable time marker header ─────────────────────────────────────────────
function SortableMarkerHeader({ marker, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: marker.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="min-w-[160px] w-[200px] border-r border-flat px-2 py-3 flex items-center justify-between group flex-shrink-0"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span {...attributes} {...listeners}
          className="text-mist/25 hover:text-mist/70 cursor-grab active:cursor-grabbing text-sm flex-shrink-0 select-none"
          title="Drag to reorder">⠿</span>
        <span className="text-ash text-sm font-medium truncate">{marker.label}</span>
      </div>
      <button onClick={() => onDelete(marker.id)}
        className="text-mist/20 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0">×</button>
    </div>
  )
}

// ── Guided mode panel ───────────────────────────────────────────────────────
function GuidedPanel({ track, trackIndex, totalTracks, timeMarkers, observations, onNoteChange, onObservationChange, onAddMarker, onNext, onPrev, onExit }) {
  const [overviewDraft, setOverviewDraft] = useState(track.generalNote || '')
  const [momentDrafts, setMomentDrafts] = useState({})
  const [activeTab, setActiveTab] = useState('overview')
  const [addingMoment, setAddingMoment] = useState(false)
  const [newMomentLabel, setNewMomentLabel] = useState('')
  const timerRef = useRef(null)
  const prevMarkerCount = useRef(timeMarkers.length)

  const def = DEFAULT_TRACK_DEFINITIONS.find(d => d.schemaCategory === track.schemaCategory)
  const questions = def?.guidingQuestions || []

  // Reset when track changes
  useEffect(() => {
    setOverviewDraft(track.generalNote || '')
    setActiveTab('overview')
    const drafts = {}
    timeMarkers.forEach(m => {
      const key = `${track.id}:${m.id}`
      drafts[m.id] = observations[key]?.content || ''
    })
    setMomentDrafts(drafts)
    prevMarkerCount.current = timeMarkers.length
  }, [track.id])

  // When a new marker is added, add it to drafts and auto-switch to it
  useEffect(() => {
    if (timeMarkers.length > prevMarkerCount.current) {
      const newest = timeMarkers[timeMarkers.length - 1]
      setMomentDrafts(prev => ({
        ...prev,
        [newest.id]: observations[`${track.id}:${newest.id}`]?.content || '',
      }))
      setActiveTab(newest.id)
    }
    prevMarkerCount.current = timeMarkers.length
  }, [timeMarkers.length])

  function handleOverviewChange(val) {
    setOverviewDraft(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onNoteChange(track.id, val), 500)
  }

  function handleMomentChange(markerId, val) {
    setMomentDrafts(prev => ({ ...prev, [markerId]: val }))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onObservationChange(track.id, markerId, val), 500)
  }

  function flushAll() {
    onNoteChange(track.id, overviewDraft)
    timeMarkers.forEach(m => {
      onObservationChange(track.id, m.id, momentDrafts[m.id] || '')
    })
  }

  function handleNext() { flushAll(); onNext() }
  function handlePrev() { flushAll(); onPrev() }
  function handleExit() { flushAll(); onExit() }

  function addMoment() {
    if (!newMomentLabel.trim()) return
    onAddMarker(newMomentLabel.trim())
    setNewMomentLabel('')
    setAddingMoment(false)
  }

  const activeMarker = timeMarkers.find(m => m.id === activeTab)
  const isOverview = activeTab === 'overview'

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-flat bg-stage">
        {Array.from({ length: totalTracks }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i === trackIndex ? track.color : i < trackIndex ? track.color + '55' : '#2a2a40' }} />
        ))}
        <span className="text-mist text-xs ml-3 whitespace-nowrap">{trackIndex + 1} of {totalTracks}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: element info + prompts */}
        <aside className="w-64 min-w-[16rem] border-r border-flat flex flex-col bg-stage overflow-y-auto flex-shrink-0">
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: track.color }}>Element {trackIndex + 1}</div>
            <h2 className="font-display text-xl mb-4" style={{ color: track.color }}>{track.label}</h2>
            {questions.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-mist text-xs uppercase tracking-widest">Consider…</p>
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-mist/40 text-xs mt-0.5 flex-shrink-0">—</span>
                    <p className="text-ash/65 text-xs leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-flat">
              <p className="text-mist/40 text-xs leading-relaxed italic">
                {timeMarkers.length === 0
                  ? 'Write freely first. Add moments with "+ moment" above to split observations across the timeline.'
                  : 'Use the Overview for general notes, then switch to each moment to add specific observations.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Right: tab bar + textarea */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-flat overflow-x-auto flex-shrink-0">
            {/* Overview tab */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs rounded-t border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                isOverview ? 'text-ash font-semibold' : 'border-transparent text-mist hover:text-ash'
              }`}
              style={isOverview ? { borderColor: track.color } : {}}
            >
              Overview
              {overviewDraft && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block align-middle" style={{ backgroundColor: track.color }} />}
            </button>

            {/* Moment tabs */}
            {timeMarkers.map(m => {
              const key = `${track.id}:${m.id}`
              const hasContent = momentDrafts[m.id]?.trim() || observations[key]?.content
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  className={`px-3 py-2 text-xs rounded-t border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === m.id ? 'text-ash font-semibold' : 'border-transparent text-mist hover:text-ash'
                  }`}
                  style={activeTab === m.id ? { borderColor: track.color } : {}}
                >
                  {m.label}
                  {hasContent && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block align-middle" style={{ backgroundColor: track.color + '99' }} />}
                </button>
              )
            })}

            {/* Add moment inline */}
            <div className="flex items-center ml-1 flex-shrink-0">
              {addingMoment ? (
                <div className="flex items-center gap-1.5 px-1">
                  <input
                    autoFocus
                    value={newMomentLabel}
                    onChange={e => setNewMomentLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addMoment()
                      if (e.key === 'Escape') { setAddingMoment(false); setNewMomentLabel('') }
                    }}
                    placeholder="Moment name…"
                    className="bg-flat border border-gold/50 rounded px-2 py-1 text-ash text-xs w-28 focus:border-gold focus:outline-none"
                  />
                  <button onClick={addMoment} className="text-gold text-xs hover:text-gold-dim">Add</button>
                  <button onClick={() => { setAddingMoment(false); setNewMomentLabel('') }} className="text-mist text-xs hover:text-ash">×</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingMoment(true)}
                  className="text-gold/50 hover:text-gold text-xs px-2 py-2 transition-colors border-b-2 border-transparent"
                >
                  + moment
                </button>
              )}
            </div>
          </div>

          {/* Overview notes shown as reference when on a moment tab */}
          {!isOverview && overviewDraft.trim() && (
            <div className="mx-4 mt-3 p-3 rounded-lg text-xs leading-relaxed border-l-2 bg-flat/20 flex-shrink-0"
              style={{ borderColor: track.color + '55' }}>
              <span className="text-mist/40 text-[10px] uppercase tracking-wider block mb-1">Overview notes</span>
              <p className="text-mist/70 italic">{overviewDraft}</p>
            </div>
          )}

          {/* Main textarea */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <textarea
              key={activeTab}
              value={isOverview ? overviewDraft : (momentDrafts[activeTab] || '')}
              onChange={e => isOverview
                ? handleOverviewChange(e.target.value)
                : handleMomentChange(activeTab, e.target.value)
              }
              placeholder={isOverview
                ? `Write everything you noticed about ${track.label.toLowerCase()} in this performance…`
                : `What specifically happened with ${track.label.toLowerCase()} during "${activeMarker?.label}"?`
              }
              className="flex-1 bg-flat/50 border border-flat rounded-xl p-4 text-ash text-sm resize-none focus:outline-none leading-relaxed placeholder-mist/25 transition-colors"
              style={{ minHeight: '180px' }}
              onFocus={e => { e.target.style.borderColor = track.color + '66' }}
              onBlur={e => {
                e.target.style.borderColor = ''
                if (isOverview) onNoteChange(track.id, overviewDraft)
                else onObservationChange(track.id, activeTab, momentDrafts[activeTab] || '')
              }}
            />
          </div>
        </main>
      </div>

      {/* Navigation footer */}
      <div className="border-t border-flat px-6 py-4 bg-stage flex items-center justify-between flex-shrink-0">
        <button onClick={handleExit} className="text-mist hover:text-ash text-sm transition-colors">View full map</button>
        <div className="flex items-center gap-3">
          {trackIndex > 0 && (
            <button onClick={handlePrev} className="border border-flat text-mist hover:text-ash hover:border-ash/30 px-4 py-2 rounded-lg text-sm transition-colors">
              ← Previous
            </button>
          )}
          {trackIndex < totalTracks - 1 ? (
            <button onClick={handleNext} className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ backgroundColor: track.color, color: '#0a0a14' }}>
              Next element →
            </button>
          ) : (
            <button onClick={handleExit} className="bg-gold text-void px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gold-dim transition-colors">
              Done — organise on the map ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Whiteboard export canvas (hidden off-screen) ────────────────────────────
function MapExportCanvas({ map, visibleTracks, exportId }) {
  const hasNotes = visibleTracks.some(t => t.generalNote?.trim())
  const hasMarkers = map.timeMarkers.length > 0

  return (
    <div id={exportId} style={{
      position: 'absolute', left: '-99999px', top: 0,
      width: '1800px', background: '#faf8f4',
      fontFamily: 'Georgia, serif', padding: '64px', boxSizing: 'border-box',
    }}>
      <div style={{ marginBottom: '48px', paddingBottom: '28px', borderBottom: '1px solid #d0cdc8' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}>
          Performance Analysis Map
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '42px', color: '#1a1620', margin: 0, lineHeight: 1.15 }}>
          {map.title}
        </h1>
        {(map.venue || map.date) && (
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#888', fontSize: '14px', margin: '10px 0 0' }}>
            {[map.venue, map.date ? formatDateAU(map.date) : ''].filter(Boolean).join('  ·  ')}
          </p>
        )}
      </div>

      {hasMarkers && (
        <div style={{ display: 'flex', marginBottom: '8px' }}>
          <div style={{ width: hasNotes ? '420px' : '220px', flexShrink: 0 }} />
          {map.timeMarkers.map(m => (
            <div key={m.id} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: '8px', borderBottom: '1px solid #ddd' }}>
              {m.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visibleTracks.map(track => {
          const trackObs = map.timeMarkers.map(m => ({ marker: m, content: map.observations[`${track.id}:${m.id}`]?.content || '' }))
          const hasContent = track.generalNote?.trim() || trackObs.some(o => o.content)
          return (
            <div key={track.id} style={{ display: 'flex', minHeight: hasContent ? '90px' : '54px', borderRadius: '8px', overflow: 'hidden', background: track.color + '0c' }}>
              <div style={{ width: '220px', flexShrink: 0, padding: '16px 18px', borderLeft: `4px solid ${track.color}`, display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: track.color, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>
                  {track.label}
                </span>
              </div>
              {hasNotes && (
                <div style={{ width: '200px', flexShrink: 0, padding: '14px 16px', borderRight: '1px solid ' + track.color + '22', background: track.color + '06' }}>
                  {track.generalNote?.trim() && (
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#444', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                      {track.generalNote}
                    </p>
                  )}
                </div>
              )}
              {hasMarkers ? trackObs.map(({ marker, content }, j) => (
                <div key={marker.id} style={{ flex: 1, padding: '14px 16px', borderRight: j < map.timeMarkers.length - 1 ? `1px solid ${track.color}18` : 'none' }}>
                  {content && <p style={{ fontFamily: 'Georgia, serif', fontSize: '11.5px', color: '#333', lineHeight: 1.7, margin: 0 }}>{content}</p>}
                </div>
              )) : (
                <div style={{ flex: 1, padding: '14px 16px' }}>
                  {track.generalNote?.trim() && <p style={{ fontFamily: 'Georgia, serif', fontSize: '11.5px', color: '#333', lineHeight: 1.7, margin: 0 }}>{track.generalNote}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {map.paradigms?.length > 0 && (
        <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid #d0cdc8' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', marginBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
            Performance Paradigms
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {map.paradigms.map(p => {
              const obsInParadigm = (p.observationIds || []).map(oid => Object.values(map.observations).find(o => o.id === oid)).filter(Boolean)
              return (
                <div key={p.id} style={{ flex: '1 1 340px', maxWidth: '420px', background: p.color + '10', borderRadius: '10px', padding: '20px 22px', borderTop: `3px solid ${p.color}` }}>
                  <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '16px', color: p.color, marginBottom: '8px' }}>{p.label}</div>
                  {p.note && <p style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#555', fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.6 }}>{p.note}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {obsInParadigm.map(obs => {
                      const t = map.tracks.find(t => t.id === obs.trackId)
                      const mk = map.timeMarkers.find(m => m.id === obs.timeMarkerId)
                      return (
                        <div key={obs.id} style={{ borderLeft: `2px solid ${t?.color || '#ccc'}`, paddingLeft: '10px' }}>
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: '10.5px', color: '#444', margin: '0 0 2px', lineHeight: 1.5 }}>{obs.content}</p>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#aaa' }}>{[t?.label, mk?.label].filter(Boolean).join(' · ')}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e0ddd8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#bbb', letterSpacing: '0.05em' }}>Based on Gay McAuley's Performance Analysis Schema</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#bbb' }}>{new Date().toLocaleDateString('en-AU')}</span>
      </div>
    </div>
  )
}

// ── Main MapView ────────────────────────────────────────────────────────────
export default function MapView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [newMarkerLabel, setNewMarkerLabel] = useState('')
  const [addingMarker, setAddingMarker] = useState(false)
  const [newTrackLabel, setNewTrackLabel] = useState('')
  const [addingTrack, setAddingTrack] = useState(false)
  const [guidedMode, setGuidedMode] = useState(false)
  const [guidedTrackIndex, setGuidedTrackIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(true)
  const [activeObsDragId, setActiveObsDragId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    const m = loadMap(id)
    if (!m) { navigate('/'); return }
    setMap(m)
    setTitleDraft(m.title)
  }, [id])

  const persist = useCallback((updated) => {
    const saved = saveMap(updated)
    setMap(saved)
  }, [])

  if (!map) return null

  const visibleTracks = map.tracks.filter(t => t.visible).sort((a, b) => a.order - b.order)
  const hasAnyNotes = map.tracks.some(t => t.generalNote?.trim())

  function updateObservation(trackId, markerId, content) {
    const key = `${trackId}:${markerId}`
    const obs = { ...map.observations }
    if (content.trim()) {
      obs[key] = { id: obs[key]?.id || uuidv4(), trackId, timeMarkerId: markerId, content }
    } else {
      delete obs[key]
    }
    persist({ ...map, observations: obs })
  }

  function updateTrackNote(trackId, note) {
    persist({ ...map, tracks: map.tracks.map(t => t.id === trackId ? { ...t, generalNote: note } : t) })
  }

  function addTimeMarker(label) {
    const lbl = label || newMarkerLabel
    if (!lbl?.trim()) return
    const marker = { id: uuidv4(), label: lbl.trim(), position: map.timeMarkers.length }
    persist({ ...map, timeMarkers: [...map.timeMarkers, marker] })
    setNewMarkerLabel('')
    setAddingMarker(false)
  }

  function deleteTimeMarker(markerId) {
    const obs = { ...map.observations }
    Object.keys(obs).forEach(k => { if (k.endsWith(`:${markerId}`)) delete obs[k] })
    persist({ ...map, timeMarkers: map.timeMarkers.filter(m => m.id !== markerId), observations: obs })
  }

  function handleMarkerDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIndex = map.timeMarkers.findIndex(m => m.id === active.id)
    const newIndex = map.timeMarkers.findIndex(m => m.id === over.id)
    persist({ ...map, timeMarkers: arrayMove(map.timeMarkers, oldIndex, newIndex) })
  }

  function handleObsDragEnd({ active, over }) {
    setActiveObsDragId(null)
    if (!over) return
    const [, srcTrackId, srcMarkerId] = active.id.split(':')
    const [, dstTrackId, dstMarkerId] = over.id.split(':')
    const srcKey = `${srcTrackId}:${srcMarkerId}`
    const dstKey = `${dstTrackId}:${dstMarkerId}`
    if (srcKey === dstKey) return
    const obs = { ...map.observations }
    const srcObs = obs[srcKey]
    if (!srcObs) return
    const dstObs = obs[dstKey]
    obs[dstKey] = { ...srcObs, id: obs[dstKey]?.id || uuidv4(), trackId: dstTrackId, timeMarkerId: dstMarkerId }
    if (dstObs) {
      obs[srcKey] = { ...dstObs, id: obs[srcKey]?.id || uuidv4(), trackId: srcTrackId, timeMarkerId: srcMarkerId }
    } else {
      delete obs[srcKey]
    }
    persist({ ...map, observations: obs })
  }

  function addTrack() {
    if (!newTrackLabel.trim()) return
    const track = { id: uuidv4(), label: newTrackLabel.trim(), schemaCategory: null, color: '#8888aa', order: map.tracks.length, visible: true, isDefault: false, generalNote: '' }
    persist({ ...map, tracks: [...map.tracks, track] })
    setNewTrackLabel('')
    setAddingTrack(false)
  }

  function toggleTrack(trackId) {
    persist({ ...map, tracks: map.tracks.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t) })
  }

  function commitTitle() {
    setEditingTitle(false)
    if (titleDraft.trim() && titleDraft !== map.title) persist({ ...map, title: titleDraft.trim() })
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const EXPORT_ID = 'map-whiteboard-export'

  async function handleExport(type) {
    setExporting(true)
    setShowExport(false)
    await new Promise(r => setTimeout(r, 120))
    const slug = map.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)
    if (type === 'pdf') await exportMapAsPDF(EXPORT_ID, slug)
    else await exportMapAsImage(EXPORT_ID, slug)
    setExporting(false)
  }

  function enterGuidedMode() { setGuidedTrackIndex(0); setGuidedMode(true) }

  const hiddenTracks = map.tracks.filter(t => !t.visible)
  const currentGuidedTrack = visibleTracks[guidedTrackIndex]

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <MapExportCanvas map={map} visibleTracks={visibleTracks} exportId={EXPORT_ID} />

      {/* Top bar */}
      <header className="border-b border-flat px-6 py-3 flex items-center gap-4 bg-stage sticky top-0 z-20">
        <Link to="/" className="text-mist hover:text-ash transition-colors text-sm">← Home</Link>
        <div className="flex-1">
          {editingTitle ? (
            <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter') commitTitle() }}
              className="font-display text-xl text-ash bg-transparent border-b border-gold w-full focus:outline-none" />
          ) : (
            <h1 className="font-display text-xl text-ash cursor-pointer hover:text-gold transition-colors" onClick={() => setEditingTitle(true)}>
              {map.title}
            </h1>
          )}
          {(map.venue || map.date) && (
            <p className="text-mist text-xs">{[map.venue, formatDateAU(map.date)].filter(Boolean).join(' · ')}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!guidedMode ? (
            <button onClick={enterGuidedMode} className="border border-gold/50 text-gold hover:bg-gold/10 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
              Guide me →
            </button>
          ) : (
            <button onClick={() => setGuidedMode(false)} className="bg-gold/20 border border-gold/50 text-gold px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
              Guided mode on
            </button>
          )}

          <div className="flex bg-flat rounded-lg p-0.5 text-xs">
            <span className="px-3 py-1.5 bg-gold text-void rounded-md font-semibold">Stage 1</span>
            <Link to={`/map/${id}/structure`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 2</Link>
            <Link to={`/map/${id}/paradigms`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 3</Link>
            <Link to={`/map/${id}/statement`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 4</Link>
          </div>

          <div className="relative">
            <button onClick={() => setShowExport(v => !v)} disabled={exporting}
              className="border border-flat text-mist hover:text-ash hover:border-ash/30 px-3 py-1.5 rounded-lg text-xs transition-colors">
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-wing border border-flat rounded-lg shadow-xl z-30 overflow-hidden text-xs w-36">
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 hover:bg-flat text-ash transition-colors">Save as PDF</button>
                <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2.5 hover:bg-flat text-ash transition-colors">Save as Image</button>
              </div>
            )}
          </div>

          <button onClick={copyLink} className="border border-flat text-mist hover:text-ash hover:border-ash/30 px-3 py-1.5 rounded-lg text-xs transition-colors">
            {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>
      </header>

      {/* Guided mode */}
      {guidedMode && currentGuidedTrack ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <GuidedPanel
            track={currentGuidedTrack}
            trackIndex={guidedTrackIndex}
            totalTracks={visibleTracks.length}
            timeMarkers={map.timeMarkers}
            observations={map.observations}
            onNoteChange={updateTrackNote}
            onObservationChange={updateObservation}
            onAddMarker={addTimeMarker}
            onNext={() => setGuidedTrackIndex(i => Math.min(i + 1, visibleTracks.length - 1))}
            onPrev={() => setGuidedTrackIndex(i => Math.max(i - 1, 0))}
            onExit={() => setGuidedMode(false)}
          />
        </div>
      ) : (
        <>
          {hiddenTracks.length > 0 && (
            <div className="px-6 py-2 bg-stage border-b border-flat flex items-center gap-3 flex-wrap">
              <span className="text-mist text-xs">Hidden:</span>
              {hiddenTracks.map(t => (
                <button key={t.id} onClick={() => toggleTrack(t.id)} className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-flat" style={{ borderColor: t.color + '55', color: t.color }}>
                  {t.label} (show)
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto relative">
            <div id="map-canvas" className="min-w-max">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMarkerDragEnd}>
                <div className="flex sticky top-0 z-10 bg-stage border-b border-flat">
                  <div className="w-44 min-w-[11rem] border-r border-flat flex items-end px-3 py-3 flex-shrink-0">
                    <span className="text-mist text-xs uppercase tracking-widest">Element</span>
                  </div>
                  {hasAnyNotes && (
                    <div className="w-52 min-w-[13rem] border-r border-flat px-3 py-3 flex items-center justify-between flex-shrink-0">
                      <span className="text-mist/60 text-xs uppercase tracking-widest">Initial observations</span>
                      <button onClick={() => setShowNotes(v => !v)} className="text-mist/40 hover:text-mist text-xs transition-colors ml-2">
                        {showNotes ? '–' : '+'}
                      </button>
                    </div>
                  )}
                  <SortableContext items={map.timeMarkers.map(m => m.id)} strategy={horizontalListSortingStrategy}>
                    {map.timeMarkers.map(marker => (
                      <SortableMarkerHeader key={marker.id} marker={marker} onDelete={deleteTimeMarker} />
                    ))}
                  </SortableContext>
                  <div className="px-3 py-3 flex items-center flex-shrink-0">
                    {addingMarker ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={newMarkerLabel} onChange={e => setNewMarkerLabel(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addTimeMarker()
                            if (e.key === 'Escape') { setAddingMarker(false); setNewMarkerLabel('') }
                          }}
                          placeholder="e.g. Scene 1, Act 2…"
                          className="bg-flat border border-gold/50 rounded px-2 py-1 text-ash text-xs w-36 focus:border-gold focus:outline-none"
                        />
                        <button onClick={() => addTimeMarker()} className="text-gold text-xs hover:text-gold-dim">Add</button>
                        <button onClick={() => { setAddingMarker(false); setNewMarkerLabel('') }} className="text-mist text-xs hover:text-ash">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingMarker(true)}
                        className="text-gold/70 hover:text-gold text-xs whitespace-nowrap transition-colors border border-dashed border-gold/30 hover:border-gold/60 px-3 py-1 rounded">
                        + Add Scene / Moment
                      </button>
                    )}
                  </div>
                </div>
              </DndContext>

              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={({ active }) => setActiveObsDragId(active.id)}
                onDragEnd={handleObsDragEnd}
                onDragCancel={() => setActiveObsDragId(null)}
              >
                {visibleTracks.map(track => (
                  <div key={track.id} className="flex border-b border-flat/50 group/row hover:bg-white/[0.01] transition-colors">
                    <div className="w-44 min-w-[11rem] border-r border-flat px-3 py-3 flex items-start justify-between sticky left-0 bg-stage z-10 flex-shrink-0"
                      style={{ borderLeft: `3px solid ${track.color}` }}>
                      <span className="text-ash text-xs font-medium leading-snug">{track.label}</span>
                      <button onClick={() => toggleTrack(track.id)}
                        className="text-mist/30 hover:text-mist text-xs opacity-0 group-hover/row:opacity-100 transition-all flex-shrink-0 ml-1" title="Hide track">–</button>
                    </div>
                    {hasAnyNotes && showNotes && (
                      <div className="w-52 min-w-[13rem] border-r border-flat/50 p-1 bg-void/30 flex-shrink-0">
                        <NoteCell value={track.generalNote || ''} onChange={val => updateTrackNote(track.id, val)} color={track.color} />
                      </div>
                    )}
                    {map.timeMarkers.map(marker => (
                      <div key={marker.id} className="min-w-[160px] w-[200px] border-r border-flat/50 p-1 flex-shrink-0">
                        <ObservationCell
                          trackId={track.id} markerId={marker.id}
                          value={map.observations[`${track.id}:${marker.id}`]?.content || ''}
                          onChange={val => updateObservation(track.id, marker.id, val)}
                          color={track.color}
                          isDraggingAny={!!activeObsDragId}
                        />
                      </div>
                    ))}
                    {map.timeMarkers.length > 0 && <div className="min-w-[200px]" />}
                  </div>
                ))}
                <DragOverlay dropAnimation={null}>
                  {activeObsDragId ? (() => {
                    const [, tId, mId] = activeObsDragId.split(':')
                    const content = map.observations[`${tId}:${mId}`]?.content
                    const track = map.tracks.find(t => t.id === tId)
                    return content ? (
                      <div className="bg-stage border rounded-lg p-2 text-xs text-ash shadow-2xl max-w-[200px] rotate-1 opacity-95" style={{ borderColor: track?.color + '88' }}>
                        <div className="w-full h-0.5 rounded mb-2" style={{ backgroundColor: track?.color }} />
                        <p className="leading-relaxed line-clamp-4">{content}</p>
                      </div>
                    ) : null
                  })() : null}
                </DragOverlay>
              </DndContext>

              <div className="flex border-b border-flat/30 pl-3 py-3">
                {addingTrack ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={newTrackLabel} onChange={e => setNewTrackLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTrack(); if (e.key === 'Escape') { setAddingTrack(false); setNewTrackLabel('') } }}
                      placeholder="Custom track name…"
                      className="bg-flat border border-violet/50 rounded px-2 py-1 text-ash text-xs w-48 focus:border-violet focus:outline-none"
                    />
                    <button onClick={addTrack} className="text-violet text-xs hover:text-violet-dim">Add</button>
                    <button onClick={() => { setAddingTrack(false); setNewTrackLabel('') }} className="text-mist text-xs hover:text-ash">×</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTrack(true)}
                    className="text-violet/60 hover:text-violet text-xs transition-colors border border-dashed border-violet/20 hover:border-violet/50 px-3 py-1 rounded">
                    + Add Custom Track
                  </button>
                )}
              </div>
            </div>

            {map.timeMarkers.length === 0 && !hasAnyNotes && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="font-display text-xl text-mist mb-1">Ready to map your performance</p>
                  <p className="text-mist/50 text-sm mb-5">Start with guided mode to capture your observations, then organise them into scenes</p>
                  <button onClick={enterGuidedMode} className="pointer-events-auto border border-gold/50 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-lg text-sm transition-colors font-medium">
                    Start guided mode →
                  </button>
                </div>
              </div>
            )}

            {map.timeMarkers.length === 0 && hasAnyNotes && (
              <div className="px-6 py-3 border-t border-flat bg-stage/50 flex items-center gap-4">
                <p className="text-mist/70 text-xs flex-1">
                  Observations captured. Add scenes or moments to organise them across the timeline — or go back to guided mode to do it there.
                </p>
                <button onClick={enterGuidedMode} className="border border-gold/30 text-gold/70 hover:text-gold hover:border-gold/60 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap">
                  Back to guided mode
                </button>
                <button onClick={() => setAddingMarker(true)}
                  className="border border-gold/50 text-gold hover:bg-gold/10 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap">
                  + Add first scene / moment
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
