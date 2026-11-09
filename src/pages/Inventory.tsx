import { useMemo, useState } from 'react'
import { Check, ClipboardCheck, ClipboardList, Plus, Save } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useStock } from '../context/StockContext'
import { formatDate, today } from '../lib/format'
import type { AppUser, InventoryLine, InventorySession } from '../types'

export function Inventory({ user }: { user: AppUser }) {
  const { products, inventories, saveInventory, validateInventory } = useStock()
  const [active, setActive] = useState<InventorySession | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const openSession = useMemo(() => inventories.find((inventory) => inventory.status === 'En cours'), [inventories])
  const lines = active?.lines ?? openSession?.lines ?? []
  const filtered = lines.filter((line) => `${line.productName} ${line.sku}`.toLowerCase().includes(query.toLowerCase()))
  const differences = lines.filter((line) => line.counted !== line.expected).length
  const differenceCount = lines.reduce((sum, line) => sum + line.counted - line.expected, 0)

  const start = () => {
    const newSession: InventorySession = {
      id: crypto.randomUUID(),
      label: `INV-${new Date().toLocaleDateString('fr-FR').replaceAll('/', '')}-${String(inventories.length + 1).padStart(2, '0')}`,
      date: today(),
      status: 'En cours',
      lines: products.map((product) => ({ productId: product.id, productName: product.name, sku: product.sku, expected: product.quantity, counted: product.quantity }))
    }
    setActive(newSession)
    setError('')
  }
  const current = active ?? openSession
  const updateCount = (line: InventoryLine, counted: number) => {
    if (!current) return
    const next = { ...current, lines: current.lines.map((item) => item.productId === line.productId ? { ...item, counted } : item) }
    setActive(next)
  }
  const saveDraft = async () => {
    if (!current) return
    setSaving(true); setError('')
    try { await saveInventory(current); setActive(null) }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la session.') }
    finally { setSaving(false) }
  }
  const validate = async () => {
    if (!current) return
    setSaving(true); setError('')
    try { await validateInventory(current, user.name); setActive(null) }
    catch (validateError) { setError(validateError instanceof Error ? validateError.message : 'Impossible de valider l’inventaire.') }
    finally { setSaving(false) }
  }

  return (
    <div className="content-stack">
      {current ? <>
        <section className="inventory-progress-card"><div className="inventory-progress-icon"><ClipboardCheck size={22} /></div><div className="inventory-progress-copy"><strong>Session d’inventaire en cours</strong><small>{current.label ?? current.id} · Démarrée le {formatDate(current.date)}</small></div><div className="inventory-difference"><strong className={differences ? 'warning-text' : 'positive-text'}>{differences}</strong><small>écart{differences > 1 ? 's' : ''}</small></div><button className="button button-secondary" onClick={() => setActive(current)}><Save size={16} /> Enregistrer</button><button className="button button-primary" disabled={saving} onClick={() => void validate()}><Check size={17} /> {saving ? 'Validation…' : 'Valider l’inventaire'}</button></section>
        <section className="table-card">
          <div className="table-heading"><div><h2>Comptage des produits</h2><span>{lines.length} références · écart total : {differenceCount > 0 ? '+' : ''}{differenceCount}</span></div><input className="compact-search" placeholder="Rechercher…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="desktop-table-wrap"><table className="data-table">
            <thead><tr><th>PRODUIT</th><th>RÉFÉRENCE</th><th>STOCK THÉORIQUE</th><th>QUANTITÉ COMPTÉE</th><th>ÉCART</th></tr></thead>
            <tbody>{filtered.map((line) => {
              const difference = line.counted - line.expected
              return <tr key={line.productId}><td><strong>{line.productName}</strong></td><td>{line.sku}</td><td>{line.expected}</td><td><input aria-label={`Quantité comptée pour ${line.productName}`} className="count-input" min="0" type="number" value={line.counted} onChange={(event) => updateCount(line, Math.max(0, Number(event.target.value)))} /></td><td><strong className={difference === 0 ? 'muted' : difference > 0 ? 'positive-text' : 'danger-text'}>{difference > 0 ? '+' : ''}{difference}</strong></td></tr>
            })}</tbody>
          </table></div>
          <div className="mobile-count-list">{filtered.map((line) => {
            const difference = line.counted - line.expected
            return <div className="mobile-count-card" key={line.productId}><div className="recent-copy"><strong>{line.productName}</strong><small>{line.sku} · Théorique : {line.expected}</small></div><input aria-label={`Quantité comptée pour ${line.productName}`} className="count-input" min="0" type="number" value={line.counted} onChange={(event) => updateCount(line, Math.max(0, Number(event.target.value)))} /><b className={difference === 0 ? 'muted' : difference > 0 ? 'positive-text' : 'danger-text'}>{difference > 0 ? '+' : ''}{difference}</b></div>
          })}</div>
          {error && <p className="form-error section-error">{error}</p>}
        </section>
      </> : <section className="inventory-start-card"><div className="inventory-illustration"><ClipboardList size={28} /></div><h2>Un stock fiable commence par un bon comptage.</h2><p>Lancez une session pour comparer les quantités physiques à votre stock théorique. Les écarts seront ajustés automatiquement à la validation.</p><button className="button button-primary" onClick={start}><Plus size={17} /> Démarrer un inventaire</button><span>{products.length} produits à compter</span></section>}

      <section className="table-card">
        <div className="table-heading"><div><h2>Historique des inventaires</h2><span>Sessions réalisées et en cours</span></div></div>
        {inventories.length ? <div className="inventory-history">{inventories.map((inventory) => <div className="inventory-history-row" key={inventory.id}><div className={`history-icon ${inventory.status === 'Validé' ? 'completed' : ''}`}><ClipboardList size={17} /></div><div className="recent-copy"><strong>{inventory.label ?? inventory.id}</strong><small>{formatDate(inventory.date)} · {inventory.lines.length} produits comptés</small></div><span className={`status-pill ${inventory.status === 'Validé' ? 'status-ok' : 'status-warn'}`}>{inventory.status}</span><span className="history-diff">{inventory.lines.filter((line) => line.counted !== line.expected).length} écarts</span></div>)}</div> : <div className="empty-mini"><ClipboardList size={20} /><p>Aucun inventaire réalisé pour le moment.</p></div>}
      </section>
    </div>
  )
}
