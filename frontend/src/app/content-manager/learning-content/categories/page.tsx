"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Eye,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { Category, ContentStatus } from "@/types/learning-content";
import { ApiClientError, categoryApi } from "@/lib/api";

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "In review": "border-amber-200 bg-amber-50 text-amber-700",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isMounted = true;

    categoryApi
      .list()
      .then((loadedCategories) => {
        if (isMounted) {
          setCategories(loadedCategories);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Unable to load categories. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (openMenu === null) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-category-menu]")) {
        return;
      }
      setOpenMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);
  const filteredCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? categories.filter((category) =>
          [category.name, category.slug, category.description].some((value) =>
            value.toLowerCase().includes(term),
          ),
        )
      : categories;
  }, [categories, query]);

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setFormError("");
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description);
    setFormError("");
    setOpenMenu(null);
    setIsCreateOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;

    setDeletingCategoryId(category.id);
    setOpenMenu(null);
    try {
      await categoryApi.remove(String(category.id));
      setCategories((currentCategories) =>
        currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
      );
    } catch (error) {
      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Unable to delete category. Please try again.",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const toggleCategoryMenu = (
    categoryId: string | number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (openMenu === categoryId) {
      setOpenMenu(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: buttonRect.bottom + 4,
      left: Math.max(8, buttonRect.right - 128),
    });
    setOpenMenu(categoryId);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
    setFormError("");
  };

  const handleCreateCategory = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName.length < 3) {
      setFormError("Name must be at least 3 characters.");
      return;
    }

    if (!trimmedSlug) {
      setFormError("A valid slug is required.");
      return;
    }

    if (categories.some((category) => category.slug === trimmedSlug)) {
      setFormError("This slug already exists. Choose a different name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const updatedCategory = await categoryApi.update(String(editingCategory.id), {
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim(),
        });
        setCategories((currentCategories) =>
          currentCategories.map((category) =>
            category.id === editingCategory.id ? updatedCategory : category,
          ),
        );
      } else {
        const createdCategory = await categoryApi.create({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim(),
        });
        setCategories((currentCategories) => [createdCategory, ...currentCategories]);
      }
      closeCreateModal();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to create category. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Categories
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Top-level grouping for every C# course in the catalogue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-[#db3540]"
        >
          <Plus className="h-4 w-4" />
          New category
        </button>
      </header>
      <section className="overflow-visible rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
        <div className="flex items-center justify-between gap-4 border-b border-[#dfe6df] px-4 py-4 sm:px-5">
          <label className="relative block w-full max-w-[342px]">
            <span className="sr-only">Search categories</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#637981]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories..."
              className="h-10 w-full rounded-xl border border-[#dfe6df] bg-white pl-10 pr-3 text-sm text-[#002C3E] placeholder:text-[#637981]/70 shadow-xs outline-none transition focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </label>
          <span className="shrink-0 text-xs text-[#637981]">
            {filteredCategories.length}{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
          </span>
        </div>
        <div className="h-[390px] min-h-[330px] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#fbfcf8]">
              <tr className="border-b border-[#dfe6df] text-sm text-[#637981]">
                <th className="px-4 py-3 font-medium sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-center font-medium">Courses</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#637981]"
                  >
                    Loading categories...
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="group border-b border-[#e5ebe5] last:border-b-0 hover:bg-[#f3f7f5]"
                >
                  <td className="px-4 py-2 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F7444E]/10 text-[#F7444E]">
                        <FolderTree className="h-4 w-4" />
                      </span>
                      <Link
                        href={`/content-manager/learning-content/categories/${category.slug}`}
                        className="font-semibold text-[#002C3E] hover:text-[#F7444E]"
                      >
                        {category.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#637981]">
                    {category.slug}
                  </td>
                  <td className="max-w-[390px] truncate px-4 py-2 text-sm text-[#637981]">
                    {category.description}
                  </td>
                  <td className="px-4 py-2 text-center text-sm font-semibold text-[#002C3E]">
                    {category.courses}
                  </td>
                  <td className="px-4 py-2 text-sm text-[#637981]">
                    {category.created}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[category.status]}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {category.status}
                    </span>
                  </td>
                  <td
                    className="relative px-3 py-2 text-right"
                    data-category-menu
                  >
                    <button
                      type="button"
                      aria-label={`Actions for ${category.name}`}
                      onClick={(event) => toggleCategoryMenu(category.id, event)}
                      className="rounded-lg p-2 text-[#637981] transition hover:bg-[#dfe6df]/50 hover:text-[#002C3E]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loadError && (
          <p className="px-5 py-12 text-center text-sm text-[#F7444E]">
            {loadError}
          </p>
        )}
        {!isLoading && !loadError && filteredCategories.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-[#637981]">
            No categories found.
          </p>
        )}
      </section>
      {openMenu !== null &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const category = categories.find((item) => item.id === openMenu);
            if (!category) return null;

            return (
              <div
                data-category-menu
                className="fixed z-[100] w-32 rounded-lg border border-[#dfe6df] bg-white p-1 text-left text-xs text-[#002C3E] shadow-lg"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <Link
                  href={`/content-manager/learning-content/categories/${category.slug}`}
                  onClick={() => setOpenMenu(null)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[#002C3E] hover:bg-[#f3f7f5]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => openEditModal(category)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[#002C3E] hover:bg-[#f3f7f5]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(category)}
                  disabled={deletingCategoryId === category.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[#F7444E] hover:bg-rose-50 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {deletingCategoryId === category.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            );
          })(),
          document.body,
        )}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs px-4 py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <form
            onSubmit={handleCreateCategory}
            className="max-h-full w-full max-w-[640px] overflow-y-auto rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-2xl sm:p-8 text-[#002C3E]"
            aria-labelledby="create-category-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="create-category-title"
                  className="text-2xl font-semibold text-[#002C3E]"
                >
                  {editingCategory ? "Edit category" : "Create category"}
                </h2>
                <p className="mt-1 max-w-[500px] text-sm leading-6 text-[#637981]">
                  Categories group related C# courses, e.g. “Object-Oriented Programming”.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Close create category form"
                className="rounded-lg p-1 text-[#637981] transition hover:bg-[#dfe6df]/50 hover:text-[#002C3E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-[#002C3E]">
                Name
                <input
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="e.g. Object-Oriented Programming"
                  autoFocus
                  className={`mt-2 h-12 w-full rounded-xl border bg-white px-4 text-base text-[#002C3E] outline-none transition placeholder:text-[#637981]/70 focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20 ${
                    formError && name.trim().length < 3
                      ? "border-[#F7444E]"
                      : "border-[#dfe6df]"
                  }`}
                />
              </label>

              <label className="block text-sm font-medium text-[#002C3E]">
                Slug
                <input
                  value={slug}
                  readOnly
                  className="mt-2 h-12 w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] px-4 font-mono text-sm text-[#637981] outline-none"
                />
                <span className="mt-1.5 block text-xs text-[#637981]">
                  Generated automatically from the name.
                </span>
              </label>

              <label className="block text-sm font-medium text-[#002C3E]">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the courses in this category..."
                  rows={4}
                  className="mt-2 w-full resize-y rounded-xl border border-[#dfe6df] bg-white px-4 py-3 text-sm leading-6 text-[#002C3E] outline-none transition placeholder:text-[#637981]/70 focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
                />
              </label>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-[#F7444E]" role="alert">
                {formError}
              </p>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isSubmitting}
                className="h-11 rounded-xl border border-[#dfe6df] bg-white px-5 text-sm font-semibold text-[#002C3E] shadow-xs transition hover:bg-[#f3f7f5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-[#F7444E] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#db3540] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingCategory
                    ? "Save changes"
                    : "Create category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
