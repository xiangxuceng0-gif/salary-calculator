import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Clock, CalendarDays, Star, TrendingUp, UserMinus, Shield, Banknote, Zap } from 'lucide-react';
import type { ISalarySettings, IWorkRecord, ILeaveRecord } from '@/data/salary';
import { calcDailySalary, countWorkdayAttendance, calcLeaveBreakdown } from '@/data/salary';

interface SalarySummarySectionProps {
  settings: ISalarySettings;
  records: IWorkRecord[];
  leaveRecords: ILeaveRecord[];
}

export default function SalarySummarySection({ settings, records, leaveRecords }: SalarySummarySectionProps) {
  const summary = useMemo(() => {
    const { baseSalary, weekdayOvertimeRate, weekendOvertimeRate, holidayOvertimeRate, standardDaysPerMonth, salaryMode, customAttendanceDays, insuranceType, socialInsuranceAmount, housingFundAmount } = settings;
    let twh = 0, weh = 0, hoh = 0, th = 0;
    for (const r of records) { th += r.totalHours; twh += r.weekdayOvertimeHours; weh += r.weekendOvertimeHours; hoh += r.holidayOvertimeHours; }
    const wPay = twh * weekdayOvertimeRate; const wePay = weh * weekendOvertimeRate; const hoPay = hoh * holidayOvertimeRate;
    const overtimeTotal = wPay + wePay + hoPay;
    let tld = 0, tldAmt = 0;
    for (const l of leaveRecords) { tld = Math.round((tld + l.days) * 100) / 100; tldAmt = Math.round((tldAmt + l.deductionAmount) * 100) / 100; }
    const ds2 = calcDailySalary(baseSalary, standardDaysPerMonth);
    const autoAtt = countWorkdayAttendance(records);
    const effDays = salaryMode === 'attendance' ? (customAttendanceDays > 0 ? customAttendanceDays : autoAtt) : standardDaysPerMonth;
    const effBase = salaryMode === 'attendance' ? Math.round(ds2 * effDays * 100) / 100 : baseSalary;
    const insAmt = (insuranceType === 'social' || insuranceType === 'both' ? socialInsuranceAmount : 0) + (insuranceType === 'housing' || insuranceType === 'both' ? housingFundAmount : 0);
    const totalPay = effBase + overtimeTotal - tldAmt;
    const netPay = totalPay - insAmt;
    const leaveBreakdown = calcLeaveBreakdown(leaveRecords);
    return { effBase, salaryMode, effDays, ds2, twh, wPay, weh, wePay, hoh, hoPay, overtimeTotal, tld, tldAmt, leaveBreakdown, th, totalPay, insAmt, netPay };
  }, [settings, records, leaveRecords]);

  const fm = (v: number) => `¥${v.toFixed(2)}`;
  const fh = (v: number) => `${v.toFixed(1)}h`;

  return (
    <Card className="border-2 border-border bg-background rounded-none h-full">
      <CardHeader className="pb-3 border-b-2 border-border">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">工资汇总</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3">

        {/* 底薪 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Wallet className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">底薪</span>
            {summary.salaryMode === 'attendance' && <span className="text-xs ml-auto">出勤 {summary.effDays} 天</span>}
          </div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">{fm(summary.effBase)}</p>
          {summary.salaryMode === 'attendance' && <p className="text-xs text-muted-foreground mt-1">日薪 {fm(summary.ds2)} × {summary.effDays} 天</p>}
        </div>

        {/* 平时加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Clock className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">平时加班</span></div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">{fm(summary.wPay)}</p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{fh(summary.twh)}</span>
          </div>
        </div>

        {/* 周末加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground"><CalendarDays className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">周末加班</span></div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">{fm(summary.wePay)}</p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{fh(summary.weh)}</span>
          </div>
        </div>

        {/* 节假日加班 */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Star className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">节假日加班</span></div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">{fm(summary.hoPay)}</p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{fh(summary.hoh)}</span>
          </div>
        </div>

        {/* 请假扣款 */}
        <div className="border-2 border-destructive/40 bg-destructive/5 p-4 transition-all duration-300 hover:bg-destructive/10 hover:border-destructive">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground"><UserMinus className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">请假扣款</span></div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-destructive">-{fm(summary.tldAmt)}</p>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{summary.tld} 天</span>
          </div>
          {summary.leaveBreakdown.length > 0 && (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground border-t border-border/30 pt-2">
              {summary.leaveBreakdown.map((lb) => (
                <div key={lb.type} className="flex justify-between"><span>{lb.type} {lb.days}天</span><span className="font-bold text-destructive">-{fm(lb.amount)}</span></div>
              ))}
            </div>
          )}
        </div>

        {/* 五险一金 */}
        {summary.insAmt > 0 && (
          <div className="border-2 border-info/40 bg-info/5 p-4 transition-all duration-300 hover:bg-info/10 hover:border-info">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Shield className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">五险一金</span></div>
            <p className="text-2xl font-bold tabular-nums tracking-tighter text-info">-{fm(summary.insAmt)}</p>
          </div>
        )}

        {/* 总工时（含加班明细） */}
        <div className="border-2 border-border bg-background p-4 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Zap className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">总工时</span></div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-foreground">{fh(summary.th)}</p>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground border-t border-border/30 pt-2">
            {summary.twh > 0 && <div className="flex justify-between"><span>平时加班</span><span className="font-bold">{fh(summary.twh)} · {fm(summary.wPay)}</span></div>}
            {summary.weh > 0 && <div className="flex justify-between"><span>周末加班</span><span className="font-bold">{fh(summary.weh)} · {fm(summary.wePay)}</span></div>}
            {summary.hoh > 0 && <div className="flex justify-between"><span>节假日加班</span><span className="font-bold">{fh(summary.hoh)} · {fm(summary.hoPay)}</span></div>}
          </div>
        </div>

        {/* 总工资 */}
        <div className="border-2 bg-primary text-black border-primary p-4">
          <div className="flex items-center gap-2 mb-2 text-black/70"><TrendingUp className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">总工资</span></div>
          <p className="text-2xl font-bold tabular-nums tracking-tighter text-black">{fm(summary.totalPay)}</p>
        </div>

        {/* 实发工资 */}
        <div className="border-2 bg-success text-black border-success p-4">
          <div className="flex items-center gap-2 mb-2 text-black/70"><Banknote className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">实发工资</span></div>
          <p className="text-3xl font-black tabular-nums tracking-tighter text-black">{fm(summary.netPay)}</p>
          <p className="text-xs text-black/60 mt-1">总工资 {fm(summary.totalPay)} - 五险一金 {fm(summary.insAmt)}</p>
        </div>

      </CardContent>
    </Card>
  );
}
