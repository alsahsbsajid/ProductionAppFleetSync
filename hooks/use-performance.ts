'use client';
import React, { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';

// Performance metrics interface
interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  renderTime?: number;
  apiResponseTime?: number;
  cacheHitRate?: number;
  memoryUsage?: number;
  
  // Component metrics
  componentLoadTime?: number;
  hydrationTime?: number;
}

// Performance observer for Core Web Vitals
function observeWebVitals(callback: (metric: any) => void) {
  if (typeof window === 'undefined') return;

  // Observe LCP
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        callback({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: lastEntry.startTime > 4000 ? 'poor' : lastEntry.startTime > 2500 ? 'needs-improvement' : 'good'
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          callback({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: (entry.processingStart - entry.startTime) > 300 ? 'poor' : 
                   (entry.processingStart - entry.startTime) > 100 ? 'needs-improvement' : 'good'
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        callback({
          name: 'CLS',
          value: clsValue,
          rating: clsValue > 0.25 ? 'poor' : clsValue > 0.1 ? 'needs-improvement' : 'good'
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }
}

// Memory usage monitoring
function getMemoryUsage() {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
    const memory = (window.performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }
  return null;
}

// Main performance hook
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Increment render count
  renderCountRef.current += 1;

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return () => {};
    
    setIsMonitoring(true);
    startTimeRef.current = performance.now();

    // Start Web Vitals observation
    observeWebVitals((metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value
      }));
    });

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      const memoryInfo = getMemoryUsage();
      if (memoryInfo) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryInfo.percentage
        }));
      }
    }, 5000);

    // Monitor FCP
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({
                ...prev,
                fcp: entry.startTime
              }));
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP observer failed:', error);
      }
    }

    return () => {
      clearInterval(memoryInterval);
      setIsMonitoring(false);
    };
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Measure component render time
  const measureRenderTime = useCallback((componentName: string) => {
    const renderTime = performance.now() - startTimeRef.current;
    setMetrics(prev => ({
      ...prev,
      renderTime,
      componentLoadTime: renderTime
    }));
    console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
  }, []);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    const { lcp, fid, cls, fcp } = metrics;
    
    if (!lcp && !fid && !cls && !fcp) return null;
    
    let score = 100;
    
    // LCP scoring (0-40 points)
    if (lcp) {
      if (lcp > 4000) score -= 40;
      else if (lcp > 2500) score -= 20;
    }
    
    // FID scoring (0-30 points)
    if (fid) {
      if (fid > 300) score -= 30;
      else if (fid > 100) score -= 15;
    }
    
    // CLS scoring (0-20 points)
    if (cls) {
      if (cls > 0.25) score -= 20;
      else if (cls > 0.1) score -= 10;
    }
    
    // FCP scoring (0-10 points)
    if (fcp) {
      if (fcp > 3000) score -= 10;
      else if (fcp > 1800) score -= 5;
    }
    
    return Math.max(0, score);
  }, [metrics]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes and improving server response times');
    }
    
    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }
    
    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Improve Cumulative Layout Shift by setting dimensions for images and ads');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 80) {
      recommendations.push('High memory usage detected - consider optimizing component re-renders');
    }
    
    if (metrics.cacheHitRate && metrics.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }
    
    return recommendations;
  }, [metrics]);

  // Auto-start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    measureRenderTime,
    getPerformanceScore,
    getRecommendations,
    renderCount: renderCountRef.current
  };
}

// Performance context for sharing metrics across components
interface PerformanceContextType {
  metrics: PerformanceMetrics;
  isMonitoring: boolean;
  getPerformanceScore: () => number | null;
  getRecommendations: () => string[];
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const performance = usePerformance();
  
  const contextValue: PerformanceContextType = {
    metrics: performance.metrics,
    isMonitoring: performance.isMonitoring,
    getPerformanceScore: performance.getPerformanceScore,
    getRecommendations: performance.getRecommendations
  };
  
  return React.createElement(
    PerformanceContext.Provider,
    { value: contextValue },
    children
  )
}

export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
}

// Performance monitoring component
export function PerformanceMonitor({ 
  showDetails = false,
  className 
}: { 
  showDetails?: boolean;
  className?: string;
}) {
  const { metrics, getPerformanceScore, getRecommendations } = usePerformance();
  
  if (!showDetails) return null;
  
  const score = getPerformanceScore();
  const recommendations = getRecommendations();
  
  return React.createElement('div', {
    className: `fixed bottom-4 right-4 bg-card border rounded-lg p-4 shadow-lg z-50 max-w-sm ${className || ''}`
  }, [
    React.createElement('h3', { key: 'title', className: 'font-semibold mb-2' }, 'Performance Monitor'),
    
    score !== null && React.createElement('div', { key: 'score', className: 'mb-2' }, [
      React.createElement('span', { key: 'label', className: 'text-sm font-medium' }, 'Score: '),
      React.createElement('span', {
        key: 'value',
        className: `font-bold ${
          score >= 90 ? 'text-green-600' :
          score >= 70 ? 'text-yellow-600' : 'text-red-600'
        }`
      }, `${score}/100`)
    ]),
    
    React.createElement('div', { key: 'metrics', className: 'space-y-1 text-xs' }, [
      metrics.lcp && React.createElement('div', { key: 'lcp' }, `LCP: ${metrics.lcp.toFixed(0)}ms`),
      metrics.fid && React.createElement('div', { key: 'fid' }, `FID: ${metrics.fid.toFixed(0)}ms`),
      metrics.cls && React.createElement('div', { key: 'cls' }, `CLS: ${metrics.cls.toFixed(3)}`),
      metrics.cacheHitRate && React.createElement('div', { key: 'cache' }, `Cache Hit: ${metrics.cacheHitRate.toFixed(1)}%`),
      metrics.memoryUsage && React.createElement('div', { key: 'memory' }, `Memory: ${metrics.memoryUsage.toFixed(1)}%`)
    ].filter(Boolean)),
    
    recommendations.length > 0 && React.createElement('div', { key: 'recommendations', className: 'mt-2 pt-2 border-t' }, [
      React.createElement('div', { key: 'rec-title', className: 'text-xs font-medium mb-1' }, 'Recommendations:'),
      React.createElement('ul', { key: 'rec-list', className: 'text-xs space-y-1' },
        recommendations.slice(0, 2).map((rec, i) => 
          React.createElement('li', { key: i, className: 'text-muted-foreground' }, `• ${rec}`)
        )
      )
    ])
  ].filter(Boolean));
}