import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../api';
import ErrorMessage from '../../components/ui/ErrorMessage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.login(email, password);
      // Save token and context
      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.customer));
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '400px', margin: '100px auto', padding: '40px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#202124' }}>Admin Login sign-in</h2>
      
      {error && <ErrorMessage error={error} />}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#5f6368' }}>Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#5f6368' }}>Password</label>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            placeholder="Min 8 characters"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '14px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
