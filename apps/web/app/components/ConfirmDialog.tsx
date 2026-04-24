'use client';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.72)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '24px',
  } as React.CSSProperties,
  modal: {
    width: '100%',
    maxWidth: '520px',
    background: 'linear-gradient(180deg, #0b1737 0%, #09122b 100%)',
    border: '1px solid rgba(100,116,139,0.35)',
    borderRadius: '24px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
    padding: '28px',
  } as React.CSSProperties,
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#e5eefc',
    marginBottom: '12px',
  } as React.CSSProperties,
  message: {
    fontSize: '16px',
    lineHeight: 1.7,
    color: '#cbd5e1',
    marginBottom: '24px',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  cancelBtn: {
    padding: '12px 18px',
    borderRadius: '14px',
    border: '1px solid rgba(16,185,129,0.45)',
    background: 'rgba(16,185,129,0.18)',
    color: '#bbf7d0',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '15px',
  } as React.CSSProperties,
  confirmBtn: {
    padding: '12px 18px',
    borderRadius: '14px',
    border: '1px solid rgba(239,68,68,0.5)',
    background: 'rgba(127,29,29,0.18)',
    color: '#fecaca',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '15px',
  } as React.CSSProperties,
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>{title}</div>
        <div style={styles.message}>{message}</div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            style={styles.confirmBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
