"use client";

import { PartialBlock } from "@blocknote/core";
import { CSSProperties, Fragment, ReactNode } from "react";

type TripContentRendererProps = {
  blocks: PartialBlock[];
  className?: string;
};

type InlineContent =
  | string
  | {
      type?: string;
      text?: string;
      href?: string;
      styles?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strike?: boolean;
        code?: boolean;
        textColor?: string;
        backgroundColor?: string;
      };
      content?: InlineContent[];
    };

function renderInlineContent(
  content: InlineContent[] | string | undefined,
  keyPrefix: string,
): ReactNode {
  if (!content) {
    return null;
  }

  if (typeof content === "string") {
    return content;
  }

  return content.map((item, index) => {
    if (typeof item === "string") {
      return <Fragment key={`${keyPrefix}-${index}`}>{item}</Fragment>;
    }

    const childKey = `${keyPrefix}-${index}`;
    const text = item.text ?? "";
    const nested = item.content ? renderInlineContent(item.content, childKey) : text;
    let node: ReactNode = nested;

    if (item.type === "link" && item.href) {
      node = (
        <a className="text-[#8c6f3e] underline underline-offset-4" href={item.href} key={childKey}>
          {node}
        </a>
      );
    }

    const styles = item.styles ?? {};
    const style: CSSProperties = {};
    if (styles.textColor) {
      style.color = styles.textColor;
    }
    if (styles.backgroundColor) {
      style.backgroundColor = styles.backgroundColor;
    }

    const className = [
      styles.bold ? "font-semibold" : "",
      styles.italic ? "italic" : "",
      styles.underline ? "underline underline-offset-4" : "",
      styles.strike ? "line-through" : "",
      styles.code ? "rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-[0.92em]" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span className={className || undefined} key={childKey} style={style}>
        {node}
      </span>
    );
  });
}

function renderBlock(block: PartialBlock, key: string): ReactNode {
  const content = renderInlineContent(
    block.content as InlineContent[] | string | undefined,
    `${key}-content`,
  );
  const children =
    Array.isArray(block.children) && block.children.length > 0 ? (
      <div className="mt-3 space-y-3 pl-5">
        {block.children.map((child, index) => (
          <Fragment key={`${key}-child-${index}`}>
            {renderBlock(child, `${key}-child-${index}`)}
          </Fragment>
        ))}
      </div>
    ) : null;

  switch (block.type) {
    case "heading": {
      const level = Number((block.props as { level?: number } | undefined)?.level ?? 1);
      if (level === 1) {
        return (
          <div key={key}>
            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-stone-950 first:mt-0">
              {content}
            </h2>
            {children}
          </div>
        );
      }
      if (level === 2) {
        return (
          <div key={key}>
            <h3 className="mt-7 text-2xl font-semibold text-stone-900 first:mt-0">{content}</h3>
            {children}
          </div>
        );
      }
      return (
        <div key={key}>
          <h4 className="mt-6 text-xl font-semibold text-stone-900 first:mt-0">{content}</h4>
          {children}
        </div>
      );
    }
    case "bulletListItem":
      return (
        <div key={key}>
          <div className="flex items-start gap-3">
            <span className="mt-[0.55rem] size-2 shrink-0 rounded-full bg-stone-500" />
            <div className="min-w-0 flex-1">
              <div>{content}</div>
              {children}
            </div>
          </div>
        </div>
      );
    case "numberedListItem":
      return (
        <div key={key}>
          <div className="flex items-start gap-3">
            <span className="min-w-6 text-sm font-semibold text-stone-500">#</span>
            <div className="min-w-0 flex-1">
              <div>{content}</div>
              {children}
            </div>
          </div>
        </div>
      );
    case "checkListItem": {
      const checked = Boolean((block.props as { checked?: boolean } | undefined)?.checked);
      return (
        <div key={key}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-stone-500">{checked ? "☑" : "☐"}</span>
            <div className="min-w-0 flex-1">
              <div>{content}</div>
              {children}
            </div>
          </div>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-700" key={key}>
          {content}
          {children}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 text-sm text-stone-100"
          key={key}
        >
          <code>{typeof content === "string" ? content : content}</code>
          {children}
        </pre>
      );
    case "image": {
      const props = (block.props as { url?: string; caption?: string } | undefined) ?? {};
      if (!props.url) {
        return null;
      }
      return (
        <figure className="space-y-3" key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={props.caption ?? ""}
            className="max-h-[34rem] w-full rounded-2xl object-cover"
            src={props.url}
          />
          {props.caption ? (
            <figcaption className="text-sm text-stone-500">{props.caption}</figcaption>
          ) : null}
          {children}
        </figure>
      );
    }
    default:
      return (
        <div className="text-base leading-7 text-stone-700" key={key}>
          {content}
          {children}
        </div>
      );
  }
}

export function TripContentRenderer({ blocks, className }: TripContentRendererProps) {
  return (
    <div className={`space-y-4 text-base leading-7 text-stone-700 ${className ?? ""}`}>
      {blocks.map((block, index) => renderBlock(block, `block-${index}`))}
    </div>
  );
}
