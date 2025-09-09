import HeaderBar from '../components/HeaderBar'
import ProcurementDashboard from '../components/ProcurementDashboard'
import MarketIndicators from '../components/MarketIndicators'
import EquityMonitor from '../components/EquityMonitor'
import NewsIntelligence from '../components/NewsIntelligence'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar />
      <main className="max-w-7xl mx-auto p-4 space-y-8">
        <section className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">조달 Dashboard</h2>
          <ProcurementDashboard />
        </section>
        <section className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">시장 지표</h2>
          <MarketIndicators />
        </section>
        <section className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">주요 리테일러 주가</h2>
          <EquityMonitor />
        </section>
        <section className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">산업 뉴스</h2>
          <NewsIntelligence />
        </section>
      </main>
    </div>
  )
}
