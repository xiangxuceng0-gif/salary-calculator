import { useCallback, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, DollarSign, Clock, CalendarDays, Utensils, Star, Coffee, Eye, Shield } from 'lucide-react';
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
          <p className="text-xs text-muted-foreground">
            日薪 ¥{dailySalary.toFixed(2)}（底薪 ÷ {settings.standardDaysPerMonth}天）
          </p>
        </div>

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

        {/* 五险一金设置 */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Shield className="size-3" />
            五险一金
          </Label>
          <Select
            value={settings.insuranceType}
            onValueChange={(v) => updateSettings({ insuranceType: v as 'none' | 'social' | 'housing' | 'both' })}
          >
            <SelectTrigger className="h-11 text-sm rounded-none border-2 border-border bg-background focus:ring-0 focus:border-primary uppercase tracking-wider font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border bg-background">
              <SelectItem value="none" className="focus:bg-primary focus:text-black font-bold">
                不缴纳
              </SelectItem>
              <SelectItem value="social" className="focus:bg-primary focus:text-black font-bold">
                仅五险（社保）
              </SelectItem>
              <SelectItem value="housing" className="focus:bg-primary focus:text-black font-bold">
                仅一金（公积金）
              </SelectItem>
              <SelectItem value="both" className="focus:bg-primary focus:text-black font-bold">
                五险一金（都交）
              </SelectItem>
            </SelectContent>
          </Select>
          {(settings.insuranceType === 'social' || settings.insuranceType === 'both') && (
            <div className="space-y-1.5">
              <Label htmlFor="socialInsurance" className="text-xs text-muted-foreground">
                五险（社保）月缴金额（元）
              </Label>
              <Input
                id="socialInsurance"
                type="number"
                min="0"
                step="10"
                value={settings.socialInsuranceAmount || ''}
                onChange={(e) => updateSettings({ socialInsuranceAmount: parseFloat(e.target.value) || 0 })}
                placeholder="个人缴纳部分"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          )}
          {(settings.insuranceType === 'housing' || settings.insuranceType === 'both') && (
            <div className="space-y-1.5">
              <Label htmlFor="housingFund" className="text-xs text-muted-foreground">
                公积金（一金）月缴金额（元）
              </Label>
              <Input
                id="housingFund"
                type="number"
                min="0"
                step="10"
                value={settings.housingFundAmount || ''}
                onChange={(e) => updateSettings({ housingFundAmount: parseFloat(e.target.value) || 0 })}
                placeholder="个人缴纳部分"
                className="rounded-none border-2 border-border bg-background text-foreground h-11 text-sm font-bold focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          )}
          {settings.insuranceType !== 'none' && (
            <p className="text-xs text-muted-foreground">
              五险一金合计扣除 ¥{((settings.insuranceType === 'social' || settings.insuranceType === 'both' ? settings.socialInsuranceAmount : 0) + (settings.insuranceType === 'housing' || settings.insuranceType === 'both' ? settings.housingFundAmount : 0)).toFixed(2)}
            </p>
          )}
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
