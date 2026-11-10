import { useMemo, useState } from 'react'
import { ArrowDownToLine, FileSpreadsheet, Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStock } from '../context/StockContext'
import { formatMoney } from '../lib/format'

const outgoing = ['Vente', 'Perte', 'Casse']
const colors = ['#718bff', '#9c7af6', '#37c5a1', '#f7a94b', '#ef718b', '#53b5df', '#b6c66b']
type Period = 'Jour' | 'Semaine' | 'Mois'

function exportCsv(name: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(';')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

export function Reports() {
  const { products, movements } = useStock()
  const [period, setPeriod] = useState<Period>('Semaine')
  const inventoryValue = products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0)
  const sales = movements.filter((movement) => movement.type === 'Vente')
  const exits = movements.filter((movement) => outgoing.includes(movement.type))
  const margin = sales.reduce((sum, movement) => {
    const product = products.find((item) => item.id === movement.productId)
    return sum + (product ? (product.sellingPrice - product.purchasePrice) * movement.quantity : 0)
  }, 0)
  const categoryData = products.reduce<{ name: string; value: number }[]>((data, product) => {
    const existing = data.find((item) => item.name === product.category)
    if (existing) existing.value += product.quantity * product.purchasePrice
    else data.push({ name: product.category, value: product.quantity * product.purchasePrice })
    return data
  }, []).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)

  const flowData = useMemo(() => {
    const groupCount = period === 'Jour' ? 7 : period === 'Semaine' ? 8 : 6
    return Array.from({ length: groupCount }, (_, index) => {
      const current = new Date()
      const amount = period === 'Jour' ? 1 : period === 'Semaine' ? 7 : 30
      const start = new Date(current); start.setDate(current.getDate() - (groupCount - 1 - index) * amount); start.setHours(0, 0, 0, 0)
      const end = new Date(start); end.setDate(start.getDate() + amount)
      const inPeriod = movements.filter((movement) => {
        const date = new Date(movement.date)
        return date >= start && date < end
      })
      return {
        label: period === 'Jour' ? start.toLocaleDateString('fr-FR', { weekday: 'short' }) : period === 'Mois' ? start.toLocaleDateString('fr-FR', { month: 'short' }) : `S${index + 1}`,
        entrées: inPeriod.filter((movement) => movement.type === 'Réception' || movement.type === 'Retour').reduce((sum, movement) => sum + Math.abs(movement.quantity), 0),
        sorties: inPeriod.filter((movement) => outgoing.includes(movement.type)).reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      }
    })
  }, [movements, period])

  const topProducts = products.map((product) => ({
    ...product,
    sold: exits.filter((movement) => movement.productId === product.id).reduce((sum, movement) => sum + movement.quantity, 0)
  })).sort((a, b) => b.sold - a.sold).slice(0, 5)

  const exportReport = () => exportCsv('sibaway-rapport-stock.csv', [
    ['Rapport Sibaway', new Date().toLocaleDateString('fr-FR')],
    ['Produit', 'Référence', 'Catégorie', 'Stock', 'Prix achat (FCFA)', 'Prix vente (FCFA)', 'Valeur stock (FCFA)'],
    ...products.map((product) => [product.name, product.sku, product.category, String(product.quantity), String(product.purchasePrice), String(product.sellingPrice), String(product.quantity * product.purchasePrice)])
  ])

  return (
    <div className="content-stack report-page">
      <div className="report-actions"><div className="period-switch">{(['Jour', 'Semaine', 'Mois'] as Period[]).map((value) => <button key={value} className={period === value ? 'selected' : ''} onClick={() => setPeriod(value)}>{value}</button>)}</div><div><button className="button button-secondary" onClick={() => window.print()}><Printer size={16} /> Exporter en PDF</button><button className="button button-primary" onClick={exportReport}><FileSpreadsheet size={16} /> Exporter Excel / CSV</button></div></div>
      <section className="report-kpis">
        <article><span>Valeur totale du stock</span><strong>{formatMoney(inventoryValue)}</strong><small>Évaluée au prix d’achat</small></article>
        <article><span>Références actives</span><strong>{products.length}</strong><small>{products.reduce((sum, product) => sum + product.quantity, 0)} unités en stock</small></article>
        <article><span>Marge estimée réalisée</span><strong className="positive-text">{formatMoney(margin)}</strong><small>Sur les ventes enregistrées</small></article>
        <article><span>Ventes comptabilisées</span><strong>{sales.reduce((sum, movement) => sum + movement.quantity, 0)} unités</strong><small>{sales.length} mouvements de vente</small></article>
      </section>
      <div className="reports-chart-grid">
        <section className="chart-card report-chart"><div className="section-heading"><div><h2>Flux de stock</h2><p>Entrées et sorties par {period.toLowerCase()}</p></div><span className="chart-legend dual"><i /> Entrées <i /> Sorties</span></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={flowData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }} />                    <Bar dataKey="entrées" fill="#42c99a" radius={[4, 4, 0, 0]} /><Bar dataKey="sorties" fill="#718bff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </section>
        <section className="chart-card category-chart"><div className="section-heading"><div><h2>Valeur par catégorie</h2><p>Répartition du stock au prix d’achat</p></div></div>
          <div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={4} stroke="none">{categoryData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }} /></PieChart></ResponsiveContainer><div className="pie-center"><small>Valeur totale</small><strong>{formatMoney(inventoryValue)}</strong></div></div>
          <div className="category-legend">{categoryData.map((item, index) => <div key={item.name}><i style={{ background: colors[index % colors.length] }} /><span>{item.name}</span><b>{inventoryValue ? Math.round(item.value / inventoryValue * 100) : 0}%</b></div>)}</div>
        </section>
      </div>
      <section className="table-card"><div className="table-heading"><div><h2>Produits les plus sortis</h2><span>Unités sorties (ventes, pertes et casse)</span></div><button className="text-button" onClick={exportReport}><ArrowDownToLine size={15} /> Télécharger les données</button></div>
        <div className="top-products-list">{topProducts.map((product, index) => <div className="top-product-row" key={product.id}><span className="rank">0{index + 1}</span><div className="recent-copy"><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></div><div className="sold-bar"><i style={{ width: `${topProducts[0]?.sold ? product.sold / topProducts[0].sold * 100 : 0}%` }} /></div><b>{product.sold} unité{product.sold > 1 ? 's' : ''}</b></div>)}</div>
      </section>
    </div>
  )
}
