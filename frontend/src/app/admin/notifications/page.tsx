'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ACCOUNT_COUNTS, NOTIFICATIONS, fmtInt, type NotificationRow } from '@/lib/admin-mock';

const AUDIENCE_LABEL: Record<NotificationRow['audience'], string> = {
  all: 'Tất cả người dùng',
  learner: 'Learner',
  content_manager: 'Content Manager',
  admin: 'Admin',
};

const TYPE_LABEL: Record<NotificationRow['type'], string> = {
  General: 'General',
  Warning: 'Warning',
  Maintenance: 'Maintenance',
};

const notificationSchema = z
  .object({
    title: z.string().min(3, 'Tiêu đề cần ít nhất 3 ký tự'),
    content: z.string().min(10, 'Nội dung cần ít nhất 10 ký tự'),
    type: z.enum(['General', 'Warning', 'Maintenance']),
    audience: z.enum(['all', 'learner', 'content_manager', 'admin']),
    timing: z.enum(['now', 'scheduled']),
    scheduledAt: z.string().optional(),
    email: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.timing === 'scheduled' && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduledAt'],
        message: 'Chọn thời điểm gửi khi đặt lịch',
      });
    }
  });

type NotificationForm = z.infer<typeof notificationSchema>;

function readRate(row: NotificationRow) {
  if (!row.recipients) return 0;
  return (row.read / row.recipients) * 100;
}

function rateClass(rate: number) {
  if (rate >= 80) return 'text-success';
  if (rate >= 40) return 'text-foreground';
  return 'text-warning';
}

export default function NotificationsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>(NOTIFICATIONS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: 'General',
      audience: 'all',
      timing: 'now',
      email: false,
    },
  });

  const timing = watch('timing');
  const type = watch('type');
  const audience = watch('audience');

  const onSubmit = handleSubmit((data) => {
    const recipients =
      data.audience === 'all'
        ? ACCOUNT_COUNTS.total
        : ACCOUNT_COUNTS[data.audience as 'learner' | 'content_manager' | 'admin'];

    const row: NotificationRow = {
      id: `ntf-${Date.now()}`,
      title: data.title,
      type: data.type,
      audience: data.audience,
      recipients,
      read: 0,
      sentAt: data.timing === 'now' ? new Date() : new Date(data.scheduledAt!),
      status: data.timing === 'now' ? 'sent' : 'scheduled',
    };

    setRows((current) => [row, ...current]);
    toast.success(
      data.timing === 'now'
        ? `Đã gửi "${data.title}" đến ${AUDIENCE_LABEL[data.audience]} (${fmtInt(recipients)} người)`
        : `Đã lên lịch gửi "${data.title}" lúc ${format(row.sentAt!, 'dd/MM HH:mm')}`,
    );
    reset();
    setIsCreating(false);
  });

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System Notifications</h2>
          <p className="admin-page-copy">
            Thông báo đã gửi là bất biến, không thể sửa hay thu hồi.
          </p>
        </div>
        <Button
          onClick={() => {
            if (isCreating) reset();
            setIsCreating(!isCreating);
          }}
          variant={isCreating ? 'outline' : 'default'}
        >
          {isCreating ? 'Hủy' : 'Tạo thông báo mới'}
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo thông báo mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="ntf-title">Tiêu đề</Label>
                <Input id="ntf-title" placeholder="Ví dụ: Bảo trì hệ thống đêm nay" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ntf-content">Nội dung</Label>
                <textarea
                  id="ntf-content"
                  rows={3}
                  placeholder="Nhập nội dung chi tiết người dùng sẽ nhận được..."
                  className="flex min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...register('content')}
                />
                {errors.content && (
                  <p className="text-xs text-destructive">{errors.content.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Loại thông báo</Label>
                  <Select value={type} onValueChange={(value) => setValue('type', value as NotificationForm['type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại thông báo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABEL) as NotificationRow['type'][]).map((option) => (
                        <SelectItem key={option} value={option}>
                          {TYPE_LABEL[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Đối tượng nhận</Label>
                  <Select
                    value={audience}
                    onValueChange={(value) => setValue('audience', value as NotificationForm['audience'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người nhận" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUDIENCE_LABEL) as NotificationRow['audience'][]).map((option) => (
                        <SelectItem key={option} value={option}>
                          {AUDIENCE_LABEL[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Thời điểm gửi</Label>
                <RadioGroup
                  value={timing}
                  onValueChange={(value) => setValue('timing', value as NotificationForm['timing'])}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="timing-now" />
                    <Label htmlFor="timing-now" className="font-normal">
                      Gửi ngay
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="timing-scheduled" />
                    <Label htmlFor="timing-scheduled" className="font-normal">
                      Đặt lịch
                    </Label>
                  </div>
                </RadioGroup>
                {timing === 'scheduled' && (
                  <div className="space-y-2">
                    <Label htmlFor="ntf-scheduled">Thời điểm gửi</Label>
                    <Input id="ntf-scheduled" type="datetime-local" {...register('scheduledAt')} />
                    {errors.scheduledAt && (
                      <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="ntf-email"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                  {...register('email')}
                />
                <Label htmlFor="ntf-email" className="font-normal">
                  Gửi kèm qua email (không bắt buộc)
                </Label>
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit">
                  {timing === 'now' ? 'Gửi thông báo' : 'Lên lịch gửi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thông báo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tỷ lệ đọc = số người đã đọc / tổng số người nhận.
          </p>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead className="text-right">Người nhận</TableHead>
                <TableHead className="text-right">Đã đọc</TableHead>
                <TableHead className="text-right">Tỷ lệ đọc</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[240px] truncate font-medium">{row.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.type === 'Warning'
                          ? 'border-warning text-warning'
                          : row.type === 'Maintenance'
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground'
                      }
                    >
                      {TYPE_LABEL[row.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{AUDIENCE_LABEL[row.audience]}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.recipients)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.read)}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${rateClass(readRate(row))}`}>
                    {row.status === 'sent' ? `${readRate(row).toFixed(1)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {row.status === 'scheduled'
                      ? `Dự kiến ${row.sentAt ? format(row.sentAt, 'dd/MM HH:mm', { locale: vi }) : ''}`
                      : row.sentAt
                        ? format(row.sentAt, 'dd/MM HH:mm', { locale: vi })
                        : ''}
                  </TableCell>
                  <TableCell>
                    {row.status === 'sent' ? (
                      <Badge variant="outline" className="border-success text-success">
                        Đã gửi
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning text-warning">
                        Đã lên lịch
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
