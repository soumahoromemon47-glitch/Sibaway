import { createClient } from '@supabase/supabase-js'
import type { InventorySession, Movement, Product } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('votre-projet'))
export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null

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
  const photoUrl = await syncProductPhoto(product)
  const row: Record<string, unknown> = {
    id: product.id,
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
  if (initialQuantity !== undefined) {
    const { error } = await supabase.from('products').insert({ ...row, quantity: initialQuantity })
    if (!error) return
    if (error.code !== '23505') throw error
  }
  const { error } = await supabase.from('products').update(row).eq('id', product.id)
  if (error) throw error
}

export async function syncMovement(movement: Movement) {
  if (!supabase) return
  const { error } = await supabase.from('stock_movements').upsert({
    id: movement.id,
    product_id: movement.productId,
    type: movement.type,
    quantity: movement.quantity,
    occurred_at: movement.date,
    note: movement.note,
    supplier: movement.supplier ?? null
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error
}

export async function syncProductDelete(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('products').delete().eq('id', id)
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
  const lines = inventory.lines.map((line) => ({
    session_id: inventory.id,
    product_id: line.productId,
    product_name: line.productName,
    product_sku: line.sku,
    expected_quantity: line.expected,
    counted_quantity: line.counted
  }))
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
