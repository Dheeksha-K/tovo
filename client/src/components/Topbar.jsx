import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <Link to="/" className="brand">Tovo</Link>
      <div>
        <span className="muted">{user.name}</span>{' '}
        <button className="small" onClick={logout}>Log out</button>
      </div>
    </header>
  );
}