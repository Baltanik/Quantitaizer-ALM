import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface CategorySectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function CategorySection({ title, description, children }: CategorySectionProps) {
  return (
    <section className="space-y-4">
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
