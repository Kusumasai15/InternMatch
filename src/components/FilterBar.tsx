import { ChevronDown } from "lucide-react";

export default function FilterSelect({ label, value, options, onChange, displayOptions }: { label: string; value: string; options: string[]; onChange: (value: string) => void; displayOptions?: string[] }) {
  return <div className="filter-field"><label htmlFor={`filter-${label}`}>{label}</label><div className="select-wrap"><select id={`filter-${label}`} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option, i) => <option key={option} value={option}>{displayOptions?.[i] ?? option}</option>)}</select><ChevronDown size={13}/></div></div>;
}

