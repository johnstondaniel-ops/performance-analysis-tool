import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { loadMap, saveMap } from '../utils/storage.js'
import { exportMapAsPDF, exportMapAsImage } from '../utils/export.js'

const STAGE_COLOR = '#f472b6'

function formatDateAU(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function StatementView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [impressionDraft, setImpressionDraft] = useState('')
  const [statementDraft, setStatementDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const m = loadMap(id)
    if (!m) { navigate('/'); return }
    setMap(m)
    setImpressionDraft(m.originalImpression || '')
    setStatementDraft(m.globalStatement || '')
  }, [id])

  const persist = useCallback((updated) => setMap(saveMap(updated)), [])

  function saveField(field, value) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
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

  const EXPORT_ID = 'statement-export-canvas'

  async function handleExport(type) {
    setExporting(true)
    setShowExport(false)
    await new Promise(r => setTimeout(r, 120))
    const slug = map.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40) + '-global-statement'
    if (type === 'pdf') await exportMapAsPDF(EXPORT_ID, slug)
    else await exportMapAsImage(EXPORT_ID, slug)
    setExporting(false)
  }

  if (!map) return null

  const paradigms = map.paradigms || []

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Hidden export canvas */}
      <div id={EXPORT_ID} style={{ position: 'absolute', left: '-99999px', top: 0, width: '1200px', background: '#faf8f4', padding: '48px', fontFamily: 'Georgia, serif' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', color: '#1a1620', marginBottom: '8px' }}>{map.title} — Global Statement</h1>
        <p style={{ color: '#999', fontSize: '12px', marginBottom: '40px', fontFamily: 'Inter, sans-serif' }}>
          {[map.venue, map.date ? formatDateAU(map.date) : ''].filter(Boolean).join(' · ')}
        </p>
        {map.originalImpression && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>Initial Impression</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.8, fontStyle: 'italic', margin: 0 }}>{map.originalImpression}</p>
          </div>
        )}
        {map.globalStatement && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>Global Statement</div>
            <p style={{ fontSize: '14px', color: '#1a1620', lineHeight: 1.9, margin: 0 }}>{map.globalStatement}</p>
          </div>
        )}
        {paradigms.length > 0 && (
          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e0ddd8' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>Paradigms</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {paradigms.map(p => (
                <span key={p.id} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '999px', background: p.color + '20', color: p.color, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}
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
            <Link to={`/map/${id}/structure`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 2</Link>
            <Link to={`/map/${id}/paradigms`} className="px-3 py-1.5 text-mist hover:text-ash transition-colors">Stage 3</Link>
            <span className="px-3 py-1.5 rounded-md font-semibold text-void" style={{ backgroundColor: STAGE_COLOR }}>Stage 4</span>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left: paradigm reference panel */}
        <aside className="w-64 border-r border-flat bg-stage flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-flat flex-shrink-0">
            <h2 className="font-display text-base text-ash">Paradigms</h2>
            <p className="text-mist text-xs mt-0.5">From Stage 3 — your evidence base</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {paradigms.length === 0 && (
              <p className="text-mist/40 text-xs text-center py-6 italic">No paradigms coded yet.<br />Complete Stage 3 first.</p>
            )}
            {paradigms.map(p => {
              const count = (p.observationIds || []).length
              const eCount = Object.values(p.observationRelations || {}).filter(r => r !== 'antithesis').length
              const aCount = Object.values(p.observationRelations || {}).filter(r => r === 'antithesis').length
              return (
                <div key={p.id} className="rounded-xl p-3" style={{ background: p.color + '12', border: `1px solid ${p.color}33` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-medium" style={{ color: p.color }}>{p.label}</span>
                    <span className="text-mist/40 text-[10px] ml-auto">{count}</span>
                  </div>
                  {p.note && <p className="text-mist/60 text-[11px] italic leading-relaxed mb-1.5">{p.note}</p>}
                  {count > 0 && (
                    <div className="flex gap-2 text-[10px]">
                      {eCount > 0 && <span style={{ color: '#4ade80' }}>→{eCount} elaboration</span>}
                      {aCount > 0 && <span style={{ color: '#a78bfa' }}>↕{aCount} antithesis</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {map.narrativeOverview && (
            <div className="border-t border-flat p-3 flex-shrink-0">
              <div className="text-mist text-[10px] uppercase tracking-widest mb-1.5">Narrative Overview</div>
              <p className="text-mist/60 text-[11px] italic leading-relaxed">{map.narrativeOverview}</p>
            </div>
          )}
        </aside>

        {/* Right: writing area */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl">
            <div className="mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: STAGE_COLOR }}>Stage 4</span>
            </div>
            <h2 className="font-display text-3xl text-ash mb-2">Global Statement</h2>
            <p className="text-mist/60 text-sm leading-relaxed mb-8 italic">
              "The final stage is concerned with elaborating what the analyst considers the performance to be saying… it is preferable to work through the detail of the material signifiers… and to hold back from attributing meaning until one has worked systematically through the process." — Gay McAuley
            </p>

            <div className="space-y-8">
              <div>
                <label className="text-mist text-[10px] uppercase tracking-widest block mb-1">Initial Impression <span className="normal-case text-mist/40 tracking-normal ml-1">— optional</span></label>
                <p className="text-mist/40 text-[11px] italic mb-2">Before you began the analytical process, what did you think the performance was saying? Record this to compare with your conclusions after analysis.</p>
                <textarea
                  value={impressionDraft}
                  onChange={e => { setImpressionDraft(e.target.value); saveField('originalImpression', e.target.value) }}
                  onBlur={() => { setMap(c => { const u = { ...c, originalImpression: impressionDraft }; saveMap(u); return u }) }}
                  placeholder="What meanings did you perceive coming out of the performance?"
                  className="w-full bg-flat/50 border border-flat rounded-xl p-4 text-ash text-sm resize-none focus:outline-none leading-relaxed placeholder-mist/25 min-h-[100px] transition-colors"
                  style={{ '--tw-border-opacity': 1 }}
                  onFocus={e => e.target.style.borderColor = STAGE_COLOR + '44'}
                  onBlurCapture={e => e.target.style.borderColor = ''}
                />
              </div>

              <div>
                <label className="text-mist text-[10px] uppercase tracking-widest block mb-1">Global Statement</label>
                <p className="text-mist/40 text-[11px] italic mb-2">
                  What does this performance seem to be saying? Drawing on your paradigm analysis, articulate the meanings you consider the performance to be conveying — and note how the analytical process has modified, deepened, or complicated what you originally perceived. Consider where meanings have been subverted by other factors in the staging.
                </p>
                <textarea
                  value={statementDraft}
                  onChange={e => { setStatementDraft(e.target.value); saveField('globalStatement', e.target.value) }}
                  onBlur={() => { setMap(c => { const u = { ...c, globalStatement: statementDraft }; saveMap(u); return u }) }}
                  placeholder="What is this performance saying?"
                  className="w-full bg-flat/50 border border-flat rounded-xl p-4 text-ash text-sm resize-none focus:outline-none leading-relaxed placeholder-mist/25 min-h-[280px] transition-colors"
                  onFocus={e => e.target.style.borderColor = STAGE_COLOR + '44'}
                  onBlurCapture={e => e.target.style.borderColor = ''}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
