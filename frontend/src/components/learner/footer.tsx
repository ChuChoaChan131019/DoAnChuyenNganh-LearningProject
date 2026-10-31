import { Code2, GraduationCap, Mail, Send } from 'lucide-react';

export function LearnerFooter() {
  return (
    <footer className="border-t border-[#dfe6df] bg-[#F7F8F3] px-7 py-7 text-[#002c3e] lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <p className="text-lg font-bold">CSharpHub</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#637981]">
            Nền tảng tự học C# và lập trình hướng đối tượng, hỗ trợ quản lý nội dung. Dành cho học viên và người biên soạn.
          </p>

          <div className="mt-4 flex gap-2">
            <a
              aria-label="Kho mã nguồn CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="#"
            >
              <Code2 className="h-4 w-4" />
            </a>
            <a
              aria-label="Chia sẻ CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="#"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              aria-label="Liên hệ CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="mailto:hello@csharphub.com"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm sm:grid-cols-3 lg:gap-x-16">
          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Nền tảng</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/learner/courses">Khóa học</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/learner/practice">Luyện tập</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/learner/ai-tutor">Trợ giảng trí tuệ nhân tạo</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Không gian nội dung</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/content-manager/dashboard">Bảng điều khiển</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager/questions/bank">Ngân hàng câu hỏi</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager/testsandpractice/tests">Bài kiểm tra</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager">Công cụ tạo nội dung tự động</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Hỗ trợ</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/learner/search">Tìm kiếm</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="#">Cài đặt</a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-3 border-t border-[#dfe6df] pt-4 text-sm text-[#637981] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 CSharpHub. Dành cho người học C# và lập trình hướng đối tượng.</p>
        <div className="flex gap-3">
          <a className="hover:text-[#002c3e]" href="#">Quyền riêng tư</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-[#002c3e]" href="#">Điều khoản</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-[#002c3e]" href="#">Trạng thái</a>
        </div>
      </div>
    </footer>
  );
}
