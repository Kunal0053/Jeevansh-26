export const mockDonors = Array.from({ length: 200 }, (_, i) => ({
  id: `donor-${i + 1}`,
  name: `Donor ${i + 1}`,
  phone: `+9198${String(10000000 + i).slice(0, 8)}`,
  bloodType: ['O+', 'B+', 'A+', 'O-', 'AB+', 'B-'][i % 6],
  distance: Math.round((Math.random() * 14 + 1) * 10) / 10,
  available: true,
  lastDonatedAt: null,
  totalDonations: Math.floor(Math.random() * 8),
  badges: ['First Drop', 'Regular'].slice(0, Math.floor(Math.random() * 3)),
  livesImpacted: Math.floor(Math.random() * 20)
}));

export const mockBanks = [
  { id: 'bank-1', name: 'City Hospital Blood Bank', distance: 3.2, stock: { 'B+': 4, 'O+': 2, 'A+': 1 } },
  { id: 'bank-2', name: 'Red Cross Society', distance: 7.8, stock: { 'B+': 0, 'O-': 1, 'AB+': 3 } },
  { id: 'bank-3', name: 'Govt Medical College', distance: 12.1, stock: { 'B+': 2, 'A+': 5, 'O+': 0 } }
];

export const mockStats = {
  totalDonors: 12480,
  livesSaved: 37440,
  activeRequests: 47,
  citiesCovered: 128
};

export const mockTestimonials = [
  { name: 'Priya Sharma', role: 'Recipient', text: 'Jeevansh found a donor for my father within 20 minutes. I cannot express how grateful we are.' },
  { name: 'Rahul Verma', role: 'Donor', text: 'The WhatsApp alert system is brilliant. I donated blood without ever downloading an app.' },
  { name: 'Dr. Meera Nair', role: 'Blood Bank Officer', text: 'This platform has reduced our coordination time by 80%. Every blood bank needs this.' }
];