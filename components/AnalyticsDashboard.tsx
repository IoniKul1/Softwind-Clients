interface Analytics {
  period: string
  uniqueVisitors: number
  totalPageviews: number
  bounceRate: string
  avgSession: string
  sources: { name: string; visits: number }[]
  pages: { path: string; views: number }[]
  geography: { country: string; visits: number }[]
  devices: { type: string; visits: number }[]
  updatedAt: string
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return String(n)
}

export default function AnalyticsDashboard({ data }: { data: Analytics }) {
  return (
    <div className="flex flex-col gap-6 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Analytics</h2>
        <span className="text-xs text-neutral-600">{data.period} · actualizado {data.updatedAt}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-1">Visitantes únicos</p>
          <p className="text-2xl font-semibold">{fmt(data.uniqueVisitors)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-1">Pageviews</p>
          <p className="text-2xl font-semibold">{fmt(data.totalPageviews)}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-1">Bounce rate</p>
          <p className="text-2xl font-semibold">{data.bounceRate}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-1">Sesión promedio</p>
          <p className="text-2xl font-semibold">{data.avgSession}</p>
        </div>
      </div>

      {/* Sources */}
      {data.sources?.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-3">Fuentes de tráfico</p>
          <div className="flex flex-col gap-2">
            {data.sources.map((s, i) => {
              const total = data.sources.reduce((a, b) => a + b.visits, 0)
              const pct = total ? Math.round((s.visits / total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300">{s.name}</span>
                    <span className="text-neutral-500">{fmt(s.visits)}</span>
                  </div>
                  <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pages */}
      {data.pages?.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
          <p className="text-xs text-neutral-500 mb-3">Páginas más visitadas</p>
          <div className="flex flex-col gap-2">
            {data.pages.map((p, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-neutral-300">{p.path}</span>
                <span className="text-neutral-500">{fmt(p.views)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geography + Devices */}
      <div className="grid grid-cols-2 gap-3">
        {data.geography?.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
            <p className="text-xs text-neutral-500 mb-3">Países</p>
            <div className="flex flex-col gap-1.5">
              {data.geography.map((g, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-neutral-300">{g.country}</span>
                  <span className="text-neutral-500">{fmt(g.visits)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.devices?.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4">
            <p className="text-xs text-neutral-500 mb-3">Dispositivos</p>
            <div className="flex flex-col gap-1.5">
              {data.devices.map((d, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-neutral-300">{d.type}</span>
                  <span className="text-neutral-500">{fmt(d.visits)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
