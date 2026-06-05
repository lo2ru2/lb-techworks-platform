import { CustomerAuthForms } from './CustomerAuthForms';
import './customerAuth.css';

type Props = {
  open: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onAuthed: () => void;
};

export function CustomerAuthModal({ open, initialMode, onClose, onAuthed }: Props) {
  if (!open) return null;

  return (
    <div
      className="lb-auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-auth-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="lb-auth-modal" onClick={(e) => e.stopPropagation()}>
        <span id="lb-auth-modal-title" className="sr-only">
          Hyr ose regjistrohu
        </span>
        <button type="button" className="lb-auth-modal-close" onClick={onClose} aria-label="Mbyll">
          ×
        </button>
        <CustomerAuthForms
          variant="modal"
          initialMode={initialMode}
          onSuccess={() => {
            onAuthed();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
