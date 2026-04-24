'use client';

import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';

type FlowNodeType =
  | 'file'
  | 'web'
  | 'network'
  | 'usb'
  | 'clipboard'
  | 'bluetooth'
  | 'airdrop'
  | 'sync'
  | 'media'
  | 'genai'
  | 'unknown';

type FlowIndicatorItem = {
  id?: string;
  name?: string;
  type?: string;
  kind?: string;
  matches?: number | null;
};

type FlowIndicatorGroup = {
  type: string;
  label: string;
  items: FlowIndicatorItem[];
};

type FlowNode = {
  type: FlowNodeType;
  title: string;
  label: string;
  secondaryLabel?: string;
  meta?: string;
  indicators?: FlowIndicatorGroup[];
  detectors?: FlowIndicatorGroup[];

};

type Props = {
  title: string;
  applicationName?: string;
  source: FlowNode;
  target?: FlowNode | null;
  getIndicatorVisual?: (
    type?: string | null,
    kind?: string | null
  ) => {
    backgroundColor: string;
    border: string;
    color: string;
  };
};

function getNodeIcon(type: FlowNodeType) {
  switch (type) {
    case 'file':
      return '📄';
    case 'web':
      return '🌐';
    case 'network':
      return '⛓️‍💥';
    case 'usb':
      return '💾';
    case 'clipboard':
      return '🔗';
    case 'bluetooth':
      return '🟦';
    case 'airdrop':
      return '📲';
    case 'sync':
      return '🔄';
    case 'media':
      return '💿';
    case 'genai':
      return '✨';
    default:
      return '•';
  }
}

const styles: Record<string, CSSProperties> = {
    wrapper: {
        display: 'grid',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'rgba(15, 23, 42, 0.45)'
    },
    title: {
        fontSize: 16,
        fontWeight: 700,
        color: '#e2e8f0',
        lineHeight: 1.2
    },
    appName: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: -2
    },
    flowWrap: {
        display: 'grid',
        gap: 0
    },
    sourceWrap: {
        position: 'relative',
        maxWidth: '100%'
    },
    targetWrap: {
        position: 'relative',
        marginLeft: 88,
        width: 'calc(100% - 88x)',
        maxWidth: 'calc(100% - 88px)'
    },
    connectorSvg: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible'
    },
    node: {
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'rgba(15, 23, 42, 0.55)',
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 12,
        minWidth: 0
    },
    nodeHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
    },
    nodeTitle: {
        fontSize: 13,
        fontWeight: 700,
        color: '#cbd5e1',
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
    },
    nodeMeta: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'right',
        whiteSpace: 'nowrap'
    },
    nodeBody: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        minWidth: 0
    },
    icon: {
        width: 28,
        minWidth: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20
    },
    textWrap: {
        display: 'grid',
        gap: 4,
        minWidth: 0,
        flex: 1
    },
    label: {
        fontSize: 16,
        lineHeight: 1.35,
        color: '#f8fafc',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        whiteSpace: 'pre-wrap',
        minWidth: 0
    },
    secondary: {
        fontSize: 13,
        color: '#94a3b8',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        whiteSpace: 'pre-wrap'
    },
    flowCanvas: {
        position: 'relative',
        display: 'grid',
        gap: 20
    }
};

