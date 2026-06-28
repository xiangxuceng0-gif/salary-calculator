import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Clock, CalendarDays, Star, Zap, TrendingUp, UserMinus, Shield, Banknote } from 'lucide-react';
import type { ISalarySettings, IWorkRecord, ILeaveRecord } from '@/data/salary';
import { calcDailySalary, countWorkdayAttendance } from '@/data/salary';

interface SalarySummarySectionProps {
  settings: ISalarySettings;
  records: IWorkRecord[];
  leaveRecords: ILeaveRecord[];
}

export default function SalarySummarySection({ settings, records, leaveRecords }: SalarySummarySectionProps) {
  const summary = useMemo(() => {
    const {
      baseSalary,
      weekdayOvertimeRate,
      weekendOvertimeRate,
      holidayOvertimeRate,
      standardDaysPerMonth,
      salaryMode,
      customAttendanceDays,
    } = settings;

    let totalWeekdayOvertimeHours = 0;
    let totalWeekendOvertimeHours = 0;
    let totalHolidayOvertimeHours = 0;
    let totalHours = 0;

    for (const r of records) {
      totalHours += r.totalHours;
      totalWeekdayOvertimeHours += r.weekdayOvertimeHours;
      totalWeekendOvertimeHours += r.weekendOvertimeHours;
      totalHolidayOvertimeHours += r.holidayOvertimeHours;
    }

    const weekdayOvertimePay = totalWeekdayOvertimeHours * weekdayOvertimeRate;
    const weekendOvertimePay = totalWeekendOvertimeHours * weekendOvertimeRate;
    const holidayOvertimePay = totalHolidayOvertimeHours * holidayOvertimeRate;

    let totalLeaveDays = 0;
    let totalLeaveDeduction = 0;
    for (const l of leaveRecords) {
      totalLeaveDays += l.days;
      totalLeaveDeduction += l.deductionAmount;
    }

    const dailySalary = calcDailySalary(baseSalary, standardDaysPerMonth);
    const autoAttendanceDays = countWorkdayAttendance(records);
    const effectiveAttendanceDays = salaryMode === 'attendance'
      ? (customAttendanceDays > 0 ? customAttendanceDays : autoAttendanceDays)
      : standardDaysPerMonth;
    const effectiveBaseSalary = salaryMode === 'attendance'
      ? Math.round(dailySalary * effectiveAttendanceDays * 100) / 100
      : baseSalary;

    const insuranceAmount = (settings.insuranceType === 'social' || settings.insuranceType === 'both' ? settings.socialInsuranceAmount : 0)
      + (settings.insuranceType === 'housing' || settings.insuranceType === 'both' ? settings.housingFundAmount : 0);

    const totalPay = effectiveBaseSalary + weekdayOvertimePay + weekendOvertimePay + holidayOvertimePay - totalLeaveDeduction;
    const netPay = totalPay - insuranceAmount;

    return {
      effectiveBaseSalary,
      salaryMode,
      effectiveAttendanceDays,
      dailySalary,
      totalWeekdayOvertimeHours,
      weekdayOvertimePay,
      totalWeekendOvertimeHours,
      weekendOvertimePay,
      totalHolidayOvertimeHours,
      holidayOvertimePay,
      totalLeaveDays,
      totalLeaveDeduction,
      totalHours,
      totalPay,
      insuranceAmount,
      netPay,
    };
  }, [settings, records, leaveRecords]);

  const formatMoney = (v: number) => `¥${v.toFixed(2)}`;
  const formatHours = (v: number) => `${v.toFixed(1)}h`;

  return (
    <Card className="border-2 border-border bg-background rounded-none h-full">
      <CardHeader className="pb-3 border-b-2 border-border">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">工资汇总</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {/* 底薪 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Wallet className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">底薪</span>
            {summary.salaryMode === 'attendance' && (
              <span className="text-xs text-muted-foreground ml-auto">
                出勤 {summary.effectiveAttendanceDays} 天
              </span>
            )}
          </div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
            {formatMoney(summary.effectiveBaseSalary)}
          </p>
          {summary.salaryMode === 'attendance' && (
            <p className="text-xs text-muted-foreground mt-1">
              日薪 {formatMoney(summary.dailySalary)} × {summary.effectiveAttendanceDays} 天
            </p>
          )}
        </div>

        {/* 平时加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Clock className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">平时加班</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
              {formatMoney(summary.weekdayOvertimePay)}
            </p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {formatHours(summary.totalWeekdayOvertimeHours)}
            </span>
          </div>
        </div>

        {/* 周末加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <CalendarDays className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">周末加班</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
              {formatMoney(summary.weekendOvertimePay)}
            </p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {formatHours(summary.totalWeekendOvertimeHours)}
            </span>
          </div>
        </div>

        {/* 节假日加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Star className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">节假日加班</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
              {formatMoney(summary.holidayOvertimePay)}
            </p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {formatHours(summary.totalHolidayOvertimeHours)}
            </span>
          </div>
        </div>

        {/* 请假扣款 */}
        <div className="border-2 border-destructive/40 bg-destructive/5 p-4 transition-all duration-300 hover:bg-destructive/10 hover:border-destructive">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <UserMinus className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">请假扣款</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-destructive">
              -{formatMoney(summary.totalLeaveDeduction)}
            </p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">
              {summary.totalLeaveDays} 天
            </span>
          </div>
        </div>

        {/* 五险一金扣除 */}
        {summary.insuranceAmount > 0 && (
          <div className="border-2 border-info/40 bg-info/5 p-4 transition-all duration-300 hover:bg-info/10 hover:border-info">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Shield className="size-4" />
              <span className="text-xs font-bold uppercase tracking-widest">五险一金</span>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-info">
              -{formatMoney(summary.insuranceAmount)}
            </p>
          </div>
        )}

        {/* 总工时 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Zap className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">总工时</span>
          </div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">
            {formatHours(summary.totalHours)}
          </p>
        </div>

        {/* 总工资 */}
        <div className="border-2 bg-primary text-black border-primary p-4">
          <div className="flex items-center gap-2 mb-2 text-black/70">
            <TrendingUp className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">总工资</span>
          </div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-black">
            {formatMoney(summary.totalPay)}
          </p>
        </div>

        {/* 实发工资 */}
        <div className="border-2 bg-success text-black border-success p-4">
          <div className="flex items-center gap-2 mb-2 text-black/70">
            <Banknote className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">实发工资</span>
          </div>
          <p className="text-3xl font-black tabular-nums tracking-tighter text-black">
            {formatMoney(summary.netPay)}
          </p>
          <p className="text-xs text-black/60 mt-1">
            总工资 {formatMoney(summary.totalPay)} - 请假 {formatMoney(summary.totalLeaveDeduction)} - 五险一金 {formatMoney(summary.insuranceAmount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
