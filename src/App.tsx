import { lazy, Suspense, useEffect, useState } from 'react'
import { Menu, Moon, Sun, Wifi, WifiOff } from 'lucide-react'
import { Login } from './components/Login'
import { MobileNav, Sidebar, type PageId } from './components/Sidebar'
import { StockProvider, useStock } from './context/StockContext'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { AppUser, UserRole } from './types'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Products = lazy(() => import('./pages/Products').then((module) => ({ default: module.Products })))
const Movements = lazy(() => import('./pages/Movements').then((module) => ({ default: module.Movements })))
const Inventory = lazy(() => import('./pages/Inventory').then((module) => ({ default: module.Inventory })))
const Alerts = lazy(() => import('./pages/Alerts').then((module) => ({ default: module.Alerts })))
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))

const headings: Record<PageId, { title: string; description: string }> = {
  dashboard: { title: 'Vue d’ensemble', description: 'Voici ce qui se passe dans votre boutique.' },
  products: { title: 'Produits', description: 'Gérez votre catalogue et vos niveaux de stock.' },
  movements: { title: 'Mouvements de stock', description: 'Suivez chaque entrée et sortie de votre inventaire.' },
  inventory: { title: 'Inventaire', description: 'Comptez et rapprochez votre stock physique.' },
  alerts: { title: 'Alertes de stock', description: 'Les produits à réapprovisionner en priorité.' },
  reports: { title: 'Rapports & statistiques', description: 'Une vision claire de la performance de votre stock.' },
  settings: { title: 'Paramètres', description: 'Personnalisez votre espace de gestion.' }
}

function Workspace({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const stock = useStock()
  const [page, setPage] = useState<PageId>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sibaway-theme') !== 'light')
  const lowCount = stock.products.filter((product) => product.quantity <= product.alertThreshold).length
  const heading = headings[page]

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('sibaway-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} user={user} onLogout={onLogout} alertCount={lowCount} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Ouvrir le menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>sibaway</span><i>/</i><strong>{heading.title}</strong></div>
          <div className="topbar-actions">
            <div className={`sync-status ${!stock.isOnline ? 'offline' : stock.isSynced ? 'synced' : 'pending'}`}>
              {stock.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{!stock.isOnline ? 'Hors ligne' : stock.isSynced ? (isSupabaseConfigured ? 'Synchronisé' : 'Données locales') : 'Synchronisation…'}</span>
            </div>
            <button className="icon-button theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="topbar-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">BONJOUR, {user.name.split(' ')[0].toLocaleUpperCase('fr-FR')}</p><h1>{heading.title}</h1><p>{heading.description}</p></div></div>
          {stock.error && <div className="error-banner" role="alert">{stock.error}<button onClick={() => void stock.refresh()}>Réessayer</button></div>}
          {stock.loading ? <div className="loading-state"><span className="spinner" />Chargement de votre espace…</div> : (
            <>
              <Suspense fallback={<div className="loading-state"><span className="spinner" />Chargement de la page…</div>}>
                {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
                {page === 'products' && <Products user={user} />}
                {page === 'movements' && <Movements user={user} />}
                {page === 'inventory' && <Inventory user={user} />}
                {page === 'alerts' && <Alerts onNavigate={setPage} />}
                {page === 'reports' && <Reports />}
                {page === 'settings' && user.role === 'Administrateur' && <Settings />}
              </Suspense>
            </>
          )}
        </div>
        <MobileNav page={page} onNavigate={setPage} alertCount={lowCount} />
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    const client = supabase
    if (!isSupabaseConfigured || !client) return
    let active = true
    client.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) { if (active) setAuthLoading(false); return }
      const { data: profile, error } = await client.from('profiles').select('full_name, role').eq('id', data.session.user.id).single()
      if (active && !error) {
        setUser({ name: profile.full_name || data.session.user.email?.split('@')[0] || 'Utilisateur', email: data.session.user.email ?? '', role: profile.role as UserRole })
      }
      if (active) setAuthLoading(false)
    }).catch(() => { if (active) setAuthLoading(false) })
    const { data: subscription } = client.auth.onAuthStateChange(() => {})
    return () => { active = false; subscription.subscription.unsubscribe() }
  }, [])

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  if (authLoading) return <div className="auth-loading"><span className="spinner" />Vérification de la session…</div>
  if (!user) return <Login onLogin={setUser} />
  return <StockProvider user={user}><Workspace user={user} onLogout={() => void logout()} /></StockProvider>
}
