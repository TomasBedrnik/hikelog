"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

type TripContentRendererProps = {
  blocks: PartialBlock[];
  editorKey: string;
};

function MountedTripContentRenderer({
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

export function TripContentRenderer(props: TripContentRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-24 rounded-2xl bg-stone-50" />;
  }

  return <MountedTripContentRenderer {...props} />;
}
