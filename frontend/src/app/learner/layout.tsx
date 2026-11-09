import React from "react";

import { LearnerFooter } from "@/components/learner/footer";
import { LearnerTopbar } from "@/components/learner/topbar";
import { AiTutorFloating } from "@/components/learner/ai-tutor-floating";
import { TutorContextProvider } from "@/contexts/tutor-context";

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TutorContextProvider>
      <div className="min-h-screen bg-[#F7F8F3] font-[var(--font-plus-jakarta-sans)]">
        {/* Thanh điều hướng */}
        <LearnerTopbar />

        {/* Nội dung trang */}
        <main className="mx-auto max-w-7xl p-6 lg:p-8">{children}</main>

        {/* Widget trợ giảng nổi */}
        <AiTutorFloating />

        {/* Footer */}
        <LearnerFooter />
      </div>
    </TutorContextProvider>
  );
}