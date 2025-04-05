"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Keyboard } from "lucide-react";

interface NumericKeypadProps {
  onNumberClick: (number: string) => void;
  onBackspace: () => void;
}

export default function NumericKeypad({
  onNumberClick,
  onBackspace,
}: NumericKeypadProps) {
  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 ml-2"
          type="button"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-3 gap-2">
          {numbers.map((number) => (
            <Button
              key={number}
              variant="outline"
              className="h-12"
              onClick={() => onNumberClick(number)}
              type="button"
            >
              {number}
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-12 col-span-2"
            onClick={onBackspace}
            type="button"
          >
            ⌫
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 