"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";

type TripContentEditorProps = {
  initialBlocks: PartialBlock[];
  editorKey: string;
  onChangeAction: (blocks: PartialBlock[]) => void;
};

export function TripContentEditor({
  initialBlocks,
  editorKey,
                                      onChangeAction,
}: TripContentEditorProps) {
  const editor = useCreateBlockNote(
    {
      initialContent: initialBlocks,
    },
    [editorKey],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <BlockNoteView
        editor={editor}
        onChange={() => {
            onChangeAction(editor.document as PartialBlock[]);
        }}
      />
    </div>
  );
}
