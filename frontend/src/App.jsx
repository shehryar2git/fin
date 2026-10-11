import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [amount, setAmount] = useState(10000);
  const [quotes, setQuotes] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const getQuotes = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/quotes', {
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
      const response = await axios.post('http://127.0.0.1:8000/api/transfer', {
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