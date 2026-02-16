"use client"

import { useState } from "react"
import { Folder, List } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Collection {
  id: number
  name: string
  count: number
}

interface CollectionFilterProps {
  collections: Collection[]
  onFilterChange: (collectionId: number | null) => void
}

export function CollectionFilter({ collections, onFilterChange }: CollectionFilterProps) {
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null)

  const handleSelect = (collectionId: number | null) => {
    setSelectedCollection(collectionId)
    onFilterChange(collectionId)
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Folder className="h-4 w-4" />
        コレクション
      </h3>

      <div className="space-y-1">
        {/* すべて表示 */}
        <button
          onClick={() => handleSelect(null)}
          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            selectedCollection === null
              ? "bg-indigo-50 text-indigo-700 font-medium"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <List className="h-4 w-4" />
            すべて
          </span>
          <Badge
            variant="secondary"
            className={
              selectedCollection === null
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
            }
          >
            {collections.reduce((sum, c) => sum + c.count, 0)}
          </Badge>
        </button>

        {/* コレクション一覧 */}
        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => handleSelect(collection.id)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              selectedCollection === collection.id
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Folder className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{collection.name}</span>
            </span>
            <Badge
              variant="secondary"
              className={`flex-shrink-0 ${
                selectedCollection === collection.id
                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {collection.count}
            </Badge>
          </button>
        ))}
      </div>
    </Card>
  )
}
