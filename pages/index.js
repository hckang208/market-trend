import { useEffect, useState } from 'react'
import HeaderBar from '../components/HeaderBar'
import ProcurementDashboard from '../components/ProcurementDashboard'
import MarketIndicators from '../components/MarketIndicators'
import EquityMonitor from '../components/EquityMonitor'
import NewsIntelligence from '../components/NewsIntelligence'

export default function Home() {
  const [aiSummary, setAiSummary] = useState(null)

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/ai-summary', { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setAiSummary(data.summary || '')
        }
      } catch (err) {
        console.error('AI summary fetch error:', err)
      }
    }
    fetchSummary()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar />

      <main className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Procurement Dashboard */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">조달 Dashboard</h2>
          <ProcurementDashboard />
        </section>

        {/* Market Indicators */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">시장 지표</h2>
          <MarketIndicators />
        </section>

        {/* Equity Monitor */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">주요 리테일러 주가</h2>
          <EquityMonitor />
        </section>

        {/* News + AI Summary */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">산업 뉴스</h2>
          <NewsIntelligence />
          {aiSummary && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">AI 요약</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{aiSummary}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
