export type UserRole = 'Administrateur' | 'Employé'

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  photo?: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  alertThreshold: number
  location: string
}

export type MovementType = 'Réception' | 'Vente' | 'Perte' | 'Casse' | 'Retour' | 'Ajustement d’inventaire'

export type Movement = {
  id: string
  productId: string
  productName: string
  sku: string
  type: MovementType
  quantity: number
  date: string
  user: string
  note: string
  supplier?: string
}

export type InventoryLine = {
  productId: string
  productName: string
  sku: string
  expected: number
  counted: number
}

export type InventorySession = {
  id: string
  label?: string
  date: string
  status: 'En cours' | 'Validé'
  lines: InventoryLine[]
}

export type PendingOperation = {
  id?: number
  type: 'product_upsert' | 'product_delete' | 'movement_insert' | 'category_upsert' | 'category_delete' | 'inventory_upsert'
  payload: Product | Movement | InventorySession | string
  initialQuantity?: number
  createdAt: string
}

export type AppUser = {
  name: string
  email: string
  role: UserRole
}
