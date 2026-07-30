import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createNewMap } from '../utils/defaults.js'
import { saveMap, loadAllMaps, deleteMap } from '../utils/storage.js'

function formatDateAU(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function Home() {
  const navigate = useNavigate()
  const [maps, setMaps] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')

  useEffect(() => {
    setMaps(loadAllMaps())
  }, [])

  function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    const map = createNewMap(title.trim(), date, venue)
    saveMap(map)
    navigate(`/map/${map.id}`)
  }

  function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this map? This cannot be undone.')) return
    deleteMap(id)
    setMaps(loadAllMaps())
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Header */}
      <header className="border-b border-flat px-8 py-6">
        <h1 className="font-display text-3xl text-gold">Performance Analysis Tool</h1>
        <p className="text-mist text-sm mt-1">Based on Gay McAuley's Performance Analysis Schema</p>
      </header>

      <main className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full">
        {/* Intro */}
        <div className="mb-10 grid grid-cols-2 gap-4">
          <div className="bg-wing border border-flat rounded-xl p-5">
            <div className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">Stage 1</div>
            <h2 className="font-display text-lg text-ash mb-2">Multi-Track Map</h2>
            <p className="text-mist text-sm leading-relaxed">
              Document what's happening across all performance elements — space, light, sound, movement, costume — as the performance unfolds on a shared timeline.
            </p>
          </div>
          <div className="bg-wing border border-flat rounded-xl p-5">
            <div className="text-[#22d3ee] text-xs font-semibold uppercase tracking-widest mb-2">Stage 2</div>
            <h2 className="font-display text-lg text-ash mb-2">Narrative & Segmentation</h2>
            <p className="text-mist text-sm leading-relaxed">
              Analyse the narrative content and performance segmentation — what story is told, how the performance is divided into segments, how those segments are signalled, and what kind of performativity is at work.
            </p>
          </div>
          <div className="bg-wing border border-flat rounded-xl p-5">
            <div className="text-violet text-xs font-semibold uppercase tracking-widest mb-2">Stage 3</div>
            <h2 className="font-display text-lg text-ash mb-2">Performance Paradigms</h2>
            <p className="text-mist text-sm leading-relaxed">
              Pull observations from the map and code them into interpretive clusters — the paradigms of special significance that form the evidence base for your analytical argument.
            </p>
          </div>
          <div className="bg-wing border border-flat rounded-xl p-5">
            <div className="text-[#f472b6] text-xs font-semibold uppercase tracking-widest mb-2">Stage 4</div>
            <h2 className="font-display text-lg text-ash mb-2">Global Statement</h2>
            <p className="text-mist text-sm leading-relaxed">
              Articulate what the performance seems to be saying — drawing on your paradigm analysis to elaborate the meanings conveyed, and noting how the analytical process may have modified, deepened, or subverted your initial impressions.
            </p>
          </div>
        </div>

        {/* New Map */}
        <div className="mb-8">
          {!showNew ? (
            <button
              onClick={() => setShowNew(true)}
              className="bg-gold text-void font-semibold px-6 py-3 rounded-lg hover:bg-gold-dim transition-colors font-display text-lg"
            >
              + New Performance Map
            </button>
          ) : (
            <form onSubmit={handleCreate} className="bg-wing border border-flat rounded-xl p-6 max-w-lg">
              <h3 className="font-display text-xl text-ash mb-4">New Performance Map</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-mist text-xs uppercase tracking-wider block mb-1">Performance Title *</label>
                  <input
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. The Tempest — Melbourne Theatre Company"
                    className="w-full bg-flat border border-flat rounded-lg px-3 py-2 text-ash placeholder-mist/50 focus:border-gold transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-mist text-xs uppercase tracking-wider block mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-flat border border-flat rounded-lg px-3 py-2 text-ash focus:border-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-mist text-xs uppercase tracking-wider block mb-1">Venue</label>
                    <input
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      placeholder="e.g. Southbank Theatre"
                      className="w-full bg-flat border border-flat rounded-lg px-3 py-2 text-ash placeholder-mist/50 focus:border-gold transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  type="submit"
                  className="bg-gold text-void font-semibold px-5 py-2 rounded-lg hover:bg-gold-dim transition-colors"
                >
                  Create Map
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="text-mist hover:text-ash px-5 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Recent Maps */}
        {maps.length > 0 && (
          <div>
            <h2 className="font-display text-xl text-ash mb-4">Your Maps</h2>
            <div className="space-y-2">
              {maps.map(map => (
                <div
                  key={map.id}
                  onClick={() => navigate(`/map/${map.id}`)}
                  className="bg-wing border border-flat rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-gold/50 transition-colors group"
                >
                  <div>
                    <div className="text-ash font-medium group-hover:text-gold transition-colors">{map.title}</div>
                    <div className="text-mist text-xs mt-0.5">
                      {map.venue && <span>{map.venue} · </span>}
                      {map.date && <span>{formatDateAU(map.date)} · </span>}
                      <span>{Object.keys(map.observations || {}).length} observations</span>
                      {map.paradigms?.length > 0 && <span> · {map.paradigms.length} paradigms</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(map.id, e)}
                    className="text-mist/40 hover:text-red-400 transition-colors text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
