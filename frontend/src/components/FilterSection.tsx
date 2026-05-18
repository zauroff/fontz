import { useState } from 'react';

export type FilterOption = { value: string; label: string };

type Props = {
  title: string;
  value: string;
  options: FilterOption[];
  onChange: (next: string) => void;
  defaultOpen?: boolean;
};

export function FilterSection({ title, value, options, onChange, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`sidebar-section${open ? ' open' : ''}`}>
      <button
        type="button"
        className="sidebar-title"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sidebar-toggle">{open ? '[-]' : '[+]'}</span>
        <span>{title}</span>
      </button>
      {open && (
        <ul className="sidebar-list">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value || '__all__'}>
                <button
                  type="button"
                  className={`sidebar-row${active ? ' active' : ''}`}
                  onClick={() => onChange(opt.value)}
                >
                  <span className="sidebar-marker">{active ? '>' : ' '}</span>
                  <span className="sidebar-label">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
