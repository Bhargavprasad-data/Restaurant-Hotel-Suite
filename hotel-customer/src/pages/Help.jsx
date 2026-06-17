import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  HelpCircle, Search, Mail, Phone, MapPin, Send,
  CheckCircle, ChevronDown, ChevronUp, AlertCircle,
  Hotel
} from 'lucide-react';
import toast from 'react-hot-toast';

const FAQS = [
  {
    category: 'Stays & Check-In',
    q: 'What are the check-in and check-out times?',
    a: 'Standard check-in is from 2:00 PM onwards, and check-out is before 11:00 AM. Stays are monitored and auto-checked out at their scheduled date and time.'
  },
  {
    category: 'Stays & Check-In',
    q: 'Is early check-in or late check-out available?',
    a: 'Early check-in and late check-out are subject to room availability. Please get in touch with our front desk or submit a support query to request timing adjustments.'
  },
  {
    category: 'Bookings & Payments',
    q: 'Can I modify my booking dates?',
    a: 'Yes, you can modify check-in and check-out dates for any Pending stay directly from your dashboard under "My Bookings". Confirmed or checked-in stays cannot be modified.'
  },
  {
    category: 'Bookings & Payments',
    q: 'What payment options do you support?',
    a: 'We accept all major credit cards, debit cards, net banking, and UPI payments through our Razorpay checkout gateway.'
  },
  {
    category: 'Cancellations & Refunds',
    q: 'What is your cancellation and refund policy?',
    a: 'Cancellations made 24 hours prior to check-in are eligible for a full refund. Refunds for eligible bookings are automatically processed back to the original payment method in 3-5 business days.'
  },
  {
    category: 'General Policies',
    q: 'Are pets allowed in the suites?',
    a: 'We have dedicated pet-friendly Deluxe and Suite rooms available. Please mention that you are bringing a pet in your reservation details or contact concierge before arrival.'
  },
  {
    category: 'General Policies',
    q: 'Is there parking available on site?',
    a: 'Yes, we offer complimentary secure parking and 24/7 valet service for all registered hotel guests.'
  }
];

const Help = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    } else {
      setName('');
      setEmail('');
    }
  }, [user]);

  const handleToggleFaq = (idx) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/hotel/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit support query.');
      }

      toast.success('Support ticket submitted successfully!');
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
        {/* Hero Section */}
        <div className="text-center mb-10 max-w-xl mx-auto animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF385C]/8 text-[#FF385C] text-xs font-semibold mb-4 border border-[#FF385C]/15">
            <HelpCircle size={13} />
            <span>Tasty Suites Concierge</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How can we help?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2.5 text-sm leading-relaxed">
            Find answers to frequently asked questions about bookings, amenities, and cancellations, or submit a support query directly.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#FF385C] dark:focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20 transition-all text-sm shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left / Center: FAQs accordion */}
          <div className="lg:col-span-2 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <HelpCircle size={18} className="text-[#FF385C]" />
                <span>Frequently Asked Questions</span>
              </h2>

              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No FAQs match your search</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try searching other keywords like "payment" or "pet"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300"
                      >
                        <button
                          onClick={() => handleToggleFaq(idx)}
                          className="w-full flex items-center justify-between p-4 text-left bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF385C]/80 block mb-1">
                              {faq.category}
                            </span>
                            <span className="font-semibold text-slate-850 dark:text-white text-sm">
                              {faq.q}
                            </span>
                          </div>
                          <span className="text-slate-400 shrink-0 ml-4">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </button>

                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isExpanded ? 'max-h-40 border-t border-slate-100 dark:border-slate-800' : 'max-h-0'
                          }`}
                        >
                          <div className="p-4 text-sm text-slate-650 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900">
                            {faq.a}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Form and Contact Info */}
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            {/* Contact Form Card */}
            <div className="card p-6 sm:p-7">
              {success ? (
                <div className="text-center py-6 space-y-4 animate-scale-in">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100 dark:border-emerald-900/30 shadow-md">
                    <CheckCircle size={26} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Query Received!</h3>
                    <p className="text-slate-500 dark:text-slate-455 mt-1.5 text-xs leading-relaxed max-w-[240px] mx-auto">
                      Your query has been recorded. An agent will get back to you at <strong className="text-slate-700 dark:text-slate-300 font-semibold">{email}</strong> shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="btn-brand py-2 px-5 text-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Send a Message</h3>
                  <p className="text-xs text-slate-500 mb-5">Have a custom request? Email our support team below.</p>
                  
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="section-label mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field py-2 text-sm"
                        placeholder="John Doe"
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="section-label mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field py-2 text-sm"
                        placeholder="john@example.com"
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="section-label mb-1.5">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="input-field py-2 text-sm"
                        placeholder="Booking cancellation, billing query..."
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="section-label mb-1.5">Message / Details</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="input-field py-2.5 text-sm resize-none"
                        rows="4"
                        placeholder="Describe your request or stay details..."
                        required
                        disabled={submitting}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-brand py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
                    >
                      {submitting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      <span>Submit Query</span>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Direct Contact Info */}
            <div className="card p-6 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Direct Contact</h3>
              
              <div className="space-y-3.5">
                <div className="flex items-start gap-3 text-xs text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-150/40 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 flex items-center justify-center shrink-0 text-[#FF385C]">
                    <Phone size={13} />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Call Admin (Bhargav Vana)</span>
                    <a href="tel:+919876543210" className="font-semibold text-slate-850 dark:text-white hover:text-[#FF385C] transition-colors font-mono">
                      +91 98765 43210
                    </a>
                    <span className="text-[10px] text-slate-400 block mt-0.5">24/7 Direct Concierge Helpline</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-150/40 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 flex items-center justify-center shrink-0 text-[#FF385C]">
                    <Mail size={13} />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email Support</span>
                    <a href="mailto:bhargavvana80@gmail.com" className="font-semibold text-slate-850 dark:text-white hover:text-[#FF385C] transition-colors">
                      bhargavvana80@gmail.com
                    </a>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Typical response in under 2 hours</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-left">
                  <div className="w-8 h-8 rounded-xl bg-slate-150/40 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 flex items-center justify-center shrink-0 text-[#FF385C]">
                    <MapPin size={13} />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Resort Address</span>
                    <span className="font-semibold text-slate-850 dark:text-white leading-relaxed">
                      123 Luxury Avenue, Paradise Valley, PV 90210
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs shrink-0 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FF385C] flex items-center justify-center shrink-0">
                <Hotel size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold">Tasty Suites</p>
                <p className="text-[9px] text-slate-500">Premium Stays & Dining</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              © {new Date().getFullYear()} Tasty Bites & Suites. All rights reserved.
            </p>
            <div className="flex gap-4 text-[10px]">
              <a href="/rooms" className="hover:text-white transition-colors">Suites</a>
              <a href="/help" className="hover:text-white transition-colors">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Help;
