import { PartialBlock } from "@blocknote/core";
import { TripContent } from "@/lib/trips";

const EMPTY_BLOCKS: PartialBlock[] = [{ type: "paragraph" }];

export function getTripContentBlocks(content: TripContent): PartialBlock[] {
  if (!content || typeof content !== "object") {
    return EMPTY_BLOCKS;
  }

  const blocks = "blocks" in content ? content.blocks : undefined;
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks as PartialBlock[];
  }

  return EMPTY_BLOCKS;
}

export function hasTripContent(content: TripContent): boolean {
  if (!content || typeof content !== "object") {
    return false;
  }

  const blocks = "blocks" in content ? content.blocks : undefined;
  return Array.isArray(blocks) && blocks.length > 0;
}

function collectText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        if ("text" in item && typeof item.text === "string") {
          return item.text;
        }
        if ("content" in item) {
          return collectText(item.content);
        }
      }
      return "";
    })
    .join("");
}

export function getFirstParagraphText(content: TripContent): string | null {
  if (!content || typeof content !== "object") {
    return null;
  }

  const blocks = "blocks" in content ? content.blocks : undefined;
  if (!Array.isArray(blocks)) {
    return null;
  }

  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }

    const text = "content" in block ? collectText(block.content).trim() : "";
    if (text) {
      return text;
    }
  }

  return null;
}
