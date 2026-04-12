export default function Header() {
  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0
    }}>
      <div>
        {/* Placeholder for Breadcrumbs or Search */}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#202124' }}>Admin User</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#5f6368' }}>admin@styleflow.local</p>
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#1a73e8',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}>
          A
        </div>
      </div>
    </header>
  );
}
