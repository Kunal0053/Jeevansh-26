import { Link } from 'react-router-dom';
import { useInView } from '../hooks/useInView';
import {
  UsersIcon, HeartIcon, AlertIcon, GlobeIcon, LocationIcon, SendIcon, CheckCircleIcon, ArrowRightIcon, SparkleIcon,
} from '../components/common/Icons';
import { mockStats, mockTestimonials } from '../services/mockData';

function Reveal({ children, delay = 0, direction = 'up', className = '' }) {
  const [ref, isInView] = useInView();
  const hiddenClass = `reveal-hidden-${direction}`;
  return (
    <div ref={ref} className={`reveal-base ${isInView ? 'reveal-visible' : hiddenClass} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden bg-cream-50">
      {/* HERO */}
      <section className="relative bg-cream-50">
        {/* Subtle background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-olive-100/50 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blood-100/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-olive-100 border border-olive-200 px-4 py-2 rounded-full text-sm font-semibold text-olive-800 mb-6 animate-fade-in-up">
                <span className="w-2 h-2 bg-olive-500 rounded-full animate-pulse" />
                Live Network — {mockStats.totalDonors.toLocaleString()} donors active
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-blood-900 leading-[1.05] mb-6 animate-fade-in-up animate-delay-100">
                Every Drop<br />
                <span className="text-blood-600">Counts.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl leading-relaxed animate-fade-in-up animate-delay-200">
                Find donors, connect with hospitals, and be part of a stronger, healthier community. Instant, transparent, and without any app downloads.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-300">
                <Link
                  to="/donor/register"
                  className="inline-flex items-center justify-center gap-3 bg-blood-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-blood-700 transition-all shadow-xl shadow-blood-600/20 text-lg animate-pulse-glow"
                >
                  <HeartIcon size={22} />
                  Become a Donor
                </Link>
                <Link
                  to="/request"
                  className="inline-flex items-center justify-center gap-3 bg-transparent border-2 border-olive-600 text-olive-700 font-bold px-8 py-4 rounded-2xl hover:bg-olive-50 transition-all text-lg"
                >
                  Find Blood Now {/* <--- TEXT CHANGED HERE */}
                  <ArrowRightIcon size={20} />
                </Link>
              </div>
            </div>

            {/* Right: Floating Drop */}
            <div className="hidden md:flex justify-center animate-fade-in animate-delay-300">
              <div className="relative">
                <div className="w-80 h-80 bg-white/60 backdrop-blur-sm border border-olive-100 shadow-xl shadow-olive-900/5 rounded-full flex items-center justify-center animate-float">
                  <div className="w-64 h-64 bg-white/80 backdrop-blur-sm border border-olive-100 rounded-full flex items-center justify-center">
                    <svg width="160" height="160" viewBox="0 0 48 48" fill="none">
                      <defs>
                        <linearGradient id="heroDrop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c97370" />
                          <stop offset="100%" stopColor="#B85C58" />
                        </linearGradient>
                      </defs>
                      <path d="M24 4 C24 4, 10 20, 10 30 C10 38, 16 44, 24 44 C32 44, 38 38, 38 30 C38 20, 24 4, 24 4 Z" fill="url(#heroDrop)" />
                      <ellipse cx="19" cy="26" rx="3" ry="5" fill="white" fillOpacity="0.4" />
                      <path d="M14 30 L18 30 L20 25 L23 35 L26 28 L28 30 L34 30" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                </div>
                {/* Decorative leaves */}
                <svg className="absolute -bottom-8 -right-8 w-32 h-32 text-olive-300 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22l1-2.3A4.49,4.49 0 0,0 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                </svg>
                <div className="absolute inset-0 rounded-full border-2 border-blood-200/50 animate-ping" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white py-20 border-y border-olive-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: <UsersIcon size={32} />, value: mockStats.totalDonors.toLocaleString(), label: 'Registered Donors', color: 'text-olive-600' },
              { icon: <HeartIcon size={32} />, value: mockStats.livesSaved.toLocaleString(), label: 'Lives Impacted', color: 'text-blood-600' },
              { icon: <AlertIcon size={32} />, value: mockStats.activeRequests, label: 'Active Requests', color: 'text-amber-600' },
              { icon: <GlobeIcon size={32} />, value: mockStats.citiesCovered, label: 'Cities Covered', color: 'text-blue-600' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center hover-lift p-4 rounded-2xl">
                  <div className={`flex justify-center mb-3 ${stat.color}`}>{stat.icon}</div>
                  <div className="text-3xl md:text-4xl font-black text-blood-900">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-500 mt-1">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-cream-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal direction="up">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-olive-100 text-olive-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
                <SparkleIcon size={16} /> Simple Process
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-blood-900 mb-4">How Jeevansh Works</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">Three simple steps to save a life. No app downloads. No complicated forms.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: <LocationIcon size={32} />, title: 'Request Blood', desc: 'Enter the blood group needed and share your location. Our system instantly finds compatible donors nearby.', color: 'from-olive-500 to-olive-700' },
              { step: '02', icon: <SendIcon size={32} />, title: 'Donors Get Alerted', desc: 'Compatible donors receive a WhatsApp message with the request details. They accept or decline with one tap.', color: 'from-blood-500 to-blood-700' },
              { step: '03', icon: <CheckCircleIcon size={32} />, title: 'Donation Confirmed', desc: 'Once a donor accepts, you get their contact instantly. A QR code verifies the donation at the blood bank.', color: 'from-blue-500 to-blue-700' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 150} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                <div className="relative bg-white rounded-3xl p-8 shadow-sm border border-olive-100 hover-lift h-full">
                  <div className="absolute top-6 right-6 text-5xl font-black text-olive-50 select-none">{item.step}</div>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} text-white mb-5 shadow-lg`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-blood-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal direction="up">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blood-50 text-blood-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
                <HeartIcon size={16} /> Real Stories
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-blood-900 mb-4">Stories That Matter</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Real people. Real impact. Real lives saved.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {mockTestimonials.map((t, i) => (
              <Reveal key={i} delay={i * 150} direction="zoom">
                <div className="bg-cream-50 rounded-3xl p-8 border border-olive-100 hover-lift h-full">
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="18" height="18" viewBox="0 0 24 24" fill="#facc15">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-olive-500 to-olive-700 flex items-center justify-center text-white font-bold text-sm">
                      {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-blood-900 text-sm">{t.name}</p>
                      <p className="text-xs text-blood-600 font-medium">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-blood-600 py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Reveal direction="up">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">Ready to Save a Life?</h2>
            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Whether you need blood or want to donate, Jeevansh makes it simple. Join our network of heroes today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/request" className="inline-flex items-center justify-center gap-2 bg-white text-blood-600 font-bold px-8 py-4 rounded-2xl hover:bg-cream-50 transition-all shadow-xl text-lg">
                <HeartIcon size={20} /> Find Blood Now
              </Link>
              <Link to="/donor/register" className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-lg">
                Register as Donor <ArrowRightIcon size={20} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}