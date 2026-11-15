import { Fragment, useMemo, useState } from 'react'
import { ArrowDownToLine, Filter, MoreHorizontal, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { MovementProductPicker } from '../components/MovementProductPicker'
import { useStock } from '../context/StockContext'
import { formatMoney } from '../lib/format'
import type { AppUser, MovementType, Product } from '../types'

const blankProduct = (): Product => ({
  id: crypto.randomUUID(), name: '', sku: '', category: '', brand: '',
  purchasePrice: 0, sellingPrice: 0, quantity: 0, alertThreshold: 2, location: ''
})

const maxPhotoSize = 5 * 1024 * 1024
const supportedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp']

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Impossible de lire cette image.'))
    }
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'))
    reader.readAsDataURL(file)
  })
}

export function Products({ user }: { user: AppUser }) {
  const { products, categories, brandsByCategory, saveProduct, deleteProduct, addMovement } = useStock()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes les catégories')
  const [brand, setBrand] = useState('Toutes les marques')
  const [stockFilter, setStockFilter] = useState('Tous les états')
  const [editing, setEditing] = useState<Product | null>(null)
  const [actionProduct, setActionProduct] = useState<Product | null>(null)
  const [actionError, setActionError] = useState('')
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementProductId, setMovementProductId] = useState('')
  const [movementType, setMovementType] = useState<MovementType>('Vente')
  const [movementQuantity, setMovementQuantity] = useState(1)
  const [movementNote, setMovementNote] = useState('')
  const [movementSupplier, setMovementSupplier] = useState('')
  const [movementError, setMovementError] = useState('')
  const [movementSaving, setMovementSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const availableBrands = useMemo(() => {
    const values = category === 'Toutes les catégories'
      ? Object.values(brandsByCategory).flat()
      : brandsByCategory[category] ?? []
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  }, [brandsByCategory, category])

  const choosePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!supportedPhotoTypes.includes(file.type)) {
      setFormError('Choisissez une image au format JPG, PNG ou WebP.')
      return
    }
    if (file.size > maxPhotoSize) {
      setFormError('L’image ne doit pas dépasser 5 Mo.')
      return
    }
    try {
      setField('photo', await readPhoto(file))
      setFormError('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible de lire cette image.')
    }
  }

  const filtered = useMemo(() => products.filter((product) => {
    const textMatch = `${product.name} ${product.sku} ${product.brand}`.toLocaleLowerCase('fr-FR').includes(query.toLocaleLowerCase('fr-FR'))
    const categoryMatch = category === 'Toutes les catégories' || product.category === category
    const brandMatch = brand === 'Toutes les marques' || product.brand === brand
    const stockMatch = stockFilter === 'Tous les états' || (stockFilter === 'Rupture' ? product.quantity === 0 : stockFilter === 'Stock faible' ? product.quantity > 0 && product.quantity <= product.alertThreshold : product.quantity > product.alertThreshold)
    return textMatch && categoryMatch && brandMatch && stockMatch
  }), [products, query, category, brand, stockFilter])
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>()
    filtered.forEach((product) => {
      const categoryName = product.category || 'Sans catégorie'
      const group = groups.get(categoryName) ?? []
      group.push(product)
      groups.set(categoryName, group)
    })
    return Array.from(groups, ([name, items]) => ({ name, items }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [filtered])

  const openNew = () => { setEditing(blankProduct()); setFormError(''); setShowForm(true) }
  const openEdit = (product: Product) => { setEditing({ ...product }); setFormError(''); setShowForm(true) }
  const changeProductCategory = (nextCategory: string) => setEditing((current) => {
    if (!current) return current
    const available = brandsByCategory[nextCategory] ?? []
    return { ...current, category: nextCategory, brand: available.includes(current.brand) ? current.brand : '' }
  })
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
  const setField = (field: keyof Product, value: string | number | undefined) => setEditing((current) => current ? { ...current, [field]: value } : current)
  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Supprimer « ${product.name} » du catalogue ? L’historique des mouvements sera conservé.`)) return
    setDeleting(true); setFormError(''); setActionError('')
    try {
      await deleteProduct(product.id)
      setShowForm(false)
      setActionProduct(null)
    }
    catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Impossible de supprimer ce produit.'
      setFormError(message)
      setActionError(message)
    }
    finally { setDeleting(false) }
  }
  const startMovement = () => {
    setMovementProductId('')
    setMovementOpen(true)
    setMovementType('Vente')
    setMovementQuantity(1)
    setMovementNote('')
    setMovementSupplier('')
    setMovementError('')
    setMovementSaving(false)
    setActionProduct(null)
  }
  const submitMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const movementProduct = products.find((product) => product.id === movementProductId)
    if (!movementProduct) {
      setMovementError('Recherchez une catégorie, puis choisissez un produit.')
      return
    }
    setMovementSaving(true)
    setMovementError('')
    try {
      await addMovement({
        productId: movementProduct.id,
        type: movementType,
        quantity: movementQuantity,
        note: movementNote,
        ...(movementType === 'Réception' ? { supplier: movementSupplier } : {})
      }, user.name)
      setMovementOpen(false)
    } catch (error) {
      setMovementError(error instanceof Error ? error.message : 'Impossible d’enregistrer le mouvement.')
    } finally {
      setMovementSaving(false)
    }
  }
  const renderActions = (product: Product) => (
    <div className="product-actions" onClick={(event) => event.stopPropagation()}>
      <button
        className="icon-button row-more"
        aria-label={`Actions pour ${product.name}`}
        aria-haspopup="menu"
        aria-expanded={actionProduct?.id === product.id}
        onClick={() => {
          setActionError('')
          setActionProduct((current) => current?.id === product.id ? null : product)
        }}
      ><MoreHorizontal size={18} /></button>
      {actionProduct?.id === product.id && <div className="product-action-menu" role="menu">
        <button role="menuitem" onClick={startMovement}><ArrowDownToLine size={14} /> Faire un mouvement</button>
        <button role="menuitem" onClick={() => { setActionProduct(null); openEdit(product) }}><PackagePlus size={14} /> Modifier</button>
        {user.role === 'Administrateur' && <button className="danger-action" role="menuitem" onClick={() => void removeProduct(product)}><Trash2 size={14} /> Supprimer</button>}
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
      </div>}
    </div>
  )

  return (
    <div className="content-stack">
      <section className="toolbar-card">
        <div className="search-field"><Search size={17} /><input placeholder="Rechercher un produit, une référence…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
        <button className={`button button-secondary filter-toggle ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters((value) => !value)}><Filter size={16} /> Filtres</button>
        <button className="button button-primary" onClick={openNew}><Plus size={17} /> Nouveau produit</button>
      </section>
      {showFilters && <section className="filter-row">
        <label>Catégorie<select value={category} onChange={(event) => { setCategory(event.target.value); setBrand('Toutes les marques') }}><option>Toutes les catégories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Marque<select value={brand} onChange={(event) => setBrand(event.target.value)}><option>Toutes les marques</option>{availableBrands.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>État du stock<select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option>Tous les états</option><option>Disponible</option><option>Stock faible</option><option>Rupture</option></select></label>
        <button className="text-button" onClick={() => { setCategory('Toutes les catégories'); setBrand('Toutes les marques'); setStockFilter('Tous les états') }}><X size={14} /> Effacer</button>
      </section>}
      <section className="table-card">
        <div className="table-heading"><div><h2>Catalogue produits</h2><span>{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span></div><span className="table-sort">Mis à jour récemment <MoreHorizontal size={17} /></span></div>
        <div className="desktop-table-wrap"><table className="data-table">
          <thead><tr><th>PRODUIT</th><th>PRIX DE VENTE</th><th>STOCK</th><th>EMPLACEMENT</th><th></th></tr></thead>
          <tbody>{groupedProducts.map(({ name, items }) => <Fragment key={name}>
            <tr className="product-category-heading"><th colSpan={5} scope="rowgroup">{name}<span>{items.length} produit{items.length > 1 ? 's' : ''}</span></th></tr>
            {items.map((product) => <tr key={product.id} onClick={() => openEdit(product)}>
              <td><div className="product-cell"><div className="product-thumb">{product.photo ? <img src={product.photo} alt="" /> : <PackagePlus size={19} />}</div><div><strong>{product.name}</strong><small>{product.brand} · {product.sku}</small></div></div></td>
              <td className="price-cell">{formatMoney(product.sellingPrice)}</td>
              <td><div className="quantity-cell"><span className={`stock-dot ${product.quantity === 0 ? 'empty' : product.quantity <= product.alertThreshold ? 'low' : ''}`} />{product.quantity} <small>/ seuil {product.alertThreshold}</small></div></td>
              <td className="location-cell">{product.location || '—'}</td>
              <td>{renderActions(product)}</td>
            </tr>)}
          </Fragment>)}</tbody>
        </table></div>
        <div className="mobile-product-list">{groupedProducts.map(({ name, items }) => <section className="mobile-product-group" key={name}>
          <h3>{name}<span>{items.length}</span></h3>
          {items.map((product) => <div className="mobile-product-entry" key={product.id}>
            <button className="mobile-product-card" onClick={() => openEdit(product)}>
              <div className="product-thumb">{product.photo ? <img src={product.photo} alt="" /> : <PackagePlus size={19} />}</div>
              <div className="mobile-product-info"><strong>{product.name}</strong><small>{product.brand} · {product.sku}</small></div>
              <div className="mobile-product-right"><b>{product.quantity}</b><small>{formatMoney(product.sellingPrice)}</small></div>
            </button>
            {renderActions(product)}
          </div>)}
        </section>)}</div>
        {filtered.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>Aucun produit trouvé</h3><p>Essayez de modifier votre recherche ou vos filtres.</p></div>}
      </section>

      {showForm && editing && <Modal title={products.some((product) => product.id === editing.id) ? 'Modifier le produit' : 'Ajouter un produit'} onClose={() => setShowForm(false)} wide>
        <form className="form-grid" onSubmit={(event) => void submit(event)}>
          <label className="span-two">Nom du produit<input required maxLength={120} value={editing.name} onChange={(event) => setField('name', event.target.value)} placeholder="Ex. Dell Latitude 5440" /></label>
          <label>Référence / SKU<input required maxLength={40} value={editing.sku} onChange={(event) => setField('sku', event.target.value)} placeholder="Ex. DEL-LAT5440" /></label>
          <label>Catégorie<select required value={editing.category} onChange={(event) => changeProductCategory(event.target.value)}><option value="">Choisir…</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Marque<select required value={editing.brand} onChange={(event) => setField('brand', event.target.value)}><option value="">Choisir…</option>{(brandsByCategory[editing.category] ?? []).map((item) => <option key={item}>{item}</option>)}</select><small>Les marques se gèrent dans Paramètres pour chaque catégorie.</small></label>
          <label>Emplacement / rayon<input value={editing.location} onChange={(event) => setField('location', event.target.value)} placeholder="A-01" /></label>
          <label>Prix d’achat (FCFA)<input required type="number" min="0" step="1" value={editing.purchasePrice} onChange={(event) => setField('purchasePrice', Number(event.target.value))} /></label>
          <label>Prix de vente (FCFA)<input required type="number" min="0" step="1" value={editing.sellingPrice} onChange={(event) => setField('sellingPrice', Number(event.target.value))} /></label>
          {!products.some((product) => product.id === editing.id) ? <label>Quantité initiale<input required type="number" min="0" step="1" value={editing.quantity} onChange={(event) => setField('quantity', Number(event.target.value))} /></label> : <label>Quantité en stock<input disabled type="number" value={editing.quantity} /><small>Le stock évolue via les mouvements.</small></label>}
          <label>Seuil d’alerte<input required type="number" min="0" step="1" value={editing.alertThreshold} onChange={(event) => setField('alertThreshold', Number(event.target.value))} /></label>
          <label className="span-two">Image du produit <span className="optional">(JPG, PNG ou WebP · 5 Mo max.)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} /></label>
          {editing.photo && <div className="product-photo-preview span-two"><img src={editing.photo} alt="Aperçu de la photo du produit" /><button type="button" className="button button-secondary" onClick={() => setField('photo', undefined)}>Retirer l’image</button></div>}
          <label className="span-two">Ou URL de la photo <span className="optional">(facultatif)</span><input type="url" value={editing.photo?.startsWith('data:') ? '' : editing.photo ?? ''} onChange={(event) => setField('photo', event.target.value)} placeholder="https://…" /></label>
          {formError && <p className="form-error span-two">{formError}</p>}
          <div className="modal-actions span-two">{user.role === 'Administrateur' && products.some((product) => product.id === editing.id) && <button type="button" className="button button-danger" onClick={() => void removeProduct(editing)} disabled={deleting}>{deleting ? 'Suppression…' : 'Supprimer'}</button>}<span className="modal-actions-spacer" /><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le produit'}</button></div>
        </form>
      </Modal>}
      {movementOpen && <Modal title="Enregistrer un mouvement" onClose={() => setMovementOpen(false)}>
        <form className="form-stack" onSubmit={(event) => void submitMovement(event)}>
          <MovementProductPicker categories={categories} products={products} productId={movementProductId} onProductChange={setMovementProductId} />
          <label>Type de mouvement<select value={movementType} onChange={(event) => setMovementType(event.target.value as MovementType)}><option>Réception</option><option>Vente</option><option>Perte</option><option>Casse</option></select></label>
          <label>Quantité<input required type="number" min="1" step="1" value={movementQuantity} onChange={(event) => setMovementQuantity(Number(event.target.value))} /></label>
          {movementType === 'Réception' && <label>Fournisseur <span className="optional">(facultatif)</span><input value={movementSupplier} onChange={(event) => setMovementSupplier(event.target.value)} placeholder="Nom du fournisseur" /></label>}
          <label>Note <span className="optional">(facultatif)</span><textarea rows={3} maxLength={400} value={movementNote} onChange={(event) => setMovementNote(event.target.value)} placeholder="Précisions sur l’opération…" /></label>
          {movementError && <p className="form-error">{movementError}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMovementOpen(false)}>Annuler</button><button className="button button-primary" disabled={movementSaving}>{movementSaving ? 'Enregistrement…' : 'Confirmer le mouvement'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}
