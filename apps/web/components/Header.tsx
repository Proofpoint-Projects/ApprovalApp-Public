export default function Header() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        borderBottom: '1px solid rgba(71,85,105,0.35)',
        background: 'rgba(2, 6, 23, 0.9)'
      }}
    >
      <img
        src="/proofpoint-logo.png"
        alt="Proofpoint"
        style={{
          height: 26,
          objectFit: 'contain'
        }}
      />
    </div>
  );
}