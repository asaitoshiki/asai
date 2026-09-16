import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './features/home/HomePage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { PhotoGalleryPage } from './features/photos/PhotoGalleryPage'
import { ExpensePage } from './features/expenses/ExpensePage'
import { OshiListPage } from './features/oshi/OshiListPage'
import { OshiDetailPage } from './features/oshi/OshiDetailPage'
import { PenlightPage } from './features/oshi/PenlightPage'
import { GoodsPage } from './features/goods/GoodsPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { PlacesPage } from './features/places/PlacesPage'
import { SettingsPage } from './features/settings/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/photos" element={<PhotoGalleryPage />} />
      <Route path="/expenses" element={<ExpensePage />} />
      <Route path="/oshi" element={<OshiListPage />} />
      <Route path="/oshi/:id" element={<OshiDetailPage />} />
      <Route path="/oshi/:id/penlight" element={<PenlightPage />} />
      <Route path="/goods" element={<GoodsPage />} />
      <Route path="/diary" element={<DiaryPage />} />
      <Route path="/places" element={<PlacesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
