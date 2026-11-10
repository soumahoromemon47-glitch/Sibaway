import { createClient } from '@supabase/supabase-js'
import { demoProducts } from './demo-data'
import type { InventorySession, Movement, Product } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('votre-projet'))
export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findProductIdBySku(sku: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('products').select('id').eq('sku', sku).maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

async function resolveProductId(id: string, sku: string): Promise<string> {
  if (uuidPattern.test(id)) return id
  const remoteId = await findProductIdBySku(sku)
  if (!remoteId) throw new Error(`Produit introuvable dans Supabase pour la référence « ${sku} ».`)
  return remoteId
}

async function syncProductPhoto(product: Product) {
  if (!supabase || !product.photo?.startsWith('data:')) return product.photo ?? null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(product.photo)
  if (!match) throw new Error('Le format de cette image ne peut pas être synchronisé.')
  const response = await fetch(product.photo)
  if (!response.ok) throw new Error('Impossible de préparer l’image pour la synchronisation.')
  const image = await response.blob()
  const objectPath = `products/${product.id}/photo`
  const { error } = await supabase.storage.from('product-images').upload(objectPath, image, {
    contentType: match[1],
    upsert: true
  })
  if (error) throw error
  return supabase.storage.from('product-images').getPublicUrl(objectPath).data.publicUrl
}

export async function syncProduct(product: Product, initialQuantity?: number) {
  if (!supabase) return
  const legacyId = !uuidPattern.test(product.id)
  const existingId = legacyId ? await findProductIdBySku(product.sku) : null
  const productId = existingId ?? (legacyId ? crypto.randomUUID() : product.id)
  const photoUrl = await syncProductPhoto(product)
  const row: Record<string, unknown> = {
    id: productId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    photo_url: photoUrl,
    purchase_price: product.purchasePrice,
    selling_price: product.sellingPrice,
    alert_threshold: product.alertThreshold,
    location: product.location
  }
  if ((initialQuantity !== undefined || legacyId) && !existingId) {
    const { error } = await supabase.from('products').insert({ ...row, quantity: initialQuantity ?? product.quantity })
    if (!error) return
    if (error.code !== '23505') throw error
    const conflictingId = await findProductIdBySku(product.sku)
    if (!conflictingId) throw error
    row.id = conflictingId
  }
  const { error } = await supabase.from('products').update(row).eq('id', row.id)
  if (error) throw error
}

export function isStockInsufficientError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : ''
  return /stock insuffisant|stock.*sous zéro/i.test(message)
}

export async function syncMovement(movement: Movement): Promise<number | null> {
  if (!supabase) return null
  const productId = await resolveProductId(movement.productId, movement.sku)
  const { error } = await supabase.from('stock_movements').upsert({
    id: movement.id,
    product_id: productId,
    type: movement.type,
    quantity: movement.quantity,
    occurred_at: movement.date,
    note: movement.note,
    supplier: movement.supplier ?? null
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('quantity')
    .eq('id', productId)
    .single()
  if (productError) throw productError
  return product.quantity
}

export async function syncProductDelete(id: string) {
  if (!supabase) return
  let productId = id
  if (!uuidPattern.test(id)) {
    const sku = demoProducts.find((product) => product.id === id)?.sku
    if (!sku) throw new Error(`Impossible de retrouver la référence du produit local « ${id} ».`)
    const remoteId = await findProductIdBySku(sku)
    if (!remoteId) return
    productId = remoteId
  }
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export async function syncCategory(category: string) {
  if (!supabase) return
  const { error } = await supabase.from('categories').upsert({ name: category }, { onConflict: 'name', ignoreDuplicates: true })
  if (error) throw error
}

export async function syncCategoryDelete(category: string) {
  if (!supabase) return
  const { error } = await supabase.from('categories').delete().eq('name', category)
  if (error) throw error
}

export async function syncInventory(inventory: InventorySession) {
  if (!supabase) return
  const { data: existing, error: existingError } = await supabase.from('inventory_sessions').select('status').eq('id', inventory.id).maybeSingle()
  if (existingError) throw existingError
  if (existing?.status === 'Validé') return
  const { error: sessionError } = await supabase.from('inventory_sessions').upsert({
    id: inventory.id,
    label: inventory.label ?? inventory.id,
    status: 'En cours',
    started_at: inventory.date,
  }, { onConflict: 'id' })
  if (sessionError) throw sessionError
  const lines = await Promise.all(inventory.lines.map(async (line) => ({
    session_id: inventory.id,
    product_id: await resolveProductId(line.productId, line.sku),
    product_name: line.productName,
    product_sku: line.sku,
    expected_quantity: line.expected,
    counted_quantity: line.counted
  })))
  if (lines.length) {
    const { error: linesError } = await supabase.from('inventory_lines').upsert(lines, { onConflict: 'session_id,product_sku' })
    if (linesError) throw linesError
  }
  if (inventory.status === 'Validé') {
    const { error: validateError } = await supabase.from('inventory_sessions')
      .update({ status: 'Validé', validated_at: new Date().toISOString() }).eq('id', inventory.id)
    if (validateError) throw validateError
  }
}
