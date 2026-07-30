import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { loadMap, saveMap } from '../utils/storage.js'
import { exportMapAsPDF, exportMapAsImage } from '../utils/export.js'

function formatDateAU(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function hasNotes(note) {
  return !!(note?.content || note?.signalling || note?.performativity)
}

function SegmentDetail({ marker, markerIndex, note, paradigmsInSegment, prevMarker, nextMarker, observations, tracks, onUpdate, onUpdateDebounced, onNavigate }) {
  const [contentDraft, setContentDraft] = useState(note?.content || '')
  const [signallingDraft, setSignallingDraft] = useState(note?.signalling || '')
  const [performativityDraft, setPerformativityDraft] = useState(note?.performativity || '')

  useEffect(() => {
    setContentDraft(note?.content || '')
    setSignallingDraft(note?.signalling || '')
    setPerformativityDraft(note?.performativity || '')
  }, [marker.id])

  const segmentObs = Object.values(observations).filter(o => o.timeMarkerId === marker.id)

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-mist/40 text-[10px] uppercase tracking-widest mb-1">Segment {markerIndex + 1}</div>
          <h2 className="font-display text-2xl text-ash">{marker.label}</h2>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <button onClick={() => prevMarker && onNavigate(prevMarker.id)} disabled={!prevMarker}
            className="px-2 py-1.5 text-xs text-mist hover:text-ash disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-flat rounded">
            ← Prev
          </button>
          <button onClick={() => nextMarker && onNavigate(nextMarker.id)} disabled={!nextMarker}
            className="px-2 py-1.5 text-xs text-mist hover:text-ash disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-flat rounded">
            Next →
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-mist text-[10px] uppercase tracking-widest block mb-1">Content & Principal Action</label>
          <p className="text-mist/40 text-[11px] italic mb-2">What happens in this segment? What story is told, or what sequence of actions/events unfolds?</p>
          <textarea
            value={contentDraft}
            onChange={e => { setContentDraft(e.target.value); onUpdateDebounced(marker.id, 'content', e.target.value) }}
            onBlur={() => onUpdate(marker.id, 'content', contentDraft)}
            className="w-full bg-flat/50 border border-flat rounded-xl p-3 text-ash text-sm resize-none focus:outline-none focus:border-gold/30 leading-relaxed placeholder-mist/25 min-h-[100px] transition-colors"
            placeholder="Describe what happens…"
          />
        </div>

        <div>
          <label className="text-mist text-[10px] uppercase tracking-widest block mb-1">How is it Signalled?</label>
          <p className="text-mist/40 text-[11px] italic mb-2">How is this segment marked or delimited? What means does the performance use — shifts in actorial presence, lighting, curtain, set or decor changes, music, sound, etc.? Is the segmentation clearly signalled?</p>
          <textarea
            value={signallingDraft}
            onChange={e => { setSignallingDraft(e.target.value); onUpdateDebounced(marker.id, 'signalling', e.target.value) }}
            onBlur={() => onUpdate(marker.id, 'signalling', signallingDraft)}
            className="w-full bg-flat/50 border border-flat rounded-xl p-3 text-ash text-sm resize-none focus:outline-none focus:border-gold/30 leading-relaxed placeholder-mist/25 min-h-[80px] transition-colors"
            placeholder="Describe how the segment is signalled…"
          />
        </div>

        <div>
          <label className="text-mist text-[10px] uppercase tracking-widest block mb-1">Performativity</label>
          <p className="text-mist/40 text-[11px] italic mb-2">What kind of performativity is involved? Is the action enacted or narrated? What is the dominant performance register in this segment?</p>
          <textarea
            value={performativityDraft}
            onChange={e => { setPerformativityDraft(e.target.value); onUpdateDebounced(marker.id, 'performativity', e.target.value) }}
            onBlur={() => onUpdate(marker.id, 'performativity', performativityDraft)}
            className="w-full bg-flat/50 border border-flat rounded-xl p-3 text-ash text-sm resize-none focus:outline-none focus:border-gold/30 leading-relaxed placeholder-mist/25 min-h-[80px] transition-colors"
            placeholder="e.g. enacted, narrated, presentational…"
          />
        </div>

        {paradigmsInSegment.length > 0 && (
          <div>
            <label className="text-mist text-[10px] uppercase tracking-widest block mb-2">Paradigms Active in This Segment</label>
            <div className="flex flex-wrap gap-2">
              {paradigmsInSegment.map(({ paradigm, elaborationCount, antithesisCount }) => (
                <div key={paradigm.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
                  style={{ backgroundColor: paradigm.color + '18', borderColor: paradigm.color + '44', color: paradigm.color }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: paradigm.color }} />
                  <span>{paradigm.label}</span>
                  {elaborationCount > 0 && <span style={{ color: '#4ade80' }}>→{elaborationCount}</span>}
                  {antithesisCount > 0 && <span style={{ color: '#a78bfa' }}>↕{antithesisCount}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {segmentObs.length > 0 && (
          <div>
            <label className="text-mist text-[10px] uppercase tracking-widest block mb-2">Observations from Stage 1</label>
            <div className="space-y-2">
              {segmentObs.map(obs => {
                const track = tracks.find(t => t.id === obs.trackId)
                return (
                  <div key={obs.id} className="rounded-lg p-3 text-xs text-ash/80 leading-relaxed"
                    style={{ borderLeft: `3px solid ${track?.color || '#2a2a40'}`, backgroundColor: (track?.color || '#2a2a40') + '0a' }}>
                    <div className="text-[10px] mb-1" style={{ color: track?.color || '#8888aa' }}>{track?.label || 'Unknown track'}</div>
                    {obs.content}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StructureView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [selectedMarkerId, setSelectedMarkerId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [narrativeOverviewDraft, setNarrativeOverviewDraft] = useState('')
  const [segmentationAnalysisDraft, setSegmentationAnalysisDraft] = useState('')
  const timerRef = useRef(null)
  const overallTimerRef = useRef(null)

  useEffect(() => {
    const m = loadMap(id)
    if (!m) { navigate('/'); return }
    setMap(m)
    setNarrativeOverviewDraft(m.narrativeOverview || '')
    setSegmentationAnalysisDraft(m.segmentationAnalysis || '')
    if (m.timeMarkers?.length > 0) setSelectedMarkerId(m.timeMarkers[0].id)
  }, [id])

  const persist = useCallback((updated) => setMap(saveMap(updated)), [])

  function updateSegmentNote(markerId, field, value) {
    setMap(current => {
      const segmentNotes = { ...(current.segmentNotes || {}) }
      segmentNotes[markerId] = { ...(segmentNotes[markerId] || {}), [field]: value }
      const updated = { ...current, segmentNotes }
      saveMap(updated)
      return updated
    })
  }

  function updateSegmentNoteDebounced(markerId, field, value) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => updateSegmentNote(markerId, field, value), 500)
  }

  function updateOverallField(field, value) {
    clearTimeout(overallTimerRef.current)
    overallTimerRef.current = setTimeout(() => {
      setMap(current => {
        const updated = { ...current, [field]: value }
        saveMap(updated)
        return updated
      })
    }, 500)
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const EXPORT_ID = 'structure-export-canvas'

  async function handleExport(type) {
    setExporting(true)
    setShowExport(false)
    await new Promise(r => setTimeout(r, 120))
    const slug = map.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40) + '-narrative-structure'
    if (type === 'pdf') await exportMapAsPDF(EXPORT_ID, slug)
    else await exportMapAsImage(EXPORT_ID, slug)
    setExporting(false)
  }

  if (!map) return null

  const timeMarkers = map.timeMarkers || []
  const segmentNotes = map.segmentNotes || {}
  const paradigms = map.paradigms || []
  const observations = map.observations || {}
  const tracks = map.tracks || []

  const selectedMarker = timeMarkers.find(m => m.id === selectedMarkerId) || null
  const selectedIndex = timeMarkers.findIndex(m => m.id === selectedMarkerId)
  const prevMarker = selectedIndex > 0 ? timeMarkers[selectedIndex - 1] : null
  const nextMarker = selectedIndex < timeMarkers.length - 1 ? timeMarkers[selectedIndex + 1] : null

  function getParadigmsInSegment(markerId) {
    return paradigms.map(paradigm => {
      const segObs = (paradigm.observationIds || []).filter(oid => {
        const obs = Object.values(observations).find(o => o.id === oid)
        return obs?.timeMarkerId === markerId
      })
      if (segObs.length === 0) return null
      const relations = paradigm.observationRelations || {}
      const elaborationCount = segObs.filter(oid => !relations[oid] || relations[oid] === 'elaboration').length
      const antithesisCount = segObs.filter(oid => relations[oid] === 'antithesis').length
      return { paradigm, elaborationCount, antithesisCount }
    }).filter(Boolean)
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Hidden export canvas */}
      <div id={EXPORT_ID} style={{ position: 'absolute', left: '-99999px', top: 0, width: '1400px', background: '#faf8f4', padding: '48px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', color: '#1a1620', marginBottom: '8px' }}>{map.title} — Narrative & Segmentation</h1>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: '32px', fontFamily: 'Inter, sans-serif' }}>
          {[map.venue, map.date ? formatDateAU(map.date) : ''].filter(Boolean).join(' · ')}
        </p>
        {(map.narrativeOverview || map.segmentationAnalysis) && (
          <div style={{ marginBottom: '40px', padding: '20px 24px', background: '#f0ede8', borderRadius: '8px' }}>
            {map.narrativeOverview && (
              <div style={{ marginBottom: map.segmentationAnalysis ? '16px' : 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: '6px', fontFamily: 'Inter, sans-serif' }}>Narrative Overview</div>
                <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, margin: 0 }}>{map.narrativeOverview}</p>
              </div>
            )}
            {map.segmentationAnalysis && (
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: '6px', fontFamily: 'Inter, sans-serif' }}>Segmentation & Structure</div>
                <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, margin: 0 }}>{map.segmentationAnalysis}</p>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '32px' }}>
          {timeMarkers.map(m => {
            const annotated = hasNotes(segmentNotes[m.id])
            return (
              <div key={m.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', height: '28px', backgroundColor: annotated ? '#e8c54766' : '#22223a', borderRadius: '2px' }} />
                <div style={{ fontSize: '9px', color: '#888', fontFamily: 'Inter, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{m.label}</div>
              </div>
            )
          })}
        </div>
        {timeMarkers.map((m, i) => {
          const note = segmentNotes[m.id] || {}
          const inSegment = getParadigmsInSegment(m.id)
          if (!note.content && !note.signalling && !note.performativity && inSegment.length === 0) return null
          return (
            <div key={m.id} style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #e0ddd8' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#1a1620', marginBottom: '12px' }}>Segment {i + 1}: {m.label}</div>
              {note.content && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', fontFamily: 'Inter, sans-serif', marginBottom: '3px' }}>Content & Action</div>
                  <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, margin: 0 }}>{note.content}</p>
                </div>
              )}
              {note.signalling && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', fontFamily: 'Inter, sans-serif', marginBottom: '3px' }}>Signalling</div>
                  <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, margin: 0 }}>{note.signalling}</p>
                </div>
              )}
              {note.performativity && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', fontFamily: 'Inter, sans-serif', marginBottom: '3px' }}>Performativity</div>
                  <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.7, margin: 0 }}>{note.performativity}</p>
                </div>
              )}
              {inSegment.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {inSegment.map(({ paradigm, elaborationCount, antithesisCount }) => (
                    <span key={paradigm.id} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', backgroundColor: paradigm.color + '20', color: paradigm.color, fontFamily: 'Inter, sans-serif' }}>
                      {paradigm.label}{elaborationCount > 0 ? ` →${elaborationCount}` : ''}{antithesisCount > 0 ? ` ↕${antithesisCount}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Header */}
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
            <span className="px-3 py-1.5 bg-gold text-void rounded-md font-semibold">Stage 2</span>
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

      {timeMarkers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl text-mist mb-3">No segments yet</h2>
            <p className="text-mist/50 text-sm mb-6 max-w-xs mx-auto">Add scenes or moments in Stage 1 to begin your narrative and segmentation analysis here.</p>
            <Link to={`/map/${id}`} className="border border-gold/50 text-gold hover:bg-gold/10 px-5 py-2.5 rounded-lg text-sm transition-colors font-medium">
              ← Go to Stage 1: Map
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Arc bar */}
          <div className="border-b border-flat bg-stage px-6 py-3">
            <div className="flex gap-0.5">
              {timeMarkers.map(m => {
                const annotated = hasNotes(segmentNotes[m.id])
                const isSelected = m.id === selectedMarkerId
                return (
                  <div key={m.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedMarkerId(m.id)}
                      title={m.label}
                      className="w-full h-8 rounded-sm transition-all"
                      style={{
                        backgroundColor: annotated ? '#e8c54766' : '#22223a',
                        outline: isSelected ? `2px solid ${annotated ? '#e8c547' : '#e2e2e8'}` : 'none',
                        outlineOffset: '1px',
                        opacity: isSelected ? 1 : 0.75,
                      }}
                    />
                    <div className="text-[9px] text-mist/50 truncate w-full text-center px-0.5">{m.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: segment list + overall notes */}
            <aside className="w-64 border-r border-flat bg-stage flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-flat flex-shrink-0">
                <h2 className="font-display text-base text-ash">Segments</h2>
                <p className="text-mist text-xs mt-0.5">{timeMarkers.length} segment{timeMarkers.length !== 1 ? 's' : ''} in sequence</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {timeMarkers.map((m, i) => {
                  const annotated = hasNotes(segmentNotes[m.id])
                  const isSelected = m.id === selectedMarkerId
                  const paradigmsHere = getParadigmsInSegment(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMarkerId(m.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1"
                      style={{
                        borderLeft: `3px solid ${annotated ? '#e8c547' : '#2a2a40'}`,
                        backgroundColor: isSelected ? '#22223a' : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-mist/40 text-[10px] flex-shrink-0">{i + 1}</span>
                          <span className="text-ash text-xs truncate">{m.label}</span>
                        </div>
                        {paradigmsHere.length > 0 && (
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {paradigmsHere.slice(0, 5).map(({ paradigm }) => (
                              <span key={paradigm.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: paradigm.color }} />
                            ))}
                            {paradigmsHere.length > 5 && <span className="text-[9px] text-mist/40">+{paradigmsHere.length - 5}</span>}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Overall analysis notes */}
              <div className="border-t border-flat p-3 flex-shrink-0 space-y-3">
                <div>
                  <div className="text-mist text-[10px] uppercase tracking-widest mb-1.5">Narrative Overview</div>
                  <textarea
                    value={narrativeOverviewDraft}
                    onChange={e => { setNarrativeOverviewDraft(e.target.value); updateOverallField('narrativeOverview', e.target.value) }}
                    onBlur={() => { setMap(c => { const u = { ...c, narrativeOverview: narrativeOverviewDraft }; saveMap(u); return u }) }}
                    placeholder="What story is presented, or what is the overall sequence of actions/events?"
                    className="w-full bg-flat/50 border border-flat rounded-lg p-2 text-ash text-[11px] resize-none focus:outline-none focus:border-gold/30 leading-relaxed placeholder-mist/25 min-h-[70px] transition-colors"
                  />
                </div>
                <div>
                  <div className="text-mist text-[10px] uppercase tracking-widest mb-1.5">Segmentation & Structure</div>
                  <textarea
                    value={segmentationAnalysisDraft}
                    onChange={e => { setSegmentationAnalysisDraft(e.target.value); updateOverallField('segmentationAnalysis', e.target.value) }}
                    onBlur={() => { setMap(c => { const u = { ...c, segmentationAnalysis: segmentationAnalysisDraft }; saveMap(u); return u }) }}
                    placeholder="What is the relationship between performance segmentation and narrative? How does the performance structure the narrative, and what are the implications?"
                    className="w-full bg-flat/50 border border-flat rounded-lg p-2 text-ash text-[11px] resize-none focus:outline-none focus:border-gold/30 leading-relaxed placeholder-mist/25 min-h-[70px] transition-colors"
                  />
                </div>
              </div>
            </aside>

            {/* Right: segment detail */}
            <main className="flex-1 overflow-auto p-6">
              {selectedMarker && (
                <SegmentDetail
                  marker={selectedMarker}
                  markerIndex={selectedIndex}
                  note={segmentNotes[selectedMarkerId] || {}}
                  paradigmsInSegment={getParadigmsInSegment(selectedMarkerId)}
                  prevMarker={prevMarker}
                  nextMarker={nextMarker}
                  observations={observations}
                  tracks={tracks}
                  onUpdate={updateSegmentNote}
                  onUpdateDebounced={updateSegmentNoteDebounced}
                  onNavigate={setSelectedMarkerId}
                />
              )}
            </main>
          </div>
        </>
      )}
    </div>
  )
}
