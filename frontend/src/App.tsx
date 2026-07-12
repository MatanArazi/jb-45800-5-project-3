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

type AppView = 'home' | 'ai' | 'mcp' | 'create' | 'report';

interface AiResponse {
  success: boolean;
  recommendation?: string;
  error?: string;
}

interface McpResponse {
  success: boolean;
  answer?: string;
  error?: string;
}

interface ReportRow {
  destination: string;
  likes: number;
}

interface ReportResponse {
  success: boolean;
  data: ReportRow[];
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

  // Admin edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDestination, setEditDestination] = useState<string>('');
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

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
  const [view, setView] = useState<AppView>('home');

  // AI page state
  const [aiDestination, setAiDestination] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // MCP page state
  const [mcpQuestion, setMcpQuestion] = useState<string>('');
  const [mcpResult, setMcpResult] = useState<string>('');
  const [mcpLoading, setMcpLoading] = useState<boolean>(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  useEffect(() => {
    if (currentUser && view === 'report') {
      fetchVacationReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, view]);

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
          const imageVersion = encodeURIComponent(v.image_url || 'no-image');
          const key = `vacation_image_${v.vacation_id}_${imageVersion}`;
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
      const likedSet = new Set(
        withImages
          .filter((v) => Number(v.liked_by_current_user || 0) > 0)
          .map((v) => v.vacation_id)
      );
      setUserLikes(likedSet);
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
      if (!newTitle || !newDescription || !newDestination || !newStart || !newEnd || !newPrice || !newImageFile) {
        alert('All fields are required, including image');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      if (newStart < today) {
        alert('Start date cannot be in the past');
        return;
      }
      if (newEnd < newStart) {
        alert('End date must be after start date');
        return;
      }

      const numericPrice = Number(newPrice);
      if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 10000) {
        alert('Price must be between 0 and 10000');
        return;
      }

      const form = new FormData();
      form.append('title', newTitle);
      form.append('description', newDescription);
      form.append('destination', newDestination);
      form.append('start_date', newStart);
      form.append('end_date', newEnd);
      form.append('price', String(numericPrice));
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
      setView('home');
      fetchVacations(page, filter);
      fetchStats();
    } catch (err) {
      console.error('Create vacation failed:', err);
      alert('Failed to create vacation');
    }
  };

  const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const startEditVacation = (vacation: Vacation): void => {
    setView('create');
    setEditingId(vacation.vacation_id);
    setEditTitle(vacation.title);
    setEditDescription(vacation.description);
    setEditDestination(vacation.destination);
    setEditStart(vacation.start_date.split('T')[0]);
    setEditEnd(vacation.end_date.split('T')[0]);
    setEditPrice(String(vacation.price));
    setEditImageFile(null);
    setShowAdminCreate(false);
  };

  const fetchVacationReport = async (): Promise<void> => {
    try {
      setReportLoading(true);
      setReportError(null);
      const res = await axios.get<ReportResponse>(`${API_BASE}/reports/vacation-likes`);
      setReportRows((res.data?.data || []).map((r) => ({ destination: r.destination, likes: Number(r.likes || 0) })));
    } catch (err: any) {
      setReportError(err?.response?.data?.error || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReportCsv = async (): Promise<void> => {
    try {
      const res = await axios.get<Blob>(`${API_BASE}/reports/vacation-likes.csv`, { responseType: 'blob' });
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vacation-likes-report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  const handleUpdateVacation = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      if (editStart < today) {
        alert('Start date cannot be in the past');
        return;
      }
      if (editEnd < editStart) {
        alert('End date must be after start date');
        return;
      }

      const form = new FormData();
      form.append('title', editTitle);
      form.append('description', editDescription);
      form.append('destination', editDestination);
      form.append('start_date', editStart);
      form.append('end_date', editEnd);
      form.append('price', editPrice);
      if (editImageFile) form.append('image', editImageFile);

      await axios.put(`${API_BASE}/vacations/${editingId}`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(currentUser?.user_id ? { 'x-user-id': String(currentUser.user_id) } : {}),
        },
      });

      setEditingId(null);
      fetchVacations(page, filter);
      fetchStats();
      alert('Vacation updated successfully!');
    } catch (err) {
      console.error('Update vacation failed:', err);
      alert('Failed to update vacation');
    }
  };

  const handleDeleteVacation = async (vacationId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this vacation?')) return;

    try {
      await axios.delete(`${API_BASE}/vacations/${vacationId}`, {
        headers: currentUser?.user_id ? { 'x-user-id': String(currentUser.user_id) } : {},
      });

      fetchVacations(page, filter);
      fetchStats();
      alert('Vacation deleted successfully!');
    } catch (err) {
      console.error('Delete vacation failed:', err);
      alert('Failed to delete vacation');
    }
  }

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
    setView('home');
  };

