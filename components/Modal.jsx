'use client';
export default function Modal({ open, onClose, width, align, children }) {
  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" style={{ width, textAlign: align }}>{open ? children : null}</div>
    </div>
  );
}
