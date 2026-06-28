// EXPORTS: ISalarySettings, IWorkRecord, ILeaveRecord, DEFAULT_SETTINGS, loadSettings, saveSettings, loadRecords, saveRecords, loadLeaveRecords, saveLeaveRecords, isWeekend, getMonthLabel, getMonthKey, getWeekdayLabel, calcBreakDeductionMinutes, calcDailySalary, countWorkdayAttendance

export interface ISalarySettings {
  baseSalary: number;
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

export const DEFAULT_SETTINGS: ISalarySettings = {
  baseSalary: 4000,
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
};

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

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

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

const SETTINGS_KEY = '__salary_calculator_settings_v5';
const RECORDS_KEY = '__salary_calculator_records_v5';
const LEAVE_KEY = '__salary_calculator_leave_v5';

export function loadSettings(): ISalarySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
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
  return [];
}

export function saveLeaveRecords(records: ILeaveRecord[]): void {
  try {
    localStorage.setItem(LEAVE_KEY, JSON.stringify(records));
  } catch { /* ignore */ }
}
