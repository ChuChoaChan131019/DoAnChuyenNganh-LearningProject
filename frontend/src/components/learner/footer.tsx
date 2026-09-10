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
            The C# and OOP self-learning platform with an AI-assisted content
            management studio. Built for students and content managers.
          </p>

          <div className="mt-4 flex gap-2">
            <a
              aria-label="CSharpHub code repository"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="#"
            >
              <Code2 className="h-4 w-4" />
            </a>
            <a
              aria-label="Share CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="#"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              aria-label="Contact CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe6df] text-[#637981] hover:border-primary hover:text-primary"
              href="mailto:hello@csharphub.com"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm sm:grid-cols-3 lg:gap-x-16">
          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Platform</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/learner/courses">Courses</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/learner/practice">Practice</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/learner/dashboard">Analytics</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/learner/ai-tutor">AI Tutor</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Studio</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/content-manager">Dashboard</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager/questions/bank">Question bank</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager/testsandpractice/tests">Tests</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="/content-manager">AI generator</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-[#637981]">Support</p>
            <a className="mt-4 block text-[#637981] hover:text-[#002c3e]" href="/learner/search">Search</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="#">Settings</a>
            <a className="mt-2 block text-[#637981] hover:text-[#002c3e]" href="#">Notifications</a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-3 border-t border-[#dfe6df] pt-4 text-sm text-[#637981] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 CSharpHub. Built for C# and OOP learners.</p>
        <div className="flex gap-3">
          <a className="hover:text-[#002c3e]" href="#">Privacy</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-[#002c3e]" href="#">Terms</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-[#002c3e]" href="#">Status</a>
        </div>
      </div>
    </footer>
  );
}
