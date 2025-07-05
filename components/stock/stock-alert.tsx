
'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package } from 'lucide-react'

interface StockAlertProps {
  stock: number
  lowStockThreshold?: number
}

export default function StockAlert({ stock, lowStockThreshold = 10 }: StockAlertProps) {
  if (stock === 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Package className="h-3 w-3" />
        Out of Stock
      </Badge>
    )
  }

  if (stock <= lowStockThreshold) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 text-orange-600">
        <AlertTriangle className="h-3 w-3" />
        Low Stock ({stock} left)
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1 text-green-600">
      <Package className="h-3 w-3" />
      In Stock ({stock} available)
    </Badge>
  )
}
