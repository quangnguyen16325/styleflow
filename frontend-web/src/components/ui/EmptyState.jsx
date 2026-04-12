export default function EmptyState({ title = 'No Data', description = 'There is nothing to display here right now.' }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{title}</h3>
      <p style={{ margin: 0, color: '#777' }}>{description}</p>
    </div>
  );
}
