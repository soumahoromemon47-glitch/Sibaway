import { ArrowRight, BellRing, Package, ShoppingCart } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { formatMoney } from '../lib/format'
import type { PageId } from '../components/Sidebar'

export function Alerts({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { products } = useStock()
  const critical = products.filter((product) => product.quantity === 0)
  const low = products.filter((product) => product.quantity > 0 && product.quantity <= product.alertThreshold)
  const items = [...critical, ...low]
  return (
    <div className="content-stack">
      <section className="alert-banner"><div className="alert-banner-icon"><BellRing size={20} /></div><div><strong>{items.length === 0 ? 'Tout est en ordre.' : `${items.length} produit${items.length > 1 ? 's' : ''} à surveiller`}</strong><p>{critical.length} en rupture · {low.length} sous le seuil d’alerte</p></div><button className="button button-secondary" onClick={() => onNavigate('movements')}><ShoppingCart size={16} /> Enregistrer une entrée</button></section>
      <section className="table-card">
        <div className="table-heading"><div><h2>Réapprovisionnement nécessaire</h2><span>Classement par niveau d’urgence</span></div><span className="alert-count-chip">{items.length} alerte{items.length > 1 ? 's' : ''}</span></div>
        {items.length > 0 ? <div className="alert-list">{items.map((product) => {
          const out = product.quantity === 0
          return <article className={`alert-product-card ${out ? 'critical' : ''}`} key={product.id}>
            <div className={`alert-product-icon ${out ? 'red' : 'orange'}`}><Package size={19} /></div>
            <div className="alert-product-detail"><strong>{product.name}</strong><small>{product.brand} · {product.sku} · {product.location || 'Emplacement non défini'}</small><span className={`movement-type ${out ? 'type-exit' : 'type-adjust'}`}>{out ? 'Rupture de stock' : 'Stock faible'}</span></div>
            <div className="alert-quantity"><strong className={out ? 'danger-text' : 'warning-text'}>{product.quantity}</strong><small>stock actuel</small></div>
            <div className="alert-quantity"><strong>{product.alertThreshold}</strong><small>seuil d’alerte</small></div>
            <div className="alert-price"><small>Valeur à réassortir</small><strong>{formatMoney(Math.max(0, product.alertThreshold - product.quantity) * product.purchasePrice)}</strong></div>
            <button className="text-button" onClick={() => onNavigate('movements')}>Réapprovisionner <ArrowRight size={14} /></button>
          </article>
        })}</div> : <div className="empty-state"><div className="empty-icon green-empty">✓</div><h3>Aucune alerte en cours</h3><p>Le niveau de stock de vos produits est suffisant.</p></div>}
      </section>
    </div>
  )
}
