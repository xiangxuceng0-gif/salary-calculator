import { useState, useMemo, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock, CalendarDays, Pencil, CalendarPlus, CircleDollarSign, ArrowUpDown, ListChecks, Check, X, Moon, PartyPopper, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ISalarySettings, IWorkRecord, ILeaveRecord } from '@/data/salary';
import {
  isWeekend, getMonthKey, getMonthLabel, getWeekdayLabel,
  calcBreakDeductionMinutes, calcDailySalary, calcLeaveBreakdown,
  saveRecords, saveLeaveRecords,
  getLunarMonthDay, isChineseHoliday, formatDateDisplay,
} from '@/data/salary';

interface WorkRecordSectionProps {
  settings: ISalarySettings;
  records: IWorkRecord[];
  onRecordsChange: (records: IWorkRecord[]) => void;
  leaveRecords: ILeaveRecord[];
  onLeaveRecordsChange: (records: ILeaveRecord[]) => void;
}

const LEAVE_TYPES = ['事假', '病假', '年假', '调休', '其他'];

function generateMonthCalendar(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

function calcRecordOvertimePay(record: IWorkRecord, settings: ISalarySettings): number {
  return Math.round((
    record.weekdayOvertimeHours * settings.weekdayOvertimeRate +
    record.weekendOvertimeHours * settings.weekendOvertimeRate +
    record.holidayOvertimeHours * settings.holidayOvertimeRate
  ) * 100) / 100;
}

export default function WorkRecordSection({ settings, records, onRecordsChange, leaveRecords, onLeaveRecordsChange }: WorkRecordSectionProps) {
  const [date, setDate] = useState('');
  const [dateDisplay, setDateDisplay] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isHoliday, setIsHoliday] = useState(false);
  const [filterMonth, setFilterMonth] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [batchStartTime, setBatchStartTime] = useState('08:00');
  const [batchEndTime, setBatchEndTime] = useState('17:00');
  const [batchIsHoliday, setBatchIsHoliday] = useState(false);
  const [batchOverlapMode, setBatchOverlapMode] = useState<'skip' | 'overwrite'>('skip');
  const [batchMode, setBatchMode] = useState<'add' | 'modify'>('add');
  const [leaveCalendarOpen, setLeaveCalendarOpen] = useState(false);
  const [leaveCalendarYear, setLeaveCalendarYear] = useState(new Date().getFullYear());
  const [leaveCalendarMonth, setLeaveCalendarMonth] = useState(new Date().getMonth());
  const [leaveSelectedDates, setLeaveSelectedDates] = useState<Set<string>>(new Set());
  const [leaveType, setLeaveType] = useState('事假');
  const [leaveHalfDay, setLeaveHalfDay] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try { const s = localStorage.getItem('__salary_calculator_sort_order'); if (s === 'desc') return 'desc'; } catch {}
    return 'asc';
  });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLeaveIds, setSelectedLeaveIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSortOrder = () => setSortOrder((prev) => { const next = prev === 'asc' ? 'desc' : 'asc'; try { localStorage.setItem('__salary_calculator_sort_order', next); } catch {} return next; });

  const handleRecalculateAll = () => {
    if (records.length === 0) { toast.info('没有记录需要重算'); return; }
    const updated = records.map((r) => {
      const c = computeRecord(r.date, r.startTime, r.endTime, r.isHoliday);
      return { ...c, id: r.id };
    });
    onRecordsChange(updated);
    saveRecords(updated);
    toast.success(`已按当前费率重算 ${updated.length} 条记录`);
  };
  const monthStats = useMemo(() => {
    const map = new Map<string, { workDays: number; leaveDays: number }>();
    for (const r of records) { const mk = getMonthKey(r.date); const e = map.get(mk) || { workDays: 0, leaveDays: 0 }; e.workDays++; map.set(mk, e); }
    for (const l of leaveRecords) { const mk = getMonthKey(l.date); const e = map.get(mk) || { workDays: 0, leaveDays: 0 }; e.leaveDays = Math.round((e.leaveDays + l.days) * 10) / 10; map.set(mk, e); }
    return map;
  }, [records, leaveRecords]);
  const availableMonths = useMemo(() => Array.from(monthStats.keys()).sort().reverse(), [monthStats]);
  const filteredRecords = useMemo(() => {
    let list = filterMonth === 'all' ? records : records.filter((r) => getMonthKey(r.date) === filterMonth);
    if (searchQuery) { const q = searchQuery.toLowerCase(); list = list.filter((r) => r.date.includes(q) || r.startTime.includes(q) || r.endTime.includes(q)); }
    return sortOrder === 'desc' ? [...list].sort((a, b) => a.date.localeCompare(b.date)).reverse() : [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [records, filterMonth, sortOrder, searchQuery]);
  const filteredLeaveRecords = useMemo(() => {
    const list = filterMonth === 'all' ? leaveRecords : leaveRecords.filter((l) => getMonthKey(l.date) === filterMonth);
    return sortOrder === 'desc' ? [...list].sort((a, b) => a.date.localeCompare(b.date)).reverse() : [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [leaveRecords, filterMonth, sortOrder]);
  const leaveBreakdown = useMemo(() => calcLeaveBreakdown(filteredLeaveRecords), [filteredLeaveRecords]);

  const computeRecord = (d: string, st: string, et: string, holiday: boolean): Omit<IWorkRecord, 'id'> => {
    const lunchMin = calcBreakDeductionMinutes(st, et, settings.lunchStartTime, settings.lunchEndTime);
    const afternoonMin = calcBreakDeductionMinutes(st, et, settings.afternoonStartTime, settings.afternoonEndTime);
    const lunchHours = Math.round((lunchMin / 60) * 100) / 100;
    const afternoonHours = Math.round((afternoonMin / 60) * 100) / 100;
    const [sh, sm] = st.split(':').map(Number); const [eh, em] = et.split(':').map(Number);
    const totalHours = Math.round(((eh * 60 + em - sh * 60 - sm - lunchMin - afternoonMin) / 60) * 100) / 100;
    const weekend = isWeekend(d); const chHoliday = isChineseHoliday(d); const isHol = holiday || !!chHoliday;
    let wo = 0, weo = 0, ho = 0;
    if (isHol) ho = totalHours; else if (weekend) weo = totalHours; else wo = Math.max(0, Math.round((totalHours - settings.standardHoursPerDay) * 100) / 100);
    return { date: d, startTime: st, endTime: et, totalHours, weekdayOvertimeHours: wo, weekendOvertimeHours: weo, holidayOvertimeHours: ho, isWeekend: weekend, isHoliday: isHol, lunchDeductionHours: lunchHours, afternoonDeductionHours: afternoonHours };
  };

  const handleDateInput = (val: string) => {
    // 只允许数字和分隔符
    const cleaned = val.replace(/[^\d\-\/年岁月日]/g, '');
    setDateDisplay(cleaned);
    // 严格日期格式匹配
    const iso = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const y = parseInt(iso[1]), m = parseInt(iso[2]), d = parseInt(iso[3]);
      if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        setDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        return;
      }
    }
    const slash = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (slash) {
      const y = parseInt(slash[1]), m = parseInt(slash[2]), d = parseInt(slash[3]);
      if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        setDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        setDateDisplay(formatDateDisplay(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
        return;
      }
    }
    const cn = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
    if (cn) {
      const y = parseInt(cn[1]), m = parseInt(cn[2]), d = parseInt(cn[3]);
      if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        setDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        setDateDisplay(formatDateDisplay(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
        return;
      }
    }
    // 不匹配任何格式 → 清空内部日期
    setDate('');
  };

  const focusDateInput = () => {
    const el = document.querySelector<HTMLInputElement>('input[placeholder="2026年12月19日"]');
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };

  const handleEdit = (r: IWorkRecord) => {
    setDate(r.date);
    setDateDisplay(formatDateDisplay(r.date));
    setStartTime(r.startTime);
    setEndTime(r.endTime);
    setIsHoliday(r.isHoliday);
    setEditingId(r.id);
    setTimeout(() => focusDateInput(), 100);
  };

  const handleCancelEdit = () => { setDate(''); setDateDisplay(''); setStartTime('08:00'); setEndTime('17:00'); setIsHoliday(false); setEditingId(null); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date) { toast.error('请输入有效日期（如 2026年12月19日）'); return; }
    if (!startTime || !endTime) { toast.error('请填写上下班时间'); return; }
    const computed = computeRecord(date, startTime, endTime, isHoliday);
    if (computed.totalHours <= 0) { toast.error('扣除休息时间后无有效工时'); return; }
    if (editingId) {
      onRecordsChange(records.map((r) => r.id === editingId ? { ...computed, id: editingId } : r));
      toast.success('记录已更新'); setEditingId(null);
    } else {
      const r: IWorkRecord = { ...computed, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
      onRecordsChange([r, ...records]);
      const lunar = getLunarMonthDay(date);
      const hi = isChineseHoliday(date);
      const extra = hi ? `（${hi}）` : lunar ? `（农历${lunar}）` : '';
      if (computed.isHoliday) toast.success(`已添加节假日加班 ${computed.totalHours}h${extra}`);
      else if (computed.isWeekend) toast.success(`已添加周末加班 ${computed.totalHours}h${extra}`);
      else toast.success(`记录已添加${extra}`);
    }
    setDate(''); setDateDisplay(''); setStartTime('08:00'); setEndTime('17:00'); setIsHoliday(false);
  };
  const handleDelete = (id: string) => { onRecordsChange(records.filter((r) => r.id !== id)); if (editingId === id) handleCancelEdit(); toast.success('记录已删除'); };
  const handleDeleteLeave = (id: string) => { onLeaveRecordsChange(leaveRecords.filter((l) => l.id !== id)); toast.success('请假记录已删除'); };
  const enterMultiSelect = () => { setMultiSelectMode(true); setSelectedIds(new Set()); setSelectedLeaveIds(new Set()); };
  const exitMultiSelect = () => { setMultiSelectMode(false); setSelectedIds(new Set()); setSelectedLeaveIds(new Set()); };
  const tglRec = (id: string) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const tglLeave = (id: string) => setSelectedLeaveIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selAll = () => { setSelectedIds(new Set(filteredRecords.map((r) => r.id))); setSelectedLeaveIds(new Set(filteredLeaveRecords.map((l) => l.id))); };
  const deselAll = () => { setSelectedIds(new Set()); setSelectedLeaveIds(new Set()); };
  const totalSel = selectedIds.size + selectedLeaveIds.size;
  const allSel = totalSel > 0 && totalSel === filteredRecords.length + filteredLeaveRecords.length;
  const handleBatchDelete = () => { onRecordsChange(records.filter((r) => !selectedIds.has(r.id))); onLeaveRecordsChange(leaveRecords.filter((l) => !selectedLeaveIds.has(l.id))); toast.success(`已删除 ${totalSel} 条记录`); exitMultiSelect(); setBatchDeleteOpen(false); };
  const openCal = () => { const n = new Date(); setCalendarYear(n.getFullYear()); setCalendarMonth(n.getMonth()); setSelectedDates(new Set()); setBatchStartTime('08:00'); setBatchEndTime('17:00'); setBatchIsHoliday(false); setBatchOverlapMode('skip'); setBatchMode('add'); setCalendarOpen(true); };
  const tglCalDate = (ds: string) => setSelectedDates((p) => { const n = new Set(p); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; });
  const goPrevM = () => calendarMonth === 0 ? (setCalendarYear((y) => y - 1), setCalendarMonth(11)) : setCalendarMonth((m) => m - 1);
  const goNextM = () => calendarMonth === 11 ? (setCalendarYear((y) => y + 1), setCalendarMonth(0)) : setCalendarMonth((m) => m + 1);
  const handleBatchSubmit = () => { if (selectedDates.size === 0) { toast.error('请至少选择一个日期'); return; } const ex = new Set(records.map((r) => r.date)); const nr: IWorkRecord[] = []; let sk = 0, ow = 0; for (const ds of Array.from(selectedDates).sort()) { const c = computeRecord(ds, batchStartTime, batchEndTime, batchIsHoliday); if (c.totalHours <= 0) { sk++; continue; } if (batchMode === 'modify' || (batchOverlapMode === 'overwrite' && ex.has(ds))) ow++; else if (ex.has(ds)) { sk++; continue; } nr.push({ ...c, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ds }); } if (nr.length === 0) { toast.info('没有新记录可添加'); setCalendarOpen(false); return; } let up: IWorkRecord[]; const od = new Set(nr.map((r) => r.date)); if (batchMode === 'modify' || batchOverlapMode === 'overwrite') up = [...nr, ...records.filter((r) => !od.has(r.date))]; else up = [...nr, ...records]; onRecordsChange(up); toast.success(`已${batchMode === 'modify' ? '修改' : '添加'} ${nr.length} 条记录${sk > 0 ? `，跳过 ${sk} 天` : ''}`); setCalendarOpen(false); };
  const openLeaveCal = () => { const n = new Date(); setLeaveCalendarYear(n.getFullYear()); setLeaveCalendarMonth(n.getMonth()); setLeaveSelectedDates(new Set()); setLeaveType('事假'); setLeaveHalfDay(false); setLeaveCalendarOpen(true); };
  const tglLeaveDate = (ds: string) => setLeaveSelectedDates((p) => { const n = new Set(p); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; });
  const goLeavePrev = () => leaveCalendarMonth === 0 ? (setLeaveCalendarYear((y) => y - 1), setLeaveCalendarMonth(11)) : setLeaveCalendarMonth((m) => m - 1);
  const goLeaveNext = () => leaveCalendarMonth === 11 ? (setLeaveCalendarYear((y) => y + 1), setLeaveCalendarMonth(0)) : setLeaveCalendarMonth((m) => m + 1);
  const handleLeaveSubmit = () => { if (leaveSelectedDates.size === 0) { toast.error('请至少选择一个请假日期'); return; } const ds2 = calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth); const dpd = leaveHalfDay ? 0.5 : 1; const dPer = Math.round(ds2 * dpd * 100) / 100; const ex2 = new Set(leaveRecords.map((l) => l.date)); const nl: ILeaveRecord[] = []; let sk2 = 0; for (const ds of Array.from(leaveSelectedDates).sort()) { if (ex2.has(ds)) { sk2++; continue; } nl.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ds, date: ds, type: leaveType, days: dpd, deductionAmount: dPer }); } if (nl.length === 0) { toast.info('所选日期均已有请假记录'); setLeaveCalendarOpen(false); return; } onLeaveRecordsChange([...nl, ...leaveRecords]); toast.success(`已添加 ${nl.length} 天${leaveType}，扣款 ¥${(dPer * nl.length).toFixed(2)}`); setLeaveCalendarOpen(false); };

  const fm = (v: number) => `¥${v.toFixed(2)}`;
  const fh = (v: number) => `${v.toFixed(1)}h`;
  const today = new Date().toISOString().slice(0, 10);
  const dailySalary = calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth);
  const calCells = useMemo(() => generateMonthCalendar(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
  const leaveCalCells = useMemo(() => generateMonthCalendar(leaveCalendarYear, leaveCalendarMonth), [leaveCalendarYear, leaveCalendarMonth]);
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const previewLunchMin = date && startTime && endTime ? calcBreakDeductionMinutes(startTime, endTime, settings.lunchStartTime, settings.lunchEndTime) : 0;
  const previewAfternoonMin = date && startTime && endTime ? calcBreakDeductionMinutes(startTime, endTime, settings.afternoonStartTime, settings.afternoonEndTime) : 0;
  const dateLunar = date ? getLunarMonthDay(date) : '';
  const dateHolidayName = date ? isChineseHoliday(date) : null;
  const hasAny = records.length > 0 || leaveRecords.length > 0;
  const hasFiltered = filteredRecords.length > 0 || filteredLeaveRecords.length > 0;
  const leaveTotalDays = filteredLeaveRecords.reduce((s, l) => Math.round((s + l.days) * 10) / 10, 0);
  const leaveTotalAmt = filteredLeaveRecords.reduce((s, l) => Math.round((s + l.deductionAmount) * 100) / 100, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          {multiSelectMode ? (<Button type="button" variant="ghost" size="sm" onClick={exitMultiSelect} className="h-7 text-xs rounded-none"><X className="size-3.5 mr-1" />完成</Button>) : (
            <><Button type="button" variant="ghost" size="icon" onClick={handleRecalculateAll} className="size-7 rounded-none" title="重算"><RefreshCw className="size-3.5" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={enterMultiSelect} className="size-7 rounded-none" title="批量"><ListChecks className="size-3.5" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={toggleSortOrder} className="size-7 rounded-none" title="排序"><ArrowUpDown className={`size-3.5 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} /></Button></>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openCal} className="h-7 text-xs rounded-none border-2 border-border gap-1"><CalendarPlus className="size-3" />日历批量</Button>
      </div>
      <div className="space-y-3 p-4 flex-1 overflow-y-auto">
        {/* 搜索 */}
        <div className="flex items-center gap-2"><Search className="size-3.5 text-muted-foreground shrink-0" /><Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索日期..." className="h-8 text-xs rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary flex-1" /></div>
        <form onSubmit={handleSubmit} className="space-y-3 border-2 border-border bg-accent/30 p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{editingId ? '编辑记录' : '添加记录'}</span>{editingId && <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider">取消编辑</Button>}</div>
          <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">日期</Label><div className="flex items-center gap-2"><Input type="date" value={date} min="2020-01-01" max="2099-12-31" onChange={(e) => { setDate(e.target.value); setDateDisplay(e.target.value ? formatDateDisplay(e.target.value) : ''); }} className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary flex-1" /><Button type="button" variant="outline" size="icon" onClick={openCal} className="size-10 shrink-0 rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary" title="日历批量"><CalendarPlus className="size-4" /></Button></div>{date && (<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">{dateHolidayName ? <span className="text-destructive font-bold flex items-center gap-1"><PartyPopper className="size-3" />{dateHolidayName}</span> : isWeekend(date) ? <span className="text-info font-bold">周末</span> : <span>工作日</span>}{dateLunar && <span className="flex items-center gap-1"><Moon className="size-3" />农历{dateLunar}</span>}</div>)}</div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">上班时间</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary" /></div><div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">下班时间</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary" /></div></div>
          <div className="space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2"><span className="font-bold uppercase tracking-wider">休息扣除</span><div className="flex gap-4"><span>午休 {settings.lunchStartTime}~{settings.lunchEndTime}：(午休扣除会在记录详情中显示)</span></div></div>
          <div className="flex items-center gap-2"><Checkbox id="isHoliday" checked={isHoliday} onCheckedChange={(v) => setIsHoliday(v === true)} className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" /><Label htmlFor="isHoliday" className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">节假日加班</Label></div>
          <Button type="submit" className="w-full rounded-none bg-primary text-black hover:bg-white border-2 border-primary uppercase tracking-widest text-xs font-bold h-11">{editingId ? (<><Pencil className="size-4" />更新记录</>) : (<><Plus className="size-4" />添加记录</>)}</Button>
        </form>
        <div className="space-y-3 border-2 border-border bg-accent/30 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">请假扣款</span><Button type="button" variant="outline" size="sm" onClick={openLeaveCal} className="h-8 text-xs rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary uppercase tracking-wider font-bold gap-1.5"><CalendarPlus className="size-3.5" />选择日期</Button></div>{settings.baseSalary > 0 && <p className="text-xs text-muted-foreground">日薪 ¥{dailySalary.toFixed(2)}（底薪 ÷ {settings.standardDaysPerMonth}天）</p>}{leaveBreakdown.length > 0 && (<div className="flex flex-wrap gap-2 text-xs">{leaveBreakdown.map((lb) => (<Badge key={lb.type} className="rounded-none border-2 border-destructive/30 bg-destructive/5 text-destructive font-bold">{lb.type} {lb.days}天 ¥{lb.amount.toFixed(0)}</Badge>))}</div>)}</div>
        {hasAny && (<div className="flex items-center gap-2"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">月份筛选</Label><Select value={filterMonth} onValueChange={setFilterMonth}><SelectTrigger className="h-9 text-xs rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary flex-1"><SelectValue /></SelectTrigger><SelectContent className="rounded-none border-2 border-border bg-background"><SelectItem value="all" className="focus:bg-primary focus:text-black">全部月份</SelectItem>{availableMonths.map((m) => { const s = monthStats.get(m); return (<SelectItem key={m} value={m} className="focus:bg-primary focus:text-black">{getMonthLabel(m)}{s && <span className="ml-2 text-xs opacity-60">上班{s.workDays} · 请假{s.leaveDays}天</span>}</SelectItem>); })}</SelectContent></Select></div>)}
        {multiSelectMode && hasFiltered && (<div className="flex items-center justify-between border-2 border-primary bg-primary/10 p-2"><span className="text-xs font-bold uppercase tracking-wider text-primary">已选 {totalSel} 项</span><div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" onClick={allSel ? deselAll : selAll} className="h-7 text-xs rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary uppercase tracking-wider font-bold">{allSel ? (<><X className="size-3 mr-1" />取消全选</>) : (<><Check className="size-3 mr-1" />全选</>)}</Button><Button type="button" variant="outline" size="sm" disabled={totalSel === 0} onClick={() => setBatchDeleteOpen(true)} className="h-7 text-xs rounded-none border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground uppercase tracking-wider font-bold disabled:opacity-30"><Trash2 className="size-3 mr-1" />删除</Button></div></div>)}
        {!hasFiltered && (<div className="flex flex-col items-center justify-center py-10 text-muted-foreground"><CalendarDays className="size-12 mb-3 opacity-20" /><p className="text-sm font-bold uppercase tracking-wider">{filterMonth === 'all' ? '暂无记录' : `${getMonthLabel(filterMonth)} 无记录`}</p><p className="text-xs mt-1">添加上班记录开始</p></div>)}
        {filteredRecords.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">{filteredRecords.map((record) => { const overtimePay = calcRecordOvertimePay(record, settings); const isWd = !record.isWeekend && !record.isHoliday; const showFull = settings.showDailySalary && isWd; const amt = showFull ? dailySalary + overtimePay : overtimePay; const hasAmt = showFull || overtimePay > 0; const isCk = selectedIds.has(record.id); return (
            <div key={record.id} className={`border-2 bg-background p-3 transition-all duration-300 group ${multiSelectMode ? 'cursor-pointer' : ''} ${isCk ? 'border-primary bg-primary/10' : 'border-border hover:bg-primary hover:text-black hover:border-primary'}`} onClick={multiSelectMode ? () => tglRec(record.id) : undefined}>
              <div className="flex items-center justify-between min-w-0"><div className="flex items-center gap-2 min-w-0">{multiSelectMode && <Checkbox checked={isCk} className="rounded-none border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-black shrink-0" onClick={(e) => e.stopPropagation()} onCheckedChange={() => tglRec(record.id)} />}<span className="font-bold truncate">{record.date}</span><span className="text-xs shrink-0 text-muted-foreground group-hover:text-black/60">{getWeekdayLabel(record.date)}</span>{record.isHoliday ? <Badge className="text-xs shrink-0 rounded-none border-2 border-destructive bg-destructive/20 text-destructive group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">节假日</Badge> : record.isWeekend ? <Badge className="text-xs shrink-0 rounded-none border-2 border-info bg-info/20 text-info group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">周末</Badge> : record.weekdayOvertimeHours > 0 ? <Badge className="text-xs shrink-0 rounded-none border-2 border-warning bg-warning/20 text-warning group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">加班</Badge> : <Badge className="text-xs shrink-0 rounded-none border-2 border-border text-muted-foreground group-hover:border-black group-hover:text-black font-bold">正常</Badge>}</div><div className="flex items-center gap-2 shrink-0">{hasAmt ? <span className="text-xs font-bold tabular-nums text-success group-hover:text-black"><CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />¥{amt.toFixed(2)}</span> : <span className="text-xs text-muted-foreground/40 group-hover:text-black/30 tabular-nums"><CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />¥0</span>}{!multiSelectMode && (<><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground group-hover:text-black rounded-none" onClick={() => handleEdit(record)}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive group-hover:text-black group-hover:hover:text-destructive rounded-none" onClick={() => handleDelete(record.id)}><Trash2 className="size-3.5" /></Button></>)}</div></div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-black/70 mt-1.5"><span className="font-mono">{record.startTime} ~ {record.endTime}</span><span className="font-bold">实际 {record.totalHours}h</span></div>
              {showFull && !record.isWeekend && !record.isHoliday && (
                <div className="flex items-center gap-3 text-xs mt-1"><span className="text-success group-hover:text-black font-bold">日薪 {fm(dailySalary)}</span>{record.weekdayOvertimeHours > 0 && <span className="text-warning group-hover:text-black font-bold">+ 平时加班 {fh(record.weekdayOvertimeHours)} × {fm(settings.weekdayOvertimeRate)}/h</span>}</div>
              )}
              {(record.weekdayOvertimeHours > 0 || record.weekendOvertimeHours > 0 || record.holidayOvertimeHours > 0) && !showFull && (<div className="flex items-center gap-3 text-xs mt-1">{record.weekdayOvertimeHours > 0 && <span className="text-warning group-hover:text-black font-bold">平时加班 +{record.weekdayOvertimeHours}h</span>}{record.weekendOvertimeHours > 0 && <span className="text-info group-hover:text-black font-bold">周末加班 +{record.weekendOvertimeHours}h</span>}{record.holidayOvertimeHours > 0 && <span className="text-destructive group-hover:text-black font-bold">节假日加班 +{record.holidayOvertimeHours}h</span>}</div>)}
            </div>
          );})}</div>
        )}
        {filteredLeaveRecords.length > 0 && (
          <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">请假记录</p><span className="text-xs text-muted-foreground">累计 {leaveTotalDays} 天 · ¥{leaveTotalAmt.toFixed(2)}</span></div><div className="space-y-2 max-h-[200px] overflow-y-auto">{filteredLeaveRecords.map((leave) => { const isCk = selectedLeaveIds.has(leave.id); return (
            <div key={leave.id} className={`flex items-center justify-between border-2 p-3 transition-all duration-300 group ${multiSelectMode ? 'cursor-pointer' : ''} ${isCk ? 'border-primary bg-primary/10' : 'border-destructive/30 bg-destructive/5 hover:bg-destructive/15'}`} onClick={multiSelectMode ? () => tglLeave(leave.id) : undefined}><div className="min-w-0 flex-1 space-y-0.5"><div className="flex items-center gap-2">{multiSelectMode && <Checkbox checked={isCk} className="rounded-none border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-black shrink-0" onClick={(e) => e.stopPropagation()} onCheckedChange={() => tglLeave(leave.id)} />}<span className="font-bold text-sm">{leave.date}</span><span className="text-xs text-muted-foreground">{getWeekdayLabel(leave.date)}</span><Badge className="text-xs shrink-0 rounded-none border-2 border-destructive/50 bg-destructive/20 text-destructive font-bold">{leave.type}</Badge><Badge className="text-xs shrink-0 rounded-none border-2 border-border text-muted-foreground font-bold">{leave.days === 0.5 ? '半天' : `${leave.days}天`}</Badge></div></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs font-bold tabular-nums text-destructive"><CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />-¥{leave.deductionAmount.toFixed(2)}</span>{!multiSelectMode && <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive rounded-none" onClick={() => handleDeleteLeave(leave.id)}><Trash2 className="size-3.5" /></Button>}</div></div>
          );})}</div></div>
        )}
        <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}><AlertDialogContent className="rounded-none border-2 border-border bg-background"><AlertDialogHeader><AlertDialogTitle className="text-foreground uppercase tracking-wider">确认批量删除？</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">将删除选中的 {totalSel} 条记录</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold">取消</AlertDialogCancel><AlertDialogAction onClick={handleBatchDelete} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 uppercase tracking-widest text-xs font-bold">确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

        {/* 日历批量 */}
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}><DialogContent className="rounded-none border-2 border-border bg-background max-w-md max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle className="text-foreground uppercase tracking-wider text-sm">批量管理记录</DialogTitle><DialogDescription className="text-muted-foreground text-xs">多选日期，下方统一设置时间和类型</DialogDescription></DialogHeader>
          <div className="flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={goPrevM} className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider">◀ 上月</Button><span className="text-base font-black tracking-tight">{calendarYear}年{MONTHS[calendarMonth]}</span><Button type="button" variant="ghost" size="sm" onClick={goNextM} className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider">下月 ▶</Button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">{['日','一','二','三','四','五','六'].map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{calCells.map((ds, i) => { if (!ds) return <div key={`e-${i}`} className="aspect-square bg-accent/5" />; const isSel = selectedDates.has(ds); const isTd = ds === today; const hasR = records.some((r) => r.date === ds); const lunar = getLunarMonthDay(ds); const hol = isChineseHoliday(ds); return (<button key={ds} type="button" onClick={() => tglCalDate(ds)} className={`aspect-square flex flex-col items-center justify-center text-xs font-bold border-2 transition-colors cursor-pointer relative ${isSel ? 'bg-primary text-black border-primary' : hasR ? 'bg-accent/50 text-foreground border-border' : 'bg-background text-foreground border-border hover:border-primary'} ${isTd ? 'ring-1 ring-primary' : ''}`}><span>{new Date(ds + 'T00:00:00').getDate()}</span>{lunar && !isSel && <span className="text-[8px] leading-none opacity-40">{lunar.slice(-2).replace('日','')}</span>}{hol && <span className="absolute -top-0.5 right-0.5 text-[7px] text-destructive font-black">休</span>}{hasR && !isSel && <span className="text-[6px] leading-none text-muted-foreground mt-0.5">●</span>}</button>); })}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>已选 {selectedDates.size} 天</span><span>● 已有</span><span><Moon className="size-3 inline" /> 农历</span><span>休 节假日</span></div>
          {/* 设置区域 */}
          <div className="space-y-3 border-2 border-border bg-accent/30 p-3 max-h-[220px] overflow-y-auto">
            <div className="flex items-center gap-3"><Label className="text-xs font-bold uppercase tracking-wider shrink-0">模式</Label><div className="flex gap-1"><Button type="button" variant={batchMode === 'add' ? 'default' : 'outline'} size="sm" onClick={() => setBatchMode('add')} className="h-7 text-xs rounded-none uppercase tracking-wider font-bold">批量添加</Button><Button type="button" variant={batchMode === 'modify' ? 'default' : 'outline'} size="sm" onClick={() => setBatchMode('modify')} className="h-7 text-xs rounded-none uppercase tracking-wider font-bold">批量修改</Button></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">上班时间</Label><Input type="time" value={batchStartTime} onChange={(e) => setBatchStartTime(e.target.value)} className="h-9 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary" /></div><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">下班时间</Label><Input type="time" value={batchEndTime} onChange={(e) => setBatchEndTime(e.target.value)} className="h-9 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary" /></div></div>
            <div className="flex items-center gap-2"><Checkbox id="bH" checked={batchIsHoliday} onCheckedChange={(v) => setBatchIsHoliday(v === true)} className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" /><Label htmlFor="bH" className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">节假日加班</Label></div>
          </div>
          <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setCalendarOpen(false)} className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold">取消</Button><Button type="button" onClick={handleBatchSubmit} className="rounded-none bg-primary text-black hover:bg-white border-2 border-primary uppercase tracking-widest text-xs font-bold">{batchMode === 'modify' ? '批量修改' : '批量添加'} ({selectedDates.size})</Button></DialogFooter>
        </DialogContent></Dialog>

        {/* 请假 Dialog */}
        <Dialog open={leaveCalendarOpen} onOpenChange={setLeaveCalendarOpen}><DialogContent className="rounded-none border-2 border-border bg-background max-w-md"><DialogHeader><DialogTitle className="text-foreground uppercase tracking-wider text-sm">添加请假</DialogTitle><DialogDescription className="text-muted-foreground text-xs">多选日期，统一设置类型和天数</DialogDescription></DialogHeader>
          <div className="flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={goLeavePrev} className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider">◀ 上月</Button><span className="text-base font-black tracking-tight">{leaveCalendarYear}年{MONTHS[leaveCalendarMonth]}</span><Button type="button" variant="ghost" size="sm" onClick={goLeaveNext} className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider">下月 ▶</Button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">{['日','一','二','三','四','五','六'].map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{leaveCalCells.map((ds, i) => { if (!ds) return <div key={`le-${i}`} className="aspect-square bg-accent/5" />; const isSel = leaveSelectedDates.has(ds); const isTd = ds === today; const hasL = leaveRecords.some((l) => l.date === ds); const lunar = getLunarMonthDay(ds); const hol = isChineseHoliday(ds); return (<button key={ds} type="button" onClick={() => tglLeaveDate(ds)} className={`aspect-square flex flex-col items-center justify-center text-xs font-bold border-2 transition-colors cursor-pointer relative ${isSel ? 'bg-destructive text-destructive-foreground border-destructive' : hasL ? 'bg-destructive/10 text-foreground border-destructive/30' : 'bg-background text-foreground border-border hover:border-destructive'} ${isTd ? 'ring-1 ring-primary' : ''}`}><span>{new Date(ds + 'T00:00:00').getDate()}</span>{lunar && !isSel && <span className="text-[8px] leading-none opacity-40">{lunar.slice(-2).replace('日','')}</span>}{hol && <span className="absolute -top-0.5 right-0.5 text-[7px] text-destructive font-black">休</span>}{hasL && !isSel && <span className="text-[6px] leading-none text-destructive/60 mt-0.5">●</span>}</button>); })}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>已选 {leaveSelectedDates.size} 天</span><span><Moon className="size-3 inline" /> 农历</span><span>休 节假日</span></div>
          <div className="space-y-3 border-2 border-border bg-accent/30 p-3"><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">请假类型</Label><Select value={leaveType} onValueChange={setLeaveType}><SelectTrigger className="h-9 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary"><SelectValue /></SelectTrigger><SelectContent className="rounded-none border-2 border-border bg-background">{LEAVE_TYPES.map((lt) => <SelectItem key={lt} value={lt} className="focus:bg-primary focus:text-black">{lt}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><Checkbox id="lH" checked={leaveHalfDay} onCheckedChange={(v) => setLeaveHalfDay(v === true)} className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" /><Label htmlFor="lH" className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">半天假（默认全天）</Label></div><p className="text-xs text-muted-foreground">日薪 ¥{dailySalary.toFixed(2)} · {leaveHalfDay ? '半天扣 ¥' + (dailySalary / 2).toFixed(2) : '全天扣 ¥' + dailySalary.toFixed(2)}</p></div>
          <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setLeaveCalendarOpen(false)} className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold">取消</Button><Button type="button" onClick={handleLeaveSubmit} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 border-2 border-destructive uppercase tracking-widest text-xs font-bold">添加请假 ({leaveSelectedDates.size})</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </div>
  );
}