import { Code2, GraduationCap, Mail, Send } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-sidebar px-7 py-7 text-white lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <p className="text-lg font-bold">CSharpHub</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/75">
            The C# and OOP self-learning platform with AI-assisted content
            management studio. Built for students and content managers.
          </p>

          <div className="mt-4 flex gap-2">
            <a
              aria-label="CSharpHub on GitHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/60 text-white hover:bg-white/10"
              href="#"
            >
              <Code2 className="h-4 w-4" />
            </a>
            <a
              aria-label="Share CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/60 text-white hover:bg-white/10"
              href="#"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              aria-label="Contact CSharpHub"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/60 text-white hover:bg-white/10"
              href="mailto:hello@csharphub.com"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm sm:grid-cols-3 lg:gap-x-16">
          <div>
            <p className="font-semibold uppercase tracking-wider text-white/75">Platform</p>
            <a
              className="mt-4 block text-white/75 hover:text-white"
              href="/content-manager/learning-content/courses"
            >
              Courses
            </a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager/testsandpractice/practicesets">Practice</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager">Analytics</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager">AI Tutor</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-white/75">Studio</p>
            <a className="mt-4 block text-white/75 hover:text-white" href="/content-manager">Dashboard</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager/questions/bank">Question bank</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager/testsandpractice/tests">Tests</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager">AI generator</a>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-wider text-white/75">Support</p>
            <a className="mt-4 block text-white/75 hover:text-white" href="/content-manager/search">Search</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager">Settings</a>
            <a className="mt-2 block text-white/75 hover:text-white" href="/content-manager">Notifications</a>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-white/30 pt-4 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 CSharpHub. Built for C# and OOP learners.</p>
        <div className="flex gap-3">
          <a className="hover:text-white" href="#">Privacy</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-white" href="#">Terms</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-white" href="#">Status</a>
        </div>
      </div>
    </footer>
  );
}
