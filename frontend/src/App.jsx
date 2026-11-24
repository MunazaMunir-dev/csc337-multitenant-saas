import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [email, setEmail] = useState('admin@abc.test');
  const [password, setPassword] = useState('DemoPass123!');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function login(e) {
    e.preventDefault(); setMessage('');
    try {
      const data = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('token', data.token); setToken(data.token); setUser(data.user); setMessage('Signed in successfully.');
    } catch (err) { setMessage(err.message); }
  }

  async function loadOrders() {
    try { const data = await request('/api/v1/orders'); setOrders(data.orders); }
    catch (err) { setMessage(err.message); }
  }

  useEffect(() => { if (token) loadOrders(); }, [token]);

  async function createOrder(e) {
    e.preventDefault(); setMessage('');
    try {
      const data = await request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ items: [{ productId, quantity: Number(quantity) }] })
      });
      setMessage(`Accepted: ${data.order.id}. Kafka event: ${data.eventId}`);
      setProductId(''); await loadOrders();
    } catch (err) { setMessage(err.message); }
  }

  function logout() { localStorage.removeItem('token'); setToken(''); setUser(null); setOrders([]); }

  return <main className="shell">
    <header><div><p className="eyebrow">CSC337 · ADVANCED WEB TECHNOLOGIES</p><h1>OrderFlow <span>SaaS</span></h1><p className="sub">Multi-tenant order management and asynchronous processing</p></div>
      {token && <button className="ghost" onClick={logout}>Sign out</button>}</header>
    {!token ? <section className="panel login"><h2>Welcome back</h2><p>Use either demo tenant account to explore isolation.</p>
      <form onSubmit={login}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required /></label>
      <label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required /></label><button>Sign in</button></form>
      <div className="demo"><b>Tenant A:</b> admin@abc.test &nbsp; <b>Tenant B:</b> admin@xyz.test<br/>Password: DemoPass123!</div>
    </section> : <>
      <section className="welcome"><div><p className="eyebrow">ACTIVE WORKSPACE</p><h2>{user?.name || 'Tenant workspace'}</h2><p>{user?.email || 'Authenticated tenant session'}</p></div><span className="pill">Tenant isolated</span></section>
      <section className="grid">
        <div className="panel"><p className="eyebrow">CREATE ORDER</p><h2>New order</h2>
          <form onSubmit={createOrder}><label>Product UUID<input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="Paste a product UUID" required /></label>
          <label>Quantity<input type="number" min="1" max="1000" value={quantity} onChange={e=>setQuantity(e.target.value)} required /></label><button>Submit order · 202 Accepted</button></form>
          <p className="hint">Find product UUIDs using the SQL query in README, filtered by your tenant.</p>
        </div>
        <div className="panel"><p className="eyebrow">ASYNC PIPELINE</p><h2>Order processing</h2><div className="pipeline"><span>REST API</span><b>→</b><span>Kafka</span><b>→</b><span>Consumer</span></div><p className="hint">The API publishes an OrderCreated event. The consumer updates inventory and logs its partition and offset.</p></div>
      </section>
      <section className="panel"><div className="section-head"><div><p className="eyebrow">TENANT-SCOPED DATA</p><h2>Recent orders</h2></div><button className="ghost" onClick={loadOrders}>Refresh</button></div>
        {orders.length ? <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Created</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.id.slice(0,8)}…</td><td><span className="pill">{o.status}</span></td><td>{Number(o.total_amount).toFixed(2)}</td><td>{new Date(o.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="empty">No orders yet. Submit an order to start the event flow.</p>}
      </section>
    </>}
    {message && <div className="notice">{message}</div>}
    <footer>Learning project · PostgreSQL · KafkaJS · React</footer>
  </main>;
}
