'use client';

import { useState } from 'react';

type Props = {
  open: boolean;
  itemLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onDeny: (comment: string) => Promise<void>;
  onApprove1m: (comment: string) => Promise<void>;
  onApprove1h: (comment: string) => Promise<void>;
  onApprove6h: (comment: string) => Promise<void>;
};

export default function ApprovalDecisionDialog({
  open,
  itemLabel,
  busy,
  onClose,
  onDeny,
  onApprove1m, 
  onApprove1h,
  onApprove6h
}: Props) {
  const [comment, setComment] = useState('');

  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={title}>Decisão da aprovação</div>
        <div style={subtitle}>{itemLabel || 'Informe o motivo e escolha a ação.'}</div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Motivo / justificativa"
          style={textarea}
        />

        <div style={actions}>
          <button style={secondaryBtn} disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button style={dangerBtn} disabled={busy} onClick={() => onDeny(comment)}>
            Não aprovar
          </button>
          <button style={primaryBtn} disabled={busy} onClick={() => onApprove1h(comment)}>
            Aprovar 1 hora
          </button>
          <button style={primaryBtn} disabled={busy} onClick={() => onApprove6h(comment)}>
            Aprovar 6 horas
          </button>
          <button
              type="button"
              onClick={() => onApprove1m(comment)}
              disabled={busy}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: '#22c55e',
                color: '#081225',
                fontWeight: 800,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1
              }}
            >
              Teste 1 min
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2,6,23,0.68)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20
};

const modal: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  background: '#0b1737',
  border: '1px solid rgba(71,85,105,0.35)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
};

const title: React.CSSProperties = {
  color: '#e5eefc',
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 8
};

const subtitle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 14,
  marginBottom: 14,
  lineHeight: 1.5
};

const textarea: React.CSSProperties = {
 width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  minHeight: '90px',
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(100,116,139,0.35)',
  background: '#081225',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  marginTop: '12px',
  resize: 'none',
  display: 'block' 
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  marginTop: 16
};

const baseBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 14
};

const secondaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#1e293b',
  color: '#e2e8f0'
};

const dangerBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#7f1d1d',
  color: '#fecaca'
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#75a9ff',
  color: '#081225'
};