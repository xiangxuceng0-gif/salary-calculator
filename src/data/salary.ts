import { Lunar, HolidayUtil } from 'lunar-javascript';

// ========== TYPES ==========

export type WorkMode = 'standard' | 'flex' | 'piecework';

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  standard: '标准模式（5天8小时）',
  flex: '综合工时制',
  piecework: '计件模式',
};

export interface ISalarySettings {
  workMode: WorkMode;
  baseSalary: number;
  bonusAmount: number;
  weekdayOvertimeRate: number;
  weekendOvertimeRate: number;
  holidayOvertimeRate: number;
  standardHoursPerDay: number;
  standardDaysPerMonth: number;
  lunchStartTime: string;
  lunchEndTime: string;
  afternoonStartTime: string;
  afternoonEndTime: string;
  salaryMode: 'full' | 'attendance';
  customAttendanceDays: number;
  showDailySalary: boolean;
  insuranceType: 'none' | 'social' | 'housing' | 'both';
  socialInsuranceAmount: number;
  housingFundAmount: number;
  sickLeaveRate: number;
  pieceRate: number;
}

export interface IWorkRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  weekdayOvertimeHours: number;
  weekendOvertimeHours: number;
  holidayOvertimeHours: number;
  isWeekend: boolean;
  isHoliday: boolean;
  lunchDeductionHours: number;
  afternoonDeductionHours: number;
}

export interface ILeaveRecord {
  id: string;
  date: string;
  type: string;
  days: number;
  deductionAmount: number;
}

export interface ILeaveBreakdown {
  type: string;
  days: number;
  amount: number;
}

// ========== DEFAULTS ==========

export const DEFAULT_SETTINGS: ISalarySettings = {
  workMode: 'standard',
  baseSalary: 4000,
  bonusAmount: 0,
  weekdayOvertimeRate: 22.7,
  weekendOvertimeRate: 28.4,
  holidayOvertimeRate: 68.2,
  standardHoursPerDay: 8,
  standardDaysPerMonth: 22,
  lunchStartTime: '12:00',
  lunchEndTime: '13:00',
  afternoonStartTime: '15:30',
  afternoonEndTime: '15:45',
  salaryMode: 'full',
  customAttendanceDays: 0,
  showDailySalary: false,
  insuranceType: 'none',
  socialInsuranceAmount: 0,
  housingFundAmount: 0,
  sickLeaveRate: 1,
  pieceRate: 10,
};

// ========== WEEKDAY ==========

const WEEKDAY_LABELS: Record<number, string> = {
  0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六',
};

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEKDAY_LABELS[d.getDay()] ?? '';
}

// ========== MONTH ==========

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

// ========== SALARY CALC ==========

export function calcDailySalary(baseSalary: number, standardDays: number): number {
  if (standardDays <= 0) return 0;
  return Math.round((baseSalary / standardDays) * 100) / 100;
}

export function countWorkdayAttendance(records: IWorkRecord[], monthKey?: string): number {
  const dateSet = new Set<string>();
  for (const r of records) {
    if (monthKey && getMonthKey(r.date) !== monthKey) continue;
    if (!r.isWeekend && !r.isHoliday) {
      dateSet.add(r.date);
    }
  }
  return dateSet.size;
}

// ========== BREAK DEDUCTION ==========

export function calcBreakDeductionMinutes(
  startTime: string,
  endTime: string,
  breakStart: string,
  breakEnd: string,
): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const [bh, bm] = breakStart.split(':').map(Number);
  const [bEh, bEm] = breakEnd.split(':').map(Number);
  const workStart = sh * 60 + sm;
  const workEnd = eh * 60 + em;
  const breakStartMin = bh * 60 + bm;
  const breakEndMin = bEh * 60 + bEm;
  if (workEnd <= workStart) return 0;
  if (breakStartMin >= breakEndMin) return 0;
  const overlapStart = Math.max(workStart, breakStartMin);
  const overlapEnd = Math.min(workEnd, breakEndMin);
  if (overlapStart >= overlapEnd) return 0;
  return overlapEnd - overlapStart;
}

// ========== LUNAR + HOLIDAY ==========