  const askAiRecommendation = async (): Promise<void> => {
    if (!aiDestination.trim()) {
      setAiError('Please enter a destination first.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult('');
    try {
      const res = await axios.post<AiResponse>(`${API_BASE}/ai/recommendation`, {
        destination: aiDestination,
      });
      if (!res.data.success) {
        setAiError(res.data.error || 'Failed to fetch AI recommendation');
        return;
      }
      setAiResult(res.data.recommendation || 'No recommendation returned.');
    } catch (err: any) {
      setAiError(err?.response?.data?.error || 'Failed to fetch AI recommendation');
    } finally {
      setAiLoading(false);
    }
  };

  const askMcpQuestion = async (): Promise<void> => {
    if (!mcpQuestion.trim()) {
      setMcpError('Please enter a question first.');
      return;
    }

    setMcpLoading(true);
    setMcpError(null);
    setMcpResult('');
    try {
      const res = await axios.post<McpResponse>(`${API_BASE}/mcp/query`, {
        question: mcpQuestion,
      });
      if (!res.data.success) {
        setMcpError(res.data.error || 'Failed to query MCP server');
        return;
      }
      setMcpResult(res.data.answer || 'No answer returned.');
    } catch (err: any) {
      setMcpError(err?.response?.data?.error || 'Failed to query MCP server');
    } finally {
      setMcpLoading(false);
    }
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

      <div className="top-nav-shell">
        <nav className="top-nav" aria-label="Main navigation">
          <div className="top-nav-left">
            <button
              className={`nav-pill ${view === 'home' && filter === 'all' ? 'active-filter' : ''}`}
              onClick={() => { setView('home'); changeFilter('all'); }}
            >
              Home
            </button>
            {(['all', 'liked', 'active', 'future'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setView('home'); changeFilter(f); }}
                className={`nav-pill ${view === 'home' && filter === f ? 'active-filter' : ''}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="top-nav-right">
            {isAdmin && (
              <>
                <button
                  className={`nav-pill nav-pill-tool ${view === 'create' ? 'active-filter' : ''}`}
                  onClick={() => {
                    setView('create');
                    setShowAdminCreate(true);
                    setEditingId(null);
                  }}
                >
                  Add Vacation
                </button>
                <button
                  className={`nav-pill nav-pill-tool ${view === 'report' ? 'active-filter' : ''}`}
                  onClick={() => setView('report')}
                >
                  Vacation Report
                </button>
              </>
            )}
            <button
              className={`nav-pill nav-pill-tool ${view === 'ai' ? 'active-filter' : ''}`}
              onClick={() => setView('ai')}
            >
              AI reccomendations
            </button>
            <button
              className={`nav-pill nav-pill-tool ${view === 'mcp' ? 'active-filter' : ''}`}
              onClick={() => setView('mcp')}
            >
              Any questions? click here
            </button>
          </div>
        </nav>
      </div>

      {/* Stats Dashboard */}
      {view === 'home' && stats && (
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
        {view === 'home' && error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Make sure to start the backend server:
              <br />
              <code>cd backend && npm install && npm start</code>
            </p>
          </div>
        )}

        {view === 'ai' && (
          <section className="panel-section">
            <h2>AI Travel Recommendation</h2>
            <p>Enter a destination and get a personalized recommendation.</p>
            <div className="panel-form">
              <input
                type="text"
                value={aiDestination}
                onChange={(e) => setAiDestination(e.target.value)}
                placeholder="Destination (for example: Tokyo, Japan)"
              />
              <button onClick={askAiRecommendation} disabled={aiLoading}>
                {aiLoading ? 'Thinking...' : 'Get Recommendation'}
              </button>
            </div>
            {aiError && <div className="auth-error">{aiError}</div>}
            {aiResult && <div className="panel-result">{aiResult}</div>}
          </section>
        )}

        {view === 'mcp' && (
          <section className="panel-section">
            <h2>MCP Database Assistant</h2>
            <p>Ask a data question about vacations. The backend MCP server will answer from the database.</p>
            <div className="panel-form">
              <input
                type="text"
                value={mcpQuestion}
                onChange={(e) => setMcpQuestion(e.target.value)}
                placeholder="Example: How many active vacations are there now?"
              />
              <button onClick={askMcpQuestion} disabled={mcpLoading}>
                {mcpLoading ? 'Querying...' : 'Ask MCP'}
              </button>
            </div>
            <div className="panel-hints">
              <strong>Try:</strong> Active vacations count, average price, future Europe vacations.
            </div>
            {mcpError && <div className="auth-error">{mcpError}</div>}
            {mcpResult && <div className="panel-result">{mcpResult}</div>}
          </section>
        )}

        {view === 'create' && isAdmin && (
          <section className="panel-section">
            <h2>{editingId ? 'Edit Vacation' : 'Add Vacation'}</h2>

            {!editingId && (
              <form onSubmit={handleCreateVacation} className="admin-create-form">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                  <input placeholder="Destination" value={newDestination} onChange={(e) => setNewDestination(e.target.value)} required />
                  <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} min={getTodayString()} required />
                  <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} min={newStart || getTodayString()} required />
                  <input type="number" min={0} max={10000} step="0.01" placeholder="Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                  <input placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} required />
                  <input type="file" accept="image/*" onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)} required />
                </div>
                <div style={{ marginTop: 8 }}>
                  <button type="submit">Create Vacation</button>
                </div>
              </form>
            )}

            {editingId && (
              <form onSubmit={handleUpdateVacation} className="admin-create-form" style={{ border: '2px solid #ffc107', padding: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                  <input placeholder="Destination" value={editDestination} onChange={(e) => setEditDestination(e.target.value)} required />
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} min={getTodayString()} required />
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} min={editStart || getTodayString()} required />
                  <input type="number" min={0} max={10000} step="0.01" placeholder="Price" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
                  <input placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required />
                  <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <button type="submit">Update Vacation</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ marginLeft: 8 }}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        )}

        {view === 'report' && isAdmin && (
          <section className="panel-section">
            <h2>Vacation Likes Report</h2>
            <div style={{ marginBottom: 10 }}>
              <button onClick={downloadReportCsv}>Download CSV</button>
            </div>

            {reportLoading && <div className="loading"><p>Loading report...</p></div>}
            {reportError && <div className="auth-error">{reportError}</div>}

            {!reportLoading && !reportError && (
              <div className="report-chart-wrap">
                <div className="report-chart">
                  {reportRows.map((row) => {
                    const maxLikes = Math.max(1, ...reportRows.map((r) => Number(r.likes || 0)));
                    const pct = Math.max(2, Math.round((Number(row.likes || 0) / maxLikes) * 100));
                    return (
                      <div key={row.destination} className="report-bar-col">
                        <div className="report-bar-value">{row.likes}</div>
                        <div className="report-bar" style={{ height: `${pct}%` }} title={`${row.destination}: ${row.likes}`} />
                        <div className="report-bar-label">{row.destination}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'home' && (loading && !error ? (
          <div className="loading"><p>Loading vacations...⏳</p></div>
        ) : vacations.length === 0 ? (
          <div className="empty-state">
            <h2>No vacations found</h2>
            <p>Check back soon for amazing vacation packages!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, margin: '12px 0', alignItems: 'center' }}>
              <div><strong>Current Filter:</strong> {filter}</div>
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
              isAdmin={isAdmin}
              onEdit={startEditVacation}
              onDelete={handleDeleteVacation}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {Array.from({ length: Math.max(1, Math.ceil(total / limit)) }).map((_, idx) => (
                <button key={idx} onClick={() => goToPage(idx + 1)} className={page === idx + 1 ? 'active-page' : ''}>
                  {idx + 1}
                </button>
              ))}
            </div>
          </>
        ))}
      </main>

      <footer className="footer">
        <p>🏖️ Vacation Paradise © 2026 | Where Dreams Meet Reality</p>
      </footer>
    </div>
  );
}

export default App;
