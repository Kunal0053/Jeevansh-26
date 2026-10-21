import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const BANK_TOKEN_KEY = 'jeevansh_bank_token';

function bankApi() {
  const token = localStorage.getItem(BANK_TOKEN_KEY);
  return axios.create({ baseURL: API_URL, headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

export async function loginBank(bankId, password) {
  const res = await axios.post(`${API_URL}/banks/login`, { bank_id: bankId, password });
  return res.data;
}

export async function verifyDonation(token, bankId = null) {
  const res = await bankApi().post('/donations/verify', { token, bank_id: bankId });
  return res.data;
}

// Kept as compatibility aliases for components that may still import these names.
export async function scanDonationQR(token, bankId = null) {
  return { token, bank_id: bankId, ready_to_verify: true };
}
export async function approveDonation(_requestId, token, bankId = null) {
  return verifyDonation(token, bankId);
}
export async function rejectDonation() {
  throw new Error('Donation rejection is not supported by the current verification API.');
}
export async function getDonationHistory(bankId) {
  const url = bankId ? `${API_URL}/donations/history?bank_id=${encodeURIComponent(bankId)}` : `${API_URL}/donations/history`;
  const res = await bankApi().get(url);
  return res.data;
}


export async function recordMedicalDecision({ requestId, donorId, decision, note = '' }) {
  const res = await bankApi().post('/donations/medical-decision', {
    request_id: requestId,
    donor_id: donorId,
    decision,
    note,
  });
  return res.data;
}


export async function getBankReviewQueue() {
  const res = await bankApi().get('/banks/review-queue');
  return res.data.requests || [];
}


export async function completeDonation({ requestId, donorId }) {
  const res = await bankApi().post('/donations/complete', {
    request_id: requestId,
    donor_id: donorId,
    decision: 'approve',
  });
  return res.data;
}
