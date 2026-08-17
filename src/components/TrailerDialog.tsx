"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";

type TrailerDialogProps = {
  /** YouTube video key; the page only renders this component when one exists. */
  videoKey: string;
  /** The film's display title, for the dialog heading and iframe title. */
  title: string;
};

/**
 * Play Trailer button and its modal. A native dialog supplies the focus
 * trap, Escape, and background inertness. The YouTube iframe mounts
 * only while the dialog is open, so the third party loads nothing until
 * the viewer actually asks for the trailer, and unmounting on close is
 * also what stops playback.
 */
export default function TrailerDialog({ videoKey, title }: TrailerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  return (
    <>
      <button className="tc-trailer-button" onClick={show} type="button">
        <Icon name="play" size="sm" />
        Play Trailer
      </button>
      <dialog
        aria-label={`${title} trailer`}
        className="tc-trailer-dialog"
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <div className="tc-trailer-bar">
          <span className="tc-ui">{title}</span>
          <button
            aria-label="Close trailer"
            className="tc-trailer-close"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <Icon name="x" size="lg" />
          </button>
        </div>
        {open && (
          <iframe
            allow="autoplay; encrypted-media; fullscreen"
            className="tc-trailer-frame"
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1`}
            title={`${title} trailer`}
          />
        )}
      </dialog>
    </>
  );
}
