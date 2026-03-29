"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

type TripContentEditorProps = {
  initialBlocks: PartialBlock[];
  editorKey: string;
  onChangeAction: (blocks: PartialBlock[]) => void;
};

function MountedTripContentEditor({
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

export function TripContentEditor(props: TripContentEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-24 rounded-2xl bg-stone-50" />;
  }

  return <MountedTripContentEditor {...props} />;
}
