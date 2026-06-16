import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, ShieldCheck, Calendar,
  LogOut, BedDouble, ChevronRight, Edit3, Star,
  Save, X, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 transition-colors duration-300">
          <div className="pt-0 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <p className="text-slate-500">Please sign in to view your profile.</p>
            <Link to="/login" className="btn-brand">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditClick = () => {
    setName(user.name);
    setPhone(user.phone || '');
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number cannot be empty.');
      return;
    }
    setSaving(true);
    const res = await updateProfile(name, phone);
    setSaving(false);
    if (res.success) {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } else {
      toast.error(res.error || 'Failed to update profile.');
    }
  };

  const infoFields = [
    { icon: <Mail size={17} className="text-[#FF385C]" />, label: 'Email Address', value: user.email },
    { icon: <Phone size={17} className="text-[#FF385C]" />, label: 'Phone Number', value: user.phone || 'Not provided' },
    {
      icon: <ShieldCheck size={17} className="text-emerald-500" />,
      label: 'Account Status',
      value: (
        <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Verified & Active
        </span>
      ),
    },
    { icon: <User size={17} className="text-[#FF385C]" />, label: 'Role', value: user.role?.charAt(0).toUpperCase() + user.role?.slice(1) },
  ];

  const quickLinks = [
    { icon: <BedDouble size={18} />, label: 'Browse Rooms', desc: 'Explore our premium suites', path: '/rooms', color: 'bg-blue-50 text-blue-600' },
    { icon: <Calendar size={18} />, label: 'My Bookings', desc: 'View & manage reservations', path: '/my-bookings', color: 'bg-[#FF385C]/8 text-[#FF385C]' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-slate-950 transition-colors duration-300">

      <div className="pt-0">
        {/* ── Profile Hero ── */}
        <div
          className="relative h-48 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          <div className="absolute top-8 right-16 w-48 h-48 bg-[#FF385C]/10 rounded-full blur-[60px]" />
          <div className="absolute bottom-0 left-16 w-64 h-32 bg-blue-500/10 rounded-full blur-[50px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 pb-16 relative z-10 animate-fade-in-up">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-4 bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-sm transition-all active:scale-95"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            <span>Back to previous page</span>
          </button>

          {/* ── Profile Card ── */}
          <div className="card p-6 sm:p-8 animate-scale-in">
            <div className="flex flex-col sm:flex-row gap-6 items-start">

              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #FF385C, #FF8C69)' }}
                >
                  {initials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shadow-md">
                  <ShieldCheck size={15} className="text-white" />
                </div>
              </div>

              {/* Name & Role */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-4 w-full max-w-md">
                      <div>
                        <label className="section-label mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input-field"
                          placeholder="Your Name"
                          required
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="section-label mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input-field"
                          placeholder="Phone Number"
                          required
                          disabled={saving}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="btn-brand py-2.5 px-5 text-xs flex items-center gap-1.5"
                        >
                          {saving ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save size={13} />
                          )}
                          <span>Save Changes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="btn-outline py-2.5 px-5 text-xs flex items-center gap-1.5"
                        >
                          <X size={13} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{user.email}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF385C]/8 text-[#FF385C] text-xs font-semibold capitalize border border-[#FF385C]/15">
                            <Star size={12} fill="currentColor" className="shrink-0" />
                            <span>{user.role} Member</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/30">
                            <ShieldCheck size={12} className="shrink-0" />
                            <span>Verified</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleEditClick}
                        className="btn-ghost border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 text-xs py-2 px-3.5 shrink-0 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
                      >
                        <Edit3 size={13} />
                        <span>Edit Profile</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="divider mt-6" />

            {/* Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoFields.map((field, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shadow-sm shrink-0">
                    {field.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="section-label mb-1">{field.label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {field.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick Links ── */}
          <div className="mt-5 space-y-3">
            <p className="section-label px-1">Quick Links</p>
            {quickLinks.map((link, i) => (
              <Link
                key={i}
                to={link.path}
                className="card flex items-center gap-4 p-5 hover:shadow-md transition-all group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${link.color}`}>
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{link.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.desc}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>

          {/* ── Logout ── */}
          <div className="mt-5">
            <button
              onClick={handleLogout}
              className="w-full card flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-100 dark:hover:border-red-900/30 transition-all group"
            >
              <div className="w-11 h-11 rounded-2xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                <LogOut size={18} className="text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-red-600 text-sm">Sign Out</p>
                <p className="text-xs text-red-400 mt-0.5">You'll be redirected to the home page</p>
              </div>
              <ChevronRight size={18} className="text-red-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
