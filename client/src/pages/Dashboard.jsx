import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="page">
      <header className="topbar">
        <strong>Tovo</strong>
        <div>
          <span className="muted">{user.name}</span>{' '}
          <button className="small" onClick={logout}>Log out</button>
        </div>
      </header>
      <h2>Your projects will appear here</h2>
    </div>
  );
}