import Dexie, { type Table } from 'dexie'
import type { InventorySession, Movement, PendingOperation, Product } from '../types'
import { demoMovements, demoProducts } from './demo-data'

export class StockDatabase extends Dexie {
  products!: Table<Product, string>
  movements!: Table<Movement, string>
  inventories!: Table<InventorySession, string>
  queue!: Table<PendingOperation, number>
  metadata!: Table<{ key: string; value: string }, string>

  constructor() {
    super('sibaway-stock')
    this.version(1).stores({
      products: 'id, sku, category, name',
      movements: 'id, productId, type, date',
      inventories: 'id, date, status',
      queue: '++id, type, createdAt',
      metadata: 'key'
    })
  }
}

export const db = new StockDatabase()

export async function initializeDemoData() {
  const initialized = await db.metadata.get('demo-seeded')
  if (initialized) return
  await db.transaction('rw', db.products, db.movements, db.metadata, async () => {
    if ((await db.products.count()) === 0) await db.products.bulkAdd(demoProducts)
    if ((await db.movements.count()) === 0) await db.movements.bulkAdd(demoMovements)
    await db.metadata.put({ key: 'demo-seeded', value: 'true' })
  })
}
