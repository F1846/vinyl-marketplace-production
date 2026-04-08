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
    <div className="space-y-2">
      <div className="relative aspect-[0.82] overflow-hidden rounded-[1.1rem] border border-border bg-white shadow-soft">
        {selectedImage?.url ? (
          <Image
            src={selectedImage.url}
            alt={`${artist} - ${title}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 42vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base text-muted">
            No image available
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const isSelected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[0.8rem] border bg-white transition ${
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
