import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useStock } from '../context/StockContext'
import { formatDate } from '../lib/format'
import type { AppUser, MovementType } from '../types'

const movementTypes: MovementType[] = ['Réception', 'Vente', 'Perte', 'Casse', 'Retour']

export function Movements({ user }: { user: AppUser }) {
  const { products, movements, addMovement } = useStock()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tous les mouvements')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<MovementType>('Vente')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [supplier, setSupplier] = useState('')

  const filtered = useMemo(() => movements.filter((movement) => {
    const matchesText = `${movement.productName} ${movement.sku} ${movement.user} ${movement.note}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR'))
    return matchesText && (filter === 'Tous les mouvements' || movement.type === filter)
  }), [movements, query, filter])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const selected = products.find((product) => product.id === productId)
      if (!selected) throw new Error('Choisissez un produit.')
      await addMovement({ productId, type, quantity, note, ...(type === 'Réception' ? { supplier } : {}) }, user.name)
      setOpen(false); setQuantity(1); setNote(''); setSupplier('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible d’enregistrer le mouvement.')
    } finally { setSaving(false) }
  }

  return (
    <div className="content-stack">
      <section className="toolbar-card">
        <div className="search-field"><Search size={17} /><input placeholder="Rechercher par produit, référence…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <label className="select-inline"><SlidersHorizontal size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Tous les mouvements</option>{movementTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="button button-primary" onClick={() => { setProductId(products[0]?.id ?? ''); setOpen(true) }}><Plus size={17} /> Nouveau mouvement</button>
      </section>
      <div className="movement-summary">
        <div><span className="summary-icon entry"><ArrowDownToLine size={17} /></span><span>Entrées récentes</span><strong>{movements.filter((item) => item.type === 'Réception' || item.type === 'Retour').length}</strong></div>
        <div><span className="summary-icon exit"><ArrowUpFromLine size={17} /></span><span>Sorties récentes</span><strong>{movements.filter((item) => ['Vente', 'Perte', 'Casse'].includes(item.type)).length}</strong></div>
        <div><span className="summary-icon neutral">↗</span><span>Opérations affichées</span><strong>{filtered.length}</strong></div>
      </div>
      <section className="table-card">
        <div className="table-heading"><div><h2>Historique des mouvements</h2><span>Entrées, sorties et ajustements</span></div></div>
        <div className="desktop-table-wrap"><table className="data-table movement-table">
          <thead><tr><th>PRODUIT</th><th>TYPE</th><th>QUANTITÉ</th><th>DATE</th><th>UTILISATEUR</th><th>NOTE / FOURNISSEUR</th></tr></thead>
          <tbody>{filtered.map((movement) => {
            const positive = movement.type === 'Réception' || movement.type === 'Retour' || (movement.type === 'Ajustement d’inventaire' && movement.quantity > 0)
            return <tr key={movement.id}>
              <td><div className="movement-product"><strong>{movement.productName}</strong><small>{movement.sku}</small></div></td>
              <td><span className={`movement-type ${positive ? 'type-entry' : movement.type === 'Ajustement d’inventaire' ? 'type-adjust' : 'type-exit'}`}>{movement.type}</span></td>
              <td><strong className={positive ? 'positive-text' : ''}>{positive ? '+' : '−'}{Math.abs(movement.quantity)}</strong></td>
              <td>{formatDate(movement.date)}</td><td>{movement.user}</td><td className="note-cell">{movement.supplier || movement.note || '—'}</td>
            </tr>
          })}</tbody>
        </table></div>
        <div className="mobile-movement-list">{filtered.map((movement) => {
          const positive = movement.type === 'Réception' || movement.type === 'Retour' || (movement.type === 'Ajustement d’inventaire' && movement.quantity > 0)
          return <div className="mobile-movement-card" key={movement.id}><div className={`movement-sign ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}</div><div className="recent-copy"><strong>{movement.productName}</strong><small>{movement.type} · {formatDate(movement.date)}</small></div><b className={positive ? 'positive-text' : ''}>{positive ? '+' : '−'}{Math.abs(movement.quantity)}</b></div>
        })}</div>
        {filtered.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>Aucun mouvement trouvé</h3><p>Les opérations apparaîtront ici après leur enregistrement.</p></div>}
      </section>
      {open && <Modal title="Enregistrer un mouvement" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>Produit<select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choisir un produit…</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.quantity} en stock</option>)}</select></label>
          <label>Type de mouvement<select value={type} onChange={(event) => setType(event.target.value as MovementType)}>{movementTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Quantité<input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
          {type === 'Réception' && <label>Fournisseur<input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Nom du fournisseur" /></label>}
          <label>Note <span className="optional">(facultatif)</span><textarea rows={3} maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Précisions sur l’opération…" /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Confirmer le mouvement'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}
