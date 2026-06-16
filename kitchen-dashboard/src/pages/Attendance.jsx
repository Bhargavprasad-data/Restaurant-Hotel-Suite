import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, Square, Calendar, RefreshCw, CheckCircle2, MinusCircle } from 'lucide-react';

const Attendance = () => {
  const { user, setUser, apiFetch } = useAuth();
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [status, setStatus]     = useState(user?.attendance_status || 'clocked_out');
  const [processing, setProcessing] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());

  // Sync state when user profile is updated or re-hydrated
  useEffect(() => {
    if (user?.attendance_status) {
      setStatus(user.attendance_status);
    }
  }, [user]);

  const retryTimeoutRef = React.useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch with retry ── */
  const fetchLogs = async () => {
    try {
      const data = await apiFetch('/staff/attendance');
      setLogs(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Kitchen Attendance fetch error:', err);
      setError(err.message || 'Failed to load attendance history. Retrying…');
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(fetchLogs, 3000);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    return () => { if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); };
  }, [status]);

  const handleClockIn = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await apiFetch('/staff/clock-in', { method: 'POST' });
      setStatus('clocked_in');
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('kitchen_user', JSON.stringify(res.user));
      }
    } catch (err) {
      setError(err.message || 'Clock in action failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await apiFetch('/staff/clock-out', { method: 'POST' });
      setStatus('clocked_out');
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('kitchen_user', JSON.stringify(res.user));
      }
    } catch (err) {
      setError(err.message || 'Clock out action failed.');
    } finally {
      setProcessing(false);
    }
  };

  const isClockedIn = status === 'clocked_in';

  /* ══════════ SHIMMER LOADING ══════════ */
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse-slow">
        <div className="space-y-1.5">
          <div className="shimmer-skeleton h-7 w-56 rounded-lg" />
          <div className="shimmer-skeleton h-3.5 w-40 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 surface-card p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="shimmer-skeleton h-3 w-16 rounded" />
                <div className="shimmer-skeleton h-7 w-48 rounded-lg" />
              </div>
              <div className="shimmer-skeleton h-14 w-14 rounded-full" />
            </div>
            <div className="shimmer-skeleton h-4 w-full rounded" />
            <div className="shimmer-skeleton h-11 w-full rounded-xl" />
          </div>
          <div className="surface-card p-6 space-y-4">
            <div className="shimmer-skeleton h-3 w-20 rounded" />
            <div className="shimmer-skeleton h-5 w-32 rounded-lg" />
            <div className="space-y-3 py-4" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              {[1, 2].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="shimmer-skeleton h-3 w-12 rounded" />
                  <div className="shimmer-skeleton h-3 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="shimmer-skeleton h-5 w-36 rounded-lg" />
          <div className="surface-card overflow-hidden">
            <div className="shimmer-skeleton h-10 w-full" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-6 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="shimmer-skeleton h-3.5 w-28 rounded" />
                <div className="shimmer-skeleton h-3.5 w-16 rounded" />
                <div className="shimmer-skeleton h-3.5 w-16 rounded" />
                <div className="shimmer-skeleton h-3.5 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ MAIN VIEW ══════════ */
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 select-none">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Kitchen Shift Attendance
        </h1>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Clock in / out operations
        </p>
      </div>

      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-medium"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
          }}
        >
          <RefreshCw size={13} className="shrink-0 animate-spin" />
          {error}
        </div>
      )}

      {/* ── Top cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* ── Status + Clock In/Out card ── */}
        <div
          className="md:col-span-2 surface-card p-6 space-y-5"
          style={isClockedIn ? { borderColor: 'rgba(16, 185, 129, 0.3)' } : {}}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Current Status
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {isClockedIn ? (
                  <CheckCircle2 size={20} strokeWidth={2.5} className="text-emerald-500 animate-pulse" />
                ) : (
                  <MinusCircle size={20} strokeWidth={2.5} className="text-rose-500" />
                )}
                <h3 className={`text-[20px] font-bold ${isClockedIn ? 'text-emerald-600 dark:text-emerald-400' : ''}`} style={!isClockedIn ? { color: 'var(--text-secondary)' } : {}}>
                  {isClockedIn ? 'Clocked In & Preparing' : 'Off Shift'}
                </h3>
              </div>
            </div>

            {/* Live clock */}
            <div
              className="flex flex-col items-end gap-0.5 p-3 rounded-xl"
              style={{
                background: isClockedIn ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                border: `1px solid ${isClockedIn ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`,
              }}
            >
              <Clock
                size={22}
                className={isClockedIn ? 'text-emerald-500 dot-pulse' : ''}
                style={!isClockedIn ? { color: 'var(--text-muted)' } : {}}
              />
              <span className="text-[12px] font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                {liveTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Please log your shift attendance accurately. Clocking hours will aggregate in the central Admin dashboard.
          </p>

          {/* Status indicator bar */}
          <div className="flex items-center gap-2">
            <div className={`h-1.5 rounded-full flex-1 ${isClockedIn ? 'bg-emerald-500' : ''}`} style={!isClockedIn ? { background: 'var(--border)' } : {}} />
            <div className={`h-1.5 rounded-full flex-1 ${isClockedIn ? 'bg-emerald-500/50' : ''}`} style={!isClockedIn ? { background: 'var(--border)' } : {}} />
            <div className={`h-1.5 rounded-full flex-1 ${!isClockedIn ? 'bg-rose-500/50' : ''}`} style={isClockedIn ? { background: 'var(--border)' } : {}} />
          </div>

          {/* Action button */}
          {isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={processing}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white
                bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all
                shadow-lg shadow-rose-500/20
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processing
                ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Square size={15} /><span>Clock Out (Close Shift)</span></>
              }
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={processing}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white
                bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all
                shadow-lg shadow-amber-500/20
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processing
                ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Play size={15} /><span>Clock In (Start Cooking)</span></>
              }
            </button>
          )}
        </div>

        {/* ── Shift info card ── */}
        <div className="surface-card p-6 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
              Kitchen Shift
            </div>
            <h4 className="text-[15px] font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>
              Tasty Bites Roster
            </h4>
          </div>

          <div className="py-4 space-y-3" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {[
              { label: 'Timing', value: user?.shift_timing || '09:00–17:00' },
              { label: 'Role', value: 'Chef', highlight: true },
              { label: 'Status', value: isClockedIn ? 'Active' : 'Inactive', active: isClockedIn },
            ].map(({ label, value, highlight, active }) => (
              <div key={label} className="flex items-center justify-between text-[12px]">
                <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span
                  className="font-bold capitalize"
                  style={{
                    color: active !== undefined
                      ? active ? '#10b981' : '#f43f5e'
                      : highlight
                      ? '#f59e0b'
                      : 'var(--text-primary)',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Hours auto-aggregate in the admin payroll reports.
          </p>
        </div>
      </div>

      {/* ── Attendance log table ── */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar size={16} className="text-amber-500" />
          Clocking Log
        </h2>

        {logs.length === 0 ? (
          <div className="surface-card py-12 text-center">
            <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No attendance history recorded.</p>
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:opacity-80"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 1 ? 'var(--bg-card)' : 'transparent',
                      }}
                    >
                      <td className="px-5 py-3.5 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {new Date(log.record_date).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {log.clock_in
                          ? new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-rose-500">
                        {log.clock_out
                          ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className="flex items-center gap-1 text-amber-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dot-pulse" />
                              Active
                            </span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-black" style={{ color: 'var(--text-primary)' }}>
                        {log.hours_worked
                          ? <span>{log.hours_worked} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>hrs</span></span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
