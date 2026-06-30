import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, CalendarPlus, Layers } from 'lucide-react';
import { toast } from 'sonner';
import {
  type ISalarySettings, type IWorkRecord, type ILeaveRecord,
  type WorkMode, WORK_MODE_LABELS,
  DEFAULT_SETTINGS,
  loadSettings, saveSettings, loadRecords, saveRecords, loadLeaveRecords, saveLeaveRecords,
  getMonthKey, getMonthLabel, calcBreakDeductionMinutes, countWorkdayAttendance,
} from '@/data/salary';
import SalarySettingsSection from './SalarySettingsSection';
import WorkRecordSection from './WorkRecordSection';
import SalarySummarySection from './SalarySummarySection';

const MODE_SUBTITLES: Record<WorkMode, string> = {
  standard: '5天8小时 · 早八晚五 · 周六固定加班',
  flex: '综合工时 · 灵活排班 · 月度总工时核算',
  piecework: '计件工资 · 多劳多得 · 按件计价',
};

export default function SalaryCalculatorPage() {
  const [settings, setSettings] = useState<ISalarySettings>(() => loadSettings());
  const [records, setRecords] = useState<IWorkRecord[]>(() => loadRecords());
  const [leaveRecords, setLeaveRecords] = useState<ILeaveRecord[]>(() => loadLeaveRecords());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { saveLeaveRecords(leaveRecords); }, [leaveRecords]);

  const handleSettingsChange = useCallback((next: ISalarySettings) => setSettings(next), []);
  const handleRecordsChange = useCallback((next: IWorkRecord[]) => setRecords(next), []);
  const handleLeaveRecordsChange = useCallback((next: ILeaveRecord[]) => setLeaveRecords(next), []);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setRecords([]);
    setLeaveRecords([]);
    saveSettings({ ...DEFAULT_SETTINGS });
    saveRecords([]);
    saveLeaveRecords([]);
    toast.success('数据已重置');
  }, []);

  const handleModeChange = useCallback((mode: string) => {
    setSettings((prev) => {
      const next = { ...prev, workMode: mode as WorkMode };
      saveSettings(next);
      return next;
    });
  }, []);

  // 按月统计（含天数）
  const monthStats = useMemo(() => {
    const map = new Map<string, { workDays: number; leaveDays: number }>();
    for (const r of records) {
      const mk = getMonthKey(r.date);
      const entry = map.get(mk) || { workDays: 0, leaveDays: 0 };
      entry.workDays++;
      map.set(mk, entry);
    }
    for (const l of leaveRecords) {
      const mk = getMonthKey(l.date);
      const entry = map.get(mk) || { workDays: 0, leaveDays: 0 };
      entry.leaveDays = Math.round((entry.leaveDays + l.days) * 10) / 10;
      map.set(mk, entry);
    }
    return map;
  }, [records, leaveRecords]);

  const availableMonths = useMemo(() => {
    return Array.from(monthStats.keys()).sort().reverse();
  }, [monthStats]);

  const filteredRecords = useMemo(() => {
    if (selectedMonth === 'all') return records;
    return records.filter((r) => getMonthKey(r.date) === selectedMonth);
  }, [records, selectedMonth]);

  const filteredLeaveRecords = useMemo(() => {
    if (selectedMonth === 'all') return leaveRecords;
    return leaveRecords.filter((l) => getMonthKey(l.date) === selectedMonth);
  }, [leaveRecords, selectedMonth]);

  const workdayAttendanceCount = useMemo(() => {
    return countWorkdayAttendance(records, selectedMonth === 'all' ? undefined : selectedMonth);
  }, [records, selectedMonth]);

  const handleAddSaturdayRecords = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const saturdays: string[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === 6) {
        saturdays.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
      d.setDate(d.getDate() + 1);
    }
    const existingDates = new Set(records.map((r) => r.date));
    const newRecords: IWorkRecord[] = [];
    for (const ds of saturdays) {
      if (!existingDates.has(ds)) {
        const lunchMin = calcBreakDeductionMinutes('08:00', '17:00', settings.lunchStartTime, settings.lunchEndTime);
        const afternoonMin = calcBreakDeductionMinutes('08:00', '17:00', settings.afternoonStartTime, settings.afternoonEndTime);
        const totalHours = Math.round(((9 * 60 - lunchMin - afternoonMin) / 60) * 100) / 100;
        newRecords.push({
          id: `sat-${ds}`, date: ds, startTime: '08:00', endTime: '17:00', totalHours,
          weekdayOvertimeHours: 0, weekendOvertimeHours: totalHours, holidayOvertimeHours: 0,
          isWeekend: true, isHoliday: false,
          lunchDeductionHours: Math.round((lunchMin / 60) * 100) / 100,
          afternoonDeductionHours: Math.round((afternoonMin / 60) * 100) / 100,
        });
      }
    }
    if (newRecords.length === 0) { toast.info('本月周六加班记录已全部添加'); return; }
    const updated = [...newRecords, ...records];
    setRecords(updated);
    saveRecords(updated);
    toast.success(`已添加 ${newRecords.length} 天周六加班记录`);
  }, [records, settings]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-[95vw] mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b-2 border-border pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">JiCai · Salary Calculator</p>
            <h1 className="text-[clamp(2rem,6vw,4rem)] font-bold leading-[0.9] tracking-tighter">记财</h1>
            <p className="text-sm text-muted-foreground mt-2 tracking-wide">
              {MODE_SUBTITLES[settings.workMode]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleAddSaturdayRecords}
              className="gap-2 border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary rounded-none uppercase tracking-widest text-xs font-bold px-4 py-5">
              <CalendarPlus className="size-4" />本月周六加班
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-2 border-border text-foreground hover:bg-primary hover:text-black hover:border-primary rounded-none uppercase tracking-widest text-xs font-bold px-6 py-5">
                  <RotateCcw className="size-4" />重置
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-none border-2 border-border bg-background">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground uppercase tracking-wider">确认重置？</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    将清除所有工资设置、上班记录和请假记录，恢复为默认状态。此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-none border-2 border-border uppercase tracking-widest text-xs font-bold">取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="rounded-none bg-primary text-black hover:bg-white uppercase tracking-widest text-xs font-bold">确认重置</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        {/* Mode Switcher */}
        <div className="flex items-center gap-3 border-b-2 border-border/50 pb-4">
          <Layers className="size-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">计算模式</span>
          <Select value={settings.workMode} onValueChange={handleModeChange}>
            <SelectTrigger className="w-56 h-10 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border bg-background">
              {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="focus:bg-primary focus:text-black font-bold">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">月度筛选</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-56 h-10 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary font-bold">
              <SelectValue placeholder="全部月份" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border bg-background">
              <SelectItem value="all" className="focus:bg-primary focus:text-black font-bold">全部月份</SelectItem>
              {availableMonths.map((mk) => {
                const stat = monthStats.get(mk);
                return (
                  <SelectItem key={mk} value={mk} className="focus:bg-primary focus:text-black font-bold">
                    {getMonthLabel(mk)}
                    {stat && <span className="ml-2 text-xs text-muted-foreground"> 上班{stat.workDays}天 · 请假{stat.leaveDays}天</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedMonth !== 'all' && (
            <span className="text-xs text-muted-foreground">
              {filteredRecords.length} 条上班 · {filteredLeaveRecords.length} 条请假
            </span>
          )}
          {settings.salaryMode === 'attendance' && (
            <span className="text-xs text-primary font-bold uppercase tracking-wider ml-auto">工作日出勤 {workdayAttendanceCount} 天</span>
          )}
        </div>

        {/* Three-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SalarySettingsSection settings={settings} onSettingsChange={handleSettingsChange} />
          <WorkRecordSection settings={settings} records={records} leaveRecords={leaveRecords}
            onRecordsChange={handleRecordsChange} onLeaveRecordsChange={handleLeaveRecordsChange} />
          <SalarySummarySection settings={settings} records={filteredRecords} leaveRecords={filteredLeaveRecords} />
        </div>
      </main>
    </div>
  );
}
