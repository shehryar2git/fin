import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://127.0.0.1:8000';

function App() {
  // Existing state
  const [amount, setAmount] = useState(10000);
  const [quotes, setQuotes] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // NEW: Rate alert state
  const [currentRate, setCurrentRate] = useState(3.2552);
  const [targetRate, setTargetRate] = useState(3.30);
  const [direction, setDirection] = useState('above');
  const [alerts, setAlerts] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [lockedRate, setLockedRate] = useState(null);

  // Fetch current alerts on page load and every 10 seconds
  useEffect(() => {
    fetchAlerts();
    fetchLockedRate();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/api/alerts`);
      setAlerts(res.data.alerts);
      setCurrentRate(res.data.current_rate);
    } catch (err) {
      console.error('Failed to fetch alerts');
    }
  };

  const fetchLockedRate = async () => {
    try {
      const res = await axios.get(`${API}/api/rates/locked`);
      setLockedRate(res.data.locked ? res.data : null);
    } catch (err) {
      console.error('Failed to fetch locked rate');
    }
  };

  const createAlert = async () => {
    setAlertMessage('');
    try {
      await axios.post(`${API}/api/alerts`, {
        target_rate: parseFloat(targetRate),
        direction: direction
      });
      setAlertMessage(`✅ Alert created: notify me when rate goes ${direction} ${targetRate}`);
      fetchAlerts();
    } catch (err) {
      setAlertMessage(err.response?.data?.detail || 'Failed to create alert.');
    }
  };

  const deleteAlert = async (id) => {
    try {
      await axios.delete(`${API}/api/alerts/${id}`);
      fetchAlerts();
    } catch (err) {
      setAlertMessage('Failed to delete alert.');
    }
  };

  const lockCurrentRate = async () => {
    try {
      await axios.post(`${API}/api/rates/lock`, { rate: currentRate });
      setAlertMessage(`🔒 Locked in rate ${currentRate} for 24 hours`);
      fetchLockedRate();
    } catch (err) {
      setAlertMessage('Failed to lock rate.');
    }
  };

  // ---- Existing quote/transfer logic ----
  const getQuotes = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API}/api/quotes`, {
        amount_rub: parseFloat(amount)
      });
      setQuotes(response.data.quotes);
      setSelectedProvider(null);
      setConfirmed(false);
    } catch (error) {
      setMessage('Error fetching quotes. Is the backend running?');
    }
    setLoading(false);
  };

  const executeTransfer = async () => {
    if (!selectedProvider) return setMessage('Please select a provider first.');
    if (!confirmed) return setMessage('You must check the confirmation box.');

    try {
      const response = await axios.post(`${API}/api/transfer`, {
        quote_id: selectedProvider.provider_id,
        user_confirmed: true,
        recipient_bank: "Standard Bank"
      });
      setMessage(`✅ Success! Transaction ID: ${response.data.transaction_id}`);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Transfer failed.');
    }
  };

  return (
    <div className="container">
      <h1>RUB → PKR Remittance Optimizer</h1>
      <p className="subtitle">AI-powered comparison for Pakistani students in Russia</p>

      {/* ---------- RATE ALERT PANEL ---------- */}
      <div className="rate-panel">
        <div className="rate-header">
          <div>
            <span className="rate-label">Current rate</span>
            <span className="rate-value">1 RUB = {currentRate} PKR</span>
          </div>
          {lockedRate && (
            <div className="locked-badge">
              🔒 Locked: {lockedRate.rate} PKR
              <span className="locked-expiry">
                expires {new Date(lockedRate.expires_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="alert-creator">
          <label>Alert me when rate goes</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="above">above</option>
            <option value="below">below</option>
          </select>
          <input
            type="number"
            step="0.01"
            value={targetRate}
            onChange={(e) => setTargetRate(e.target.value)}
          />
          <button onClick={createAlert}>Create Alert</button>
          <button onClick={lockCurrentRate} className="lock-btn">
            🔒 Lock Current Rate
          </button>
        </div>

        {alertMessage && <p className="alert-message">{alertMessage}</p>}

        {alerts.length > 0 && (
          <div className="alerts-list">
            <h3>Your Alerts</h3>
            {alerts.map((a) => (
              <div key={a.id} className={`alert-row ${a.triggered ? 'triggered' : ''}`}>
                <span>
                  {a.triggered ? '🔔' : '⏳'} Rate {a.direction} {a.target_rate} PKR
                  {a.triggered && <strong> — TRIGGERED!</strong>}
                </span>
                <button onClick={() => deleteAlert(a.id)} className="delete-btn">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- EXISTING QUOTE SECTION ---------- */}
      <div className="input-section">
        <label>Amount in RUB:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button onClick={getQuotes} disabled={loading}>
          {loading ? 'Loading...' : 'Get Quotes'}
        </button>
      </div>

      {quotes.length > 0 && (
        <div className="results-section">
          <h2>Provider Comparison</h2>
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Fee (RUB)</th>
                <th>PKR Received</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, idx) => (
                <tr
                  key={q.provider_id}
                  className={selectedProvider?.provider_id === q.provider_id ? 'selected' : ''}
                >
                  <td>
                    {idx === 0 && <span className="best-badge">BEST</span>}
                    {q.provider_name}
                  </td>
                  <td>{q.fee_rub}</td>
                  <td><strong>{q.pkr_received.toLocaleString()}</strong></td>
                  <td>
                    <input
                      type="radio"
                      name="provider"
                      checked={selectedProvider?.provider_id === q.provider_id}
                      onChange={() => setSelectedProvider(q)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="consent-section">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I confirm this transfer (required)
            </label>
            <button onClick={executeTransfer} className="execute-btn">
              Execute Transfer
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default App;