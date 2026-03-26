import { useState } from 'react';
import { Chat } from '@/components/Chat/Chat';
import { Login } from '@/components/Auth/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [token, setToken]       = useState(() => localStorage.getItem('token') ?? '');
  const [username, setUsername] = useState(() => localStorage.getItem('username') ?? '');

  const handleLogin = (t: string, u: string) => {
    setToken(t);
    setUsername(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
  };

  if (!token) {
    return <Login onSuccess={handleLogin} apiUrl={API_URL} />;
  }

  return <Chat token={token} username={username} onLogout={handleLogout} />;
}

export default App;
