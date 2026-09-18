'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ERROR_GROUPS, fmtInt, getFeatureEvents, getUsageTotals, systemStatus } from '@/lib/admin-mock';

const RANGES = [
  { value: '7', label: '7 ngày gần nhất' },
  { value: '30', label: '30 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
];

// A-M06: báo cáo phải đủ 4 nhóm; thiếu nhóm nào thì cảnh báo và khóa export.
const REQUIRED_SECTIONS = ['Usage', 'Feature Analytics', 'Error/UX', 'AI Usage'] as const;

export default function SystemReportPage() {
  const [range, setRange] = useState('30');
  const days = Number(range);

  const { usage, events, missing } = useMemo(() => {
    const usage = getUsageTotals(days);
    const events = getFeatureEvents(days);
    // Khi nối API thật, kiểm tra từng nhóm có dữ liệu trong kỳ hay không.
    const available = new Set<string>(REQUIRED_SECTIONS);
    const missing = REQUIRED_SECTIONS.filter((section) => !available.has(section));
    return { usage, events, missing };
  }, [days]);

  const openErrors = ERROR_GROUPS.filter((row) => row.status === 'open');
  const criticalCount = openErrors
    .filter((row) => row.severity === 'Critical')
    .reduce((sum, row) => sum + row.count, 0);
  const totalErrors = ERROR_GROUPS.reduce((sum, row) => sum + row.count, 0);
  const exportLocked = missing.length > 0;

  const sections = [
    {
      title: '1. Usage Summary',
      description: 'Mức độ sử dụng hệ thống trong kỳ báo cáo',
      accent: 'border-l-brand',
      rows: [
        { label: 'Meaningful Activities', value: fmtInt(usage.meaningfulActivities) },
        { label: 'Average DAU', value: fmtInt(usage.dau) },
        { label: 'Active Users', value: fmtInt(usage.activeUsers) },
      ],
    },
    {
      title: '2. Feature Analytics',
      description: 'Tính năng được dùng nhiều và ít nhất',
      accent: 'border-l-primary',
      rows: [
        {
          label: 'Dùng nhiều nhất',
          value: `${events[0]?.event ?? '-'} (${fmtInt(events[0]?.totalActions ?? 0)} actions)`,
        },
        {
          label: 'Thấp nhất',
          value: `${events[events.length - 1]?.event ?? '-'} (${fmtInt(
            events[events.length - 1]?.totalActions ?? 0,
          )} actions)`,
        },
      ],
    },
    {
      title: '3. Error & UX Report',
      description: 'Tóm tắt lỗi trong kỳ báo cáo',
      accent: 'border-l-destructive',
      rows: [
        { label: 'Lỗi Critical đang mở', value: fmtInt(criticalCount) },
        { label: 'Tổng lỗi ghi nhận', value: fmtInt(totalErrors) },
        { label: 'Nhóm lỗi đang mở', value: fmtInt(openErrors.length) },
      ],
    },
    {
      title: '4. AI Usage Stats',
      description: 'Số lần gọi AI và tỷ lệ thành công',
      accent: 'border-l-success',
      rows: [
        { label: 'Tổng AI API Calls', value: fmtInt(usage.aiCalls) },
        { label: 'Success Rate', value: `${systemStatus.aiSuccessRate}%` },
      ],
    },
  ];

  const handleExport = (format: 'PDF' | 'Excel') => {
    if (exportLocked) {
      toast.error(`Không thể xuất báo cáo vì thiếu nhóm bắt buộc: ${missing.join(', ')}`);
      return;
    }
    toast.success(`Đã xuất báo cáo ${days} ngày dạng ${format}`);
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System Report</h2>
          <p className="admin-page-copy">
            Báo cáo tính trực tiếp từ dữ liệu hiện có, không lưu snapshot.
          </p>
        </div>
        <div className="admin-controls">
          <Select
            value={range}
            onValueChange={(value) => value && setRange(value)}
            items={RANGES.map(({ value, label }) => ({ value, label }))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleExport('PDF')} disabled={exportLocked} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => handleExport('Excel')}
            disabled={exportLocked}
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {exportLocked ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            Báo cáo đang thiếu nhóm bắt buộc: <strong>{missing.join(', ')}</strong>. Export bị khóa
            cho đến khi đủ dữ liệu của cả 4 nhóm.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Đủ 4 nhóm bắt buộc: {REQUIRED_SECTIONS.join(', ')}. Báo cáo có thể xuất PDF hoặc Excel.
        </p>
      )}

      <div className="grid gap-6">
        {sections.map((section) => (
          <Card key={section.title} className={`border-l-4 ${section.accent}`}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.rows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex flex-wrap justify-between gap-2 rounded-lg p-2.5 ${
                    index % 2 === 0 ? 'bg-muted/20' : ''
                  }`}
                >
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
