'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, ApiClientError } from '@/lib/api';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Monitor,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';

const BENEFITS = [
  'Truy cập các khóa học C# và lập trình hướng đối tượng',
  'Công cụ tạo bài trắc nghiệm bằng AI',
  'Theo dõi tiến độ học tập',
  'Nội dung được con người kiểm duyệt',
];

const TESTIMONIALS = [
  {
    quote:
      'Công cụ tạo câu hỏi bằng AI giúp chúng tôi tiết kiệm hàng trăm giờ làm việc. Mỗi câu hỏi vẫn được con người kiểm duyệt để đảm bảo chất lượng.',
    author: 'Trần Anh Khoa',
    role: 'Quản lý nội dung · Học phần Lập trình hướng đối tượng',
    initials: 'TK',
    avatarGradient: 'from-rose-500 to-orange-500',
  },
  {
    quote:
      'Bài học lập trình hướng đối tượng có cấu trúc cùng phản hồi mã nguồn tức thì giúp sinh viên nắm bắt các khái niệm C# phức tạp nhanh chóng và trực quan.',
    author: 'TS. Nguyễn Minh Huy',
    role: 'Giảng viên · Khoa Công nghệ thông tin',
    initials: 'MH',
    avatarGradient: 'from-sky-500 to-indigo-500',
  },
  {
    quote:
      'Từ cú pháp cơ bản đến các mẫu thiết kế nâng cao, bài trắc nghiệm thực hành giúp tôi tự tin xây dựng ứng dụng .NET thực tế.',
    author: 'Lê Thu Thảo',
    role: "Học viên tiêu biểu · Lớp Kỹ thuật phần mềm khóa 2026",
    initials: 'TT',
    avatarGradient: 'from-emerald-500 to-teal-500',
  },
  {
    quote:
      'Ngân hàng câu hỏi được tuyển chọn và tính năng chấm điểm tự động giúp giảm 70% thời gian chuẩn bị thi mà vẫn duy trì tiêu chuẩn học thuật cao.',
    author: 'Phạm Quốc Dũng',
    role: 'Phụ trách chương trình · C# cơ bản',
    initials: 'QD',
    avatarGradient: 'from-violet-500 to-purple-500',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'learner' | 'content_manager'>('learner');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isTestimonialPaused, setIsTestimonialPaused] = useState(false);

  useEffect(() => {
    if (isTestimonialPaused) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isTestimonialPaused]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên.';
    if (!email.includes('@')) newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (password.length < 8) newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!agreed) newErrors.agreed = 'Bạn cần đồng ý với các điều khoản.';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      toast.success('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 1200);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiClientError) {
        if (err.code === 'USER_ALREADY_EXISTS') {
          setErrors({
            email: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
          });
          toast.error('Email này đã được sử dụng. Vui lòng thử email khác.');
          return;
        }
        toast.error(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      } else {
        toast.error('Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-[var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,sans-serif]">

      {/* ── LEFT: Registration form ──────────────────────────── */}
      <section className="relative flex w-full flex-col justify-center overflow-y-auto px-8 py-10 sm:px-14 lg:w-[46%] xl:w-[42%] bg-white">
        {/* Subtle left-panel blob */}
        <div className="pointer-events-none absolute -left-16 top-1/3 h-72 w-72 rounded-full blur-3xl bg-rose-400/8" />

        {/* Logo */}
        <div className="relative mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-rose-500 shadow-lg shadow-rose-900/40">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-slate-800 leading-none">
              CSharpHub
            </p>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">
              Nền tảng học C# và lập trình hướng đối tượng
            </p>
          </div>
        </div>

        {/* Heading */}
        <h1 className="relative text-[26px] font-bold leading-tight text-slate-900">
          Tạo tài khoản của bạn
        </h1>
        <p className="relative mt-1.5 text-sm text-slate-500">
          Tham gia nền tảng và bắt đầu học C# ngay hôm nay.
        </p>

        {/* Role selector */}
        <div className="relative mt-6 flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 gap-1">
          <button
            type="button"
            id="register-role-learner"
            disabled={isLoading}
            onClick={() => setRole('learner')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              role === 'learner'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Học viên
          </button>
          <button
            type="button"
            id="register-role-manager"
            disabled={isLoading}
            onClick={() => setRole('content_manager')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              role === 'content_manager'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Quản lý nội dung
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">

          {/* Full name */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-fullname"
              className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Họ và tên
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="register-fullname"
                type="text"
                disabled={isLoading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.fullName
                    ? 'border-rose-500/60 bg-rose-50/30 text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400 focus:ring-rose-500/20'
                }`}
              />
            </div>
            {errors.fullName && <p className="text-xs text-rose-500">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-email"
              className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Địa chỉ email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="register-email"
                type="email"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.email
                    ? 'border-rose-500/60 bg-rose-50/30 text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400 focus:ring-rose-500/20'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-password"
              className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
                className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.password
                    ? 'border-rose-500/60 bg-rose-50/30 text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400 focus:ring-rose-500/20'
                }`}
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            <div className="flex gap-1 pt-0.5">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= level * 2
                      ? password.length >= 8
                        ? 'bg-emerald-500'
                        : 'bg-amber-400'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            {errors.password && <p className="text-xs text-rose-500">{errors.password}</p>}
          </div>

          {/* Terms */}
          <label className="flex cursor-pointer items-start gap-2.5 select-none">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                agreed
                  ? 'border-rose-500 bg-rose-500'
                  : errors.agreed
                  ? 'border-rose-500/60 bg-rose-50'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {agreed && <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
            </div>
            <span className="text-xs leading-relaxed text-slate-600">
              I agree to the{' '}
              <Link href="/terms" className="font-medium text-rose-500 hover:text-rose-600 hover:underline transition-colors">
                Điều khoản dịch vụ
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-rose-500 hover:text-rose-600 hover:underline transition-colors">
                Chính sách quyền riêng tư
              </Link>
            </span>
          </label>
          {errors.agreed && <p className="-mt-2 text-xs text-rose-500">{errors.agreed}</p>}

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 transition-all hover:shadow-rose-500/30 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Tạo tài khoản</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="relative mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors">
            Đăng nhập
          </Link>
        </p>
      </section>

      {/* ── RIGHT: Benefits panel ─────────────────────────────── */}
      <section className="relative hidden lg:flex lg:flex-1 flex-col justify-center overflow-hidden px-12 xl:px-16 py-8 transition-colors duration-300 bg-gradient-to-br from-[#f7444e]/45 to-[#78bcc4]/45">

        {/* Background decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-rose-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-600/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-48 w-48 rounded-full bg-violet-600/8 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center space-y-6 w-full max-w-2xl xl:max-w-3xl">
          {/* Headline */}
          <div className="space-y-3 w-full">
            <h2 className="text-3xl lg:text-[38px] xl:text-[42px] font-bold leading-tight text-black">
              Mọi thứ bạn cần để thành thạo C# nhanh chóng.
            </h2>
            <p className="text-base lg:text-[17px] leading-relaxed text-slate-800">
              Khóa học có lộ trình, bài trắc nghiệm tương tác và câu hỏi được tạo tự động rồi chuyên gia kiểm duyệt,
              cùng tính năng theo dõi tiến độ theo thời gian thực, tất cả trong một nơi.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-2.5">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-800">{b}</span>
              </div>
            ))}
          </div>

          {/* Testimonial slider (borderless, auto-scrolling) */}
          <div
            className="relative w-full max-w-xl xl:max-w-2xl overflow-hidden pt-2"
            onMouseEnter={() => setIsTestimonialPaused(true)}
            onMouseLeave={() => setIsTestimonialPaused(false)}
          >
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                width: `${TESTIMONIALS.length * 100}%`,
                transform: `translateX(-${(activeTestimonial * 100) / TESTIMONIALS.length}%)`,
              }}
            >
              {TESTIMONIALS.map((item, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 pr-6"
                  style={{ width: `${100 / TESTIMONIALS.length}%` }}
                >
                  <p className="text-sm lg:text-[15px] leading-relaxed text-slate-800 italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div className="mt-3.5 flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr ${item.avatarGradient} text-xs font-bold text-white shadow-sm`}
                    >
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.author}</p>
                      <p className="text-xs text-slate-700">{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel indicator dots */}
            <div className="mt-3.5 flex items-center gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeTestimonial
                      ? 'w-5 bg-rose-600'
                      : 'w-1.5 bg-slate-400/50 hover:bg-slate-600'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
