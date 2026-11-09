import type { Product, Movement } from '../types'

export const categories = ['Ordinateurs', 'Écrans', 'Composants', 'Accessoires', 'Imprimantes', 'Consommables']

export const demoProducts: Product[] = [
  { id: 'p-001', name: 'ThinkPad E14 Gen 5', sku: 'LEN-E14G5', category: 'Ordinateurs', brand: 'Lenovo', purchasePrice: 420000, sellingPrice: 495000, quantity: 8, alertThreshold: 3, location: 'A-01' },
  { id: 'p-002', name: 'MacBook Air M2 13”', sku: 'APL-MBA-M2', category: 'Ordinateurs', brand: 'Apple', purchasePrice: 620000, sellingPrice: 715000, quantity: 4, alertThreshold: 2, location: 'A-02' },
  { id: 'p-003', name: 'Dell Latitude 5440', sku: 'DEL-LAT5440', category: 'Ordinateurs', brand: 'Dell', purchasePrice: 510000, sellingPrice: 599000, quantity: 3, alertThreshold: 2, location: 'A-01' },
  { id: 'p-004', name: 'HP ProBook 450 G10', sku: 'HP-PB450G10', category: 'Ordinateurs', brand: 'HP', purchasePrice: 460000, sellingPrice: 540000, quantity: 1, alertThreshold: 3, location: 'A-03' },
  { id: 'p-005', name: 'Écran LG UltraWide 29WQ', sku: 'LG-29WQ', category: 'Écrans', brand: 'LG', purchasePrice: 135000, sellingPrice: 169000, quantity: 6, alertThreshold: 2, location: 'B-01' },
  { id: 'p-006', name: 'Écran Samsung 24” FHD', sku: 'SAM-S24C', category: 'Écrans', brand: 'Samsung', purchasePrice: 82000, sellingPrice: 105000, quantity: 12, alertThreshold: 4, location: 'B-02' },
  { id: 'p-007', name: 'Écran Dell P2722H 27”', sku: 'DEL-P2722H', category: 'Écrans', brand: 'Dell', purchasePrice: 185000, sellingPrice: 229000, quantity: 2, alertThreshold: 2, location: 'B-01' },
  { id: 'p-008', name: 'SSD Samsung 980 1 To', sku: 'SAM-980-1TB', category: 'Composants', brand: 'Samsung', purchasePrice: 48000, sellingPrice: 62000, quantity: 15, alertThreshold: 5, location: 'C-01' },
  { id: 'p-009', name: 'RAM Kingston Fury 16 Go DDR4', sku: 'KIN-FURY16', category: 'Composants', brand: 'Kingston', purchasePrice: 22000, sellingPrice: 29000, quantity: 2, alertThreshold: 5, location: 'C-02' },
  { id: 'p-010', name: 'Disque externe WD 2 To', sku: 'WD-ELEM-2TB', category: 'Composants', brand: 'Western Digital', purchasePrice: 46000, sellingPrice: 59000, quantity: 7, alertThreshold: 3, location: 'C-03' },
  { id: 'p-011', name: 'Clavier Logitech MX Keys', sku: 'LOG-MXKEYS', category: 'Accessoires', brand: 'Logitech', purchasePrice: 58000, sellingPrice: 75000, quantity: 5, alertThreshold: 2, location: 'D-01' },
  { id: 'p-012', name: 'Souris Logitech M185', sku: 'LOG-M185', category: 'Accessoires', brand: 'Logitech', purchasePrice: 6500, sellingPrice: 9500, quantity: 24, alertThreshold: 8, location: 'D-02' },
  { id: 'p-013', name: 'Casque JBL Tune 510BT', sku: 'JBL-T510BT', category: 'Accessoires', brand: 'JBL', purchasePrice: 18000, sellingPrice: 25000, quantity: 9, alertThreshold: 3, location: 'D-03' },
  { id: 'p-014', name: 'Routeur TP-Link Archer AX23', sku: 'TPL-AX23', category: 'Accessoires', brand: 'TP-Link', purchasePrice: 42000, sellingPrice: 55000, quantity: 6, alertThreshold: 2, location: 'D-04' },
  { id: 'p-015', name: 'Imprimante HP LaserJet M140w', sku: 'HP-M140W', category: 'Imprimantes', brand: 'HP', purchasePrice: 145000, sellingPrice: 179000, quantity: 3, alertThreshold: 2, location: 'E-01' },
  { id: 'p-016', name: 'Imprimante Epson EcoTank L3250', sku: 'EPS-L3250', category: 'Imprimantes', brand: 'Epson', purchasePrice: 155000, sellingPrice: 195000, quantity: 1, alertThreshold: 2, location: 'E-02' },
  { id: 'p-017', name: 'Toner HP 142A noir', sku: 'HP-142A', category: 'Consommables', brand: 'HP', purchasePrice: 32000, sellingPrice: 42000, quantity: 10, alertThreshold: 4, location: 'F-01' },
  { id: 'p-018', name: 'Encre Epson 103 multipack', sku: 'EPS-103-MP', category: 'Consommables', brand: 'Epson', purchasePrice: 18000, sellingPrice: 24500, quantity: 3, alertThreshold: 4, location: 'F-02' },
  { id: 'p-019', name: 'Onduleur APC 900VA', sku: 'APC-BX900', category: 'Accessoires', brand: 'APC', purchasePrice: 68000, sellingPrice: 85000, quantity: 5, alertThreshold: 2, location: 'D-05' },
  { id: 'p-020', name: 'Webcam Logitech C920 HD', sku: 'LOG-C920', category: 'Accessoires', brand: 'Logitech', purchasePrice: 52000, sellingPrice: 69000, quantity: 0, alertThreshold: 2, location: 'D-06' }
]

