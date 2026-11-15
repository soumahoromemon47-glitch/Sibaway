import { useId, useMemo, useState } from 'react'
import type { Product } from '../types'

export function MovementProductPicker({ categories, products, productId, onProductChange }: {
  categories: string[]
  products: Product[]
  productId: string
  onProductChange: (productId: string) => void
}) {
  const pickerId = useId().replace(/:/g, '')
  const categoryListId = `${pickerId}-categories`
  const productListId = `${pickerId}-products`
  const [categorySearch, setCategorySearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const selectedCategory = categories.find((category) => category.toLocaleLowerCase('fr-FR') === categorySearch.trim().toLocaleLowerCase('fr-FR')) ?? ''
  const availableProducts = useMemo(
    () => products.filter((product) => product.category === selectedCategory),
    [products, selectedCategory]
  )
  const selectedProduct = availableProducts.find((product) => product.id === productId)

  const changeCategory = (value: string) => {
    setCategorySearch(value)
    setProductSearch('')
    onProductChange('')
  }
  const changeProduct = (value: string) => {
    setProductSearch(value)
    const product = availableProducts.find((item) => `${item.name} · ${item.sku}` === value)
    onProductChange(product?.id ?? '')
  }

  return (
    <>
      <label>Rechercher une catégorie
        <input
          required
          autoComplete="off"
          list={categoryListId}
          value={categorySearch}
          onChange={(event) => changeCategory(event.target.value)}
          placeholder="Saisir ou choisir une catégorie…"
        />
        <datalist id={categoryListId}>{categories.map((category) => <option key={category} value={category} />)}</datalist>
      </label>
      <label>Rechercher un produit
        <input
          required
          autoComplete="off"
          list={productListId}
          value={productSearch}
          onChange={(event) => changeProduct(event.target.value)}
          disabled={!selectedCategory}
          placeholder={selectedCategory ? 'Saisir ou choisir un produit…' : 'Choisissez d’abord une catégorie'}
        />
        <datalist id={productListId}>{availableProducts.map((product) => <option key={product.id} value={`${product.name} · ${product.sku}`} />)}</datalist>
        {selectedProduct && <small>{selectedProduct.quantity} en stock · {selectedProduct.brand}</small>}
      </label>
    </>
  )
}
