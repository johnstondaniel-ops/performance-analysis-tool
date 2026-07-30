import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import MapView from './pages/MapView.jsx'
import ParadigmView from './pages/ParadigmView.jsx'
import StructureView from './pages/StructureView.jsx'
import StatementView from './pages/StatementView.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map/:id" element={<MapView />} />
        <Route path="/map/:id/paradigms" element={<ParadigmView />} />
        <Route path="/map/:id/structure" element={<StructureView />} />
        <Route path="/map/:id/statement" element={<StatementView />} />
      </Routes>
    </HashRouter>
  )
}
