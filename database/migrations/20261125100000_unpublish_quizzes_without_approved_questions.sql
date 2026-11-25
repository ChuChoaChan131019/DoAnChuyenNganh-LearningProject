-- Keep legacy quizzes from appearing published when they have no approved
-- question. The application also enforces this rule for future publications.
UPDATE public.quizzes AS quiz
SET is_active = false
WHERE quiz.is_active IS TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.quiz_questions AS quiz_question
    JOIN public.questions AS question
      ON question.id = quiz_question.question_id
    WHERE quiz_question.quiz_id = quiz.id
      AND question.status = 'approved'
  );
