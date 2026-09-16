import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { applyTheme, loadTheme } from './lib/theme'
import './styles/index.css'

// 最初の描画前にテーマを当てて、白い画面が一瞬光るのを防ぐ
applyTheme(loadTheme())

// GitHub Pages のサブパス配信でも壊れないよう、ルーティングはハッシュで行う
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
