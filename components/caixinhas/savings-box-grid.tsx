"use client"

import type { SavingsBoxWithProgress } from "@/types/savings-box"
import { SavingsBoxCard } from "./savings-box-card"

interface SavingsBoxGridProps {
    boxes: SavingsBoxWithProgress[]
    onContribute: (box: SavingsBoxWithProgress) => void
    onEdit: (box: SavingsBoxWithProgress) => void
    onArchive: (box: SavingsBoxWithProgress) => void
    onDelete: (box: SavingsBoxWithProgress) => void
}

export function SavingsBoxGrid({ boxes, onContribute, onEdit, onArchive, onDelete }: SavingsBoxGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boxes.map((box) => (
                <SavingsBoxCard
                    key={box.id}
                    box={box}
                    onContribute={onContribute}
                    onEdit={onEdit}
                    onArchive={onArchive}
                    onDelete={onDelete}
                />
            ))}
        </div>
    )
}
