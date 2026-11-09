import { useMemo, useState } from 'react'
import { Filter, MoreHorizontal, PackagePlus, Plus, Search, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useStock } from '../context/StockContext'
import { formatMoney } from '../lib/format'
import type { AppUser, Product } from '../types'

const blankProduct = (): Product => ({
  id: crypto.randomUUID(), name: '', sku: '', category: '', brand: '',
  purchasePrice: 0, sellingPrice: 0, quantity: 0, alertThreshold: 2, location: ''
})

export function Products({ user }: { user: AppUser }) {
  const { products, categories, saveProduct, deleteProduct } = useStock()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes les catégories')
  const [stockFilter, setStockFilter] = useState('Tous les états')
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => products.filter((product) => {
    const textMatch = `${product.name} ${product.sku} ${product.brand}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR'))
    const categoryMatch = category === 'Toutes les catégories' || product.category === category
    const stockMatch = stockFilter === 'Tous les états' || (stockFilter === 'Rupture' ? product.quantity === 0 : stockFilter === 'Stock faible' ? product.quantity > 0 && product.quantity <= product.alertThreshold : product.quantity > product.alertThreshold)
    return textMatch && categoryMatch && stockMatch
  }), [products, query, category, stockFilter])

  const openNew = () => { setEditing(blankProduct()); setFormError(''); setShowForm(true) }
  const openEdit = (product: Product) => { setEditing({ ...product }); setFormError(''); setShowForm(true) }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    if (products.some((product) => product.sku.toLowerCase() === editing.sku.toLowerCase() && product.id !== editing.id)) {
      setFormError('Cette référence SKU est déjà utilisée.')
      return
    }
    setSaving(true); setFormError('')
    try {
      const isNew = !products.some((product) => product.id === editing.id)
      await saveProduct(editing, isNew)
      setShowForm(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer ce produit.')
    } finally { setSaving(false) }
  }
  const setField = (field: keyof Product, value: string | number) => setEditing((current) => current ? { ...current, [field]: value } : current)
  const removeProduct = async () => {
    if (!editing || !window.confirm(`Supprimer « ${editing.name} » du catalogue ? L’historique des mouvements sera conservé.`)) return
    setDeleting(true); setFormError('')
    try { await deleteProduct(editing.id); setShowForm(false) }
    catch (deleteError) { setFormError(deleteError instanceof Error ? deleteError.message : 'Impossible de supprimer ce produit.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="content-stack">
      <section className="toolbar-card">
        <div className="search-field"><Search size={17} /><input placeholder="Rechercher un produit, une référence…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
        <button className={`button button-secondary filter-toggle ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters((value) => !value)}><Filter size={16} /> Filtres</button>
        <button className="button button-primary" onClick={openNew}><Plus size={17} /> Nouveau produit</button>
      </section>
      {showFilters && <section className="filter-row">
        <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Toutes les catégories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>État du stock<select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option>Tous les états</option><option>Disponible</option><option>Stock faible</option><option>Rupture</option></select></label>
        <button className="text-button" onClick={() => { setCategory('Toutes les catégories'); setStockFilter('Tous les états') }}><X size={14} /> Effacer</button>
      </section>}
      <section className="table-card">
        <div className="table-heading"><div><h2>Catalogue produits</h2><span>{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span></div><span className="table-sort">Mis à jour récemment <MoreHorizontal size={17} /></span></div>
        <div className="desktop-table-wrap"><table className="data-table">
          <thead><tr><th>PRODUIT</th><th>CATÉGORIE</th><th>PRIX DE VENTE</th><th>STOCK</th><th>EMPLACEMENT</th><th></th></tr></thead>
          <tbody>{filtered.map((product) => <tr key={product.id} onClick={() => openEdit(product)}>
            <td><div className="product-cell"><div className="product-thumb">{product.photo ? <img src={product.photo} alt="" /> : <PackagePlus size={19} />}</div><div><strong>{product.name}</strong><small>{product.brand} · {product.sku}</small></div></div></td>
            <td><span className="category-pill">{product.category}</span></td><td className="price-cell">{formatMoney(product.sellingPrice)}</td>
            <td><div className="quantity-cell"><span className={`stock-dot ${product.quantity === 0 ? 'empty' : product.quantity <= product.alertThreshold ? 'low' : ''}`} />{product.quantity} <small>/ seuil {product.alertThreshold}</small></div></td>
            <td className="location-cell">{product.location || '—'}</td>
            <td><button className="icon-button row-more" aria-label="Modifier le produit"><MoreHorizontal size={18} /></button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="mobile-product-list">{filtered.map((product) => <button className="mobile-product-card" onClick={() => openEdit(product)} key={product.id}>
          <div className="product-thumb">{product.photo ? <img src={product.photo} alt="" /> : <PackagePlus size={19} />}</div>
          <div className="mobile-product-info"><strong>{product.name}</strong><small>{product.brand} · {product.sku}</small><span className="category-pill">{product.category}</span></div>
          <div className="mobile-product-right"><b>{product.quantity}</b><small>{formatMoney(product.sellingPrice)}</small></div>
        </button>)}</div>
        {filtered.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>Aucun produit trouvé</h3><p>Essayez de modifier votre recherche ou vos filtres.</p></div>}
      </section>

      {showForm && editing && <Modal title={products.some((product) => product.id === editing.id) ? 'Modifier le produit' : 'Ajouter un produit'} onClose={() => setShowForm(false)} wide>
        <form className="form-grid" onSubmit={(event) => void submit(event)}>
          <label className="span-two">Nom du produit<input required maxLength={120} value={editing.name} onChange={(event) => setField('name', event.target.value)} placeholder="Ex. Dell Latitude 5440" /></label>
          <label>Référence / SKU<input required maxLength={40} value={editing.sku} onChange={(event) => setField('sku', event.target.value)} placeholder="Ex. DEL-LAT5440" /></label>
          <label>Marque<input required value={editing.brand} onChange={(event) => setField('brand', event.target.value)} placeholder="Dell" /></label>
          <label>Catégorie<select required value={editing.category} onChange={(event) => setField('category', event.target.value)}><option value="">Choisir…</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Emplacement / rayon<input value={editing.location} onChange={(event) => setField('location', event.target.value)} placeholder="A-01" /></label>
          <label>Prix d’achat (FCFA)<input required type="number" min="0" step="1" value={editing.purchasePrice} onChange={(event) => setField('purchasePrice', Number(event.target.value))} /></label>
          <label>Prix de vente (FCFA)<input required type="number" min="0" step="1" value={editing.sellingPrice} onChange={(event) => setField('sellingPrice', Number(event.target.value))} /></label>
          {!products.some((product) => product.id === editing.id) ? <label>Quantité initiale<input required type="number" min="0" step="1" value={editing.quantity} onChange={(event) => setField('quantity', Number(event.target.value))} /></label> : <label>Quantité en stock<input disabled type="number" value={editing.quantity} /><small>Le stock évolue via les mouvements.</small></label>}
          <label>Seuil d’alerte<input required type="number" min="0" step="1" value={editing.alertThreshold} onChange={(event) => setField('alertThreshold', Number(event.target.value))} /></label>
          <label className="span-two">URL de la photo <span className="optional">(facultatif)</span><input type="url" value={editing.photo ?? ''} onChange={(event) => setField('photo', event.target.value)} placeholder="https://…" /></label>
          {formError && <p className="form-error span-two">{formError}</p>}
          <div className="modal-actions span-two">{user.role === 'Administrateur' && products.some((product) => product.id === editing.id) && <button type="button" className="button button-danger" onClick={() => void removeProduct()} disabled={deleting}>{deleting ? 'Suppression…' : 'Supprimer'}</button>}<span className="modal-actions-spacer" /><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le produit'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}
