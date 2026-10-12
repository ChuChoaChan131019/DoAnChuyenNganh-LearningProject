'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import {
  adminNotificationsApi,
  type AdminNotification,
  type AdminNotificationAudience,
  type AdminNotificationRecipientAudience,
  type AdminNotificationType,
} from '@/lib/api';

const AUDIENCE_LABEL: Record<AdminNotificationAudience, string> = {
  all: 'Learner & Content Manager',
  learner: 'Learner',
  content_manager: 'Content Manager',
  admin: 'Admin (lịch sử)',
};

const RECIPIENT_AUDIENCES: AdminNotificationRecipientAudience[] = [
  'all',
  'learner',
  'content_manager',
];

const TYPE_LABEL: Record<AdminNotificationType, string> = {
  General: 'General',
  Warning: 'Warning',
  Maintenance: 'Maintenance',
};

const notificationSchema = z
  .object({
    title: z.string().min(3, 'Tiêu đề cần ít nhất 3 ký tự'),
    content: z.string().min(10, 'Nội dung cần ít nhất 10 ký tự'),
    type: z.enum(['General', 'Warning', 'Maintenance']),
    audience: z.enum(['all', 'learner', 'content_manager']),
    timing: z.enum(['now', 'scheduled']),
    scheduledAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.timing === 'scheduled') {
      if (!data.scheduledAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledAt'],
          message: 'Chọn thời điểm gửi khi đặt lịch',
        });
      } else if (new Date(data.scheduledAt).getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledAt'],
          message: 'Thời điểm gửi phải ở trong tương lai',
        });
      }
    }
  });

type NotificationForm = z.infer<typeof notificationSchema>;

function readRate(row: AdminNotification) {
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
  const [rows, setRows] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const notifications = await adminNotificationsApi.list();
      setRows(notifications);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải thông báo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!selectedNotification) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedNotification(null);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedNotification]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: 'General',
      audience: 'all',
      timing: 'now',
    },
  });

  const timing = useWatch({ control, name: 'timing' });
  const type = useWatch({ control, name: 'type' });
  const audience = useWatch({ control, name: 'audience' });

  const onSubmit = handleSubmit(async (data) => {
    try {
      setIsSubmitting(true);
      const result = await adminNotificationsApi.create({
        title: data.title,
        content: data.content,
        type: data.type,
        audience: data.audience,
        scheduledAt:
          data.timing === 'scheduled'
            ? new Date(data.scheduledAt!).toISOString()
            : undefined,
      });

      toast.success(
        data.timing === 'now'
          ? `Đã gửi "${data.title}" đến ${AUDIENCE_LABEL[data.audience]} (${result.recipientCount.toLocaleString('vi-VN')} người)`
          : `Đã lên lịch gửi "${data.title}" lúc ${format(new Date(result.notification.scheduledAt!), 'dd/MM HH:mm')}`,
      );
      reset();
      setIsCreating(false);
      await loadNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo thông báo');
    } finally {
      setIsSubmitting(false);
    }
  });

  const revokeNotification = async (row: AdminNotification) => {
    const action = row.status === 'scheduled' ? 'hủy lịch' : 'thu hồi';
    if (!window.confirm(`Bạn có chắc muốn ${action} thông báo “${row.title}”?`)) {
      return;
    }

    try {
      setRevokingId(row.id);
      await adminNotificationsApi.revoke(row.id);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, status: 'cancelled' } : item,
        ),
      );
      toast.success(
        row.status === 'scheduled'
          ? 'Đã hủy thông báo đã lên lịch'
          : 'Đã thu hồi thông báo khỏi chuông người nhận',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thu hồi thông báo');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System Notifications</h2>
          <p className="admin-page-copy">
            Thông báo đã gửi có thể thu hồi; dữ liệu vẫn được giữ lại để kiểm tra lịch sử.
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
                  <Select
                    value={type}
                    items={(Object.keys(TYPE_LABEL) as AdminNotificationType[]).map((value) => ({
                      value,
                      label: TYPE_LABEL[value],
                    }))}
                    onValueChange={(value) => setValue('type', value as NotificationForm['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại thông báo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABEL) as AdminNotificationType[]).map((option) => (
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
                    items={RECIPIENT_AUDIENCES.map(
                      (value) => ({ value, label: AUDIENCE_LABEL[value] }),
                    )}
                    onValueChange={(value) => setValue('audience', value as NotificationForm['audience'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người nhận" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_AUDIENCES.map((option) => (
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

              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Đang lưu...'
                    : timing === 'now'
                      ? 'Gửi thông báo'
                      : 'Lên lịch gửi'}
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
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Đang tải thông báo...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Chưa có thông báo hệ thống nào.
                  </TableCell>
                </TableRow>
              )}
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
                  <TableCell className="text-right tabular-nums">{row.recipients.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.read.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${rateClass(readRate(row))}`}>
                    {row.status === 'sent' ? `${readRate(row).toFixed(1)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {row.status === 'scheduled'
                      ? `Dự kiến ${row.scheduledAt ? format(new Date(row.scheduledAt), 'dd/MM HH:mm', { locale: vi }) : ''}`
                      : row.sentAt
                        ? format(new Date(row.sentAt), 'dd/MM HH:mm', { locale: vi })
                        : ''}
                  </TableCell>
                  <TableCell>
                    {row.status === 'sent' ? (
                      <Badge variant="outline" className="border-success text-success">
                        Đã gửi
                      </Badge>
                    ) : row.status === 'scheduled' ? (
                      <Badge variant="outline" className="border-warning text-warning">
                        Đã lên lịch
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                        {row.sentAt ? 'Đã thu hồi' : 'Đã hủy'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedNotification(row)}
                      >
                        Xem nội dung
                      </Button>
                      {row.status !== 'cancelled' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={revokingId === row.id}
                          onClick={() => void revokeNotification(row)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {revokingId === row.id
                            ? 'Đang xử lý'
                            : row.status === 'scheduled'
                              ? 'Hủy lịch'
                              : 'Thu hồi'}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onMouseDown={() => setSelectedNotification(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nội dung thông báo</p>
                <h3 id="notification-detail-title" className="mt-1 text-lg font-semibold text-foreground">
                  {selectedNotification.title}
                </h3>
              </div>
              <Badge variant="outline" className="shrink-0 border-border text-muted-foreground">
                {TYPE_LABEL[selectedNotification.type]}
              </Badge>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-muted/35 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {selectedNotification.content}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{AUDIENCE_LABEL[selectedNotification.audience]}</span>
              <span>
                {selectedNotification.sentAt
                  ? format(new Date(selectedNotification.sentAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                  : selectedNotification.scheduledAt
                    ? `Dự kiến ${format(new Date(selectedNotification.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: vi })}`
                    : ''}
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSelectedNotification(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
