'use client';

import { cn } from "@/lib/utils";

export const COLORS = [
    { name: 'zinc', label: 'Cinza', bg: 'bg-zinc-500', hex: '#71717a' },
    { name: 'red', label: 'Vermelho', bg: 'bg-red-500', hex: '#ef4444' },
    { name: 'orange', label: 'Laranja', bg: 'bg-orange-500', hex: '#f97316' },
    { name: 'amber', label: 'Âmbar', bg: 'bg-amber-500', hex: '#f59e0b' },
    { name: 'yellow', label: 'Amarelo', bg: 'bg-yellow-500', hex: '#eab308' },
    { name: 'lime', label: 'Lima', bg: 'bg-lime-500', hex: '#84cc16' },
    { name: 'green', label: 'Verde', bg: 'bg-green-500', hex: '#22c55e' },
    { name: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', hex: '#10b981' },
    { name: 'teal', label: 'Azul-petróleo', bg: 'bg-teal-500', hex: '#14b8a6' },
    { name: 'cyan', label: 'Ciano', bg: 'bg-cyan-500', hex: '#06b6d4' },
    { name: 'sky', label: 'Céu', bg: 'bg-sky-500', hex: '#0ea5e9' },
    { name: 'blue', label: 'Azul', bg: 'bg-blue-500', hex: '#3b82f6' },
    { name: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', hex: '#6366f1' },
    { name: 'violet', label: 'Violeta', bg: 'bg-violet-500', hex: '#8b5cf6' },
    { name: 'purple', label: 'Roxo', bg: 'bg-purple-500', hex: '#a855f7' },
    { name: 'fuchsia', label: 'Fúcsia', bg: 'bg-fuchsia-500', hex: '#d946ef' },
    { name: 'pink', label: 'Rosa', bg: 'bg-pink-500', hex: '#ec4899' },
    { name: 'rose', label: 'Rosa-escuro', bg: 'bg-rose-500', hex: '#f43f5e' },
];

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
            {COLORS.map((color) => {
                const isSelected = value === color.name;

                return (
                    <button
                        key={color.name}
                        type="button"
                        onClick={() => onChange(color.name)}
                        className={cn(
                            'w-full aspect-square rounded-lg transition-all',
                            color.bg,
                            isSelected && 'ring-2 ring-zinc-950 ring-offset-2'
                        )}
                        title={color.label}
                    />
                );
            })}
        </div>
    );
}

export function getColorClass(colorName: string) {
    const color = COLORS.find(c => c.name === colorName);
    return color ? color.bg : 'bg-zinc-500';
}

export function getColorHex(colorName: string) {
    const color = COLORS.find(c => c.name === colorName);
    return color ? color.hex : '#71717a';
}
