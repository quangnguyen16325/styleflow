export default function ErrorMessage({ error }) {
  const code = error?.code || 'ERROR';
  const message = error?.message || 'Something went wrong. Please try again.';

  return (
    <div style={{ padding: '15px', background: '#ffebee', color: '#c62828', borderRadius: '4px', margin: '10px 0' }}>
      <p style={{ margin: 0, fontWeight: 'bold' }}>[{code}]</p>
      <p style={{ margin: '5px 0 0 0' }}>{message}</p>
    </div>
  );
}
