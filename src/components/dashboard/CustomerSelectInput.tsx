import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { apiService } from '../../services/api';

interface CustomerSelectInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectCustomer?: (customer: { id?: string; name: string; phone?: string }) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSelectInput({
  value,
  onChange,
  onSelectCustomer,
  placeholder = "Select or type customer name...",
  className = ""
}: CustomerSelectInputProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = async () => {
    try {
      const list = await (apiService as any).customers.list();
      setCustomers(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [showSuggestions]); // Refresh on focus/click

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const suggestions = customers.filter(c => 
    c.name.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 pr-10 ${className}`}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <User size={15} />
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-150 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-100 divide-y divide-slate-50">
          {suggestions.map((c, i) => (
            <button
              key={c.id || i}
              type="button"
              onClick={() => {
                onChange(c.name);
                if (onSelectCustomer) {
                  onSelectCustomer(c);
                }
                setShowSuggestions(false);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex flex-col cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-800">{c.name}</span>
              {c.phone && <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
