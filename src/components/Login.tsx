import { useState } from 'react'
import { ArrowRight, Boxes, LockKeyhole } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AppUser, UserRole } from '../types'

export function Login({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!supabase) throw new Error('La connexion Supabase n’est pas disponible.')
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (!data.user) throw new Error('La connexion n’a pas abouti.')
      const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name, role').eq('id', data.user.id).single()
      if (profileError) throw profileError
      onLogin({
        name: profile.full_name || data.user.email?.split('@')[0] || 'Utilisateur',
        email: data.user.email ?? email,
        role: profile.role as UserRole
      })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Échec de la connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark"><Boxes size={25} /></div>
        <p className="eyebrow">GESTION DE STOCK</p>
        <h1>Bienvenue chez<br /><span>Sibaway.</span></h1>
        <p className="login-copy">Connectez-vous pour retrouver votre espace de gestion.</p>
        {isSupabaseConfigured ? (
          <form onSubmit={submit} className="login-form">
            <label>E-mail<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@entreprise.com" /></label>
            <label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-primary button-wide" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'} <ArrowRight size={17} /></button>
          </form>
        ) : (
          <div className="demo-login">
            <div className="demo-note"><LockKeyhole size={17} /><span>Mode démonstration · données stockées sur cet appareil</span></div>
            <button className="button button-primary button-wide" onClick={() => onLogin({ name: 'Aminata K.', email: 'aminata@sibaway.ci', role: 'Administrateur' })}>Entrer dans la démo <ArrowRight size={17} /></button>
            <p className="muted small">Configurez Supabase dans <code>.env</code> pour activer la connexion sécurisée.</p>
          </div>
        )}
        {error && !isSupabaseConfigured && <p className="form-error">{error}</p>}
      </div>
      <div className="login-decoration"><span>Votre stock.<br />En toute clarté.</span><small>La gestion simple, au quotidien.</small></div>
    </main>
  )
}
