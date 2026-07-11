import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import VacationsGrid from './components/VacationsGrid';
import { Vacation, User, Stats } from './types';

const API_BASE = 'http://localhost:5000/api';

interface VacationsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  data: Vacation[];
}

interface StatsResponse {
  success: boolean;
  stats: Stats;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface CreateUserResponse {
  success: boolean;
  message?: string;
  user?: User;
  user_id?: number;
  error?: string;
}

function App() {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(9);
  const [total, setTotal] = useState<number>(0);
  const [filter, setFilter] = useState<string>('all');
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Admin create form
  const [showAdminCreate, setShowAdminCreate] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newDestination, setNewDestination] = useState<string>('');
  const [newStart, setNewStart] = useState<string>('');
  const [newEnd, setNewEnd] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  // Authentication / current user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null') as User | null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Signup-specific fields
  const [signupFirst, setSignupFirst] = useState<string>('');
  const [signupLast, setSignupLast] = useState<string>('');
  const [showSignupPopup, setShowSignupPopup] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser) {
      fetchVacations(page, filter);
      fetchStats();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, page, filter]);

  const fetchImageAsDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Image fetch failed');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const fetchVacations = async (pageArg: number = 1, filterArg: string = 'all'): Promise<void> => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: pageArg, limit, filter: filterArg };
      if (currentUser) params.user_id = currentUser.user_id;
      const response = await axios.get<VacationsResponse>(`${API_BASE}/vacations`, { params });
      const items: Vacation[] = response.data.data || [];
      setTotal(response.data.total || 0);
      setPage(response.data.page || pageArg);

      const withImages = await Promise.all(
        items.map(async (v) => {
          const key = `vacation_image_${v.vacation_id}`;
          try {
            const cached = localStorage.getItem(key);
            if (cached) return { ...v, displayImage: cached };
          } catch {}

          if (v.image_url) {
            try {
              const dataUrl = await fetchImageAsDataUrl(v.image_url);
              try { localStorage.setItem(key, dataUrl); } catch {}
              return { ...v, displayImage: dataUrl };
            } catch {
              return { ...v, displayImage: v.image_url };
            }
          }
          return { ...v };
        })
      );

      setVacations(withImages);
      setError(null);
    } catch (err) {
      console.error('Error fetching vacations:', err);
      setError('Failed to load vacations. Make sure the API server is running!');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await axios.get<StatsResponse>(`${API_BASE}/stats`);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const formatPrice = (p: string | number): string => {
    const n = Number(p);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  const changeFilter = (f: string): void => {
    setFilter(f);
    setPage(1);
  };

  const goToPage = (p: number): void => {
    setPage(p);
  };

  const toggleLike = async (vacationId: number): Promise<void> => {
    try {
      const userId = currentUser?.user_id;
      if (!userId) { alert('Please log in to like vacations'); return; }

      if (userLikes.has(vacationId)) {
        await axios.delete(`${API_BASE}/likes/${userId}/${vacationId}`);
        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(vacationId);
          return next;
        });
      } else {
        await axios.post(`${API_BASE}/likes`, { user_id: userId, vacation_id: vacationId });
        setUserLikes((prev) => new Set(prev).add(vacationId));
      }
      fetchVacations(page, filter);
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('Error updating like');
    }
  };

  const handleBooking = async (vacationId: number): Promise<void> => {
    try {
      const userId = currentUser?.user_id;
      if (!userId) { alert('Please log in to make a booking'); return; }
      await axios.post(`${API_BASE}/bookings`, { user_id: userId, vacation_id: vacationId, status: 'pending' });
      alert('Booking created successfully!');
      fetchStats();
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Error creating booking');
    }
  };

  const handleCreateVacation = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const form = new FormData();
      form.append('title', newTitle);
      form.append('description', newDescription);
      form.append('destination', newDestination);
      form.append('start_date', newStart);
      form.append('end_date', newEnd);
      form.append('price', newPrice);
      form.append('created_by', String(currentUser?.user_id ?? 1));
      if (newImageFile) form.append('image', newImageFile);

      await axios.post(`${API_BASE}/vacations`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(currentUser?.user_id ? { 'x-user-id': String(currentUser.user_id) } : {}),
        },
      });

      setNewTitle(''); setNewDescription(''); setNewDestination('');
      setNewStart(''); setNewEnd(''); setNewPrice(''); setNewImageFile(null);
      setShowAdminCreate(false);
      fetchVacations(page, filter);
      fetchStats();
    } catch (err) {
      console.error('Create vacation failed:', err);
      alert('Failed to create vacation');
    }
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await axios.post<AuthResponse>(`${API_BASE}/auth/login`, { email: loginEmail, password: loginPassword });
      if (res.data?.user) {
        setCurrentUser(res.data.user as User);
        try { localStorage.setItem('currentUser', JSON.stringify(res.data.user)); } catch {}
        setLoginEmail(''); setLoginPassword('');
      }
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const first = signupFirst || loginEmail.split('@')[0] || 'User';
      const last = signupLast || 'Guest';

      const res = await axios.post<CreateUserResponse>(`${API_BASE}/users`, {
        first_name: first, last_name: last, email: loginEmail, password_hash: loginPassword,
      });

      if (res.data?.user_id || res.data?.user) {
        const loginRes = await axios.post<AuthResponse>(`${API_BASE}/auth/login`, { email: loginEmail, password: loginPassword });
        if (loginRes.data?.user) {
          setCurrentUser(loginRes.data.user as User);
          try { localStorage.setItem('currentUser', JSON.stringify(loginRes.data.user)); } catch {}
          setSignupFirst(''); setSignupLast(''); setLoginEmail(''); setLoginPassword('');
          setShowSignupPopup(false);
        }
      }
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || 'Signup failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = (): void => {
    setCurrentUser(null);
    try { localStorage.removeItem('currentUser'); } catch {}
    setVacations([]);
  };

  if (!currentUser) {
    return (
      <div className="auth-fullpage">
        <div className="auth-container">
          {!showSignupPopup ? (
            <div className="auth-card-large">
              <h1>Sign in to Vacation Paradise</h1>
              {authError && <div className="auth-error">{authError}</div>}
              <form onSubmit={handleLogin} className="auth-form-vertical">
                <label>Email</label>
                <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" required />
                <label>Password</label>
                <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" required />
                <div className="auth-actions-vertical">
                  <button type="submit" disabled={authLoading}>Sign in</button>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button type="button" onClick={() => setShowSignupPopup(true)} className="link-button">
                    Not a user? Create an account
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="signup-page">
              <div className="signup-card-large">
                <h1>Create your account</h1>
                {authError && <div className="auth-error">{authError}</div>}
                <form onSubmit={handleSignup} className="signup-form-vertical">
                  <label>First name</label>
                  <input value={signupFirst} onChange={(e) => setSignupFirst(e.target.value)} type="text" required />
                  <label>Last name</label>
                  <input value={signupLast} onChange={(e) => setSignupLast(e.target.value)} type="text" required />
                  <label>Email</label>
                  <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" required />
                  <label>Password</label>
                  <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" required />
                  <div className="auth-actions-vertical">
                    <button type="submit" disabled={authLoading}>Create account</button>
                    <button type="button" onClick={() => setShowSignupPopup(false)}>Back to sign in</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <h1>🏖️ Vacation Paradise</h1>
          <p>Discover and book your dream vacation</p>
        </div>
        <div className="header-user">
          <div className="user-badge">
            <span>👤 {currentUser.first_name} {currentUser.last_name}</span>
            <button className="logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Admin create vacation form */}
      {isAdmin && (
        <div style={{ padding: '8px 16px' }}>
          <button onClick={() => setShowAdminCreate((s) => !s)} style={{ marginBottom: 8 }}>
            Admin: Create Vacation
          </button>
          {showAdminCreate && (
            <form onSubmit={handleCreateVacation} className="admin-create-form">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                <input placeholder="Destination" value={newDestination} onChange={(e) => setNewDestination(e.target.value)} required />
                <input placeholder="Start date (YYYY-MM-DD)" value={newStart} onChange={(e) => setNewStart(e.target.value)} required />
                <input placeholder="End date (YYYY-MM-DD)" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} required />
                <input placeholder="Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                <input placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                <input type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} />
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="submit">Create Vacation</button>
                <button type="button" onClick={() => setShowAdminCreate(false)} style={{ marginLeft: 8 }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card"><h3>{stats.vacations}</h3><p>Vacations</p></div>
            <div className="stat-card"><h3>{stats.users}</h3><p>Users</p></div>
            <div className="stat-card"><h3>{stats.likes}</h3><p>Total Likes</p></div>
            <div className="stat-card"><h3>{stats.bookings}</h3><p>Bookings</p></div>
          </div>
        </section>
      )}

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Make sure to start the backend server:
              <br />
              <code>cd backend && npm install && npm start</code>
            </p>
          </div>
        )}

        {loading && !error ? (
          <div className="loading"><p>Loading vacations...⏳</p></div>
        ) : vacations.length === 0 ? (
          <div className="empty-state">
            <h2>No vacations found</h2>
            <p>Check back soon for amazing vacation packages!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, margin: '12px 0', alignItems: 'center' }}>
              <div>
                {(['all', 'liked', 'active', 'future'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => changeFilter(f)}
                    className={filter === f ? 'active-filter' : ''}
                    style={{ marginLeft: f !== 'all' ? 8 : 0 }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span>Page {page} / {Math.max(1, Math.ceil(total / limit))}</span>
              </div>
            </div>

            <VacationsGrid
              vacations={vacations}
              userLikes={userLikes}
              toggleLike={toggleLike}
              handleBooking={handleBooking}
              formatPrice={formatPrice}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {Array.from({ length: Math.max(1, Math.ceil(total / limit)) }).map((_, idx) => (
                <button key={idx} onClick={() => goToPage(idx + 1)} className={page === idx + 1 ? 'active-page' : ''}>
                  {idx + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>🏖️ Vacation Paradise © 2026 | Where Dreams Meet Reality</p>
      </footer>
    </div>
  );
}

export default App;
