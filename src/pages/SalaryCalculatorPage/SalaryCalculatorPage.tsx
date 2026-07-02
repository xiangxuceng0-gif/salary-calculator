import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, RotateCw, CalendarPlus, Layers, Download, Upload, ClipboardList, Calculator, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { type ISalarySettings, type IWorkRecord, type ILeaveRecord, type WorkMode, WORK_MODE_LABELS, DEFAULT_SETTINGS, loadSettings, saveSettings, loadRecords, saveRecords, loadLeaveRecords, saveLeaveRecords, getMonthKey, getMonthLabel, calcBreakDeductionMinutes, calcDailySalary, countWorkdayAttendance, exportAllData, importAllData } from '@/data/salary';
import SalarySettingsSection from './SalarySettingsSection';
import WorkRecordSection from './WorkRecordSection';
import SalarySummarySection from './SalarySummarySection';

type Tab = 'record' | 'summary' | 'settings';

export default function SalaryCalculatorPage() {
  const [settings, setSettings] = useState<ISalarySettings>(() => loadSettings());
  const [records, setRecords] = useState<IWorkRecord[]>(() => loadRecords());
  const [leaveRecords, setLeaveRecords] = useState<ILeaveRecord[]>(() => loadLeaveRecords());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<Tab>('record');

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { saveLeaveRecords(leaveRecords); }, [leaveRecords]);

  // 自动备份：每次数据变化后3秒静默备份
  useEffect(() => {
    const t = setTimeout(() => {
      const backup = JSON.stringify({ settings, records, leaveRecords });
      localStorage.setItem('__jicai_backup', backup);
      setHasBackup(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [settings, records, leaveRecords]);

  const handleSettingsChange = useCallback((next: ISalarySettings) => setSettings(next), []);
  const handleRecordsChange = useCallback((next: IWorkRecord[]) => setRecords(next), []);
  const handleLeaveRecordsChange = useCallback((next: ILeaveRecord[]) => setLeaveRecords(next), []);

  const [hasBackup, setHasBackup] = useState(true); // 始终检查：localStorage中有备份就显示

  // 启动时检查备份
  useEffect(() => { setHasBackup(!!localStorage.getItem('__jicai_backup')); }, []);

  const monthTotal = useMemo(() => {
    const monthRecords = selectedMonth === 'all' ? records : records.filter((r) => getMonthKey(r.date) === selectedMonth);
    const monthLeaves = selectedMonth === 'all' ? leaveRecords : leaveRecords.filter((l) => getMonthKey(l.date) === selectedMonth);
    const ot = monthRecords.reduce((s,r) => s + r.weekdayOvertimeHours*settings.weekdayOvertimeRate + r.weekendOvertimeHours*settings.weekendOvertimeRate + r.holidayOvertimeHours*settings.holidayOvertimeRate, 0);
    const ld = monthLeaves.reduce((s,l) => Math.round((s + l.deductionAmount) * 100) / 100, 0);
    const effBase = settings.salaryMode === 'attendance' ? Math.round(calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth) * (settings.customAttendanceDays > 0 ? settings.customAttendanceDays : countWorkdayAttendance(monthRecords)) * 100) / 100 : settings.baseSalary;
    return effBase + ot - ld;
  }, [settings, records, leaveRecords, selectedMonth]);

  const handleReset = useCallback(() => {
    // 自动备份
    const backup = JSON.stringify({ settings, records, leaveRecords });
    localStorage.setItem('__jicai_backup', backup);
    setHasBackup(true);
    setSettings({ ...DEFAULT_SETTINGS }); setRecords([]); setLeaveRecords([]);
    saveSettings({ ...DEFAULT_SETTINGS }); saveRecords([]); saveLeaveRecords([]);
    toast.success('数据已重置，可从顶栏恢复');
  }, [settings, records, leaveRecords]);

  const handleRestore = useCallback(() => {
    const raw = localStorage.getItem('__jicai_backup');
    if (!raw) { toast.error('没有可恢复的备份'); return; }
    try {
      const { settings: s, records: r, leaveRecords: l } = JSON.parse(raw);
      setSettings({ ...DEFAULT_SETTINGS, ...s }); setRecords(r); setLeaveRecords(l);
      saveSettings({ ...DEFAULT_SETTINGS, ...s }); saveRecords(r); saveLeaveRecords(l);
      toast.success('已恢复上一份数据');
      // 恢复后保留备份（防止再次误操作）
    } catch { toast.error('备份数据损坏'); }
  }, []);

  const handleExport = useCallback(() => {
    const json = exportAllData(); const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `记财备份_${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success('备份文件已下载');
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e: any) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const result = importAllData(reader.result as string); if (result.success) { setSettings(loadSettings()); setRecords(loadRecords()); setLeaveRecords(loadLeaveRecords()); toast.success(result.message); } else toast.error(result.message); }; reader.readAsText(file); };
    input.click();
  }, []);

  const handleModeChange = useCallback((mode: string) => { setSettings((prev) => { const next = { ...prev, workMode: mode as WorkMode }; saveSettings(next); return next; }); }, []);

  const monthStats = useMemo(() => {
    const map = new Map<string, { workDays: number; leaveDays: number }>();
    for (const r of records) { const mk = getMonthKey(r.date); const e = map.get(mk) || { workDays: 0, leaveDays: 0 }; e.workDays++; map.set(mk, e); }
    for (const l of leaveRecords) { const mk = getMonthKey(l.date); const e = map.get(mk) || { workDays: 0, leaveDays: 0 }; e.leaveDays = Math.round((e.leaveDays + l.days) * 10) / 10; map.set(mk, e); }
    return map;
  }, [records, leaveRecords]);
  const availableMonths = useMemo(() => Array.from(monthStats.keys()).sort().reverse(), [monthStats]);
  const filteredRecords = useMemo(() => selectedMonth === 'all' ? records : records.filter((r) => getMonthKey(r.date) === selectedMonth), [records, selectedMonth]);
  const filteredLeaveRecords = useMemo(() => selectedMonth === 'all' ? leaveRecords : leaveRecords.filter((l) => getMonthKey(l.date) === selectedMonth), [leaveRecords, selectedMonth]);
  const workdayAttendanceCount = useMemo(() => countWorkdayAttendance(records, selectedMonth === 'all' ? undefined : selectedMonth), [records, selectedMonth]);

  const tabs: { key: Tab; icon: JSX.Element; label: string }[] = [
    { key: 'record', icon: <ClipboardList className="size-5" />, label: '记录' },
    { key: 'summary', icon: <Calculator className="size-5" />, label: '汇总' },
    { key: 'settings', icon: <Settings2 className="size-5" />, label: '设置' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight shrink-0">记财</h1>
          <Select value={settings.workMode} onValueChange={handleModeChange}>
            <SelectTrigger className="h-8 text-xs rounded-lg border bg-white w-36 shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-lg border bg-white shadow-md">
              {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(([k, v]) => (<SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{selectedMonth === 'all' ? '全部月份' : getMonthLabel(selectedMonth)}预估 <span className="font-semibold text-primary">¥{monthTotal.toFixed(0)}</span></span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleExport} className="size-8 rounded-lg" title="导出"><Download className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={handleImport} className="size-8 rounded-lg" title="导入"><Upload className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={handleRestore} disabled={!hasBackup} className={`size-8 rounded-lg ${!hasBackup ? 'opacity-20 cursor-not-allowed' : ''}`} title={hasBackup ? '恢复数据' : '无备份'}><RotateCw className="size-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="size-8 rounded-lg" title="重置"><RotateCcw className="size-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border bg-white shadow-lg"><AlertDialogHeader><AlertDialogTitle>确认重置？</AlertDialogTitle><AlertDialogDescription>清除所有数据恢复默认，8秒内可撤销</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-lg border text-sm">取消</AlertDialogCancel><AlertDialogAction onClick={handleReset} className="rounded-lg bg-primary text-white text-sm">确认重置</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* 月份筛选条 */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-white/50">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-8 text-xs rounded-lg border bg-white w-40 shadow-none"><SelectValue placeholder="全部月份" /></SelectTrigger>
          <SelectContent className="rounded-lg border bg-white shadow-md">
            <SelectItem value="all" className="text-xs">全部月份</SelectItem>
            {availableMonths.map((mk) => { const s = monthStats.get(mk); return (<SelectItem key={mk} value={mk} className="text-xs">{getMonthLabel(mk)}{s && <span className="ml-1 opacity-50"> 上{s.workDays}请{s.leaveDays}</span>}</SelectItem>); })}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">工作日{workdayAttendanceCount}天</span>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'record' && (
          <WorkRecordSection settings={settings} records={records} leaveRecords={leaveRecords} onRecordsChange={handleRecordsChange} onLeaveRecordsChange={handleLeaveRecordsChange} />
        )}
        {activeTab === 'summary' && (
          <SalarySummarySection settings={settings} records={filteredRecords} leaveRecords={filteredLeaveRecords} />
        )}
        {activeTab === 'settings' && (
          <SalarySettingsSection settings={settings} onSettingsChange={handleSettingsChange} />
        )}
      </div>

      {/* 底部Tab导航 */}
      <nav className="sticky bottom-0 z-10 bg-white/80 backdrop-blur border-t border-border flex safe-area-bottom">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${activeTab === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.icon}
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