function FlowNodeCard({
  node,
  getIndicatorVisual,
  innerRef
}: {
  node: FlowNode;
  getIndicatorVisual?: Props['getIndicatorVisual'];
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={innerRef} style={styles.node}>
        <div style={styles.nodeHeader}>
            <div style={styles.nodeTitle}>{node.title}</div>
            <div style={styles.nodeMeta}>{node.meta || node.type}</div>
        </div>

      <div style={styles.nodeBody}>
        <div style={styles.icon}>{getNodeIcon(node.type)}</div>

        <div style={styles.textWrap}>
          <div style={styles.label}>{node.label || '-'}</div>
          {node.secondaryLabel ? (
            <div style={styles.secondary}>{node.secondaryLabel}</div>
          ) : null}
        </div>
      </div>

      {node.indicators?.length ? (
        <div>
          <div style={{ fontSize: 15, color: '#cbd5e1', marginBottom: 8 }}>
            Indicadores
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {node.indicators.map((group, groupIdx) => (
              <div
                key={`${group.type}-${groupIdx}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    paddingTop: 4
                  }}
                >
                  {group.label}
                </span>

                <span style={{ fontSize: 12, color: '#93c5fd', paddingTop: 4 }}>
                  •
                </span>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
                  {group.items.map((indicator, index) => {
                    const visual = getIndicatorVisual?.(indicator.type, indicator.kind) || {
                      backgroundColor: '#475569',
                      border: '1px solid #94a3b8',
                      color: '#f8fafc'
                    };

                    return (
                      <span
                        key={`${indicator.id || indicator.name || 'indicator'}-${index}`}
                        style={{
                          borderRadius: 8,
                          padding: '3px 8px',
                          fontSize: 11,
                          lineHeight: 1.2,
                          backgroundColor: visual.backgroundColor,
                          border: visual.border,
                          color: visual.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          maxWidth: '100%',
                          wordBreak: 'break-word'
                        }}
                      >
                        {indicator.name || '-'}
                        {typeof indicator.matches === 'number' ? ` (${indicator.matches})` : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            {node.detectors?.length ? (
            <div>
                <div style={{ fontSize: 15, color: '#cbd5e1', marginBottom: 8 }}>
                Detectores
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                {node.detectors.map((group, groupIdx) => (
                    <div
                    key={`detector-${group.type}-${groupIdx}`}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 6
                    }}
                    >

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
                        {group.items.map((indicator, index) => {
                        const visual = getIndicatorVisual?.(indicator.type, indicator.kind) || {
                            backgroundColor: '#475569',
                            border: '1px solid #94a3b8',
                            color: '#f8fafc'
                        };

                        return (
                            <span
                            key={`detector-${indicator.id || indicator.name || 'indicator'}-${index}`}
                            style={{
                                borderRadius: 8,
                                padding: '3px 8px',
                                fontSize: 11,
                                lineHeight: 1.2,
                                backgroundColor: visual.backgroundColor,
                                border: visual.border,
                                color: visual.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                maxWidth: '100%',
                                wordBreak: 'break-word'
                            }}
                            >
                            {indicator.name || '-'}
                            {typeof indicator.matches === 'number' ? ` (${indicator.matches})` : ''}
                            </span>
                        );
                        })}
                    </div>
                    </div>
                ))}
                </div>
            </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function EndpointActivityFlowCard({
  title,
  applicationName,
  source,
  target,
  getIndicatorVisual
}: Props) {
  const flowCanvasRef = useRef<HTMLDivElement | null>(null);
  const sourceCardRef = useRef<HTMLDivElement | null>(null);
  const targetCardRef = useRef<HTMLDivElement | null>(null);
  const [connectorPath, setConnectorPath] = useState('');

  useLayoutEffect(() => {
    function updateConnector() {
      if (!target) {
        setConnectorPath('');
        return;
      }

      const canvas = flowCanvasRef.current;
      const sourceCard = sourceCardRef.current;
      const targetCard = targetCardRef.current;

      if (!canvas || !sourceCard || !targetCard) {
        setConnectorPath('');
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const sourceRect = sourceCard.getBoundingClientRect();
      const targetRect = targetCard.getBoundingClientRect();

      const startX = sourceRect.left - canvasRect.left + 28;
      const startY = sourceRect.bottom - canvasRect.top;
      const endX = targetRect.left - canvasRect.left + 10;
      const endY = targetRect.top - canvasRect.top + targetRect.height / 2;

      const verticalMidY = startY + 26;
      const elbowX = startX;
      const horizontalStartX = startX + 18;
      const arrowBaseX = Math.max(horizontalStartX + 24, endX - 16);

      const path = [
        `M ${startX} ${startY}`,
        `L ${elbowX} ${verticalMidY}`,
        `Q ${elbowX} ${endY} ${horizontalStartX} ${endY}`,
        `L ${arrowBaseX} ${endY}`
      ].join(' ');

      setConnectorPath(path);
    }

    updateConnector();
    window.addEventListener('resize', updateConnector);

    return () => {
      window.removeEventListener('resize', updateConnector);
    };
  }, [target, source, applicationName]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>{title}</div>
      {applicationName ? <div style={styles.appName}>{applicationName}</div> : null}

      <div style={styles.flowWrap}>
        <div ref={flowCanvasRef} style={styles.flowCanvas}>
          <div style={styles.sourceWrap}>
              <FlowNodeCard
                node={source}
                getIndicatorVisual={getIndicatorVisual}
                innerRef={sourceCardRef}
              />
          </div>

          {target ? (
              <div style={styles.targetWrap}>
                  <FlowNodeCard
                    node={target}
                    getIndicatorVisual={getIndicatorVisual}
                    innerRef={targetCardRef}
                  />
              </div>
          ) : null}

          {target && connectorPath ? (
            <svg style={styles.connectorSvg} aria-hidden="true">
              <path
                d={connectorPath}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={(() => {
                  const match = connectorPath.match(/^M\s*([\d.]+)\s+([\d.]+)/);
                  return match ? Number(match[1]) : 0;
                })()}
                cy={(() => {
                  const match = connectorPath.match(/^M\s*([\d.]+)\s+([\d.]+)/);
                  return match ? Number(match[2]) : 0;
                })()}
                r="5"
                fill="#60a5fa"
              />
              {(() => {
                const match = connectorPath.match(/L\s*([\d.]+)\s+([\d.]+)\s*$/);
                const arrowX = match ? Number(match[1]) : 0;
                const arrowY = match ? Number(match[2]) : 0;

                return (
                  <>
                    <path
                      d={`M ${arrowX} ${arrowY} L ${arrowX - 14} ${arrowY - 10}`}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${arrowX} ${arrowY} L ${arrowX - 14} ${arrowY + 10}`}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </>
                );
              })()}
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}