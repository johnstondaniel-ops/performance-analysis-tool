import { useState, useEffect, useCallback, Component } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { loadMap, saveMap } from '../utils/storage.js'
import { PARADIGM_COLORS } from '../utils/defaults.js'
import { exportMapAsPDF, exportMapAsImage } from '../utils/export.js'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#e2e2e8', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#f97316' }}>Render error — please copy this and send it:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1a1a2e', padding: 16, borderRadius: 8, fontSize: 12 }}>
            {this.state.error?.toString()}{'\n'}{this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function formatDateAU(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ── Observation card ────────────────────────────────────────────────────────
function ObsCard({ obs, trackLabel, trackColor, markerLabel, appliedParadigms, activeParadigm, spotlightParadigmId, onToggleCode, onSetRelation }) {
  const isCodedWithActive = activeParadigm && appliedParadigms.some(p => p.id === activeParadigm.id)
  const isInSpotlight = !spotlightParadigmId || appliedParadigms.some(p => p.id === spotlightParadigmId)
  const isClickable = !!activeParadigm
  const activeRelation = isCodedWithActive
    ? (activeParadigm.observationRelations || {})[obs.id] || 'elaboration'
    : null
  const isAntithesis = activeRelation === 'antithesis'

  return (
    <div
      onClick={isClickable ? () => onToggleCode(obs.id) : undefined}
      className={`relative rounded-xl border p-3 transition-all select-none ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      } ${isCodedWithActive ? 'border-opacity-80 shadow-md' : isClickable ? 'border-flat hover:border-ash/20' : 'border-flat'}`}
      style={{
        opacity: isInSpotlight ? 1 : 0.2,
        borderColor: isCodedWithActive ? (isAntithesis ? '#a78bfa' : activeParadigm.color) + 'aa' : undefined,
        background: isCodedWithActive ? (isAntithesis ? '#a78bfa' : activeParadigm.color) + '12' : '#1a1a2e',
        transform: isCodedWithActive ? 'scale(1.01)' : undefined,
      }}
    >
      {/* Coded indicator + E/A toggle */}
      {isCodedWithActive && (
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
            style={{ backgroundColor: activeParadigm.color, color: '#0a0a14' }}>✓</div>
          <button
            onClick={() => onSetRelation(obs.id, isAntithesis ? 'elaboration' : 'antithesis')}
            title={isAntithesis ? 'Antithesis — click to switch to Elaboration' : 'Elaboration — click to switch to Antithesis'}
            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide transition-all"
            style={isAntithesis
              ? { background: '#a78bfa30', color: '#a78bfa', border: '1px solid #a78bfa66' }
              : { background: '#4ade8030', color: '#4ade80', border: '1px solid #4ade8066' }
            }
          >
            {isAntithesis ? 'A' : 'E'}
          </button>
        </div>
      )}
      {/* Click-to-code hint */}
      {isClickable && !isCodedWithActive && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-dashed flex items-center justify-center text-[10px] text-mist/30"
          style={{ borderColor: activeParadigm.color + '55' }}>+</div>
      )}

      <p className="text-ash text-xs leading-relaxed mb-2 pr-7">{obs.content}</p>

      {/* Track + marker chips */}
      <div className="flex gap-1 flex-wrap mb-1.5">
        {trackLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: trackColor + '30', color: trackColor }}>
            {trackLabel}
          </span>
        )}
        {markerLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-flat text-mist">{markerLabel}</span>
        )}
      </div>

      {/* Applied paradigm codes with relation indicator */}
      {appliedParadigms.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-1">
          {appliedParadigms.map(p => {
            const rel = (p.observationRelations || {})[obs.id]
            return (
              <span key={p.id} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{ backgroundColor: p.color + '25', color: p.color }}>
                {p.label}{rel === 'antithesis' ? ' ↕' : rel === 'elaboration' ? ' →' : ''}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ParadigmView ───────────────────────────────────────────────────────
export default function ParadigmView() {
  return <ErrorBoundary><ParadigmViewInner /></ErrorBoundary>
}

function ParadigmViewInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [activeParadigmId, setActiveParadigmId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [addingParadigm, setAddingParadigm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [filterTrack, setFilterTrack] = useState('all')
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    const m = loadMap(id)
    if (!m) { navigate('/'); return }
    setMap(m)
    setColorIndex(m.paradigms?.length % PARADIGM_COLORS.length || 0)
  }, [id])

  const persist = useCallback((updated) => {
    setMap(saveMap(updated))
  }, [])

  // Must be before early return — hooks can't be conditional
  useEffect(() => {
    const ap = map ? (map.paradigms || []).find(p => p.id === activeParadigmId) : null
    setNoteDraft(ap?.note || '')
    setEditingNote(false)
  }, [activeParadigmId])

  if (!map) return null

  const paradigms = map.paradigms || []
  const tracks = map.tracks || []
  const timeMarkers = map.timeMarkers || []
  const observations = map.observations || {}
  const trackMap = Object.fromEntries(tracks.map(t => [t.id, t]))
  const markerMap = Object.fromEntries(timeMarkers.map(m => [m.id, m.label]))

  // Include general notes as virtual observations so they're codeable
  const noteObs = tracks
    .filter(t => t.generalNote?.trim())
    .map(t => ({ id: `note:${t.id}`, trackId: t.id, timeMarkerId: null, content: t.generalNote }))
  const noteObsById = Object.fromEntries(noteObs.map(o => [o.id, o]))

  // Combined lookup for resolving obs by ID (used in export)
  function resolveObs(oid) {
    return noteObsById[oid] || Object.values(observations).find(o => o.id === oid) || null
  }

  const allObs = [
    ...noteObs,
    ...Object.values(observations),
  ]
  const activeParadigm = paradigms.find(p => p.id === activeParadigmId) || null

  function getAppliedParadigms(obsId) {
    return paradigms.filter(p => (p.observationIds || []).includes(obsId))
  }

  function toggleCode(obsId) {
    if (!activeParadigmId) return
    persist({
      ...map,
      paradigms: paradigms.map(p => {
        if (p.id !== activeParadigmId) return p
        const has = (p.observationIds || []).includes(obsId)
        const relations = { ...(p.observationRelations || {}) }
        if (has) {
          delete relations[obsId]
          return { ...p, observationIds: p.observationIds.filter(i => i !== obsId), observationRelations: relations }
        }
        relations[obsId] = 'elaboration'
        return { ...p, observationIds: [...(p.observationIds || []), obsId], observationRelations: relations }
      }),
    })
  }

  function setRelation(obsId, relation) {
    if (!activeParadigmId) return
    persist({
      ...map,
      paradigms: paradigms.map(p =>
        p.id !== activeParadigmId ? p
        : { ...p, observationRelations: { ...(p.observationRelations || {}), [obsId]: relation } }
      ),
    })
  }

  function addParadigm() {
    if (!newLabel.trim()) return
    const p = { id: uuidv4(), label: newLabel.trim(), color: PARADIGM_COLORS[colorIndex % PARADIGM_COLORS.length], note: '', observationIds: [], observationRelations: {} }
    const updated = { ...map, paradigms: [...paradigms, p] }
    persist(updated)
    setColorIndex(c => (c + 1) % PARADIGM_COLORS.length)
    setNewLabel('')
    setAddingParadigm(false)
    setActiveParadigmId(p.id)
  }

  function deleteParadigm(pId) {
    if (!confirm('Delete this paradigm? Codes will be removed from all observations.')) return
    persist({ ...map, paradigms: paradigms.filter(p => p.id !== pId) })
    if (activeParadigmId === pId) setActiveParadigmId(null)
  }

  function renameParadigm(pId, label) {
    persist({ ...map, paradigms: paradigms.map(p => p.id === pId ? { ...p, label } : p) })
  }

  function saveNote(pId, note) {
    persist({ ...map, paradigms: paradigms.map(p => p.id === pId ? { ...p, note } : p) })
  }

  function clearAllCodes(pId) {
    if (!confirm('Remove all coding for this paradigm?')) return
    persist({ ...map, paradigms: paradigms.map(p => p.id === pId ? { ...p, observationIds: [], observationRelations: {} } : p) })
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const EXPORT_ID = 'paradigm-export-canvas'

  async function handleExport(type) {
    setExporting(true)
    setShowExport(false)
    await new Promise(r => setTimeout(r, 120))
    const slug = map.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40) + '-paradigms'
    if (type === 'pdf') await exportMapAsPDF(EXPORT_ID, slug)
    else await exportMapAsImage(EXPORT_ID, slug)
    setExporting(false)
  }

  const filteredObs = filterTrack === 'all' ? allObs : allObs.filter(o => o.trackId === filterTrack)

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Hidden export canvas */}
      <div id={EXPORT_ID} style={{ position: 'absolute', left: '-99999px', top: 0, width: '1400px', background: '#faf8f4', padding: '48px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', color: '#1a1620', marginBottom: '8px' }}>{map.title} — Paradigm Analysis</h1>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: '40px', fontFamily: 'Inter, sans-serif' }}>{[map.venue, map.date ? formatDateAU(map.date) : ''].filter(Boolean).join(' · ')}</p>
        {paradigms.map(p => {
          const coded = (p.observationIds || []).map(oid => resolveObs(oid)).filter(Boolean)
          return (
            <div key={p.id} style={{ marginBottom: '32px', breakInside: 'avoid' }}>
              <div style={{ borderLeft: `4px solid ${p.color}`, paddingLeft: '16px', marginBottom: '12px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: p.color, margin: 0 }}>{p.label}</h2>
                {p.note && <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', margin: '4px 0 0', fontFamily: 'Georgia, serif' }}>{p.note}</p>}
                <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'Inter, sans-serif' }}>{coded.length} observation{coded.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {coded.map(obs => {
                  const track = trackMap[obs.trackId]
                  return (
                    <div key={obs.id} style={{ flex: '1 1 280px', maxWidth: '340px', background: p.color + '0e', borderRadius: '8px', padding: '12px', borderTop: `2px solid ${p.color}55` }}>
                      <p style={{ fontSize: '11px', color: '#333', lineHeight: 1.7, margin: '0 0 6px' }}>{obs.content}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: track?.color || '#888', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{track?.label}</span>
                        {(obs.timeMarkerId ? markerMap[obs.timeMarkerId] : 'General note') && <span style={{ fontSize: '10px', color: '#aaa', fontFamily: 'Inter, sans-serif' }}> · {obs.timeMarkerId ? markerMap[obs.timeMarkerId] : 'General note'}</span>}
                        {(() => { const rel = (p.observationRelations || {})[obs.id]; return rel ? <span style={{ fontSize: '9px', fontFamily: 'Inter, sans-serif', fontWeight: 700, padding: '1px 5px', borderRadius: '999px', background: rel === 'antithesis' ? '#a78bfa20' : '#4ade8020', color: rel === 'antithesis' ? '#a78bfa' : '#4ade80', border: `1px solid ${rel === 'antithesis' ? '#a78bfa50' : '#4ade8050'}` }}>{rel === 'antithesis' ? '↕ antithesis' : '→ elaboration'}</span> : null })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Top bar */}
      <header className="border-b border-flat px-6 py-3 flex items-center gap-4 bg-stage sticky top-0 z-20">
        <Link to="/" className="text-mist hover:text-ash transition-colors text-sm">← Home</Link>
        <div className="flex-1">
          <h1 className="font-display text-xl text-ash">{map.title}</h1>
          {(map.venue || map.date) && (
            <p className="text-mist text-xs">{[map.venue, formatDateAU(map.date)].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-flat rounded-lg p-0.5 text-xs">
            <Link to={`/map/${id}`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 1</Link>
            <Link to={`/map/${id}/structure`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 2</Link>
            <span className="px-3 py-1.5 bg-violet text-void rounded-md font-semibold">Stage 3</span>
            <Link to={`/map/${id}/statement`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 4</Link>
          </div>
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)} disabled={exporting}
              className="border border-flat text-mist hover:text-ash px-3 py-1.5 rounded-lg text-xs transition-colors">
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-wing border border-flat rounded-lg shadow-xl z-30 overflow-hidden text-xs w-36">
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 hover:bg-flat text-ash transition-colors">Save as PDF</button>
                <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2.5 hover:bg-flat text-ash transition-colors">Save as Image</button>
              </div>
            )}
          </div>
          <button onClick={copyLink} className="border border-flat text-mist hover:text-ash px-3 py-1.5 rounded-lg text-xs transition-colors">
            {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: paradigm codes panel */}
        <aside className="w-64 min-w-[16rem] border-r border-flat flex flex-col bg-stage overflow-hidden">
          <div className="px-4 py-3 border-b border-flat flex-shrink-0">
            <h2 className="font-display text-base text-ash">Paradigm Codes</h2>
            <p className="text-mist text-xs mt-0.5">
              {activeParadigm
                ? <span>Coding: <span style={{ color: activeParadigm.color }}>{activeParadigm.label}</span></span>
                : 'Select a paradigm to start coding'}
            </p>
          </div>

          {/* Paradigm list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {paradigms.length === 0 && (
              <p className="text-mist/40 text-xs text-center py-6">No paradigms yet.<br />Add one below to start coding.</p>
            )}
            {paradigms.map(p => {
              const count = (p.observationIds || []).length
              const isActive = p.id === activeParadigmId
              return (
                <div key={p.id}>
                  <button
                    onClick={() => setActiveParadigmId(isActive ? null : p.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 group ${
                      isActive ? 'shadow-md' : 'hover:bg-flat/50'
                    }`}
                    style={{
                      background: isActive ? p.color + '20' : undefined,
                      border: isActive ? `1px solid ${p.color}55` : '1px solid transparent',
                    }}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className={`flex-1 text-sm font-medium truncate ${isActive ? 'text-ash' : 'text-ash/80'}`}
                      style={isActive ? { color: p.color } : {}}>
                      {p.label}
                    </span>
                    <span className="text-xs text-mist/50 flex-shrink-0">{count}</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteParadigm(p.id) }}
                      className="text-mist/20 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >×</button>
                  </button>

                  {/* Active paradigm detail */}
                  {isActive && (
                    <div className="mx-1 mt-1 mb-2 px-3 py-2.5 rounded-lg bg-flat/30 text-xs space-y-2">
                      {/* Editable note */}
                      {editingNote ? (
                        <textarea
                          autoFocus
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          onBlur={() => { setEditingNote(false); saveNote(p.id, noteDraft) }}
                          placeholder="Add an interpretive note…"
                          className="w-full bg-void/50 rounded p-1.5 text-ash text-xs resize-none focus:outline-none min-h-[60px]"
                        />
                      ) : (
                        <p
                          className="text-mist/70 italic cursor-pointer hover:text-mist transition-colors min-h-[20px]"
                          onClick={() => setEditingNote(true)}
                        >
                          {p.note || 'Add interpretive note…'}
                        </p>
                      )}
                      {count > 0 && (
                        <div className="flex gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded-full" style={{ background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8040' }}>
                            → {Object.values(p.observationRelations || {}).filter(r => r === 'elaboration' || !r).length} elaboration
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full" style={{ background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa40' }}>
                            ↕ {Object.values(p.observationRelations || {}).filter(r => r === 'antithesis').length} antithesis
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-flat">
                        <span className="text-mist/50">{count} coded</span>
                        {count > 0 && (
                          <button onClick={() => clearAllCodes(p.id)} className="text-red-400/60 hover:text-red-400 transition-colors text-[10px]">
                            clear all
                          </button>
                        )}
                      </div>
                      <p className="text-mist/30 text-[10px] italic">Click to code/uncode · E/A to set relation</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add paradigm */}
          <div className="p-3 border-t border-flat flex-shrink-0">
            {addingParadigm ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PARADIGM_COLORS[colorIndex % PARADIGM_COLORS.length] }} />
                  <input
                    autoFocus
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addParadigm(); if (e.key === 'Escape') { setAddingParadigm(false); setNewLabel('') } }}
                    placeholder="Paradigm name…"
                    className="flex-1 bg-flat border border-flat rounded px-2 py-1.5 text-ash text-xs focus:outline-none"
                    style={{ borderColor: PARADIGM_COLORS[colorIndex % PARADIGM_COLORS.length] + '55' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={addParadigm} className="text-xs px-3 py-1 rounded-lg font-semibold text-void transition-colors"
                    style={{ backgroundColor: PARADIGM_COLORS[colorIndex % PARADIGM_COLORS.length] }}>
                    Add
                  </button>
                  <button onClick={() => { setAddingParadigm(false); setNewLabel('') }} className="text-mist text-xs hover:text-ash">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingParadigm(true)}
                className="w-full border border-dashed border-violet/30 hover:border-violet text-violet/60 hover:text-violet rounded-lg py-2 text-xs transition-colors"
              >
                + Add Paradigm
              </button>
            )}
          </div>
        </aside>

        {/* Main: observation cards */}
        <main className="flex-1 overflow-auto p-5">
          {/* Filter + instructions */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {activeParadigm && (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium"
                style={{ borderColor: activeParadigm.color + '66', color: activeParadigm.color, background: activeParadigm.color + '12' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeParadigm.color }} />
                Coding: {activeParadigm.label}
                <button onClick={() => setActiveParadigmId(null)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">×</button>
              </div>
            )}
            <select
              value={filterTrack}
              onChange={e => setFilterTrack(e.target.value)}
              className="bg-flat border border-flat rounded px-2 py-1.5 text-ash text-xs focus:outline-none ml-auto"
            >
              <option value="all">All tracks</option>
              {tracks.filter(t => t.visible).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {filteredObs.length === 0 && (
            <div className="text-center py-20">
              <p className="font-display text-xl text-mist mb-2">No observations yet</p>
              <Link to={`/map/${id}`} className="text-gold text-sm hover:underline">← Go to Stage 1 to add observations</Link>
            </div>
          )}

          {/* Observation grid */}
          <div className="columns-2 xl:columns-3 gap-3 space-y-3">
            {filteredObs.map(obs => {
              const track = trackMap[obs.trackId]
              const applied = getAppliedParadigms(obs.id)
              return (
                <div key={obs.id} className="break-inside-avoid mb-3">
                  <ObsCard
                    obs={obs}
                    trackLabel={track?.label}
                    trackColor={track?.color}
                    markerLabel={obs.timeMarkerId ? markerMap[obs.timeMarkerId] : 'General note'}
                    appliedParadigms={applied}
                    activeParadigm={activeParadigm}
                    spotlightParadigmId={activeParadigmId}
                    onToggleCode={toggleCode}
                    onSetRelation={setRelation}
                  />
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
