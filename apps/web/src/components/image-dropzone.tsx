'use client';

import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';

import { InlineSpinner } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ImageDropzone({
  busy = false,
  fileName,
  imageUrl,
  note,
  onClear,
  onFile,
}: {
  busy?: boolean;
  fileName?: string | undefined;
  imageUrl: string;
  note?: string | undefined;
  onClear: () => void;
  onFile: (file: File | null) => void;
}): ReactNode {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function onDragOver(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setDragActive(false);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setDragActive(false);
    onFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="grid gap-3">
      <label
        className={cn(
          'relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition-colors',
          'hover:border-primary/60 hover:bg-accent/40',
          dragActive && 'border-primary bg-accent/60',
          imageUrl && 'border-solid',
        )}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            onFile(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
          ref={inputRef}
          type="file"
        />
        {imageUrl ? (
          <img alt="Selected menu item" className="h-56 w-full object-cover" src={imageUrl} />
        ) : (
          <span className="grid justify-items-center gap-2 p-6 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ImagePlus aria-hidden="true" className="size-6" />
            </span>
            <span className="text-sm font-semibold">Drop an image here</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF up to 5 MB</span>
          </span>
        )}
        {busy ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-3 py-1 text-xs font-semibold text-background">
            <InlineSpinner className="size-3" />
            Uploading
          </span>
        ) : null}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => inputRef.current?.click()} size="sm" type="button" variant="outline">
          <Upload />
          {imageUrl ? 'Change image' : 'Choose image'}
        </Button>
        {imageUrl ? (
          <Button disabled={busy} onClick={onClear} size="sm" type="button" variant="ghost">
            <Trash2 />
            Remove
          </Button>
        ) : null}
      </div>

      {fileName || note ? (
        <p className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
          {fileName ? <span className="block font-semibold text-foreground">{fileName}</span> : null}
          {note}
        </p>
      ) : null}
    </div>
  );
}
