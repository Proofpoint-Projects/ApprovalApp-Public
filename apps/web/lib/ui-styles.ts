import type { CSSProperties } from 'react';

export type StyleMap = Record<string, CSSProperties>;

export function mergeStyles(
  base: StyleMap,
  overrides?: Partial<StyleMap>
): StyleMap {
  if (!overrides) return base;

  const merged: StyleMap = { ...base };

  for (const key of Object.keys(overrides)) {
    merged[key] = {
      ...(base[key] || {}),
      ...(overrides[key] || {})
    };
  }

  return merged;
}


export function stylesForRow(selected: boolean): CSSProperties {
  return selected
    ? { background: 'rgba(37, 99, 235, 0.16)' }
    : {};
}


export const sharedStyles: StyleMap = {
  pageTwoColumns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 600px) minmax(0, 1fr)',
    gap: 20,
    alignItems: 'start',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    padding: '0 32px 0 8px'
  },

  pageSidebarDetail: {
    display: 'grid',
    gridTemplateColumns: 'minmax(340px, 600px) minmax(0, 1fr)',
    gap: 18,
    width: '100%',
    alignItems: 'start',
    minWidth: 0,
    boxSizing: 'border-box',
    overflowX: 'hidden',
    padding: '0 32px 0 8px'
  },

  card: {
    background: 'rgba(8, 22, 58, 0.92)',
    border: '1px solid rgba(71, 85, 105, 0.35)',
    borderRadius: '22px',
    padding: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box', 
    overflowX: 'hidden'
  },

  miniCard: {
    background: 'linear-gradient(180deg, #232f50 0%, #132042bb 100%)',
    border: '1px solid #60a5fa1f',
    borderRadius: 14,
    padding: 14,
    color: '#e5eefc',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden'
  },

  title: {
   color: '#e5eefc',
    fontWeight: 800,
    fontSize: 20,
    lineHeight: 1.2,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  titleCenter: {
   color: '#e5eefc',
    fontWeight: 800,
    marginBottom: '20px',
    fontSize: 20,
    lineHeight: 1.2,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  },

  
  subtitle: {
    fontSize: '17px',
    color: '#94a3b8',
    marginBottom: '20px',
    lineHeight: 1.55
  },

  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: 16,
    fontWeight: 700,
    color: '#eff6ff'
  },

  sectionDivider: {
    gridColumn: '1 / -1',
    marginTop: '1px',
    marginBottom: '3px',
    paddingTop: '6px',
    color: '#93c5fd',
    fontWeight: 800,
    fontSize: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },

  sectionDividerResources: {
    gridColumn: '1 / -1',
    marginTop: '1px',
    marginBottom: '2px',
    paddingTop: '6px',
    color: '#93c5fd',
    fontWeight: 800,
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },

  toolbar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16
  },

  input: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.35)',
    background: '#0b1737',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '14px'
  },

  

  searchInput: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.35)',
    background: '#0b1737',
    color: '#e2e8f0',
    fontSize: '12px',
    outline: 'none',
    marginBottom: '14px'
  },

  textarea: {
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
  },

  button: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.45)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px'
  },

  buttonTable: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.45)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '12px'
  },

  buttonActiveTable: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    background: 'rgba(117, 169, 255, 0.16)',
    color: '#dbeafe',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '12px'
  },
  
  buttonActive: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    background: 'rgba(117, 169, 255, 0.16)',
    color: '#dbeafe',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '14px'
  },

  primaryBtn: { 
    padding: '14px 18px', 
    borderRadius: '16px', 
    border: 'none', 
    background: '#75a9ff', 
    color: '#081225', 
    fontWeight: 800, 
    cursor: 'pointer', 
    fontSize: '15px' 
  },

  primaryButton: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: 'none',
    background: '#75a9ff',
    color: '#081225',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '14px'
  },

  primaryButtonDisabled: {
    padding: '10px 14px',
    borderRadius: '12px',
    border: 'none',
    background: '#4b5563',
    color: '#cbd5e1',
    fontWeight: 800,
    cursor: 'not-allowed',
    fontSize: '14px',
    opacity: 0.7
  },

  infoBox: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(71,85,105,0.35)',
    background: 'rgba(15,23,42,0.72)',
    color: '#e2e8f0',
    fontSize: '14px'
  },
  proofpointChipSmall: {
    padding: '3px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    lineHeight: 1.2,
    fontWeight: 700
  },
  errorBox: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(244,63,94,0.35)',
    background: 'rgba(127,29,29,0.15)',
    color: '#fca5a5',
    fontSize: '14px'
  },
  messageInfo: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(71,85,105,0.35)',
    background: 'rgba(15,23,42,0.72)',
    color: '#e2e8f0',
    fontSize: '14px'
    },

  messageError: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(244,63,94,0.35)',
    background: 'rgba(127,29,29,0.15)',
    color: '#fca5a5',
    fontSize: '14px'
  },
  successBox: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(16,185,129,0.45)',
    background: 'rgba(6,78,59,0.2)',
    color: '#bbf7d0',
    fontSize: '14px'
  },

  tableWrap: {
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    border: '1px solid rgba(96, 165, 250, 0.14)',
    background: 'rgba(2, 6, 23, 0.75)',
    borderRadius: 12,
    boxSizing: 'border-box'
  },

  table: {
    width: '100%',
    maxWidth: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'auto'
  },

  th: {
    textAlign: 'left',
    padding: 10,
    fontSize: 10,
    color: '#93c5fd',
    background: '#020617',
    borderBottom: '1px solid rgba(96, 165, 250, 0.14)',
    verticalAlign: 'top'
  },

  td: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(96, 165, 250, 0.08)',
    verticalAlign: 'top',
    whiteSpace: 'normal',
    fontSize: 12,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere'
  },

  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: 'rgba(30, 41, 59, 0.68)',
    border: '1px solid rgba(96, 165, 250, 0.18)',
    color: '#dbeafe'
  },

  labelGrid: {
    display: 'grid',
    gap: 8
  },

  detailLabel: {
    color: '#94a3b8',
    fontSize: '15px',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700
  },

  detailValue: {
    color: '#e5eefc',
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },

  kvLine: {
    display: 'block',
    marginBottom: '4px',
    color: '#e5eefc',
    fontSize: '15px',
    lineHeight: 1.5
  },

  kvKey: {
    fontWeight: 800,
    color: '#ffffff'
  },

  kvValue: {
    fontWeight: 500,
    color: '#e5eefc',
    wordBreak: 'break-word'
  },

  detailBlock: {
    display: 'grid',
    gap: 6
  },

  chipWrap: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    minWidth: 0,
    maxWidth: '100%',
    alignItems: 'flex-start'
  },

  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: 'rgba(37, 99, 235, 0.16)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    color: '#dbeafe'
  },

  proofpointChip: {
    padding: '5px 9px',
    borderRadius: '999px',
    background: 'rgba(30,41,59,0.95)',
    border: '1px solid rgba(59,130,246,0.35)',
    color: '#dbeafe',
    fontSize: '11px',
    fontWeight: 700
  },

  proofpointChipLarge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(30,41,59,0.95)',
    border: '1px solid rgba(59,130,246,0.35)',
    color: '#dbeafe',
    fontSize: '11px',
    fontWeight: 700,
    lineHeight: 1.25,
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere'
  },

  fileList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10
  },

  fileItem: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    background: 'rgba(30, 41, 59, 0.55)',
    border: '1px solid rgba(96, 165, 250, 0.12)',
    borderRadius: 10,
    padding: '8px 10px',
    color: '#dbeafe'
  },

  stack: {
    display: 'grid',
    gap: 14
  },

  flowBox: {
    background: 'linear-gradient(180deg, #04153fde 0%, #132042bb 100%)',
    border: '1px solid #60a5fa1f',
    borderRadius: 12,
    padding: 12,
    display: 'grid',
    gap: 8,
    alignContent: 'start',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden'
  },

  flowTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#dbeafe',
    marginBottom: 8
  },

  flowArrow: {
    fontWeight: 700,
    color: '#60a5fa',
    margin: '8px 0'
  },

  resourceCardWrap: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    alignItems: 'stretch',
    marginTop: '4px',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%'
  },

  resourceCard: {
    background: 'rgba(2, 6, 23, 0.72)',
    border: '1px solid rgba(96, 165, 250, 0.14)',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'flex-start',
    height: '100%',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden'
  },

  resourceLocations: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    marginBottom: '8px'
  },

  inlineIndicatorText: {
    color: '#e5eefc',
    fontSize: '14px',
    lineHeight: 1.5,
    fontWeight: 500,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },

  indicatorRow: {
    display: 'grid',
    gridTemplateColumns: 'max-content auto',
    gap: 10,
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    minWidth: 0
  },

  indicatorLabel: {
    color: '#93c5fd',
    fontSize: '13px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: 1.4,
    paddingTop: 2,
    minWidth: 0,  
    whiteSpace: 'nowrap'

  },

  indicatorChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    width: 'fit-content',
    maxWidth: '100%',
    minWidth: 0,
    alignItems: 'center'
  },

  screenshotGrid: {
    display: 'grid',
    gap: 12
  },

  screenshotCard: {
    background: 'rgba(2, 6, 23, 0.72)',
    border: '1px solid rgba(96, 165, 250, 0.14)',
    borderRadius: 12,
    padding: 14
  },

  screenshotImage: {
    width: '100%',
    height: 'auto',
    borderRadius: 10,
    border: '1px solid rgba(96, 165, 250, 0.12)',
    marginBottom: 10
  },

  screenshotMeta: {
    display: 'grid',
    gap: 6,
    color: '#dbeafe',
    fontSize: 13
  },

  rangeRow: {
    display: 'flex',
    gap: 0,
    marginBottom: 14,
    border: '1px solid rgba(96, 165, 250, 0.18)',
    borderRadius: 16,
    overflow: 'hidden',
    width: 'fit-content',
    background: 'rgba(2, 6, 23, 0.7)'
  },

  rangeButton: {
    padding: '12px 18px',
    border: 'none',
    borderRight: '1px solid rgba(96, 165, 250, 0.12)',
    background: 'transparent',
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer'
  },

  rangeButtonActive: {
    background: '#3b82f6',
    color: '#eff6ff'
  },

  quickTabsWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    border: '1px solid rgba(100,116,139,0.4)',
    borderRadius: '14px',
    overflow: 'hidden',
    marginBottom: '14px'
  },

  tab: {
    padding: '10px 8px',
    textAlign: 'center',
    background: 'transparent',
    color: '#cbd5e1',
    border: 'none',
    borderRight: '1px solid rgba(100,116,139,0.3)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
    minHeight: '44px'
  },

  tabActive: {
    padding: '10px 8px',
    textAlign: 'center',
    background: '#4f6df0',
    color: '#ffffff',
    border: 'none',
    borderRight: '1px solid rgba(100,116,139,0.3)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
    minHeight: '44px'
  },

  customBlock: {
    marginBottom: '14px'
  },

  customLabel: {
    color: '#cbd5e1',
    fontSize: '13px',
    marginBottom: '8px'
  },

  customRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap'
  },

  customGrid: {
    display: 'grid',
    gridTemplateColumns: '88px minmax(0, 1fr)',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px'
  },

  customInput: {
    width: 88,
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.35)',
    background: '#0b1737',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none'
  },

  numberInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(100,116,139,0.35)',
    background: '#0b1737',
    color: '#e2e8f0',
    fontSize: '16px',
    textAlign: 'center'
  },

  segmented: {
    display: 'flex',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid rgba(96, 165, 250, 0.18)',
    background: 'rgba(2, 6, 23, 0.7)'
  },

  segmentedButton: {
    padding: '11px 16px',
    border: 'none',
    borderRight: '1px solid rgba(96, 165, 250, 0.12)',
    background: 'transparent',
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer'
  },

  segmentedButtonActive: {
    background: '#2563eb',
    color: '#eff6ff'
  },

  unitTabsWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    border: '1px solid rgba(100,116,139,0.4)',
    borderRadius: '14px',
    overflow: 'hidden',
    minWidth: 0
  },

  applyCustomWrap: {
    display: 'flex',
    justifyContent: 'flex-end'
  },

  list: {
    display: 'grid',
    gap: '10px',
    maxHeight: 'calc(100vh - 320px)',
    overflowY: 'auto',
    paddingRight: '4px'
  },

  row: {
    padding: '14px',
    borderRadius: '16px',
    background: 'rgba(11,23,55,0.65)',
    border: '1px solid rgba(71,85,105,0.28)',
    cursor: 'pointer'
  },

  rowActive: {
    padding: '14px',
    borderRadius: '16px',
    background: 'rgba(37,99,235,0.12)',
    border: '1px solid rgba(96,165,250,0.35)',
    cursor: 'pointer'
  },

  rowHeader: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },

  checkbox: {
    marginTop: '4px'
  },

  rowTitle: {
    color: '#f8fafc',
    fontSize: '15px',
    fontWeight: 800,
    marginBottom: '6px',
    lineHeight: 1.3
  },

  rowMeta: {
    color: '#cbd5e1',
    fontSize: '13px',
    lineHeight: 1.55
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },

  modal: {
    width: '100%',
    maxWidth: '560px',
    background: '#0b1737',
    border: '1px solid rgba(71,85,105,0.35)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px'
  },

  helper: {
    color: '#94a3b8',
    fontSize: '14px',
    marginTop: '6px'
  },

  select: {
    minWidth: '180px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(100,116,139,0.35)',
    background: '#0b1737',
    color: '#e2e8f0',
    fontSize: '15px'
  },

  innerCard: {
    background: '#0b1737',
    border: '1px solid rgba(71,85,105,0.35)',
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '18px'
  },

  innerTitle: {
    color: '#e5eefc',
    fontSize: '18px',
    fontWeight: 800,
    marginBottom: '8px'
  },

  innerSubtitle: {
    color: '#94a3b8',
    fontSize: '13px',
    marginBottom: '14px',
    lineHeight: 1.5
  },

  statBox: {
    background: '#0b1737',
    border: '1px solid rgba(71,85,105,0.35)',
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '14px'
  },

  statLabel: {
    color: '#94a3b8',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px'
  },

  statValue: {
    color: '#e5eefc',
    fontSize: '24px',
    fontWeight: 700
  },

  secretFieldWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: '14px'
  },
  

  secretWrap: {
    position: 'relative',
    marginBottom: '8px'
  },
  
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 2
  },

  inputDisabled: {
    width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '11px 48px 11px 14px',
      borderRadius: '12px',
      border: '1px solid rgba(100,116,139,0.35)',
      background: '#0b1737',
      color: '#e2e8f0',
      fontSize: '14px',
      outline: 'none',
      marginBottom: '14px'
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: '14px'
  },

  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '20px'
  },

  secondaryBtn: {
    padding: '14px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(100,116,139,0.5)',
    background: 'transparent',
    color: '#e2e8f0',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '15px'
  },

  dangerBtn: {
    padding: '14px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(244,63,94,0.5)',
    background: 'rgba(127,29,29,0.15)',
    color: '#fecdd3',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '15px'
  },

   successBtn: { 
    padding: '14px 18px', 
    borderRadius: '16px', 
    border: '1px solid rgba(16,185,129,0.45)', 
    background: 'rgba(6,78,59,0.2)', 
    color: '#bbf7d0', 
    fontWeight: 700, 
    cursor: 'pointer', 
    fontSize: '15px' }
};