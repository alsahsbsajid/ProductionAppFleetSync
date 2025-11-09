'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

// Intersection Observer hook for lazy loading
function useIntersectionObserver(
  elementRef: React.RefObject<Element | null>,
  {
    threshold = 0,
    root = null,
    rootMargin = '50px',
    freezeOnceVisible = false,
  }: {
    threshold?: number;
    root?: Element | null;
    rootMargin?: string;
    freezeOnceVisible?: boolean;
  } = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
  };

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen]);

  return entry;
}

// Optimized image component with lazy loading
interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lazy?: boolean;
  webpSrc?: string;
  avifSrc?: string;
  blurDataURL?: string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  quality?: number;
  onLoadingComplete?: () => void;
  onError?: () => void;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      fallbackSrc,
      lazy = true,
      webpSrc,
      avifSrc,
      blurDataURL,
      aspectRatio,
      objectFit = 'cover',
      loading = 'lazy',
      quality = 75,
      className,
      onLoadingComplete,
      onError,
      ...props
    },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const imageRef = useRef<HTMLImageElement>(null);
    const entry = useIntersectionObserver(imageRef, {
      freezeOnceVisible: true,
      rootMargin: '50px',
    });

    const isVisible = !!entry?.isIntersecting;
    const shouldLoad = !lazy || isVisible;

    // Handle image load
    const handleLoad = () => {
      setIsLoaded(true);
      onLoadingComplete?.();
    };

    // Handle image error
    const handleError = () => {
      setHasError(true);
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false);
      } else {
        onError?.();
      }
    };

    // Generate srcSet for different formats
    const generateSrcSet = () => {
      const srcSet = [];
      
      if (avifSrc) {
        srcSet.push(`${avifSrc} 1x`);
      }
      if (webpSrc) {
        srcSet.push(`${webpSrc} 1x`);
      }
      srcSet.push(`${currentSrc} 1x`);
      
      return srcSet.join(', ');
    };

    // Placeholder component
    const Placeholder = () => (
      <div 
        className={cn(
          'bg-muted animate-pulse flex items-center justify-center',
          className
        )}
        style={{ aspectRatio }}
      >
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );

    // Error component
    const ErrorComponent = () => (
      <div 
        className={cn(
          'bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/25',
          className
        )}
        style={{ aspectRatio }}
      >
        <div className="text-center text-muted-foreground">
          <svg
            className="w-8 h-8 mx-auto mb-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs">Failed to load image</p>
        </div>
      </div>
    );

    if (hasError && !fallbackSrc) {
      return <ErrorComponent />;
    }

    if (!shouldLoad) {
      return (
        <div ref={imageRef}>
          <Placeholder />
        </div>
      );
    }

    return (
      <div ref={imageRef} className="relative">
        {!isLoaded && <Placeholder />}
        <Image
          ref={ref}
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={{
            aspectRatio,
            objectFit,
            ...props.style,
          }}
          loading={loading}
          quality={quality}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

// Avatar component with optimized image
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export const Avatar = React.memo<AvatarProps>(({ 
  src, 
  alt, 
  size = 'md', 
  fallback, 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const initials = fallback || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!src) {
    return (
      <div className={cn(
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium',
        sizeClasses[size],
        className
      )}>
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      aspectRatio="1"
      fallbackSrc={undefined}
      onError={() => {
        // Could set a state to show initials fallback
      }}
    />
  );
});

Avatar.displayName = 'Avatar';

// Gallery component with optimized images
interface GalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}

export const Gallery = React.memo<GalleryProps>(({ 
  images, 
  columns = 3, 
  gap = 4, 
  className 
}) => {
  return (
    <div 
      className={cn(
        'grid',
        `grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
    >
      {images.map((image, index) => (
        <div key={index} className="group cursor-pointer">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            className="w-full h-auto rounded-lg transition-transform group-hover:scale-105"
            aspectRatio="4/3"
          />
          {image.caption && (
            <p className="mt-2 text-sm text-muted-foreground text-center">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

Gallery.displayName = 'Gallery';

// Hero image component
interface HeroImageProps {
  src: string;
  alt: string;
  overlay?: boolean;
  overlayOpacity?: number;
  children?: React.ReactNode;
  className?: string;
  height?: string;
}

export const HeroImage = React.memo<HeroImageProps>(({ 
  src, 
  alt, 
  overlay = false, 
  overlayOpacity = 0.4, 
  children, 
  className,
  height = '400px'
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ height }}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        quality={85}
      />
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          {children}
        </div>
      )}
    </div>
  );
});

HeroImage.displayName = 'HeroImage';

// Utility function to generate blur data URL
export function generateBlurDataURL(width = 8, height = 8): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
}

// Image preloader utility
export function preloadImage(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

// Batch image preloader
export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(src => 
    preloadImage(src).catch(error => {
      console.warn('Failed to preload image:', src, error);
      // Return undefined instead of rejecting to allow other images to load
      return undefined;
    })
  )).then(results => results.filter(result => result !== undefined));
}