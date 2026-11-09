import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header"><div><p className="eyebrow">GESTION DU STOCK</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></header>
        {children}
      </section>
    </div>
  )
}
