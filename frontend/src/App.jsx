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

  // Rate alert state
  const [currentRate, setCurrentRate] = useState(3.2552);
  const [targetRate, setTargetRate] = useState(3.30);
  const [direction, setDirection] = useState('above');
  const [alerts, setAlerts] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [lockedRate, setLockedRate] = useState(null);

  // NEW: Recipient state
  const [recipients, setRecipients] = useState([]);
  const [banks, setBanks] = useState([]);
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    country: 'PK'
  });
  const [recipientMessage, setRecipientMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const selectedBank = banks.find(b => b.name === newRecipient.bank_name);

  // Load alerts, locked rate, and recipients on page load
  useEffect(() => {
    fetchAlerts();
    fetchLockedRate();
    fetchRecipients();
    fetchBanks();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/api/alerts`);
      setAlerts(res.data.alerts);
      setCurrentRate(res.data.current_rate);
    } catch (err) { console.error('Failed to fetch alerts'); }
  };

  const fetchLockedRate = async () => {
    try {
      const res = await axios.get(`${API}/api/rates/locked`);
      setLockedRate(res.data.locked ? res.data : null);
    } catch (err) { console.error('Failed to fetch locked rate'); }
  };

  const fetchRecipients = async () => {
    try {
      const res = await axios.get(`${API}/api/recipients`);
      setRecipients(res.data.recipients);
    } catch (err) { console.error('Failed to fetch recipients'); }
  };

  const fetchBanks = async () => {
  try {
    const res = await axios.get(`${API}/api/banks`);
    const bankList = Object.entries(res.data.banks).map(([code, info]) => ({
      code,
      ...info
    }));
    setBanks(bankList);
  } catch (err) { console.error('Failed to fetch banks'); }
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
    } catch (err) { setAlertMessage('Failed to delete alert.'); }
  };

  const lockCurrentRate = async () => {
    try {
      await axios.post(`${API}/api/rates/lock`, { rate: currentRate });
      setAlertMessage(`🔒 Locked in rate ${currentRate} for 24 hours`);
      fetchLockedRate();
    } catch (err) { setAlertMessage('Failed to lock rate.'); }
  };

  // ---- NEW: Recipient actions ----
  const addRecipient = async () => {
    setRecipientMessage('');
    if (!newRecipient.name || !newRecipient.bank_name || !newRecipient.account_number) {
      setRecipientMessage('Please fill in all fields.');
      return;
    }
    try {
      const res = await axios.post(`${API}/api/recipients`, newRecipient);
      const screening = res.data.recipient.screening;
      if (screening.cleared) {
        setRecipientMessage(`✅ ${newRecipient.name} saved and cleared screening.`);
      } else {
        setRecipientMessage(`⚠️ ${newRecipient.name} saved but FLAGGED: ${screening.reason}`);
      }
      setNewRecipient({ name: '', bank_name: '', account_number: '', country: 'PK' });
      fetchRecipients();
    } catch (err) {
      setRecipientMessage(err.response?.data?.detail || 'Failed to add recipient.');
    }
  };

  const removeRecipient = async (id) => {
    try {
      await axios.delete(`${API}/api/recipients/${id}`);
      if (selectedRecipient?.id === id) setSelectedRecipient(null);
      fetchRecipients();
    } catch (err) { setRecipientMessage('Failed to delete recipient.'); }
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
    if (!selectedRecipient) return setMessage('Please select a recipient.');
    if (!confirmed) return setMessage('You must check the confirmation box.');

    try {
      const response = await axios.post(`${API}/api/transfer`, {
        quote_id: selectedProvider.provider_id,
        user_confirmed: true,
        recipient_bank: selectedRecipient.bank_name
      });
      setMessage(`✅ Success! Sent to ${selectedRecipient.name}. Transaction ID: ${response.data.transaction_id}`);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Transfer failed.');
    }
  };

  return (
    <div className="container">
      <h1>Ahmed's RUB → PKR Rem Optimizer</h1>
      <p className="subtitle">AI-powered comparison for Pakistani students in Russia</p>
            <p className="credit-line">
        © 2026 Shehryar Ahmed· Higher School of Economics, Moscow
      </p>

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

      {/* ---------- RECIPIENTS PANEL ---------- */}
      <div className="recipients-panel">
        <h2>Saved Recipients</h2>

               <div className="recipient-form">
          <input
            type="text"
            placeholder="Name"
            value={newRecipient.name}
            onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
          />
          <select
            value={newRecipient.bank_name}
            onChange={(e) => setNewRecipient({ ...newRecipient, bank_name: e.target.value })}
            className="bank-select"
          >
            <option value="">-- Select Bank --</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.name}>{bank.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={selectedBank ? selectedBank.example : "Account Number"}
            value={newRecipient.account_number}
            onChange={(e) => setNewRecipient({ ...newRecipient, account_number: e.target.value })}
            className={
              newRecipient.account_number === '' ? '' :
              (selectedBank && new RegExp(selectedBank.pattern).test(newRecipient.account_number))
                ? 'input-valid'
                : 'input-invalid'
            }
          />
          <button onClick={addRecipient}>+ Add Recipient</button>
        </div>

        {selectedBank && (
          <div className="bank-format-hint">
            <strong>Format for {selectedBank.name}:</strong> {selectedBank.format_hint}
            <br />
            <em>Example: {selectedBank.example}</em>
          </div>
        )}

{selectedBank && (
  <div className="bank-format-hint">
    <strong>Format for {selectedBank.name}:</strong> {selectedBank.format_hint}
    <br />
    <em>Example: {selectedBank.example}</em>
  </div>
)}
        {recipientMessage && <p className="recipient-message">{recipientMessage}</p>}

        {recipients.length > 0 ? (
          <div className="recipients-list">
            {recipients.map((r) => (
              <div
                key={r.id}
                className={`recipient-row ${r.screening.cleared ? 'cleared' : 'flagged'} ${selectedRecipient?.id === r.id ? 'selected-recipient' : ''}`}
                onClick={() => setSelectedRecipient(r)}
              >
                <div className="recipient-info">
                  <strong>{r.name}</strong>
                  <span>{r.bank_name} • {r.account_number}</span>
                </div>
                <div className="recipient-status">
                  {r.screening.cleared ? (
                    <span className="status-ok">✅ Cleared</span>
                  ) : (
                    <span className="status-flagged">⚠️ Flagged</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRecipient(r.id); }}
                    className="delete-btn"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-recipients">No recipients saved yet. Add one above.</p>
        )}
      </div>

      {/* ---------- QUOTE SECTION ---------- */}
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
              I confirm this transfer to {selectedRecipient?.name || '[select recipient]'} (required)
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