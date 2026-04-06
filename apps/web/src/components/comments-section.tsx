"use client";

import { useState } from "react";
import { CommentRead } from "@/lib/comments";
import { getDateLocale } from "@/lib/i18n";

type CommentsSectionProps = {
  comments: CommentRead[];
  locale: "en" | "cs";
  title: string;
  emptyText: string;
  nameLabel: string;
  textLabel: string;
  submitLabel?: string;
  submittingLabel?: string;
  deleteLabel?: string;
  deletingLabel?: string;
  namePlaceholder?: string;
  textPlaceholder?: string;
  validationError?: string;
  unknownError?: string;
  onCreate?: (payload: { name: string; text: string }) => Promise<void>;
  onDelete?: (commentId: number) => Promise<void>;
};

function formatDateTime(value: string, locale: "en" | "cs") {
  return new Intl.DateTimeFormat(getDateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CommentsSection({
  comments,
  locale,
  title,
  emptyText,
  nameLabel,
  textLabel,
  submitLabel,
  submittingLabel,
  deleteLabel,
  deletingLabel,
  namePlaceholder,
  textPlaceholder,
  validationError,
  unknownError,
  onCreate,
  onDelete,
}: CommentsSectionProps) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  return (
    <section className="mt-10 rounded-[2rem] border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        <span className="text-sm text-stone-500">{comments.length}</span>
      </div>

      {onCreate ? (
        <form
          className="mt-5 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!onCreate) {
              return;
            }

            const nextName = name.trim();
            const nextText = text.trim();
            if (!nextName || !nextText) {
              setError(validationError ?? "Invalid input");
              return;
            }

            setIsSubmitting(true);
            setError(null);
            void onCreate({ name: nextName, text: nextText })
              .then(() => {
                setName("");
                setText("");
              })
              .catch((nextError: unknown) => {
                setError(
                  nextError instanceof Error
                    ? nextError.message
                    : (unknownError ?? "Unknown error"),
                );
              })
              .finally(() => {
                setIsSubmitting(false);
              });
          }}
        >
          <div className="grid gap-4 md:grid-cols-1">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">{nameLabel}</span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                maxLength={120}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                placeholder={namePlaceholder}
                value={name}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">{textLabel}</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600"
                maxLength={5000}
                onChange={(event) => {
                  setText(event.target.value);
                }}
                placeholder={textPlaceholder}
                value={text}
              />
            </label>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button
            className="mt-4 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (submittingLabel ?? submitLabel) : submitLabel}
          </button>
        </form>
      ) : null}

      {comments.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">{emptyText}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-stone-900">{comment.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-400">
                    {formatDateTime(comment.created_at, locale)}
                  </p>
                </div>
                {onDelete ? (
                  <button
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={deletingCommentId !== null}
                    onClick={() => {
                      setDeletingCommentId(comment.id);
                      setError(null);
                      void onDelete(comment.id)
                        .catch((nextError: unknown) => {
                          setError(
                            nextError instanceof Error
                              ? nextError.message
                              : (unknownError ?? "Unknown error"),
                          );
                        })
                        .finally(() => {
                          setDeletingCommentId(null);
                        });
                    }}
                    type="button"
                  >
                    {deletingCommentId === comment.id
                      ? (deletingLabel ?? deleteLabel)
                      : deleteLabel}
                  </button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                {comment.text}
              </p>
            </article>
          ))}
        </div>
      )}

      {error && comments.length > 0 ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
