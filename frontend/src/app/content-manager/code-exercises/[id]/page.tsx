"use client";

import { useParams } from "next/navigation";
import { CodeExerciseEditor } from "@/components/content-manager/code-exercises/code-exercise-editor";

export default function EditCodeExercisePage() {
  const params = useParams<{ id: string }>();

  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <CodeExerciseEditor key={exerciseId} exerciseId={exerciseId} />;
}