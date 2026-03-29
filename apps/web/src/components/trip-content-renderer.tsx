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
  chrome?: "card" | "plain";
  className?: string;
};

function MountedTripContentRenderer({
  blocks,
  editorKey,
  chrome = "card",
  className,
}: TripContentRendererProps) {
  const editor = useCreateBlockNote(
    {
      initialContent: blocks,
    },
    [editorKey],
  );

  return (
    <div
      className={
        chrome === "plain"
          ? `overflow-hidden bg-transparent shadow-none [&_.bn-container]:border-0 [&_.bn-container]:bg-transparent [&_.bn-editor]:bg-transparent [&_.bn-editor]:p-0 [&_.bn-editor]:text-inherit [&_.bn-inline-content]:text-inherit ${className ?? ""}`
          : `overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className ?? ""}`
      }
    >
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}

export function TripContentRenderer({ chrome = "card", className, ...props }: TripContentRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (chrome === "plain") {
      return <div className={className} />;
    }
    return <div className="min-h-24 rounded-2xl bg-stone-50" />;
  }

  return <MountedTripContentRenderer {...props} chrome={chrome} className={className} />;
}
