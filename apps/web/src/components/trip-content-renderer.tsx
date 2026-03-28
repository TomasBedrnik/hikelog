"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

type TripContentRendererProps = {
  blocks: PartialBlock[];
  editorKey: string;
};

export function TripContentRenderer({
  blocks,
  editorKey,
}: TripContentRendererProps) {
  const editor = useCreateBlockNote(
    {
      initialContent: blocks,
    },
    [editorKey],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}
