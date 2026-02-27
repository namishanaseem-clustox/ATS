import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Loader2, Clock } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(isoString) {
    const d = new Date(isoString);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * SlotPickerModal
 * Props:
 *   isOpen, onClose, onSelect,
 *   assigneeIds: string[],
 *   initialDate: "YYYY-MM-DD",
 *   initialDurationMinutes: number
 */
const SlotPickerModal = ({ isOpen, onClose, onSelect, assigneeIds = [], initialDate, initialDurationMinutes }) => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [selectedDuration, setSelectedDuration] = useState(initialDurationMinutes || 45);

    // Reset state when opened with new props
    useEffect(() => {
        if (isOpen) {
            if (initialDate) setSelectedDate(initialDate);
            if (initialDurationMinutes) setSelectedDuration(initialDurationMinutes);
        }
    }, [isOpen, initialDate, initialDurationMinutes]);

    useEffect(() => {
        if (!isOpen || !selectedDate || !selectedDuration) return;
        const fetchSlots = async () => {
            setLoading(true);
            setError('');
            setSlots([]);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:8000/api/calendar/available-slots', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ date: selectedDate, duration_minutes: selectedDuration, user_ids: assigneeIds }),
                });
                if (!res.ok) throw new Error();
                setSlots(await res.json());
            } catch {
                setError('Could not load time slots. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchSlots();
    }, [isOpen, selectedDate, selectedDuration, assigneeIds.join(',')]);

    if (!isOpen) return null;

    const available = slots.filter(s => s.available).length;
    const busy = slots.length - available;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose} />

            {/* Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">

                {/* ── Header ── */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 flex items-center justify-center">
                                <CalendarDays className="w-4 h-4 text-[#00C853]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Select Date & Time</h3>
                                <p className="text-xs text-gray-500">Pick a duration and day to see slots.</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Duration */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium w-14">Duration</span>
                            <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar pb-0.5">
                                {[15, 30, 45, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setSelectedDuration(d)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all shrink-0 ${selectedDuration === d ? 'bg-[#00C853] text-white border-[#00C853] shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
                                    >
                                        {d < 60 ? `${d}m` : d === 60 ? '1h' : '90m'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium w-14">Date</span>
                            <div className={`flex-1 flex items-center border rounded-md overflow-hidden transition-all text-sm bg-white border-gray-200 text-gray-700 focus-within:ring-2 focus-within:ring-[#00C853]/30 focus-within:border-[#00C853]`}>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full py-1.5 px-2.5 outline-none bg-transparent [color-scheme:light]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    {slots.length > 0 && !loading && (
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#00C853]" />
                                <span className="text-xs text-gray-500 font-medium">{available} available</span>
                            </div>
                            {busy > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                                    <span className="text-xs text-gray-400">{busy} busy</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="p-5">
                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center py-10 gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00C853]/10 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-[#00C853] animate-spin" />
                            </div>
                            <p className="text-sm text-gray-400">Checking availability…</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
                            <X className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Slot grid */}
                    {!loading && !error && slots.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {slots.map((slot, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (!slot.available) return;
                                        onSelect({ start: slot.start, end: slot.end });
                                        onClose();
                                    }}
                                    disabled={!slot.available}
                                    title={slot.available ? `${fmt(slot.start)} – ${fmt(slot.end)}` : 'An assignee is busy during this slot'}
                                    className={`
                                        relative group flex flex-col items-center justify-center
                                        h-14 rounded-xl border font-medium transition-all duration-150
                                        ${slot.available
                                            ? `border-gray-200 bg-white text-gray-700
                                               hover:border-[#00C853] hover:bg-[#00C853] hover:text-white
                                               hover:shadow-lg hover:shadow-[#00C853]/20
                                               active:scale-[0.97] cursor-pointer`
                                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <span className="text-[13px] font-semibold leading-tight">
                                        {fmt(slot.start)}
                                    </span>
                                    <span className={`text-[10px] mt-0.5 leading-tight transition-colors
                                        ${slot.available ? 'text-gray-400 group-hover:text-white/70' : 'text-gray-300'}
                                    `}>
                                        {fmt(slot.end)}
                                    </span>
                                    {!slot.available && (
                                        <span className="absolute bottom-1.5 right-1.5 text-[8px] tracking-wide font-bold uppercase text-red-400">
                                            busy
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && slots.length === 0 && (
                        <div className="text-center py-10">
                            <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No slots fit this duration on this day.</p>
                        </div>
                    )}

                    {/* Footer note if no assignees */}
                    {!loading && assigneeIds.length === 0 && slots.length > 0 && (
                        <p className="mt-3 text-center text-[11px] text-amber-500">
                            No assignees selected — all slots shown as available
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SlotPickerModal;
