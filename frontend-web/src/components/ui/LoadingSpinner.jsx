export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
      <div 
        style={{
          display: 'inline-block',
          width: '30px',
          height: '30px',
          border: '3px solid rgba(0,0,0,0.1)',
          borderRadius: '50%',
          borderTopColor: '#3498db',
          animation: 'spin 1s ease-in-out infinite'
        }} 
      />
      <p style={{ marginTop: '10px' }}>{message}</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
