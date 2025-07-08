import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

import type { EnhancedProduct } from '@smartchoice-ai/shared-types'

interface ProductCardProps {
  product: EnhancedProduct
  onClick?: () => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const getDealScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIcon key={i} className="h-4 w-4 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="h-4 w-4 text-yellow-400 opacity-50" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarOutlineIcon key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }

    return stars
  }

  return (
    <div 
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Product Image */}
      <div className="relative h-48 mb-4 bg-gray-100 rounded-md overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span>No image</span>
          </div>
        )}
        
        {/* Deal Score Badge */}
        {product.dealScore && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getDealScoreColor(product.dealScore.score)}`}>
            Deal Score: {product.dealScore.score}
          </div>
        )}
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        {/* Brand */}
        {product.brand && (
          <div className="text-sm text-gray-600 font-medium">
            {product.brand}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight overflow-hidden" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const
        }}>
          {product.title}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center space-x-2">
            <div className="flex">
              {renderStars(product.rating)}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating} ({product.reviewCount} reviews)
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gray-900">
            ${product.price.toLocaleString()}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-lg text-gray-500 line-through">
              ${product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* AI Summary */}
        {product.aiSummary && (
          <p className="text-sm text-gray-600 overflow-hidden" style={{ 
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const
          }}>
            {product.aiSummary}
          </p>
        )}

        {/* Retailer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            from {product.retailer}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            product.availability === 'in_stock' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {product.availability === 'in_stock' ? 'In Stock' : 'Limited'}
          </span>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Confidence: {Math.round(product.confidence * 100)}%</span>
          {product.dealScore && (
            <span className="capitalize">{product.dealScore.recommendation} deal</span>
          )}
        </div>
      </div>
    </div>
  )
}