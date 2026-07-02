import { useCallback, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, DollarSign, Clock, CalendarDays, Utensils, Star, Coffee, Eye, Shield, FileText, Gift, UserMinus } from 'lucide-react';
import { type ISalarySettings, saveSettings, calcDailySalary } from '@/data/salary';
import { Switch } from '@/components/ui/switch';

interface SalarySettingsSectionProps {
  settings: ISalarySettings;
  onSettingsChange: (settings: ISalarySettings) => void;
}

export default function SalarySettingsSection({ settings, onSettingsChange }: SalarySettingsSectionProps) {
  const updateSettings = useCallback((partial: Partial<ISalarySettings>) => {
    const next = { ...settings, ...partial };
    onSettingsChange(next);
    saveSettings(next);
  }, [settings, onSettingsChange]);

  const handleBaseSalaryChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ baseSalary: parseFloat(e.target.value) || 0 });
  };

  const handleWeekdayRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ weekdayOvertimeRate: parseFloat(e.target.value) || 0 });
  };

  const handleWeekendRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ weekendOvertimeRate: parseFloat(e.target.value) || 0 });
  };

  const handleHolidayRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ holidayOvertimeRate: parseFloat(e.target.value) || 0 });
  };

  const handleStandardHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ standardHoursPerDay: parseFloat(e.target.value) || 8 });
  };

  const handleStandardDaysChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ standardDaysPerMonth: parseFloat(e.target.value) || 22 });
  };

  const handleLunchStartChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ lunchStartTime: e.target.value });
  };

  const handleLunchEndChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ lunchEndTime: e.target.value });
  };

  const handleAfternoonStartChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ afternoonStartTime: e.target.value });
  };

  const handleAfternoonEndChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ afternoonEndTime: e.target.value });
  };

  const handleCustomAttendanceDaysChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSettings({ customAttendanceDays: parseFloat(e.target.value) || 0 });
  };

  const dailySalary = calcDailySalary(settings.baseSalary, settings.standardDaysPerMonth);

  return (
    <Card className="border-2 border-border bg-background rounded-none h-full">
      <CardHeader className="pb-4 border-b-2 border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Settings2 className="size-4 text-primary" />
          工资设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* 主题切换 */}
        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
          <div><p className="text-sm font-medium">深色模式</p><p className="text-xs text-muted-foreground">切换浅色/深色主题</p></div>
          <Switch checked={document.documentElement.classList.contains('dark')} onCheckedChange={(v) => { document.documentElement.classList.toggle('dark', v); localStorage.setItem('__jicai_theme', v ? 'dark' : 'light'); }} />
        </div>
        {/* 底薪 */}
        <div className="space-y-2">
          <Label htmlFor="baseSalary" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <DollarSign className="size-3" />
            底薪 / 固定工资（元）
          </Label>
          <Input
            id="baseSalary"
            type="number"
            min="0"
            step="100"
            value={settings.baseSalary || ''}
            onChange={handleBaseSalaryChange}
            placeholder="4000"
            className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
          />
          {settings.workMode === 'piecework' && (
            <p className="text-xs text-muted-foreground">计件模式：底薪即为每件单价</p>
          )}
          {settings.workMode === 'flex' && (
            <p className="text-xs text-muted-foreground">综合工时制：日薪 ¥{dailySalary.toFixed(2)}</p>
          )}
          {settings.workMode === 'standard' && (
            <p className="text-xs text-muted-foreground">
              日薪 ¥{dailySalary.toFixed(2)}（底薪 ÷ {settings.standardDaysPerMonth}天）
            </p>
          )}
        </div>

        {/* 奖金/绩效 */}
        <div className="space-y-2">
          <Label htmlFor="bonus" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Gift className="size-3" />奖金/绩效（元）</Label>
          <Input id="bonus" type="number" min="0" step="100" value={settings.bonusAmount || ''} onChange={(e) => updateSettings({ bonusAmount: parseFloat(e.target.value) || 0 })} placeholder="0" className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary" />
        </div>

        {/* 模式 + 病假 + 五险一金 紧凑组合 */}
        <div className="border-2 border-border bg-accent/20 p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">模式与扣款</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">计算模式</Label>
              <Select value={settings.workMode} onValueChange={(v) => updateSettings({ workMode: v as any })}>
                <SelectTrigger className="h-9 text-xs rounded-none border-2 border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border bg-background">
                  <SelectItem value="standard" className="text-xs">标准5天8小时</SelectItem>
                  <SelectItem value="flex" className="text-xs">综合工时制</SelectItem>
                  <SelectItem value="piecework" className="text-xs">计件模式</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">病假扣款</Label>
              <Select value={String(settings.sickLeaveRate)} onValueChange={(v) => updateSettings({ sickLeaveRate: parseFloat(v) })}>
                <SelectTrigger className="h-9 text-xs rounded-none border-2 border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border bg-background">
                  <SelectItem value="1" className="text-xs">全扣100%</SelectItem>
                  <SelectItem value="0.5" className="text-xs">扣50%</SelectItem>
                  <SelectItem value="0.3" className="text-xs">扣30%</SelectItem>
                  <SelectItem value="0" className="text-xs">不扣</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">五险一金</Label>
              <Select value={settings.insuranceType} onValueChange={(v) => updateSettings({ insuranceType: v as any })}>
                <SelectTrigger className="h-9 text-xs rounded-none border-2 border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none border-2 border-border bg-background">
                  <SelectItem value="none" className="text-xs">不缴纳</SelectItem>
                  <SelectItem value="social" className="text-xs">仅五险</SelectItem>
                  <SelectItem value="housing" className="text-xs">仅一金</SelectItem>
                  <SelectItem value="both" className="text-xs">五险一金</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(settings.insuranceType === 'social' || settings.insuranceType === 'both') && (
            <Input type="number" min="0" step="10" value={settings.socialInsuranceAmount || ''} onChange={(e) => updateSettings({ socialInsuranceAmount: parseFloat(e.target.value) || 0 })} placeholder="五险金额" className="h-9 text-xs rounded-none border-2 border-border bg-background" />
          )}
          {(settings.insuranceType === 'housing' || settings.insuranceType === 'both') && (
            <Input type="number" min="0" step="10" value={settings.housingFundAmount || ''} onChange={(e) => updateSettings({ housingFundAmount: parseFloat(e.target.value) || 0 })} placeholder="公积金金额" className="h-9 text-xs rounded-none border-2 border-border bg-background" />
          )}
          {settings.insuranceType !== 'none' && (
            <p className="text-xs text-muted-foreground text-right">合计扣除 ¥{((settings.insuranceType === 'social' || settings.insuranceType === 'both' ? settings.socialInsuranceAmount : 0) + (settings.insuranceType === 'housing' || settings.insuranceType === 'both' ? settings.housingFundAmount : 0)).toFixed(2)}</p>
          )}
        </div>

        {/* 模式专属设置 */}
        {settings.workMode === 'flex' && (
          <div className="space-y-2 border-2 border-border bg-accent/30 p-3">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Clock className="size-3" />
              月标准总工时（小时）
            </Label>
            <Input type="number" min="0" step="1" value={settings.standardHoursPerDay * settings.standardDaysPerMonth || ''} readOnly
              className="rounded-none border-2 border-border bg-background/50 text-foreground h-11 text-sm font-bold opacity-60" />
            <p className="text-xs text-muted-foreground">
              每日 {settings.standardHoursPerDay}h × {settings.standardDaysPerMonth} 天 = {settings.standardHoursPerDay * settings.standardDaysPerMonth}h/月
            </p>
          </div>
        )}
        {settings.workMode === 'piecework' && (
          <div className="space-y-2 border-2 border-border bg-accent/30 p-3">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <FileText className="size-3" />
              月预估件数
            </Label>
            <Input type="number" min="0" step="10" value={settings.customAttendanceDays || ''}
              onChange={(e) => updateSettings({ customAttendanceDays: parseFloat(e.target.value) || 0 })}
              placeholder="月预估件数" className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary" />
            <p className="text-xs text-muted-foreground">
              预估月薪 = 单价 ¥{settings.baseSalary} × 件数
            </p>
          </div>
        )}

        {/* 底薪计算方式 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <CalendarDays className="size-3" />
            底薪计算方式
          </Label>
          <Select
            value={settings.salaryMode}
            onValueChange={(v) => updateSettings({ salaryMode: v as 'full' | 'attendance' })}
          >
            <SelectTrigger className="h-11 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary uppercase tracking-wider font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border bg-background">
              <SelectItem value="full" className="focus:bg-primary focus:text-black font-bold">
                满月薪（固定金额）
              </SelectItem>
              <SelectItem value="attendance" className="focus:bg-primary focus:text-black font-bold">
                按实际出勤天数计算
              </SelectItem>
            </SelectContent>
          </Select>
          {settings.salaryMode === 'attendance' && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="customAttendanceDays" className="text-xs text-muted-foreground">
                自定义出勤天数（留空则自动统计工作日出勤）
              </Label>
              <Input
                id="customAttendanceDays"
                type="number"
                min="0"
                max="31"
                step="0.5"
                value={settings.customAttendanceDays || ''}
                onChange={handleCustomAttendanceDaysChange}
                placeholder="自动统计"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                日薪 ¥{dailySalary.toFixed(2)} × 出勤天数 = 实际底薪
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {settings.salaryMode === 'full'
              ? '满月薪：底薪固定不变，适合满勤月份'
              : '按出勤：底薪 = 日薪 × 出勤天数，适合入职不满月'}
          </p>
        </div>

        {/* 工作日显示日薪开关 */}
        <div className="flex items-center justify-between border-2 border-border bg-accent/30 p-3">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Eye className="size-3" />
              工作日显示日薪+加班
            </Label>
            <p className="text-xs text-muted-foreground">
              {settings.showDailySalary
                ? `工作日记录显示：日薪 ¥${dailySalary.toFixed(2)} + 平时加班工资`
                : '工作日记录仅显示加班工资（默认）'}
            </p>
          </div>
          <Switch
            checked={settings.showDailySalary}
            onCheckedChange={(v) => updateSettings({ showDailySalary: v })}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-border"
          />
        </div>

        {/* 加班费率 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Clock className="size-3" />
            加班费率（元/小时）
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weekdayRate" className="text-xs text-muted-foreground">平时加班</Label>
              <Input
                id="weekdayRate"
                type="number"
                min="0"
                step="0.1"
                value={settings.weekdayOvertimeRate || ''}
                onChange={handleWeekdayRateChange}
                placeholder="22.7"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
              <p className="text-xs text-muted-foreground">工作日超 {settings.standardHoursPerDay}h 部分</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weekendRate" className="text-xs text-muted-foreground">周末加班</Label>
              <Input
                id="weekendRate"
                type="number"
                min="0"
                step="0.1"
                value={settings.weekendOvertimeRate || ''}
                onChange={handleWeekendRateChange}
                placeholder="28.4"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
              <p className="text-xs text-muted-foreground">周六/周日全部工时</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holidayRate" className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 text-primary" />
              节假日加班
            </Label>
            <Input
              id="holidayRate"
              type="number"
              min="0"
              step="0.1"
              value={settings.holidayOvertimeRate || ''}
              onChange={handleHolidayRateChange}
              placeholder="68.2"
              className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
            />
            <p className="text-xs text-muted-foreground">法定节假日全部工时按此单价计算</p>
          </div>
        </div>

        {/* 标准工时 & 天数 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <CalendarDays className="size-3" />
            标准工时设置
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="standardHours" className="text-xs text-muted-foreground">每日标准工时（h）</Label>
              <Input
                id="standardHours"
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={settings.standardHoursPerDay || ''}
                onChange={handleStandardHoursChange}
                placeholder="8"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="standardDays" className="text-xs text-muted-foreground">月标准天数（天）</Label>
              <Input
                id="standardDays"
                type="number"
                min="1"
                max="31"
                step="1"
                value={settings.standardDaysPerMonth || ''}
                onChange={handleStandardDaysChange}
                placeholder="22"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 午休时间 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Utensils className="size-3" />
            午休时间设置
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lunchStart" className="text-xs text-muted-foreground">午休开始</Label>
              <Input
                id="lunchStart"
                type="time"
                value={settings.lunchStartTime}
                onChange={handleLunchStartChange}
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lunchEnd" className="text-xs text-muted-foreground">午休结束</Label>
              <Input
                id="lunchEnd"
                type="time"
                value={settings.lunchEndTime}
                onChange={handleLunchEndChange}
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            计算工时自动扣除午休重叠时间 · 当前午休 {settings.lunchStartTime} ~ {settings.lunchEndTime}
          </p>
        </div>

        {/* 下午休息时间 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Coffee className="size-3" />
            下午休息时间设置
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="afternoonStart" className="text-xs text-muted-foreground">休息开始</Label>
              <Input
                id="afternoonStart"
                type="time"
                value={settings.afternoonStartTime}
                onChange={handleAfternoonStartChange}
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="afternoonEnd" className="text-xs text-muted-foreground">休息结束</Label>
              <Input
                id="afternoonEnd"
                type="time"
                value={settings.afternoonEndTime}
                onChange={handleAfternoonEndChange}
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            计算工时自动扣除下午休息重叠时间 · 当前 {settings.afternoonStartTime} ~ {settings.afternoonEndTime}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
