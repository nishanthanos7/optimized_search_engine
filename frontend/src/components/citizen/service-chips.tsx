"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CITIZEN_SERVICES } from "@/lib/citizen/services";

interface ServiceChipsProps {
  selected: string | null;
  onSelect: (slug: string) => void;
}

export function ServiceChips({ selected, onSelect }: ServiceChipsProps) {
  const handleSelect = useCallback(
    (slug: string) => onSelect(slug),
    [onSelect],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {CITIZEN_SERVICES.map((service) => (
        <Button
          key={service.slug}
          type="button"
          variant={selected === service.slug ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelect(service.slug)}
          className="text-xs md:text-sm"
        >
          {service.name}
        </Button>
      ))}
    </div>
  );
}
