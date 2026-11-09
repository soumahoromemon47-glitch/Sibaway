import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { db, initializeDemoData } from '../lib/database'
import { categories as defaultCategories } from '../lib/demo-data'
import { isSupabaseConfigured, supabase, syncCategory, syncCategoryDelete, syncInventory, syncMovement, syncProduct, syncProductDelete } from '../lib/supabase'
import { today } from '../lib/format'
import type { AppUser, InventorySession, Movement, MovementType, Product } from '../types'

type NewMovement = Omit<Movement, 'id' | 'date' | 'user' | 'productName' | 'sku'> & { date?: string }
type StockContextValue = {
  products: Product[]
  movements: Movement[]
  inventories: InventorySession[]
  categories: string[]
  loading: boolean
  error: string | null
  isOnline: boolean
  isSynced: boolean
  refresh: () => Promise<void>
  saveProduct: (product: Product, isNew?: boolean) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addMovement: (movement: NewMovement, user: string) => Promise<void>
  saveInventory: (inventory: InventorySession) => Promise<void>
  validateInventory: (inventory: InventorySession, user: string) => Promise<void>
  addCategory: (category: string) => Promise<void>
  removeCategory: (category: string) => Promise<void>
}

const StockContext = createContext<StockContextValue | null>(null)

const movementDelta = (type: MovementType, quantity: number) => {
  if (type === 'Réception' || type === 'Retour') return Math.abs(quantity)
  if (type === 'Ajustement d’inventaire') return quantity
  return -Math.abs(quantity)
}

function mapRemoteProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    category: String(row.category),
    brand: String(row.brand ?? ''),
    photo: row.photo_url ? String(row.photo_url) : undefined,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    quantity: Number(row.quantity),
    alertThreshold: Number(row.alert_threshold),
    location: String(row.location ?? '')
  }
}

function mapRemoteMovement(row: Record<string, unknown>): Movement {
  const product = row.products as Record<string, unknown> | null
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(product?.name ?? 'Produit supprimé'),
    sku: String(product?.sku ?? ''),
    type: String(row.type) as MovementType,
    quantity: Number(row.quantity),
    date: String(row.occurred_at),
    user: String((row.profiles as Record<string, unknown> | null)?.full_name ?? 'Équipe'),
    note: String(row.note ?? ''),
    supplier: row.supplier ? String(row.supplier) : undefined
  }
}

