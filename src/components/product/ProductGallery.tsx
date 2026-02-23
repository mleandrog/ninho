"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";

interface ProductGalleryProps {
    images: string[];
    category: string;
}

export function ProductGallery({ images, category }: ProductGalleryProps) {
    // Using emoji placeholders if no images provided
    const placeholderEmoji = category === 'Vestidos' ? "👗" : category === 'Bebês' ? "👶" : "👕";
    const [activeImage, setActiveImage] = useState(images[0] || null);

    return (
        <div className="flex flex-col gap-4">
            <div className="aspect-[4/5] bg-soft rounded-[2.5rem] flex items-center justify-center text-9xl overflow-hidden relative group">
                {!activeImage ? (
                    <span className="group-hover:scale-110 transition-transform duration-700">{placeholderEmoji}</span>
                ) : (
                    <img src={activeImage} alt="Product" className="w-full h-full object-cover" />
                )}
            </div>

            {images.length > 1 && (
                <div className="flex gap-4">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveImage(img)}
                            className={clsx(
                                "w-20 h-24 rounded-2xl bg-soft border-2 transition-all overflow-hidden",
                                activeImage === img ? "border-primary p-0.5" : "border-transparent"
                            )}
                        >
                            <img src={img} alt="Thumb" className="w-full h-full object-cover rounded-xl" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
