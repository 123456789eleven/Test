// Shared chrome for every org-edit modal — same overlay/close pattern as
// SignInModal, so the five near-duplicate forms only need to supply their
// own fields/actions instead of each re-implementing backdrop-click-to-close.
export default function ModalShell({ title, sub, onClose, children }) {
  return (
    <div className="auth-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal">
        <button className="auth-modal-close" type="button" onClick={onClose}>✕</button>
        <h3>{title}</h3>
        {sub ? <p className="auth-modal-sub">{sub}</p> : null}
        {children}
      </div>
    </div>
  );
}
