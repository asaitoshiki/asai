import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Segmented'
import { clearAll, downloadBackup, estimateStorage, exportBackup, importBackup } from '../../db/backup'
import { insertSampleData } from '../../db/seed'
import { applyTheme, loadTheme, type ThemeSetting } from '../../lib/theme'

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'auto', label: '端末に合わせる' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
]

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export function SettingsPage() {
  const [theme, setTheme] = useState<ThemeSetting>(loadTheme)
  const [storage, setStorage] = useState<{ usage: number; quota: number }>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    estimateStorage().then(setStorage)
  }, [])

  const changeTheme = (value: ThemeSetting) => {
    setTheme(value)
    applyTheme(value)
  }

  const runExport = async () => {
    setBusy(true)
    try {
      downloadBackup(await exportBackup())
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (file: File) => {
    if (!confirm('いまのデータをすべて置き換えます。よろしいですか？')) return
    setBusy(true)
    try {
      await importBackup(file)
      alert('復元しました')
    } catch (error) {
      alert(error instanceof Error ? error.message : '読み込みに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="設定" back>
      <div className="space-y-6">
        <Section title="見た目">
          <Segmented options={THEME_OPTIONS} value={theme} onChange={changeTheme} />
        </Section>

        <Section
          title="バックアップ"
          description="データはこの端末の中だけに保存されています。機種変更や万一に備えて、ときどき書き出しておくと安心です。"
        >
          <div className="space-y-2">
            <Button variant="ghost" onClick={runExport} disabled={busy}>
              バックアップを書き出す
            </Button>
            <label className="block w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-sm font-bold">
              バックアップから復元
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) runImport(file)
                }}
              />
            </label>
          </div>
        </Section>

        <Section title="保存容量">
          {storage ? (
            <div className="card p-4">
              <p className="text-sm">
                {formatMB(storage.usage)} / {formatMB(storage.quota)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-chart-track">
                <div
                  className="h-full rounded-full bg-chart"
                  style={{ width: `${Math.min((storage.usage / storage.quota) * 100, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">このブラウザでは取得できません</p>
          )}
        </Section>

        <Section title="お試し" description="使い心地を見るためのサンプルデータを追加します。">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await insertSampleData()
                alert('サンプルデータを追加しました')
              } finally {
                setBusy(false)
              }
            }}
          >
            サンプルデータを入れる
          </Button>
        </Section>

        <Section title="データの削除">
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!confirm('すべてのデータを削除します。元に戻せません。よろしいですか？')) return
              await clearAll()
              alert('削除しました')
            }}
          >
            すべてのデータを削除
          </Button>
        </Section>

        <p className="pb-4 text-center text-xs text-muted">
          推し活ノート — 推し活の記録をこの端末だけに保存するアプリです
        </p>
      </div>
    </AppShell>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold">{title}</h2>
      {description && <p className="text-xs leading-relaxed text-muted">{description}</p>}
      {children}
    </section>
  )
}
