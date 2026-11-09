import { useState } from 'react'
import { Check, Plus, Tag, Trash2 } from 'lucide-react'
import { useStock } from '../context/StockContext'

export function Settings() {
  const { categories, addCategory, removeCategory, products } = useStock()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const category = name.trim()
    if (!category) return
    if (categories.some((item) => item.toLocaleLowerCase('fr-FR') === category.toLocaleLowerCase('fr-FR'))) {
      setMessage('Cette catégorie existe déjà.')
      return
    }
    setSaving(true)
    try {
      await addCategory(category)
      setName('')
      setMessage('Catégorie ajoutée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’ajouter cette catégorie.')
    } finally { setSaving(false) }
  }
  const deleteCategory = async (category: string) => {
    if (!window.confirm(`Supprimer la catégorie « ${category} » ?`)) return
    try {
      await removeCategory(category)
      setMessage('Catégorie supprimée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de supprimer cette catégorie.')
    }
  }
  return (
    <div className="settings-grid">
      <section className="table-card settings-card">
        <div className="section-heading"><div><h2>Catégories de produits</h2><p>Organisez votre catalogue par famille</p></div><span className="settings-category-icon"><Tag size={17} /></span></div>
        <form className="category-add-form" onSubmit={(event) => void submit(event)}><input required maxLength={40} value={name} onChange={(event) => { setName(event.target.value); setMessage('') }} placeholder="Ex. Réseau & connectivité" /><button className="button button-primary" disabled={saving}><Plus size={16} /> Ajouter</button></form>
        {message && <p className={message.includes('ajoutée') || message.includes('supprimée') ? 'success-message' : 'form-error'}>{message.includes('ajoutée') || message.includes('supprimée') ? <Check size={14} /> : null}{message}</p>}
        <div className="settings-category-list">{categories.map((category) => <div key={category}><span className="category-dot" /><strong>{category}</strong><span>{products.filter((product) => product.category === category).length} produits</span><button className="icon-button category-delete" title={`Supprimer ${category}`} onClick={() => void deleteCategory(category)}><Trash2 size={15} /></button></div>)}</div>
      </section>
      <section className="settings-info"><h2>Votre espace Sibaway</h2><p>La gestion de votre boutique, simplement.</p><div><span>Fuseau horaire</span><strong>Africa / Abidjan</strong></div><div><span>Devise</span><strong>Franc CFA (FCFA)</strong></div><div><span>Rôle actuel</span><strong>Administrateur</strong></div><div><span>Stockage</span><strong>Local + Supabase</strong></div></section>
    </div>
  )
}
