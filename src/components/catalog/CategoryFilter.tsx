"use client";

import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

interface CategoryFilterProps {
    categories: { id: number | string; name: string; slug: string }[];
    selectedCategory: string | null;
    onSelect: (category: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
    return (
        <div className="flex flex-wrap gap-3 mb-10">
            <Button
                variant={selectedCategory === null ? "primary" : "outline"}
                size="sm"
                onClick={() => onSelect(null)}
                className={clsx("rounded-full px-5 font-bold", selectedCategory !== null && "border-gray-200 text-gray-500")}
            >
                Todos
            </Button>
            {categories.map((cat) => (
                <Button
                    key={cat.slug}
                    variant={selectedCategory === cat.slug ? "primary" : "outline"}
                    size="sm"
                    onClick={() => onSelect(cat.slug)}
                    className={clsx("rounded-full px-5 font-bold", selectedCategory !== cat.slug && "border-gray-200 text-gray-500")}
                >
                    {cat.name}
                </Button>
            ))}
        </div>
    );
}
