'use client';

import { useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ERROR_GROUPS,
  fmtDateTime,
  fmtInt,
  type ErrorGroupRow,
  type ErrorSeverity,
} from '@/lib/admin-mock';

// Thang màu severity: đỏ đậm > cam > vàng nhạt > trung tính.
// Không dùng màu brand cho severity để tránh gây nhầm thị giác.
const SEVERITY_CLASS: Record<ErrorSeverity, string> = {
  Critical: 'bg-destructive text-white border-transparent',
  High: 'bg-warning text-[#3f2d0a] border-transparent',
  Medium: 'bg-warning/20 text-foreground border-warning/50',
  Low: 'bg-muted text-muted-foreground border-border',
};

const SEVERITY_OPTIONS: ErrorSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const SEVERITY_SELECT_ITEMS = [
  { value: 'all', label: 'Mức độ: tất cả' },
  ...SEVERITY_OPTIONS.map((option) => ({ value: option, label: option })),
];
const STATUS_SELECT_ITEMS = [
  { value: 'all', label: 'Trạng thái: tất cả' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

export default function ErrorMonitoringPage() {
  const [rows, setRows] = useState<ErrorGroupRow[]>(ERROR_GROUPS);
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (severity !== 'all' && row.severity !== severity) return false;
        if (status !== 'all' && row.status !== status) return false;
        if (search && !row.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [rows, severity, status, search],
  );

  const openCount = rows.filter((row) => row.status === 'open').length;

  const toggleStatus = (row: ErrorGroupRow) => {
    const next = row.status === 'open' ? 'resolved' : 'open';
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, status: next } : item)),
    );
    toast.success(
      next === 'resolved' ? `Đã đánh dấu xử lý: ${row.name}` : `Đã mở lại lỗi: ${row.name}`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Error & UX Monitoring</h2>
          <p className="admin-page-copy">
            {openCount} nhóm lỗi đang mở. Log chỉ chứa tên lỗi kỹ thuật, không chứa mật khẩu,
            token hay nội dung riêng tư của người dùng.
          </p>
        </div>
        <div className="admin-controls">
          <Input
            aria-label="Tìm theo tên lỗi"
            placeholder="Tìm theo tên lỗi..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-[200px]"
          />
          <Select
            value={severity}
            onValueChange={(value) => value && setSeverity(value)}
            items={SEVERITY_SELECT_ITEMS}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mức độ: tất cả</SelectItem>
              {SEVERITY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => value && setStatus(value)}
            items={STATUS_SELECT_ITEMS}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Trạng thái: tất cả</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length ? (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Type / Name</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.type}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_CLASS[row.severity]}>{row.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(row.count)}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDateTime(row.firstSeen)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {fmtDateTime(row.lastSeen)}
                    </TableCell>
                    <TableCell>
                      {row.status === 'open' ? (
                        <Badge variant="outline" className="border-warning text-warning">
                          Open
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-success text-success">
                          Resolved
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={row.status === 'open' ? 'Đánh dấu đã xử lý' : 'Mở lại'}
                        onClick={() => toggleStatus(row)}
                      >
                        {row.status === 'open' ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Không có nhóm lỗi nào khớp bộ lọc hiện tại.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
