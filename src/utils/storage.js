const MAPS_INDEX_KEY = 'pat_maps'

function mapsIndex() {
  try {
    return JSON.parse(localStorage.getItem(MAPS_INDEX_KEY) || '[]')
  } catch {
    return []
  }
}

function saveIndex(ids) {
  localStorage.setItem(MAPS_INDEX_KEY, JSON.stringify(ids))
}

export function saveMap(map) {
  const updated = { ...map, updatedAt: new Date().toISOString() }
  localStorage.setItem(`pat_map:${map.id}`, JSON.stringify(updated))
  const index = mapsIndex()
  if (!index.includes(map.id)) {
    saveIndex([map.id, ...index])
  }
  return updated
}

export function loadMap(id) {
  try {
    const raw = localStorage.getItem(`pat_map:${id}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadAllMaps() {
  return mapsIndex()
    .map(id => loadMap(id))
    .filter(Boolean)
}

export function deleteMap(id) {
  localStorage.removeItem(`pat_map:${id}`)
  saveIndex(mapsIndex().filter(i => i !== id))
}