export function StockProvider({ children, user }: { children: ReactNode; user: AppUser }) {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [inventories, setInventories] = useState<InventorySession[]>([])
  const [categories, setCategories] = useState(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSynced, setIsSynced] = useState(true)
  const syncing = useRef(false)

  const refresh = useCallback(async () => {
    setError(null)
    const [cachedProducts, cachedMovements, cachedInventories] = await Promise.all([
      db.products.toArray(), db.movements.toArray(), db.inventories.toArray()
    ])
    if (cachedProducts.length) setProducts(cachedProducts)
    if (cachedMovements.length) setMovements(cachedMovements.sort((a, b) => b.date.localeCompare(a.date)))
    if (cachedInventories.length) setInventories(cachedInventories)
    const storedCategories = await db.metadata.get('categories')
    if (storedCategories) {
      try { setCategories(JSON.parse(storedCategories.value) as string[]) }
      catch (parseError) { throw new Error(`Catégories locales illisibles : ${String(parseError)}`) }
    }
    if (!isSupabaseConfigured || !supabase) {
      await initializeDemoData()
      const [localProducts, localMovements, localInventories] = await Promise.all([
        db.products.toArray(), db.movements.toArray(), db.inventories.toArray()
      ])
      setProducts(localProducts)
      setMovements(localMovements.sort((a, b) => b.date.localeCompare(a.date)))
      setInventories(localInventories.sort((a, b) => b.date.localeCompare(a.date)))
      return
    }
    if (!navigator.onLine) return

    const [remoteProducts, remoteMovements, remoteCategories, remoteInventories] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_movements').select('*, products(name, sku), profiles(full_name)').order('occurred_at', { ascending: false }).limit(500),
      supabase.from('categories').select('name').order('name'),
      supabase.from('inventory_sessions').select('*, inventory_lines(*)').order('started_at', { ascending: false })
    ])
    if (remoteProducts.error) throw remoteProducts.error
    if (remoteMovements.error) throw remoteMovements.error
    if (remoteCategories.error) throw remoteCategories.error
    if (remoteInventories.error) throw remoteInventories.error
    const nextProducts = (remoteProducts.data ?? []).map((row) => mapRemoteProduct(row as Record<string, unknown>))
    const nextMovements = (remoteMovements.data ?? []).map((row) => mapRemoteMovement(row as Record<string, unknown>))
    await db.transaction('rw', db.products, db.movements, async () => {
      await db.products.clear()
      await db.movements.clear()
      if (nextProducts.length) await db.products.bulkPut(nextProducts)
      if (nextMovements.length) await db.movements.bulkPut(nextMovements)
    })
    setProducts(nextProducts)
    setMovements(nextMovements)
    const nextInventories: InventorySession[] = (remoteInventories.data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      date: row.started_at,
      status: row.status as InventorySession['status'],
      lines: (row.inventory_lines ?? []).map((line: Record<string, unknown>) => ({
        productId: String(line.product_id ?? ''),
        productName: String(line.product_name),
        sku: String(line.product_sku),
        expected: Number(line.expected_quantity),
        counted: Number(line.counted_quantity)
      }))
    }))
    await db.inventories.clear()
    if (nextInventories.length) await db.inventories.bulkPut(nextInventories)
    setInventories(nextInventories)
    const remoteCategoryNames = (remoteCategories.data ?? []).map((row) => row.name)
    const resolvedCategories = remoteCategoryNames.length ? remoteCategoryNames : defaultCategories
    await db.metadata.put({ key: 'categories', value: JSON.stringify(resolvedCategories) })
    setCategories(resolvedCategories)
  }, [])

  const flushQueue = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine || syncing.current) return
    syncing.current = true
    try {
      setIsSynced(false)
      while (navigator.onLine) {
        const operations = await db.queue.orderBy('id').toArray()
        if (operations.length === 0) break
        for (const operation of operations) {
          if (operation.type === 'product_upsert') await syncProduct(operation.payload as Product, operation.initialQuantity)
          else if (operation.type === 'product_delete') await syncProductDelete(String(operation.payload))
          else if (operation.type === 'movement_insert') await syncMovement(operation.payload as Movement)
          else if (operation.type === 'category_upsert') await syncCategory(String(operation.payload))
          else if (operation.type === 'category_delete') await syncCategoryDelete(String(operation.payload))
          else await syncInventory(operation.payload as InventorySession)
          if (operation.id !== undefined) await db.queue.delete(operation.id)
        }
      }
      const remaining = await db.queue.count()
      setIsSynced(remaining === 0 && navigator.onLine)
      if (navigator.onLine) {
        try {
          await refresh()
        } catch (refreshError) {
          setError(refreshError instanceof Error ? `Synchronisé, mais le rechargement a échoué : ${refreshError.message}` : 'Synchronisé, mais le rechargement a échoué.')
        }
      }
    } catch (syncError) {
      setIsSynced(false)
      setError(syncError instanceof Error ? `Synchronisation impossible : ${syncError.message}` : 'Synchronisation impossible.')
    } finally {
      syncing.current = false
    }
  }, [refresh])

  useEffect(() => {
    let active = true
    setLoading(true)
    refresh()
      .then(() => flushQueue())
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les données.')
      })
      .finally(() => { if (active) setLoading(false) })
    const onOnline = () => { setIsOnline(true); void flushQueue() }
    const onOffline = () => { setIsOnline(false); setIsSynced(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const interval = window.setInterval(() => { if (navigator.onLine) void flushQueue() }, 30000)
    return () => {
      active = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(interval)
    }
  }, [flushQueue])

  const saveProduct = useCallback(async (product: Product, isNew = false) => {
    await db.products.put(product)
    await db.queue.add({
      type: 'product_upsert',
      payload: product,
      ...(isNew ? { initialQuantity: product.quantity } : {}),
      createdAt: today()
    })
    setProducts(await db.products.toArray())
    if (isSupabaseConfigured) setIsSynced(false)
    if (isNew && isSupabaseConfigured && navigator.onLine) void flushQueue()
  }, [flushQueue])

  const deleteProduct = useCallback(async (id: string) => {
    await db.transaction('rw', db.products, db.queue, async () => {
      await db.products.delete(id)
      if (isSupabaseConfigured) await db.queue.add({ type: 'product_delete', payload: id, createdAt: today() })
    })
    setProducts(await db.products.toArray())
    if (isSupabaseConfigured) {
      setIsSynced(false)
      if (navigator.onLine) void flushQueue()
    }
  }, [flushQueue])

  const addMovement = useCallback(async (input: NewMovement, actor: string) => {
    const currentProduct = await db.products.get(input.productId)
    if (!currentProduct) throw new Error('Ce produit n’existe plus.')
    const delta = movementDelta(input.type, input.quantity)
    if (currentProduct.quantity + delta < 0) throw new Error('Stock insuffisant : cette sortie ferait passer le stock sous zéro.')
    const movement: Movement = {
      ...input,
      id: crypto.randomUUID(),
      productName: currentProduct.name,
      sku: currentProduct.sku,
      date: input.date ?? today(),
      user: actor,
      quantity: input.quantity
    }
    await db.transaction('rw', db.products, db.movements, db.queue, async () => {
      await db.products.put({ ...currentProduct, quantity: currentProduct.quantity + delta })
      await db.movements.add(movement)
      await db.queue.add({ type: 'movement_insert', payload: movement, createdAt: today() })
    })
    const [localProducts, localMovements] = await Promise.all([db.products.toArray(), db.movements.toArray()])
    setProducts(localProducts)
    setMovements(localMovements.sort((a, b) => b.date.localeCompare(a.date)))
    if (isSupabaseConfigured) setIsSynced(false)
    if (isSupabaseConfigured && navigator.onLine) void flushQueue()
  }, [flushQueue, refresh])

  const saveInventory = useCallback(async (inventory: InventorySession) => {
    await db.inventories.put(inventory)
    if (isSupabaseConfigured) {
      await db.queue.add({ type: 'inventory_upsert', payload: inventory, createdAt: today() })
      setIsSynced(false)
      if (navigator.onLine) void flushQueue()
    }
    setInventories((current) => [inventory, ...current.filter((item) => item.id !== inventory.id)])
  }, [flushQueue])

  const validateInventory = useCallback(async (inventory: InventorySession, actor: string) => {
    for (const line of inventory.lines) {
      const difference = line.counted - line.expected
      if (difference !== 0) {
        await addMovement({
          productId: line.productId,
          type: 'Ajustement d’inventaire',
          quantity: difference,
          note: `Inventaire ${inventory.id} · compté ${line.counted}`
        }, actor)
      }
    }
    await saveInventory({ ...inventory, status: 'Validé' })
  }, [addMovement, saveInventory])

  const addCategory = useCallback(async (category: string) => {
    if (categories.includes(category)) return
    const nextCategories = [...categories, category]
    await db.metadata.put({ key: 'categories', value: JSON.stringify(nextCategories) })
    if (isSupabaseConfigured) {
      await db.queue.add({ type: 'category_upsert', payload: category, createdAt: today() })
      setIsSynced(false)
      if (navigator.onLine) void flushQueue()
    }
    setCategories(nextCategories)
  }, [categories, flushQueue])

  const removeCategory = useCallback(async (category: string) => {
    if (products.some((product) => product.category === category)) throw new Error('Cette catégorie contient encore des produits.')
    const nextCategories = categories.filter((item) => item !== category)
    await db.metadata.put({ key: 'categories', value: JSON.stringify(nextCategories) })
    if (isSupabaseConfigured) {
      await db.queue.add({ type: 'category_delete', payload: category, createdAt: today() })
      setIsSynced(false)
      if (navigator.onLine) void flushQueue()
    }
    setCategories(nextCategories)
  }, [categories, products, flushQueue])

  const value = useMemo(() => ({
    products, movements, inventories, categories, loading, error, isOnline, isSynced,
    refresh, saveProduct, deleteProduct, addMovement, saveInventory, validateInventory, addCategory, removeCategory
  }), [products, movements, inventories, categories, loading, error, isOnline, isSynced, refresh, saveProduct, deleteProduct, addMovement, saveInventory, validateInventory, addCategory, removeCategory])

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>
}

export function useStock() {
  const context = useContext(StockContext)
  if (!context) throw new Error('useStock doit être utilisé dans StockProvider.')
  return context
}
