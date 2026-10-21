import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://jeevansh-backend.onrender.com/api'
const DONOR_TOKEN_KEY = 'jeevansh_donor_token';

export function getDonorToken() {
  return localStorage.getItem(DONOR_TOKEN_KEY);
}

export function setDonorToken(token) {
  if (token) localStorage.setItem(DONOR_TOKEN_KEY, token);
  else localStorage.removeItem(DONOR_TOKEN_KEY);
}

function donorApi() {
  const token = getDonorToken();
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is required. Please use a browser that supports location access.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Please allow location access to complete donor registration.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export async function registerDonor(data) {
  const coords = data.latitude != null && data.longitude != null
    ? { latitude: data.latitude, longitude: data.longitude }
    : await getBrowserLocation();
  const payload = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    password: data.password,
    blood_type: data.bloodType,
    latitude: coords.latitude,
    longitude: coords.longitude,
    city: data.location?.trim() || null,
    age: data.age ? Number.parseInt(data.age, 10) : null,
    weight: data.weight ? Number.parseFloat(data.weight) : null,
    gender: data.gender || null,
    last_donated_at: data.lastDonated ? new Date(data.lastDonated).toISOString() : null,
    whatsapp_opt_in: Boolean(data.whatsappOptIn),
  };
  const res = await axios.post(`${API_URL}/donors/register`, payload);
  return res.data;
}

export async function loginDonor(phone, password) {
  const res = await axios.post(`${API_URL}/donors/login`, { phone: phone.trim(), password });
  if (res.data?.token) setDonorToken(res.data.token);
  return res.data;
}

export async function getDonorProfile() {
  const res = await donorApi().get('/donors/me');
  return res.data.donor;
}

export async function updateDonorAvailability(isAvailable) {
  const res = await donorApi().patch('/donors/me/availability', { is_available: isAvailable });
  return res.data.donor;
}

export async function getDonorDashboard() {
  const donor = await getDonorProfile();
  const certificates = await getCertificates();
  return {
    donor,
    totalDonations: Number(donor.total_donations ?? certificates.length),
    livesImpacted: Number(donor.total_donations ?? certificates.length) * 3,
    available: Boolean(donor.is_available),
  };
}

export async function getPendingRequests() {
  const res = await donorApi().get('/donors/me/pending-requests');
  return res.data.requests || [];
}

export async function acceptRequest(requestId) {
  const res = await donorApi().post(`/donors/me/accept/${requestId}`);
  return res.data;
}

export async function rejectRequest() {
  throw new Error('Request rejection is not supported by the current backend API yet.');
}

export async function getCertificates() {
  const res = await donorApi().get('/donors/me/certificates');
  return res.data.certificates || [];
}

export async function getCertificateById(certId) {
  const res = await donorApi().get(`/donors/me/certificates/${certId}`);
  return res.data;
}


export async function getSelectedRequests() {
  const res = await donorApi().get('/donors/me/selected-requests');
  return res.data.requests || [];
}
