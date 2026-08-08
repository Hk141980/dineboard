'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  openingTime?: string;
  closingTime?: string;
}

export default function PublicBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || searchParams.get('r') || 'restro';

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Form State
  const [date, setDate] = useState(() => getLocalDateString(new Date()));
  const [time, setTime] = useState('19:30');
  const [guests, setGuests] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  useEffect(() => {
    fetchRestaurant();
  }, [slug]);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/by-slug/${slug}`);
      const data = await res.json();
      if (data.success && data.data) {
        setRestaurant(data.data);
      } else {
        setRestaurant({
          id: 'tenant_default',
          name: 'Restro',
          slug: slug,
          address: 'Modinagar, Delhi NCR',
          phone: '09889776828',
          openingTime: '09:00',
          closingTime: '23:00',
        });
      }
    } catch (err) {
      setRestaurant({
        id: 'tenant_default',
        name: 'Restro',
        slug: slug,
        address: 'Modinagar, Delhi NCR',
        phone: '09889776828',
        openingTime: '09:00',
        closingTime: '23:00',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      setError('Please provide your name and phone number.');
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = JSON.stringify({
      date,
      time,
      guests: Number(guests),
      customerName,
      customerPhone,
      note,
      source: 'web_form',
    });

    const endpoints = [
      `/api/bookings/confirm?slug=${slug}`,
      `http://localhost:4000/api/bookings/confirm?slug=${slug}`,
      `http://localhost:5000/api/bookings/confirm?slug=${slug}`,
    ];

    let data: any = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        const resJson = await res.json().catch(() => null);
        if (resJson) {
          data = resJson;
          break;
        }
      } catch (err) {}
    }

    if (data && data.success && data.data?.booking) {
      setBookingSuccess(data.data.booking);
    } else if (data && (data.message || data.data?.message)) {
      setError(data.data?.message || data.message);
    } else {
      setError('Unable to connect to server. Please try again.');
    }

    setSubmitting(false);
  };

  const selectQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  const availableSlots = [
    '12:00', '13:00', '14:00', '18:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = date === todayStr;
  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed top-1/2 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-50 px-4 py-3.5 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
              {restaurant?.name?.charAt(0) || 'R'}
            </div>
            <div>
              <h1 className="font-bold text-base text-white leading-tight tracking-tight">{restaurant?.name || 'Restaurant'}</h1>
              <p className="text-[11px] text-slate-400 font-medium">✨ Table Reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs text-emerald-400 font-semibold tracking-wide">Open Now</span>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 relative z-10">
        {bookingSuccess ? (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
              🎉
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
                Reservation Confirmed
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Table Reserved!</h2>
              <p className="text-xs text-slate-400 mt-1">We look forward to serving you.</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400 font-medium">Booking Code:</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-sm">
                  {bookingSuccess.bookingCode}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400 font-medium">Date & Time:</span>
                <span className="font-semibold text-white text-xs">{date} at {bookingSuccess.bookingTime}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400 font-medium">Party Size:</span>
                <span className="font-semibold text-white text-xs">{bookingSuccess.guests} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400 font-medium">Customer Name:</span>
                <span className="font-semibold text-white text-xs">{customerName}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-left flex items-start gap-2.5">
              <span className="text-base">📱</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Confirmation ticket has been sent to your WhatsApp number.
              </p>
            </div>

            <button
              onClick={() => setBookingSuccess(null)}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition shadow-lg text-sm border border-slate-700"
            >
              Book Another Table
            </button>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Reserve Your Table</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select guests, date, and preferred time slot.</p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-center gap-2.5">
                <span className="text-base">⚠️</span> <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Guests Selector & Custom Entry Box */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Number of Guests</label>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {guests} {guests === 1 ? 'Guest' : 'Guests'}
                </span>
              </div>

              {/* Custom Guest Counter & Entry Box */}
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl p-1.5">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-900 text-slate-300 font-extrabold text-lg hover:bg-slate-800 transition border border-slate-700/80 flex items-center justify-center active:scale-95"
                >
                  -
                </button>
                
                <div className="flex-1 flex items-center justify-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Enter Guests:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={guests}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= 50) {
                        setGuests(val);
                      }
                    }}
                    className="w-16 text-center bg-slate-900 border border-slate-700/80 rounded-xl text-emerald-400 font-extrabold text-base py-1.5 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-400 font-medium">Guests</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setGuests(Math.min(50, guests + 1))}
                  className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-extrabold text-lg hover:bg-emerald-400 transition shadow-md shadow-emerald-950/50 flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Date Selection Segment Control */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Date</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/90 border border-slate-800 rounded-2xl mb-2.5">
                <button
                  type="button"
                  onClick={() => selectQuickDate(0)}
                  className={`py-2 text-xs rounded-xl transition text-center ${
                    date === todayStr
                      ? 'bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-950/60 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 font-semibold'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickDate(1)}
                  className={`py-2 text-xs rounded-xl transition text-center ${
                    date === new Date(now.getTime() + 86400000).toISOString().split('T')[0]
                      ? 'bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-950/60 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 font-semibold'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickDate(2)}
                  className={`py-2 text-xs rounded-xl transition text-center ${
                    date === new Date(now.getTime() + 172800000).toISOString().split('T')[0]
                      ? 'bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-950/60 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 font-semibold'
                  }`}
                >
                  Day After
                </button>
              </div>
              <div className="relative cursor-pointer">
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition font-medium cursor-pointer select-none"
                />
                <span className="absolute left-3.5 top-3 text-slate-500 text-sm pointer-events-none">📅</span>
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Preferred Time</label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => {
                  const [h, m] = slot.split(':').map(Number);
                  const slotMins = h * 60 + m;
                  const isPast = isToday && slotMins <= currentMins + 15;

                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
                  const label = `${displayH}:${slot.split(':')[1]} ${ampm}`;

                  if (isPast) {
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled
                        className="py-2.5 text-xs font-medium rounded-xl border transition text-center bg-slate-950/40 text-slate-600 border-slate-900/60 cursor-not-allowed line-through opacity-50"
                      >
                        {label}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition text-center ${
                        time === slot
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/50 scale-[1.02]'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Your Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Himanshu Kushwaha"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition font-medium"
                  />
                  <span className="absolute left-3.5 top-3 text-slate-500 text-sm">👤</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">WhatsApp Phone Number *</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="e.g. 9670393289"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition font-mono font-medium"
                  />
                  <span className="absolute left-3.5 top-3 text-slate-500 text-sm">📱</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Special Requests (Optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Corner table / AC section"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition font-medium"
                  />
                  <span className="absolute left-3.5 top-3 text-slate-500 text-sm">📝</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-950/60 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-sm tracking-wide disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-lg">⏳</span> Checking Table Availability...
                </>
              ) : (
                <>
                  <span>📅</span> Confirm Table Reservation
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900/80 text-center text-[11px] text-slate-500 font-medium">
        Powered by <span className="font-bold text-slate-300">DineBoard</span> · Smart Dining Platform
      </footer>
    </div>
  );
}
