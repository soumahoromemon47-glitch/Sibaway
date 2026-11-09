import {
  AlertTriangle, BarChart3, Boxes, ClipboardList, LayoutDashboard, LogOut,
  Package, Settings2, ArrowDownUp, X
} from 'lucide-react'
import type { AppUser } from '../types'

export type PageId = 'dashboard' | 'products' | 'movements' | 'inventory' | 'alerts' | 'reports' | 'settings'

const navigation: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'movements', label: 'Mouvements', icon: ArrowDownUp },
  { id: 'inventory', label: 'Inventaire', icon: ClipboardList },
  { id: 'alerts', label: 'Alertes de stock', icon: AlertTriangle },
  { id: 'reports', label: 'Rapports', icon: BarChart3 }
]

export function Sidebar({ page, onNavigate, user, onLogout, alertCount, mobileOpen, closeMobile }: {
  page: PageId
  onNavigate: (page: PageId) => void
  user: AppUser
  onLogout: () => void
  alertCount: number
  mobileOpen: boolean
  closeMobile: () => void
}) {
  const navigate = (id: PageId) => { onNavigate(id); closeMobile() }
  return (
    <>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Fermer le menu" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark small-mark"><Boxes size={20} /></div>
          <div><strong>sibaway</strong><small>STOCK & INVENTAIRE</small></div>
          <button className="icon-button mobile-close" onClick={closeMobile} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <nav className="side-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} key={id} aria-label={label} title={label}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'alerts' && alertCount > 0 && <span className="nav-count">{alertCount}</span>}
            </button>
          ))}
        </nav>
        {user.role === 'Administrateur' && (
          <div className="sidebar-bottom">
            <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')} aria-label="Paramètres" title="Paramètres"><Settings2 size={18} /><span>Paramètres</span></button>
          </div>
        )}
        <div className="sidebar-user">
          <div className="avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <div className="user-copy"><strong>{user.name}</strong><small>{user.role}</small></div>
          <button className="icon-button logout-button" title="Déconnexion" onClick={onLogout}><LogOut size={17} /></button>
        </div>
      </aside>
    </>
  )
}

export function MobileNav({ page, onNavigate, alertCount }: { page: PageId; onNavigate: (page: PageId) => void; alertCount: number }) {
  return (
    <nav className="mobile-nav">
      {[navigation[0], navigation[1], navigation[2], navigation[3], navigation[4]].map(({ id, label, icon: Icon }) => (
        <button key={id} className={page === id ? 'active' : ''} onClick={() => onNavigate(id)} aria-label={label}>
          <span className="mobile-nav-icon"><Icon size={19} />{id === 'alerts' && alertCount > 0 && <i />}</span>
          <small>{id === 'dashboard' ? 'Accueil' : id === 'movements' ? 'Mouvements' : id === 'inventory' ? 'Inventaire' : id === 'alerts' ? 'Alertes' : 'Produits'}</small>
        </button>
      ))}
    </nav>
  )
}
