import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, Square, Calendar, RefreshCw, CheckCircle2, MinusCircle, AlertCircle } from 'lucide-react';

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
      setError(err.message || 'Cannot reach backend. Retrying…');
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
        localStorage.setItem('waiter_user', JSON.stringify(res.user));
      }
    } catch (err) {
      setError(err.message || 'Clock in failed.');
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
        localStorage.setItem('waiter_user', JSON.stringify(res.user));
      }
    } catch (err) {
      setError(err.message || 'Clock out failed.');
    } finally {
      setProcessing(false);
    }
  };

  const isClockedIn = status === 'clocked_in';

  /* ══════════ SHIMMER LOADING ══════════ */
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse-slow">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="shimmer-skeleton h-7 w-56 rounded-lg" />
          <div className="shimmer-skeleton h-3.5 w-40 rounded" />
        </div>

        {/* Top cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-xl border border-slate-100 dark:border-white/[0.07] p-6 space-y-4
            bg-white dark:bg-[#111420]">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="shimmer-skeleton h-3 w-16 rounded" />
                <div className="shimmer-skeleton h-7 w-48 rounded-lg" />
              </div>
              <div className="shimmer-skeleton h-14 w-14 rounded-full" />
            </div>
            <div className="shimmer-skeleton h-4 w-full rounded" />
            <div className="shimmer-skeleton h-4 w-3/4 rounded" />
            <div className="shimmer-skeleton h-11 w-full rounded-xl" />
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.07] p-6 space-y-4
            bg-white dark:bg-[#111420]">
            <div className="space-y-2">
              <div className="shimmer-skeleton h-3 w-20 rounded" />
              <div className="shimmer-skeleton h-5 w-32 rounded-lg" />
            </div>
            <div className="border-y border-slate-100 dark:border-white/[0.06] py-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="shimmer-skeleton h-3 w-12 rounded" />
                  <div className="shimmer-skeleton h-3 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History table skeleton */}
        <div className="space-y-3">
          <div className="shimmer-skeleton h-5 w-36 rounded-lg" />
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.07] overflow-hidden
            bg-white dark:bg-[#111420]">
            <div className="shimmer-skeleton h-10 w-full" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-6 px-6 py-4 border-t border-slate-100 dark:border-white/[0.05]">
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
        <h1 className="text-[22px] font-bold text-slate-800 dark:text-white tracking-tight">
          Shift Attendance
        </h1>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 mt-0.5">
          Clock in / out operations
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl
          bg-rose-500/[0.1] border border-rose-500/[0.2] text-rose-400 text-[12px] font-medium">
          <RefreshCw size={13} className="shrink-0 animate-spin" />
          {error}
        </div>
      )}

      {/* ── Top cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* ── Status + Clock In/Out card ── */}
        <div className={`md:col-span-2 rounded-xl border p-6 space-y-5
          bg-white dark:bg-[#111420]
          ${isClockedIn
            ? 'border-emerald-500/30 dark:border-emerald-500/20'
            : 'border-slate-100 dark:border-white/[0.07]'
          }`}>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-600">
                Current Status
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {isClockedIn ? (
                  <CheckCircle2 size={20} strokeWidth={2.5} className="text-emerald-500 animate-pulse" />
                ) : (
                  <MinusCircle size={20} strokeWidth={2.5} className="text-rose-500" />
                )}
                <h3 className={`text-[20px] font-bold ${isClockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>
                  {isClockedIn ? 'On Duty' : 'Off Duty'}
                </h3>
              </div>
            </div>

            {/* Live clock */}
            <div className={`flex flex-col items-end gap-0.5 p-3 rounded-xl
              ${isClockedIn ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/[0.04]'}`}>
              <Clock
                size={22}
                className={isClockedIn ? 'text-emerald-500 dot-pulse' : 'text-slate-400'}
              />
              <span className="text-[12px] font-black tabular-nums text-slate-700 dark:text-slate-300">
                {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-600">
                {liveTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Register your shift clockings accurately at the start and end of each shift
            to ensure correct attendance records and payroll calculations.
          </p>

          {/* Status indicator bar */}
          <div className="flex items-center gap-2">
            <div className={`h-1.5 rounded-full flex-1 ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/[0.06]'}`} />
            <div className={`h-1.5 rounded-full flex-1 ${isClockedIn ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-white/[0.06]'}`} />
            <div className={`h-1.5 rounded-full flex-1 ${!isClockedIn ? 'bg-rose-500/50' : 'bg-slate-200 dark:bg-white/[0.06]'}`} />
          </div>

          {/* Action button */}
          {isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={processing}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white
                bg-rose-500 hover:bg-rose-600
                active:scale-[0.98] transition-all
                shadow-lg shadow-rose-500/20
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processing
                ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Square size={15} /><span>End Shift (Clock Out)</span></>
              }
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={processing}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white
                bg-emerald-500 hover:bg-emerald-600
                active:scale-[0.98] transition-all
                shadow-lg shadow-emerald-500/20
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processing
                ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Play size={15} /><span>Start Shift (Clock In)</span></>
              }
            </button>
          )}
        </div>

        {/* ── Shift info card ── */}
        <div className="rounded-xl border border-slate-100 dark:border-white/[0.07] p-6 space-y-4
          bg-white dark:bg-[#111420]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-600">
              Assigned Shift
            </div>
            <h4 className="text-[15px] font-bold text-slate-800 dark:text-white mt-1.5">
              Tasty Bites Roster
            </h4>
          </div>

          <div className="border-y border-slate-100 dark:border-white/[0.06] py-4 space-y-3">
            {[
              { label: 'Timing', value: user?.shift_timing || '09:00–17:00', highlight: false },
              { label: 'Role', value: user?.role || 'Waiter', highlight: true },
              { label: 'Status', value: isClockedIn ? 'Active' : 'Inactive', active: isClockedIn },
            ].map(({ label, value, highlight, active }) => (
              <div key={label} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-400 dark:text-slate-500">{label}:</span>
                <span className={`font-bold capitalize ${
                  active !== undefined
                    ? active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                    : highlight
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
            Hours auto-aggregate in the admin payroll reports.
          </p>
        </div>
      </div>

      {/* ── Attendance log table ── */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Calendar size={16} className="text-emerald-500" />
          Clocking Log
        </h2>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.07]
            bg-white dark:bg-[#111420] py-12 text-center">
            <Clock size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
            <p className="text-[13px] text-slate-400 dark:text-slate-600">No attendance history recorded.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.07] overflow-hidden
            bg-white dark:bg-[#111420]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/[0.07]">
                    {['Date', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em]
                          text-slate-400 dark:text-slate-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]
                        ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.01]'}`}
                    >
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(log.record_date).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {log.clock_in
                          ? new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-semibold text-rose-500 dark:text-rose-400">
                        {log.clock_out
                          ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dot-pulse" />
                              Active
                            </span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-black text-slate-700 dark:text-slate-300">
                        {log.hours_worked
                          ? <span>{log.hours_worked} <span className="font-normal text-slate-400">hrs</span></span>
                          : <span className="text-slate-400">—</span>
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
