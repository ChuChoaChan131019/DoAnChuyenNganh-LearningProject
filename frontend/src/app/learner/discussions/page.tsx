'use client';

import { DiscussionSection } from '@/components/learner/discussion/discussion-section';

export default function LearnerDiscussionsPage() {
  return (
    <div className="mx-auto max-w-[1240px] pb-10">
      <DiscussionSection
        allPosts
        title="Tất cả thảo luận"
        description="Xem, tìm kiếm và lọc tất cả bài đăng thuộc các khóa học, chương và bài học đã xuất bản."
      />
    </div>
  );
}
