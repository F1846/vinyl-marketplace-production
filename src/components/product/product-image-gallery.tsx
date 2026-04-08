"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type GalleryImage = {
  id: string;
  url: string;
  sortOrder: number;
};

type ProductImageGalleryProps = {
  images: GalleryImage[];
  artist: string;
  title: string;
};

export function ProductImageGallery({
  images,
  artist,
  title,
}: ProductImageGalleryProps) {
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? null);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? images[0] ?? null,
    [images, selectedImageId]
  );

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft">
        {selectedImage?.url ? (
          <Image
            src={selectedImage.url}
            alt={`${artist} - ${title}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-muted">
            No image available
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const isSelected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border bg-white transition ${
                  isSelected
                    ? "border-foreground shadow-soft"
                    : "border-border hover:border-foreground/25"
                }`}
                aria-label={`Show image ${index + 1} for ${artist} - ${title}`}
                aria-pressed={isSelected}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="6rem"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
