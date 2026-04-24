'use client';

import type { CSSProperties } from 'react';

type Props = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const size = 20;

const styles: Record<string, CSSProperties> = {
  button: {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    border: '1px solid rgba(148, 163, 184, 0.45)',
    background: 'rgba(255,255,255,0.04)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
    transition:
      'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease',
    boxShadow: '0 0 0 rgba(96, 165, 250, 0)'
  },

  buttonChecked: {
    background: '#75a9ff',
    border: '1px solid #8bb8ff',
    boxShadow: '0 0 0 3px rgba(117, 169, 255, 0.16), 0 0 14px rgba(117, 169, 255, 0.18)'
  },

  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed'
  },

  check: {
    width: 8,
    height: 4,
    borderLeft: '2px solid #ffffff',
    borderBottom: '2px solid #ffffff',
    transform: 'rotate(-45deg) translateY(-1px)',
    transformOrigin: 'center',
    marginTop: -1
  }
};

export default function RoundCheckbox({
  checked,
  onChange,
  disabled,
  onClick
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? 'Desmarcar item' : 'Marcar item'}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
        if (!disabled) onChange();
      }}
      style={{
        ...styles.button,
        ...(checked ? styles.buttonChecked : {}),
        ...(disabled ? styles.buttonDisabled : {})
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.borderColor = '#8bb8ff';
        event.currentTarget.style.boxShadow =
          checked
            ? '0 0 0 3px rgba(117, 169, 255, 0.16), 0 0 14px rgba(117, 169, 255, 0.24)'
            : '0 0 0 3px rgba(117, 169, 255, 0.08)';
      }}
      onMouseLeave={(event) => {
        if (disabled) return;
        event.currentTarget.style.borderColor = checked
          ? '#8bb8ff'
          : 'rgba(148, 163, 184, 0.45)';
        event.currentTarget.style.boxShadow = checked
          ? '0 0 0 3px rgba(117, 169, 255, 0.16), 0 0 14px rgba(117, 169, 255, 0.18)'
          : '0 0 0 rgba(96, 165, 250, 0)';
      }}
      onMouseDown={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = 'scale(0.96)';
      }}
      onMouseUp={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {checked ? <span style={styles.check} /> : null}
    </button>
  );
}