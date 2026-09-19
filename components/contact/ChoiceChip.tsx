import type { ReactNode } from "react";

interface Props {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

// Toggle button for the single- and multi-select chips of the inquiry form.
const ChoiceChip = ({ selected, onToggle, children, className = "" }: Props) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`min-h-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${
        selected
          ? "border-[#B718EC] bg-[#FDF5FF] text-[#000D36]"
          : "border-[#F0E6F4] bg-white text-[#556987] hover:border-[#D9A5EE]"
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default ChoiceChip;
