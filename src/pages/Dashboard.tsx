import { useMemo } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Package, ShoppingBag, TriangleAlert } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStock } from '../context/StockContext'
import { formatDate, formatMoney } from '../lib/format'
import type { PageId } from '../components/Sidebar'

const outgoing = ['Vente', 'Perte', 'Casse']

export function Dashboard({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { products, movements } = useStock()
  const lowProducts = products.filter((product) => product.quantity <= product.alertThreshold)
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0)
  const chartData = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    const key = date.toLocaleDateString('fr-CA', { timeZone: 'Africa/Abidjan' })
    const amount = movements.filter((movement) => {
      return outgoing.includes(movement.type) && new Date(movement.date).toLocaleDateString('fr-CA', { timeZone: 'Africa/Abidjan' }) === key
    }).reduce((sum, movement) => sum + movement.quantity, 0)
    return { jour: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', ''), sorties: amount }
  }), [movements])
  const stats = [
    { title: 'Valeur du stock', value: formatMoney(stockValue), change: 'au prix d’achat', icon: CircleDollarSign, tone: 'blue' },
    { title: 'Produits référencés', value: `${products.length}`, change: 'dans votre catalogue', icon: Package, tone: 'violet' },
    { title: 'Unités en stock', value: products.reduce((sum, product) => sum + product.quantity, 0).toLocaleString('fr-FR'), change: 'toutes catégories', icon: Boxes, tone: 'green' },
    { title: 'À réapprovisionner', value: `${lowProducts.length}`, change: 'sous le seuil d’alerte', icon: TriangleAlert, tone: lowProducts.length ? 'orange' : 'green' }
  ]

  return (
    <div className="dashboard-grid">
      <section className="stat-grid">
        {stats.map(({ title, value, change, icon: Icon, tone }) => (
          <article className="stat-card" key={title}>
            <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
            <p>{title}</p><strong className="stat-value">{value}</strong><span className="stat-caption">{change}</span>
          </article>
        ))}
      </section>
      <section className="chart-card">
        <div className="section-heading"><div><h2>Sorties de stock</h2><p>Activité sur les 30 derniers jours</p></div><span className="chart-legend"><i /> Unités sorties</span></div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <defs><linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6486ff" stopOpacity={0.25} /><stop offset="95%" stopColor="#6486ff" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="jour" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }} />
              <Area type="monotone" dataKey="sorties" stroke="#718bff" strokeWidth={2.5} fill="url(#stockGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="quick-alert-card">
        <div className="section-heading"><div><h2>À surveiller</h2><p>Produits au seuil ou en rupture</p></div><button className="text-button" onClick={() => onNavigate('alerts')}>Tout voir <ArrowRight size={14} /></button></div>
        {lowProducts.length === 0 ? <div className="empty-mini"><span className="good-check">✓</span><p>Tous les stocks sont au beau fixe.</p></div> : (
          <div className="alert-preview-list">
            {lowProducts.slice(0, 4).map((product) => (
              <div className="alert-preview" key={product.id}>
                <div className={`product-dot ${product.quantity === 0 ? 'red' : 'orange'}`}><Package size={16} /></div>
                <div className="alert-product-copy"><strong>{product.name}</strong><small>{product.sku}</small></div>
                <div className={`stock-state ${product.quantity === 0 ? 'danger-text' : 'warning-text'}`}><b>{product.quantity}</b><small> unité{product.quantity > 1 ? 's' : ''}</small></div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="movements-card">
        <div className="section-heading"><div><h2>Activité récente</h2><p>Les dernières opérations enregistrées</p></div><button className="text-button" onClick={() => onNavigate('movements')}>Historique <ArrowRight size={14} /></button></div>
        <div className="recent-list">
          {movements.slice(0, 5).map((movement) => {
            const isEntry = movement.type === 'Réception' || movement.type === 'Retour'
            return <div className="recent-row" key={movement.id}>
              <div className={`movement-sign ${isEntry ? 'positive' : 'negative'}`}>{isEntry ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}</div>
              <div className="recent-copy"><strong>{movement.productName}</strong><small>{movement.type} · {movement.user}</small></div>
              <div className="recent-qty"><b className={isEntry ? 'positive-text' : ''}>{isEntry ? '+' : '−'}{Math.abs(movement.quantity)}</b><small>{formatDate(movement.date)}</small></div>
            </div>
          })}
          {movements.length === 0 && <div className="empty-mini"><ShoppingBag size={20} /><p>Aucun mouvement enregistré.</p></div>}
        </div>
      </section>
    </div>
  )
}