const daysAgo = (days: number, hour: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 20, 0, 0)
  return date.toISOString()
}

export const demoMovements: Movement[] = [
  { id: 'm-001', productId: 'p-001', productName: 'ThinkPad E14 Gen 5', sku: 'LEN-E14G5', type: 'Vente', quantity: 2, date: daysAgo(0, 10), user: 'Aminata K.', note: 'Vente comptoir' },
  { id: 'm-002', productId: 'p-008', productName: 'SSD Samsung 980 1 To', sku: 'SAM-980-1TB', type: 'Réception', quantity: 10, date: daysAgo(0, 9), user: 'Moussa T.', note: 'Réassort mensuel', supplier: 'Tech Distribution CI' },
  { id: 'm-003', productId: 'p-012', productName: 'Souris Logitech M185', sku: 'LOG-M185', type: 'Vente', quantity: 3, date: daysAgo(1, 16), user: 'Aminata K.', note: 'Commande #1042' },
  { id: 'm-004', productId: 'p-006', productName: 'Écran Samsung 24” FHD', sku: 'SAM-S24C', type: 'Vente', quantity: 1, date: daysAgo(2, 11), user: 'Jean P.', note: 'Vente comptoir' },
  { id: 'm-005', productId: 'p-017', productName: 'Toner HP 142A noir', sku: 'HP-142A', type: 'Réception', quantity: 6, date: daysAgo(3, 14), user: 'Moussa T.', note: 'Livraison reçue', supplier: 'Burotec' },
  { id: 'm-006', productId: 'p-002', productName: 'MacBook Air M2 13”', sku: 'APL-MBA-M2', type: 'Vente', quantity: 1, date: daysAgo(4, 15), user: 'Aminata K.', note: 'Facture #0089' },
  { id: 'm-007', productId: 'p-011', productName: 'Clavier Logitech MX Keys', sku: 'LOG-MXKEYS', type: 'Vente', quantity: 1, date: daysAgo(5, 10), user: 'Jean P.', note: 'Vente comptoir' },
  { id: 'm-008', productId: 'p-005', productName: 'Écran LG UltraWide 29WQ', sku: 'LG-29WQ', type: 'Vente', quantity: 1, date: daysAgo(7, 12), user: 'Aminata K.', note: 'Commande #1031' },
  { id: 'm-009', productId: 'p-009', productName: 'RAM Kingston Fury 16 Go DDR4', sku: 'KIN-FURY16', type: 'Vente', quantity: 2, date: daysAgo(9, 13), user: 'Jean P.', note: 'Vente comptoir' },
  { id: 'm-010', productId: 'p-003', productName: 'Dell Latitude 5440', sku: 'DEL-LAT5440', type: 'Vente', quantity: 1, date: daysAgo(12, 16), user: 'Aminata K.', note: 'Facture #0081' },
  { id: 'm-011', productId: 'p-014', productName: 'Routeur TP-Link Archer AX23', sku: 'TPL-AX23', type: 'Réception', quantity: 5, date: daysAgo(15, 9), user: 'Moussa T.', note: 'Réassort', supplier: 'Ivoire Réseau' },
  { id: 'm-012', productId: 'p-013', productName: 'Casque JBL Tune 510BT', sku: 'JBL-T510BT', type: 'Vente', quantity: 2, date: daysAgo(19, 11), user: 'Jean P.', note: 'Vente comptoir' },
  { id: 'm-013', productId: 'p-015', productName: 'Imprimante HP LaserJet M140w', sku: 'HP-M140W', type: 'Vente', quantity: 1, date: daysAgo(24, 15), user: 'Aminata K.', note: 'Commande entreprise' },
  { id: 'm-014', productId: 'p-010', productName: 'Disque externe WD 2 To', sku: 'WD-ELEM-2TB', type: 'Vente', quantity: 1, date: daysAgo(28, 10), user: 'Jean P.', note: 'Vente comptoir' }
]