export function getLunarDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const lunar = Lunar.fromYmd(y, m, d);
    return lunar.getDayInChinese();
  } catch { return ''; }
}

export function getLunarMonthDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const lunar = Lunar.fromYmd(y, m, d);
    const month = lunar.getMonthInChinese();
    const day = lunar.getDayInChinese();
    return `${month}${day}`;
  } catch { return ''; }
}

export function isChineseHoliday(dateStr: string): string | null {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const holiday = HolidayUtil.getHoliday(y, m, d);
    if (holiday) return holiday.getName();
    // 调休工作日不算节假日
    return null;
  } catch { return null; }
}

// ========== DATE FORMAT ==========

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

export function parseDateInput(input: string): string | null {
  // 支持格式: 2026年12月19日、2026-12-19、2026/12/19
  const match = input.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 2020 || y > 2099) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ========== LEAVE BREAKDOWN ==========

export function calcLeaveBreakdown(leaveRecords: ILeaveRecord[]): ILeaveBreakdown[] {
  const map = new Map<string, { days: number; amount: number }>();
  for (const l of leaveRecords) {
    const entry = map.get(l.type) || { days: 0, amount: 0 };
    entry.days = Math.round((entry.days + l.days) * 100) / 100;
    entry.amount = Math.round((entry.amount + l.deductionAmount) * 100) / 100;
    map.set(l.type, entry);
  }
  return Array.from(map.entries()).map(([type, val]) => ({
    type,
    days: val.days,
    amount: val.amount,
  }));
}

// ========== STORAGE ==========

const SETTINGS_KEY = '__salary_calculator_settings_v6';
const RECORDS_KEY = '__salary_calculator_records_v6';
const LEAVE_KEY = '__salary_calculator_leave_v6';

export function loadSettings(): ISalarySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  // 兼容旧版数据迁移
  try {
    const old = localStorage.getItem('__salary_calculator_settings_v5');
    if (old) {
      const parsed = JSON.parse(old);
      const migrated = { ...DEFAULT_SETTINGS, ...parsed };
      saveSettings(migrated);
      return migrated;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: ISalarySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function loadRecords(): IWorkRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 兼容旧版
  try {
    const old = localStorage.getItem('__salary_calculator_records_v5');
    if (old) {
      const data = JSON.parse(old);
      saveRecords(data);
      return data;
    }
  } catch { /* ignore */ }
  return [];
}

export function saveRecords(records: IWorkRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch { /* ignore */ }
}

export function loadLeaveRecords(): ILeaveRecord[] {
  try {
    const raw = localStorage.getItem(LEAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 兼容旧版
  try {
    const old = localStorage.getItem('__salary_calculator_leave_v5');
    if (old) {
      const data = JSON.parse(old);
      saveLeaveRecords(data);
      return data;
    }
  } catch { /* ignore */ }
  return [];
}

export function saveLeaveRecords(records: ILeaveRecord[]): void {
  try {
    localStorage.setItem(LEAVE_KEY, JSON.stringify(records));
  } catch { /* ignore */ }
}

// ========== EXPORT / IMPORT ==========

export interface IBackupData {
  version: string;
  exportedAt: string;
  settings: ISalarySettings;
  records: IWorkRecord[];
  leaveRecords: ILeaveRecord[];
}

export function exportAllData(): string {
  const data: IBackupData = {
    version: '0.3.1',
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    records: loadRecords(),
    leaveRecords: loadLeaveRecords(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(json: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(json) as IBackupData;
    if (!data.settings || !Array.isArray(data.records) || !Array.isArray(data.leaveRecords)) {
      return { success: false, message: '无效的备份文件：缺少必要数据' };
    }
    // 合并设置（保留新字段的默认值）
    const merged = { ...DEFAULT_SETTINGS, ...data.settings };
    saveSettings(merged);
    saveRecords(data.records);
    saveLeaveRecords(data.leaveRecords);
    return {
      success: true,
      message: `导入成功！${data.records.length} 条上班记录，${data.leaveRecords.length} 条请假记录`,
    };
  } catch (e: any) {
    return { success: false, message: `解析失败：${e.message || '未知错误'}` };
  }
}
