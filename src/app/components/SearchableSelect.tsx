import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

export type SearchableSelectOption = { value: string; label: string };

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  allLabel,
  triggerClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  allLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const allOptions = [{ value: "all", label: allLabel }, ...options];
  const filtered = search.trim()
    ? allOptions.filter((o) => normalize(o.label).includes(normalize(search)))
    : allOptions;

  const displayLabel =
    value === "all" ? allLabel : (options.find((o) => o.value === value)?.label ?? value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full min-w-0 max-w-full items-center justify-between gap-1 rounded-full border border-input bg-background px-3 py-[7px] text-[13px] leading-tight shadow-sm hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm",
            triggerClassName
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder ?? "Buscar..."}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => { onValueChange(opt.value); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("mr-1 h-4 w-4 shrink-0", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
