import { useState, useMemo, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock, CalendarDays, Pencil, CalendarPlus, CircleDollarSign, ArrowUpDown, ListChecks, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ISalarySettings, IWorkRecord, ILeaveRecord } from '@/data/salary';
import {
  isWeekend,
  getMonthKey,
  getMonthLabel,
  getWeekdayLabel,
  calcBreakDeductionMinutes,
  calcDailySalary,
  saveRecords,
  saveLeaveRecords,
} from '@/data/salary';

interface WorkRecordSectionProps {
  settings: ISalarySettings;
  records: IWorkRecord[];
  onRecordsChange: (records: IWorkRecord[]) => void;
  leaveRecords: ILeaveRecord[];
  onLeaveRecordsChange: (records: ILeaveRecord[]) => void;
}

const LEAVE_TYPES = [
  { value: '事假', label: '事假' },
  { value: '病假', label: '病假' },
  { value: '年假', label: '年假' },
  { value: '调休', label: '调休' },
  { value: '其他', label: '其他' },
];

function generateMonthCalendar(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(ds);
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

export default function WorkRecordSection({
  settings,
  records,
  onRecordsChange,
  leaveRecords,
  onLeaveRecordsChange,
}: WorkRecordSectionProps) {
  const [date, setDate] = useState('');
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

  const [leaveCalendarOpen, setLeaveCalendarOpen] = useState(false);
  const [leaveCalendarYear, setLeaveCalendarYear] = useState(new Date().getFullYear());
  const [leaveCalendarMonth, setLeaveCalendarMonth] = useState(new Date().getMonth());
  const [leaveSelectedDates, setLeaveSelectedDates] = useState<Set<string>>(new Set());
  const [leaveType, setLeaveType] = useState('事假');
  const [leaveHalfDay, setLeaveHalfDay] = useState(false);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try {
      const saved = localStorage.getItem('__salary_calculator_sort_order');
      if (saved === 'desc') return 'desc';
    } catch { /* ignore */ }
    return 'asc';
  });

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLeaveIds, setSelectedLeaveIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      const next = prev === 'asc' ? 'desc' : 'asc';
      try { localStorage.setItem('__salary_calculator_sort_order', next); } catch { /* ignore */ }
      return next;
    });
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      set.add(getMonthKey(r.date));
    }
    for (const l of leaveRecords) {
      set.add(getMonthKey(l.date));
    }
    return Array.from(set).sort().reverse();
  }, [records, leaveRecords]);

  const filteredRecords = useMemo(() => {
    const list = filterMonth === 'all' ? records : records.filter((r) => getMonthKey(r.date) === filterMonth);
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [records, filterMonth, sortOrder]);

  const filteredLeaveRecords = useMemo(() => {
    const list = filterMonth === 'all' ? leaveRecords : leaveRecords.filter((l) => getMonthKey(l.date) === filterMonth);
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [leaveRecords, filterMonth, sortOrder]);

  const computeRecord = (
    d: string,
    st: string,
    et: string,
    holiday: boolean,
  ): Omit<IWorkRecord, 'id'> => {
    const lunchMin = calcBreakDeductionMinutes(st, et, settings.lunchStartTime, settings.lunchEndTime);
    const afternoonMin = calcBreakDeductionMinutes(st, et, settings.afternoonStartTime, settings.afternoonEndTime);
    const lunchHours = Math.round((lunchMin / 60) * 100) / 100;
    const afternoonHours = Math.round((afternoonMin / 60) * 100) / 100;

    const [sh, sm] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    const rawMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const totalHours = Math.round(((rawMinutes - lunchMin - afternoonMin) / 60) * 100) / 100;

    const weekend = isWeekend(d);
    let weekdayOvertimeHours = 0;
    let weekendOvertimeHours = 0;
    let holidayOvertimeHours = 0;

    if (holiday) {
      holidayOvertimeHours = totalHours;
    } else if (weekend) {
      weekendOvertimeHours = totalHours;
    } else {
      weekdayOvertimeHours = Math.max(0, Math.round((totalHours - settings.standardHoursPerDay) * 100) / 100);
    }

    return {
      date: d,
      startTime: st,
      endTime: et,
      totalHours,
      weekdayOvertimeHours,
      weekendOvertimeHours,
      holidayOvertimeHours,
      isWeekend: weekend,
      isHoliday: holiday,
      lunchDeductionHours: lunchHours,
      afternoonDeductionHours: afternoonHours,
    };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error('请填写完整的日期和时间');
      return;
    }

    const computed = computeRecord(date, startTime, endTime, isHoliday);
    if (computed.totalHours <= 0) {
      toast.error('扣除休息时间后无有效工时');
      return;
    }

    if (editingId) {
      const updated = records.map((r) =>
        r.id === editingId ? { ...computed, id: editingId } : r,
      );
      onRecordsChange(updated);
      toast.success('记录已更新');
      setEditingId(null);
    } else {
      const newRecord: IWorkRecord = {
        ...computed,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      };
      onRecordsChange([newRecord, ...records]);

      const parts: string[] = [];
      if (computed.lunchDeductionHours > 0) parts.push(`午休 ${computed.lunchDeductionHours}h`);
      if (computed.afternoonDeductionHours > 0) parts.push(`下午休 ${computed.afternoonDeductionHours}h`);
      const deductionInfo = parts.length > 0 ? `（已扣 ${parts.join('、')}）` : '';

      if (isHoliday) {
        toast.success(`已添加节假日加班（${computed.totalHours}h）${deductionInfo}`);
      } else if (computed.isWeekend) {
        toast.success(`已添加周末加班（${computed.totalHours}h）${deductionInfo}`);
      } else if (computed.weekdayOvertimeHours > 0) {
        toast.success(`已添加记录，平时加班 ${computed.weekdayOvertimeHours}h${deductionInfo}`);
      } else {
        toast.success(`记录已添加${deductionInfo}`);
      }
    }

    setDate('');
    setStartTime('08:00');
    setEndTime('17:00');
    setIsHoliday(false);
  };

  const handleEdit = (record: IWorkRecord) => {
    setDate(record.date);
    setStartTime(record.startTime);
    setEndTime(record.endTime);
    setIsHoliday(record.isHoliday);
    setEditingId(record.id);
  };

  const handleCancelEdit = () => {
    setDate('');
    setStartTime('08:00');
    setEndTime('17:00');
    setIsHoliday(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    onRecordsChange(updated);
    if (editingId === id) handleCancelEdit();
    toast.success('记录已删除');
  };

  const handleDeleteLeave = (id: string) => {
    onLeaveRecordsChange(leaveRecords.filter((l) => l.id !== id));
    toast.success('请假记录已删除');
  };

  const enterMultiSelect = () => {
    setMultiSelectMode(true);
    setSelectedIds(new Set());
    setSelectedLeaveIds(new Set());
  };

  const exitMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedIds(new Set());
    setSelectedLeaveIds(new Set());
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectLeave = (id: string) => {
    setSelectedLeaveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRecords = () => {
    setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    setSelectedLeaveIds(new Set(filteredLeaveRecords.map((l) => l.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setSelectedLeaveIds(new Set());
  };

  const totalSelected = selectedIds.size + selectedLeaveIds.size;
  const allSelected = totalSelected > 0 && totalSelected === filteredRecords.length + filteredLeaveRecords.length;

  const handleBatchDelete = () => {
    const updatedRecords = records.filter((r) => !selectedIds.has(r.id));
    const updatedLeaveRecords = leaveRecords.filter((l) => !selectedLeaveIds.has(l.id));
    onRecordsChange(updatedRecords);
    saveRecords(updatedRecords);
    onLeaveRecordsChange(updatedLeaveRecords);
    saveLeaveRecords(updatedLeaveRecords);
    const count = selectedIds.size + selectedLeaveIds.size;
    toast.success(`已删除 ${count} 条记录`);
    exitMultiSelect();
    setBatchDeleteOpen(false);
  };

  const openCalendar = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDates(new Set());
    setBatchStartTime('08:00');
    setBatchEndTime('17:00');
    setBatchIsHoliday(false);
    setBatchOverlapMode('skip');
    setCalendarOpen(true);
  };

  const toggleCalendarDate = (ds: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(ds)) {
        next.delete(ds);
      } else {
        next.add(ds);
      }
      return next;
    });
  };

  const goPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleBatchSubmit = () => {
    if (selectedDates.size === 0) {
      toast.error('请至少选择一个日期');
      return;
    }
    if (!batchStartTime || !batchEndTime) {
      toast.error('请填写上下班时间');
      return;
    }

    const existingDates = new Set(records.map((r) => r.date));
    const newRecords: IWorkRecord[] = [];
    let skipped = 0;
    let overwritten = 0;

    const sortedDates = Array.from(selectedDates).sort();

    for (const ds of sortedDates) {
      const computed = computeRecord(ds, batchStartTime, batchEndTime, batchIsHoliday);
      if (computed.totalHours <= 0) {
        skipped++;
        continue;
      }

      if (existingDates.has(ds)) {
        if (batchOverlapMode === 'skip') {
          skipped++;
          continue;
        }
        overwritten++;
      }

      newRecords.push({
        ...computed,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ds,
      });
    }

    if (newRecords.length === 0) {
      toast.info('所选日期均已有记录（已跳过）');
      setCalendarOpen(false);
      return;
    }

    let updated: IWorkRecord[];
    if (batchOverlapMode === 'overwrite') {
      const overwriteDates = new Set(newRecords.map((r) => r.date));
      updated = [...newRecords, ...records.filter((r) => !overwriteDates.has(r.date))];
    } else {
      updated = [...newRecords, ...records];
    }

    onRecordsChange(updated);
    const msgParts: string[] = [`已批量添加 ${newRecords.length} 条记录`];
    if (skipped > 0) msgParts.push(`跳过 ${skipped} 天`);
    if (overwritten > 0) msgParts.push(`覆盖 ${overwritten} 天`);
    toast.success(msgParts.join('，'));
    setCalendarOpen(false);
  };

  const openLeaveCalendar = () => {
    const now = new Date();
    setLeaveCalendarYear(now.getFullYear());
    setLeaveCalendarMonth(now.getMonth());
    setLeaveSelectedDates(new Set());
    setLeaveType('事假');
    setLeaveHalfDay(false);
    setLeaveCalendarOpen(true);
  };

  const toggleLeaveDate = (ds: string) => {
    setLeaveSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(ds)) {
        next.delete(ds);
      } else {
        next.add(ds);
      }
      return next;
    });
  };

  const goLeavePrevMonth = () => {
    if (leaveCalendarMonth === 0) {
      setLeaveCalendarYear((y) => y - 1);
      setLeaveCalendarMonth(11);
    } else {
      setLeaveCalendarMonth((m) => m - 1);
    }
  };

  const goLeaveNextMonth = () => {
    if (leaveCalendarMonth === 11) {
      setLeaveCalendarYear((y) => y + 1);
      setLeaveCalendarMonth(0);
    } else {
      setLeaveCalendarMonth((m) => m + 1);
    }
  };

  const handleLeaveBatchSubmit = () => {
    if (leaveSelectedDates.size === 0) {
      toast.error('请至少选择一个请假日期');
      return;
    }

    const dailySalary = calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth);
    const daysPerDate = leaveHalfDay ? 0.5 : 1;
    const deductionPerDate = Math.round(dailySalary * daysPerDate * 100) / 100;

    const existingLeaveDates = new Set(leaveRecords.map((l) => l.date));
    const newLeaves: ILeaveRecord[] = [];
    let skipped = 0;

    const sortedDates = Array.from(leaveSelectedDates).sort();
    for (const ds of sortedDates) {
      if (existingLeaveDates.has(ds)) {
        skipped++;
        continue;
      }
      newLeaves.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ds,
        date: ds,
        type: leaveType,
        days: daysPerDate,
        deductionAmount: deductionPerDate,
      });
    }

    if (newLeaves.length === 0) {
      toast.info('所选日期均已有请假记录');
      setLeaveCalendarOpen(false);
      return;
    }

    onLeaveRecordsChange([...newLeaves, ...leaveRecords]);
    const dayLabel = leaveHalfDay ? '半天' : '全天';
    const msgParts: string[] = [`已添加 ${newLeaves.length} 天${leaveType}（${dayLabel}），扣款 ¥${(deductionPerDate * newLeaves.length).toFixed(2)}`];
    if (skipped > 0) msgParts.push(`跳过 ${skipped} 天`);
    toast.success(msgParts.join('，'));
    setLeaveCalendarOpen(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  const previewLunchMin = date && startTime && endTime
    ? calcBreakDeductionMinutes(startTime, endTime, settings.lunchStartTime, settings.lunchEndTime)
    : 0;
  const previewAfternoonMin = date && startTime && endTime
    ? calcBreakDeductionMinutes(startTime, endTime, settings.afternoonStartTime, settings.afternoonEndTime)
    : 0;

  const hasAnyRecords = records.length > 0 || leaveRecords.length > 0;
  const hasFilteredContent = filteredRecords.length > 0 || filteredLeaveRecords.length > 0;

  const calendarCells = useMemo(
    () => generateMonthCalendar(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const leaveCalendarCells = useMemo(
    () => generateMonthCalendar(leaveCalendarYear, leaveCalendarMonth),
    [leaveCalendarYear, leaveCalendarMonth],
  );

  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const dailySalary = calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth);

  return (
    <Card className="border-2 border-border bg-background rounded-none h-full">
      <CardHeader className="pb-3 border-b-2 border-border">
        <CardTitle className="flex items-center justify-between text-sm font-bold uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            上班记录
          </span>
          <div className="flex items-center gap-1">
            {multiSelectMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={exitMultiSelect}
                className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider font-bold"
              >
                <X className="size-3.5 mr-1" />
                完成
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={enterMultiSelect}
                  className="size-7 text-muted-foreground hover:text-foreground rounded-none"
                  aria-label="批量管理"
                  title="批量管理"
                >
                  <ListChecks className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSortOrder}
                  className="size-7 text-muted-foreground hover:text-foreground rounded-none"
                  aria-label={sortOrder === 'asc' ? '正序排列，点击切换倒序' : '倒序排列，点击切换正序'}
                  title={sortOrder === 'asc' ? '正序 ↑' : '倒序 ↓'}
                >
                  <ArrowUpDown className={`size-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* 添加/编辑表单 */}
        <form onSubmit={handleSubmit} className="space-y-3 border-2 border-border bg-accent/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {editingId ? '编辑记录' : '添加记录'}
            </span>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider"
              >
                取消编辑
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">日期</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={openCalendar}
                className="size-10 shrink-0 rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary"
                aria-label="日历多选批量添加"
              >
                <CalendarPlus className="size-4" />
              </Button>
            </div>
            {date && (
              <p className="text-xs text-muted-foreground">
                {isHoliday ? (
                  <span className="text-destructive font-bold">节假日 · 全部工时计入节假日加班</span>
                ) : isWeekend(date) ? (
                  <span className="text-info font-bold">周末 · 全部工时计入周末加班</span>
                ) : (
                  <span>工作日 · 超出 {settings.standardHoursPerDay}h 部分计入平时加班</span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">上班时间</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">下班时间</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </div>

          {(previewLunchMin > 0 || previewAfternoonMin > 0) && (
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {previewLunchMin > 0 && (
                <p>午休 {settings.lunchStartTime}~{settings.lunchEndTime}，扣除 {(previewLunchMin / 60).toFixed(1)}h</p>
              )}
              {previewAfternoonMin > 0 && (
                <p>下午休 {settings.afternoonStartTime}~{settings.afternoonEndTime}，扣除 {(previewAfternoonMin / 60).toFixed(1)}h</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="isHoliday"
              checked={isHoliday}
              onCheckedChange={(v) => setIsHoliday(v === true)}
              className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive data-[state=checked]:text-destructive-foreground"
            />
            <Label
              htmlFor="isHoliday"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer"
            >
              标记为节假日加班
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full rounded-none bg-primary text-black hover:bg-white border-2 border-primary uppercase tracking-widest text-xs font-bold h-11"
          >
            {editingId ? (
              <>
                <Pencil className="size-4" />
                更新记录
              </>
            ) : (
              <>
                <Plus className="size-4" />
                添加记录
              </>
            )}
          </Button>
        </form>

        {/* 请假管理 */}
        <div className="space-y-3 border-2 border-border bg-accent/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">请假扣款</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openLeaveCalendar}
              className="h-8 text-xs rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary uppercase tracking-wider font-bold gap-1.5"
            >
              <CalendarPlus className="size-3.5" />
              选择日期
            </Button>
          </div>
          {settings.baseSalary > 0 && (
            <p className="text-xs text-muted-foreground">
              日薪 ¥{dailySalary.toFixed(2)}（底薪 ÷ {settings.standardDaysPerMonth}天），选择日期后按天自动扣款
            </p>
          )}
        </div>

        {/* 月份筛选 */}
        {hasAnyRecords && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">月份筛选</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 text-xs rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-2 border-border bg-background">
                <SelectItem value="all" className="focus:bg-primary focus:text-black">全部月份</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m} className="focus:bg-primary focus:text-black">
                    {getMonthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 多选操作栏 */}
        {multiSelectMode && hasFilteredContent && (
          <div className="flex items-center justify-between border-2 border-primary bg-primary/10 p-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              已选 {totalSelected} 项
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={allSelected ? deselectAll : selectAllRecords}
                className="h-7 text-xs rounded-none border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary uppercase tracking-wider font-bold"
              >
                {allSelected ? (
                  <>
                    <X className="size-3 mr-1" />
                    取消全选
                  </>
                ) : (
                  <>
                    <Check className="size-3 mr-1" />
                    全选
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={totalSelected === 0}
                onClick={() => setBatchDeleteOpen(true)}
                className="h-7 text-xs rounded-none border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground uppercase tracking-wider font-bold disabled:opacity-30"
              >
                <Trash2 className="size-3 mr-1" />
                删除
              </Button>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!hasFilteredContent && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CalendarDays className="size-12 mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-wider">
              {filterMonth === 'all' ? '暂无记录' : `${getMonthLabel(filterMonth)} 无记录`}
            </p>
            <p className="text-xs mt-1">添加上班记录或请假记录开始计算工资</p>
          </div>
        )}

        {/* 上班记录列表 */}
        {filteredRecords.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredRecords.map((record) => {
              const overtimePay = calcRecordOvertimePay(record, settings);
              const isWeekdayRecord = !record.isWeekend && !record.isHoliday;
              const showFullDaily = settings.showDailySalary && isWeekdayRecord;
              const displayAmount = showFullDaily ? dailySalary + overtimePay : overtimePay;
              const hasAmount = showFullDaily || overtimePay > 0;
              const isChecked = selectedIds.has(record.id);
              return (
                <div
                  key={record.id}
                  className={`border-2 bg-background p-3 transition-all duration-300 group ${multiSelectMode ? 'cursor-pointer' : ''} ${isChecked ? 'border-primary bg-primary/10' : 'border-border hover:bg-primary hover:text-black hover:border-primary'}`}
                  onClick={multiSelectMode ? () => toggleSelectRecord(record.id) : undefined}
                >
                  {/* 第一行：复选框(多选模式) + 日期 + 星期 + 类型标签 + 当日工资 + 操作按钮 */}
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {multiSelectMode && (
                        <Checkbox
                          checked={isChecked}
                          className="rounded-none border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-black shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleSelectRecord(record.id)}
                        />
                      )}
                      <span className="font-bold truncate">{record.date}</span>
                      <span className={`text-xs shrink-0 ${multiSelectMode && !isChecked ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-black/60'}`}>
                        {getWeekdayLabel(record.date)}
                      </span>
                      {record.isHoliday ? (
                        <Badge className="text-xs shrink-0 rounded-none border-2 border-destructive bg-destructive/20 text-destructive group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">
                          节假日
                        </Badge>
                      ) : record.isWeekend ? (
                        <Badge className="text-xs shrink-0 rounded-none border-2 border-info bg-info/20 text-info group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">
                          周末
                        </Badge>
                      ) : record.weekdayOvertimeHours > 0 ? (
                        <Badge className="text-xs shrink-0 rounded-none border-2 border-warning bg-warning/20 text-warning group-hover:border-black group-hover:text-black group-hover:bg-black/10 font-bold">
                          加班
                        </Badge>
                      ) : (
                        <Badge className="text-xs shrink-0 rounded-none border-2 border-border text-muted-foreground group-hover:border-black group-hover:text-black font-bold">
                          正常
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasAmount ? (
                        <span className="text-xs font-bold tabular-nums text-success group-hover:text-black">
                          <CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />
                          ¥{displayAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 group-hover:text-black/30 tabular-nums">
                          <CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />
                          ¥0
                        </span>
                      )}
                      {!multiSelectMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground group-hover:text-black rounded-none"
                            onClick={() => handleEdit(record)}
                            aria-label="编辑记录"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive group-hover:text-black group-hover:hover:text-destructive rounded-none"
                            onClick={() => handleDelete(record.id)}
                            aria-label="删除记录"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 第二行：上下班时间 + 实际工时 */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-black/70 mt-1.5">
                    <span className="font-mono">{record.startTime} ~ {record.endTime}</span>
                    <span className="font-bold">实际 {record.totalHours}h</span>
                  </div>

                  {/* 第三行：休息扣除明细 */}
                  {(record.lunchDeductionHours > 0 || record.afternoonDeductionHours > 0) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-black/50 mt-0.5">
                      {record.lunchDeductionHours > 0 && (
                        <span>午休 -{record.lunchDeductionHours}h</span>
                      )}
                      {record.afternoonDeductionHours > 0 && (
                        <span>下午休 -{record.afternoonDeductionHours}h</span>
                      )}
                    </div>
                  )}

                  {/* 第四行：加班明细 */}
                  {(record.weekdayOvertimeHours > 0 || record.weekendOvertimeHours > 0 || record.holidayOvertimeHours > 0) && (
                    <div className="flex items-center gap-3 text-xs mt-1">
                      {record.weekdayOvertimeHours > 0 && (
                        <span className="text-warning group-hover:text-black font-bold">
                          平时加班 +{record.weekdayOvertimeHours}h
                        </span>
                      )}
                      {record.weekendOvertimeHours > 0 && (
                        <span className="text-info group-hover:text-black font-bold">
                          周末加班 +{record.weekendOvertimeHours}h
                        </span>
                      )}
                      {record.holidayOvertimeHours > 0 && (
                        <span className="text-destructive group-hover:text-black font-bold">
                          节假日加班 +{record.holidayOvertimeHours}h
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 请假记录列表 */}
        {filteredLeaveRecords.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">请假记录</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filteredLeaveRecords.map((leave) => {
                const isChecked = selectedLeaveIds.has(leave.id);
                return (
                <div
                  key={leave.id}
                  className={`flex items-center justify-between border-2 p-3 transition-all duration-300 group ${multiSelectMode ? 'cursor-pointer' : ''} ${isChecked ? 'border-primary bg-primary/10' : 'border-destructive/30 bg-destructive/5 hover:bg-destructive/15'}`}
                  onClick={multiSelectMode ? () => toggleSelectLeave(leave.id) : undefined}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {multiSelectMode && (
                        <Checkbox
                          checked={isChecked}
                          className="rounded-none border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-black shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleSelectLeave(leave.id)}
                        />
                      )}
                      <span className="font-bold text-sm">{leave.date}</span>
                      <span className="text-xs text-muted-foreground">{getWeekdayLabel(leave.date)}</span>
                      <Badge className="text-xs shrink-0 rounded-none border-2 border-destructive/50 bg-destructive/20 text-destructive font-bold">
                        {leave.type}
                      </Badge>
                      <Badge className="text-xs shrink-0 rounded-none border-2 border-border text-muted-foreground font-bold">
                        {leave.days === 0.5 ? '半天' : '全天'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold tabular-nums text-destructive">
                      <CircleDollarSign className="size-3 inline mr-0.5 -mt-px" />
                      -¥{leave.deductionAmount.toFixed(2)}
                    </span>
                    {!multiSelectMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive rounded-none"
                        onClick={() => handleDeleteLeave(leave.id)}
                        aria-label="删除请假记录"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 批量删除确认 */}
        <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
          <AlertDialogContent className="rounded-none border-2 border-border bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground uppercase tracking-wider">确认批量删除？</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                将删除选中的 {totalSelected} 条记录（{selectedIds.size} 条上班 + {selectedLeaveIds.size} 条请假），此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold">取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleBatchDelete} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 uppercase tracking-widest text-xs font-bold">确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>

      {/* 日历多选批量添加 Dialog */}
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="rounded-none border-2 border-border bg-background max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-wider text-sm">批量添加记录</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              多选日期后统一设置上下班时间，批量生成记录
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goPrevMonth}
              className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider"
            >
              ◀ 上月
            </Button>
            <span className="text-sm font-bold uppercase tracking-wider">
              {calendarYear}年 {MONTH_NAMES[calendarMonth]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goNextMonth}
              className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider"
            >
              下月 ▶
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((ds, i) => {
              if (!ds) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }
              const isSelected = selectedDates.has(ds);
              const isTodayDate = ds === today;
              const hasRecord = records.some((r) => r.date === ds);
              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => toggleCalendarDate(ds)}
                  className={`aspect-square flex flex-col items-center justify-center text-xs font-bold border-2 transition-colors cursor-pointer
                    ${isSelected
                      ? 'bg-primary text-black border-primary'
                      : hasRecord
                        ? 'bg-accent/50 text-foreground border-border'
                        : 'bg-background text-foreground border-border hover:border-primary'
                    }
                    ${isTodayDate ? 'ring-1 ring-primary' : ''}
                  `}
                >
                  {new Date(ds + 'T00:00:00').getDate()}
                  {hasRecord && !isSelected && (
                    <span className="text-[8px] leading-none text-muted-foreground">●</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            已选 {selectedDates.size} 天 · 有记录日期显示 ●
          </p>

          <div className="space-y-3 border-2 border-border bg-accent/30 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">上班时间</Label>
                <Input
                  type="time"
                  value={batchStartTime}
                  onChange={(e) => setBatchStartTime(e.target.value)}
                  className="h-9 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">下班时间</Label>
                <Input
                  type="time"
                  value={batchEndTime}
                  onChange={(e) => setBatchEndTime(e.target.value)}
                  className="h-9 text-sm rounded-none border-2 border-border bg-background text-foreground focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="batchIsHoliday"
                checked={batchIsHoliday}
                onCheckedChange={(v) => setBatchIsHoliday(v === true)}
                className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive data-[state=checked]:text-destructive-foreground"
              />
              <Label
                htmlFor="batchIsHoliday"
                className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer"
              >
                节假日加班
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">已有记录处理</Label>
              <Select value={batchOverlapMode} onValueChange={(v) => setBatchOverlapMode(v as 'skip' | 'overwrite')}>
                <SelectTrigger className="h-9 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border bg-background">
                  <SelectItem value="skip" className="focus:bg-primary focus:text-black">跳过已有记录</SelectItem>
                  <SelectItem value="overwrite" className="focus:bg-primary focus:text-black">覆盖已有记录</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCalendarOpen(false)}
              className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleBatchSubmit}
              className="rounded-none bg-primary text-black hover:bg-white border-2 border-primary uppercase tracking-widest text-xs font-bold"
            >
              批量添加 ({selectedDates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 请假日历多选 Dialog */}
      <Dialog open={leaveCalendarOpen} onOpenChange={setLeaveCalendarOpen}>
        <DialogContent className="rounded-none border-2 border-border bg-background max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-wider text-sm">添加请假</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              多选请假日期，统一设置类型和半天/全天
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goLeavePrevMonth}
              className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider"
            >
              ◀ 上月
            </Button>
            <span className="text-sm font-bold uppercase tracking-wider">
              {leaveCalendarYear}年 {MONTH_NAMES[leaveCalendarMonth]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goLeaveNextMonth}
              className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-none uppercase tracking-wider"
            >
              下月 ▶
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {leaveCalendarCells.map((ds, i) => {
              if (!ds) {
                return <div key={`leave-empty-${i}`} className="aspect-square" />;
              }
              const isSelected = leaveSelectedDates.has(ds);
              const isTodayDate = ds === today;
              const hasLeave = leaveRecords.some((l) => l.date === ds);
              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => toggleLeaveDate(ds)}
                  className={`aspect-square flex flex-col items-center justify-center text-xs font-bold border-2 transition-colors cursor-pointer
                    ${isSelected
                      ? 'bg-destructive text-destructive-foreground border-destructive'
                      : hasLeave
                        ? 'bg-destructive/10 text-foreground border-destructive/30'
                        : 'bg-background text-foreground border-border hover:border-destructive'
                    }
                    ${isTodayDate ? 'ring-1 ring-primary' : ''}
                  `}
                >
                  {new Date(ds + 'T00:00:00').getDate()}
                  {hasLeave && !isSelected && (
                    <span className="text-[8px] leading-none text-destructive/60">●</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            已选 {leaveSelectedDates.size} 天 · 已有请假日期显示 ●
          </p>

          <div className="space-y-3 border-2 border-border bg-accent/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">请假类型</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="h-9 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border bg-background">
                  {LEAVE_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value} className="focus:bg-primary focus:text-black">
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="leaveHalfDay"
                checked={leaveHalfDay}
                onCheckedChange={(v) => setLeaveHalfDay(v === true)}
                className="rounded-none border-2 border-border data-[state=checked]:bg-destructive data-[state=checked]:border-destructive data-[state=checked]:text-destructive-foreground"
              />
              <Label
                htmlFor="leaveHalfDay"
                className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer"
              >
                半天假（默认全天）
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              日薪 ¥{dailySalary.toFixed(2)} · {leaveHalfDay ? '半天扣 ¥' + (dailySalary / 2).toFixed(2) : '全天扣 ¥' + dailySalary.toFixed(2)}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaveCalendarOpen(false)}
              className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleLeaveBatchSubmit}
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 border-2 border-destructive uppercase tracking-widest text-xs font-bold"
            >
              添加请假 ({leaveSelectedDates.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
