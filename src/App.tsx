import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Nav } from './components/Nav'
import Landing from './pages/Landing'
import { NotFound } from './pages/NotFound'

const EngineLesson = lazy(() => import('./pages/lessons/EngineLesson'))
const HoodLesson = lazy(() => import('./pages/lessons/HoodLesson'))
const TiresLesson = lazy(() => import('./pages/lessons/TiresLesson'))
const BrakesLesson = lazy(() => import('./pages/lessons/BrakesLesson'))
const DashboardLesson = lazy(() => import('./pages/lessons/DashboardLesson'))
const FlatTireLesson = lazy(() => import('./pages/lessons/FlatTireLesson'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }))
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <Suspense fallback={<div className="route-loading" aria-live="polite">Warming up…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn/engine" element={<EngineLesson />} />
          <Route path="/learn/under-the-hood" element={<HoodLesson />} />
          <Route path="/learn/tires" element={<TiresLesson />} />
          <Route path="/learn/brakes" element={<BrakesLesson />} />
          <Route path="/learn/dashboard" element={<DashboardLesson />} />
          <Route path="/learn/flat-tire" element={<FlatTireLesson />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
