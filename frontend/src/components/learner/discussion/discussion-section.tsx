'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagesSquare, RefreshCw } from 'lucide-react';

import { ApiClientError, discussionApi } from '@/lib/api';
import type {
  DiscussionComment,
  DiscussionChapterOption,
  DiscussionPostDetail,
  DiscussionPostListItem,
  DiscussionPostType,
} from '@/types/discussion';

import { DiscussionFilters } from './discussion-filters';
import { DiscussionPostDetail as DiscussionPostDetailPanel } from './discussion-post-detail';
import { DiscussionPostList } from './discussion-post-list';

type Props = {
  allPosts?: boolean;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  chapters?: DiscussionChapterOption[];
  title?: string;
  description?: string;
};

function mergeComments(
  current: DiscussionComment[],
  incoming: DiscussionComment[],
) {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()].sort((left, right) => {
    const timeDifference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDifference || left.id.localeCompare(right.id);
  });
}

export function DiscussionSection({
  allPosts = false,
  courseId,
  chapterId,
  lessonId,
  chapters,
  title = 'Thảo luận học tập',
  description = 'Đọc câu hỏi, ghi chú và trao đổi với các học sinh đang học cùng nội dung.',
}: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [postType, setPostType] = useState<DiscussionPostType | ''>('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [posts, setPosts] = useState<DiscussionPostListItem[]>([]);
  const [nextPostsCursor, setNextPostsCursor] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<DiscussionPostDetail | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [nextCommentsCursor, setNextCommentsCursor] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useCallback((cursor?: string) => ({
    ...(allPosts ? { scope: 'all' as const } : {}),
    ...(courseId ? { course_id: courseId } : {}),
    ...(lessonId
      ? { lesson_id: lessonId }
      : selectedChapterId
        ? { chapter_id: selectedChapterId }
        : !courseId && chapterId
          ? { chapter_id: chapterId }
          : {}),
    ...(postType ? { post_type: postType } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(cursor ? { cursor } : {}),
    limit: 20,
  }), [allPosts, chapterId, courseId, lessonId, postType, debouncedSearch, selectedChapterId]);

  const locationNames = useMemo(() => {
    const chapterNames = new Map<string, string>();
    const lessonNames = new Map<string, string>();
    for (const chapter of chapters ?? []) {
      chapterNames.set(chapter.id, chapter.title);
      for (const lesson of chapter.lessons) lessonNames.set(lesson.id, lesson.title);
    }
    return { chapterNames, lessonNames };
  }, [chapters]);

  const getLocationLabel = useCallback((post: DiscussionPostListItem) => {
    if (post.course_title && post.chapter_title) {
      return [post.course_title, post.chapter_title, post.lesson_title]
        .filter(Boolean)
        .join(' · ');
    }
    const chapterName = locationNames.chapterNames.get(post.chapter_id);
    const lessonName = post.lesson_id
      ? locationNames.lessonNames.get(post.lesson_id)
      : undefined;
    if (lessonName && chapterName) return `${chapterName} · ${lessonName}`;
    if (lessonName) return lessonName;
    return chapterName;
  }, [locationNames]);

  const loadPosts = useCallback(async (append = false, cursor?: string) => {
    if (!allPosts && !lessonId && !chapterId && !courseId) {
      setPosts([]);
      setPostsError('Không xác định được chương hoặc bài học để tải thảo luận.');
      setLoadingPosts(false);
      return;
    }

    const requestId = ++listRequestId.current;
    if (append) setLoadingMorePosts(true);
    else setLoadingPosts(true);
    if (!append) setPostsError(null);
    try {
      const page = await discussionApi.listPosts(
        filters(cursor),
      );
      if (requestId !== listRequestId.current) return;
      setPosts((current) => append ? [...current, ...page.items] : page.items);
      setNextPostsCursor(page.next_cursor);
    } catch (requestError) {
      if (requestId !== listRequestId.current) return;
      setPostsError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải danh sách thảo luận.',
      );
      if (!append) setPosts([]);
    } finally {
      if (requestId === listRequestId.current) {
        setLoadingPosts(false);
        setLoadingMorePosts(false);
      }
    }
  }, [allPosts, chapterId, courseId, lessonId, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPosts(false), 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  const resetDetail = () => {
    detailRequestId.current += 1;
    setSelectedPostId(null);
    setPostDetail(null);
    setComments([]);
    setNextCommentsCursor(null);
    setDetailError(null);
  };

  const openPost = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    setLoadingDetail(true);
    setDetailError(null);
    const requestId = ++detailRequestId.current;
    try {
      const [detail, commentsPage] = await Promise.all([
        discussionApi.getPost(postId),
        discussionApi.listComments(postId),
      ]);
      if (requestId !== detailRequestId.current) return;
      setPostDetail(detail);
      setComments(commentsPage.items);
      setNextCommentsCursor(commentsPage.next_cursor);
    } catch (requestError) {
      if (requestId !== detailRequestId.current) return;
      if (requestError instanceof ApiClientError && requestError.status === 404) {
        setPosts((current) => current.filter((post) => post.id !== postId));
        setDetailError('Bài đăng không còn khả dụng.');
      } else {
        setDetailError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể mở bài đăng.',
        );
      }
      setPostDetail(null);
      setComments([]);
    } finally {
      if (requestId === detailRequestId.current) setLoadingDetail(false);
    }
  }, []);

  const closeDetail = () => {
    resetDetail();
  };

  const handleUnavailable = (requestError: unknown) => {
    if (
      requestError instanceof ApiClientError
      && requestError.status === 404
      && selectedPostId
    ) {
      setPosts((current) => current.filter((post) => post.id !== selectedPostId));
      closeDetail();
    }
  };

  const createComment = async (content: string) => {
    if (!selectedPostId) return;
    try {
      const comment = await discussionApi.createComment(selectedPostId, content);
      setComments((current) => mergeComments(current, [comment]));
      setPosts((current) => current.map((post) =>
        post.id === selectedPostId
          ? { ...post, comment_count: post.comment_count + 1 }
          : post,
      ));
      setPostDetail((current) => current
        ? { ...current, comment_count: current.comment_count + 1 }
        : current,
      );
    } catch (requestError) {
      handleUnavailable(requestError);
      throw requestError;
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    try {
      const updated = await discussionApi.updateComment(commentId, content);
      setComments((current) => current.map((comment) =>
        comment.id === commentId ? updated : comment,
      ));
    } catch (requestError) {
      handleUnavailable(requestError);
      throw requestError;
    }
  };

  const removeComment = async (commentId: string) => {
    try {
      await discussionApi.removeComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      if (selectedPostId) {
        setPosts((current) => current.map((post) =>
          post.id === selectedPostId
            ? { ...post, comment_count: Math.max(0, post.comment_count - 1) }
            : post,
        ));
      }
      setPostDetail((current) => current
        ? { ...current, comment_count: Math.max(0, current.comment_count - 1) }
        : current,
      );
    } catch (requestError) {
      handleUnavailable(requestError);
      throw requestError;
    }
  };

  const loadMoreComments = async () => {
    if (!selectedPostId || !nextCommentsCursor || loadingMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const page = await discussionApi.listComments(
        selectedPostId,
        nextCommentsCursor,
      );
      setComments((current) => mergeComments(current, page.items));
      setNextCommentsCursor(page.next_cursor);
    } catch (requestError) {
      handleUnavailable(requestError);
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải thêm bình luận.',
      );
    } finally {
      setLoadingMoreComments(false);
    }
  };

  return (
    <section className="rounded-[18px] border border-[#dfe6df] bg-[#f8faf8] p-4 shadow-[0_4px_16px_rgba(0,44,62,0.04)] sm:p-5" aria-labelledby="discussion-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="discussion-title" className="flex items-center gap-2 text-xl font-black text-[#0f3741]">
            <MessagesSquare className="h-5 w-5 text-[#F7444E]" />
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <button type="button" onClick={() => void loadPosts(false)} disabled={loadingPosts} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="mt-5">
        <DiscussionFilters
          search={search}
          postType={postType}
          chapters={chapters}
          chapterId={selectedChapterId}
          onSearchChange={(value) => {
            resetDetail();
            setSearch(value);
          }}
          onPostTypeChange={(value) => {
            resetDetail();
            setPostType(value);
          }}
          onChapterChange={(value) => {
            resetDetail();
            setSelectedChapterId(value);
          }}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <DiscussionPostList
          posts={posts}
          selectedPostId={selectedPostId}
          loading={loadingPosts}
          loadingMore={loadingMorePosts}
          error={postsError}
          hasMore={Boolean(nextPostsCursor)}
          getLocationLabel={allPosts || chapters?.length ? getLocationLabel : undefined}
          onSelect={(postId) => void openPost(postId)}
          onRetry={() => void loadPosts(false)}
          onLoadMore={() => void loadPosts(true, nextPostsCursor ?? undefined)}
        />
        <DiscussionPostDetailPanel
          post={postDetail}
          comments={comments}
          loading={loadingDetail}
          error={detailError}
          nextCommentsCursor={nextCommentsCursor}
          loadingMoreComments={loadingMoreComments}
          onClose={closeDetail}
          onRetry={() => selectedPostId && void openPost(selectedPostId)}
          onCreateComment={createComment}
          onUpdateComment={updateComment}
          onRemoveComment={removeComment}
          onLoadMoreComments={() => void loadMoreComments()}
        />
      </div>
    </section>
  );
}
