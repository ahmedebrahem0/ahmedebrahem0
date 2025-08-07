import React, { useEffect, useState, useCallback } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// ===== WEB VITALS MONITORING =====

const WebVitalsMonitor = ({ 
  onMetric, 
  sendToAnalytics = true, 
  enableReporting = true,
  threshold = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 800
  }
}) => {
  const [metrics, setMetrics] = useState({});
  const [performanceScore, setPerformanceScore] = useState(0);

  const handleMetric = useCallback((metric) => {
    // Update local state
    setMetrics(prev => ({
      ...prev,
      [metric.name]: metric
    }));

    // Call custom handler
    if (onMetric) {
      onMetric(metric);
    }

    // Send to analytics
    if (sendToAnalytics && enableReporting) {
      // Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.value),
          event_label: metric.id,
          custom_map: {
            metric_rating: metric.rating
          }
        });
      }

      // Custom analytics endpoint
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          url: window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          } : null
        })
      }).catch(console.warn);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${metric.name}: ${metric.value} (${metric.rating})`, metric);
    }
  }, [onMetric, sendToAnalytics, enableReporting]);

  useEffect(() => {
    // Initialize Web Vitals monitoring
    getCLS(handleMetric);
    getFID(handleMetric);
    getFCP(handleMetric);
    getLCP(handleMetric);
    getTTFB(handleMetric);
  }, [handleMetric]);

  // Calculate overall performance score
  useEffect(() => {
    if (Object.keys(metrics).length === 0) return;

    const scores = {
      LCP: metrics.LCP ? (metrics.LCP.value <= threshold.LCP ? 100 : Math.max(0, 100 - (metrics.LCP.value - threshold.LCP) / 100)) : 0,
      FID: metrics.FID ? (metrics.FID.value <= threshold.FID ? 100 : Math.max(0, 100 - (metrics.FID.value - threshold.FID) * 2)) : 0,
      CLS: metrics.CLS ? (metrics.CLS.value <= threshold.CLS ? 100 : Math.max(0, 100 - (metrics.CLS.value - threshold.CLS) * 1000)) : 0,
      FCP: metrics.FCP ? (metrics.FCP.value <= threshold.FCP ? 100 : Math.max(0, 100 - (metrics.FCP.value - threshold.FCP) / 50)) : 0,
      TTFB: metrics.TTFB ? (metrics.TTFB.value <= threshold.TTFB ? 100 : Math.max(0, 100 - (metrics.TTFB.value - threshold.TTFB) / 20)) : 0,
    };

    const validScores = Object.values(scores).filter(score => score > 0);
    const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
    
    setPerformanceScore(Math.round(avgScore));
  }, [metrics, threshold]);

  return null; // This is a monitoring component, no UI needed
};

// ===== PERFORMANCE DASHBOARD COMPONENT =====

const PerformanceDashboard = ({ 
  showInDevelopment = true,
  position = 'bottom-right',
  minimal = false
}) => {
  const [metrics, setMetrics] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || showInDevelopment;

  const handleMetric = useCallback((metric) => {
    setMetrics(prev => ({
      ...prev,
      [metric.name]: metric
    }));
  }, []);

  const getMetricColor = (metric, thresholds) => {
    if (!metric) return 'text-gray-400';
    
    const value = metric.value;
    const good = thresholds.good;
    const poor = thresholds.poor;
    
    if (value <= good) return 'text-green-500';
    if (value <= poor) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatMetricValue = (metric, unit = 'ms') => {
    if (!metric) return '--';
    
    if (unit === 'ms') {
      return `${Math.round(metric.value)}ms`;
    } else if (unit === 'score') {
      return metric.value.toFixed(3);
    }
    
    return metric.value.toString();
  };

  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 }
  };

  if (!shouldShow) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <>
      <WebVitalsMonitor onMetric={handleMetric} />
      
      <div className={`fixed ${positionClasses[position]} z-50`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors mb-2"
          title="Performance Metrics"
        >
          📊
        </button>

        {/* Metrics Panel */}
        {isVisible && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Performance Metrics</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Overall Score */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className={`text-2xl font-bold ${performanceScore >= 90 ? 'text-green-500' : performanceScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {performanceScore}
                </div>
                <div className="text-sm text-gray-600">Performance Score</div>
              </div>
            </div>

            {/* Individual Metrics */}
            <div className="space-y-3">
              <MetricRow
                label="LCP"
                description="Largest Contentful Paint"
                value={formatMetricValue(metrics.LCP)}
                color={getMetricColor(metrics.LCP, thresholds.LCP)}
                threshold="< 2.5s"
              />
              
              <MetricRow
                label="FID"
                description="First Input Delay"
                value={formatMetricValue(metrics.FID)}
                color={getMetricColor(metrics.FID, thresholds.FID)}
                threshold="< 100ms"
              />
              
              <MetricRow
                label="CLS"
                description="Cumulative Layout Shift"
                value={formatMetricValue(metrics.CLS, 'score')}
                color={getMetricColor(metrics.CLS, thresholds.CLS)}
                threshold="< 0.1"
              />
              
              <MetricRow
                label="FCP"
                description="First Contentful Paint"
                value={formatMetricValue(metrics.FCP)}
                color={getMetricColor(metrics.FCP, thresholds.FCP)}
                threshold="< 1.8s"
              />
              
              <MetricRow
                label="TTFB"
                description="Time to First Byte"
                value={formatMetricValue(metrics.TTFB)}
                color={getMetricColor(metrics.TTFB, thresholds.TTFB)}
                threshold="< 800ms"
              />
            </div>

            {/* Additional Info */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <PerformanceInfo />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ===== METRIC ROW COMPONENT =====

const MetricRow = ({ label, description, value, color, threshold }) => (
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
      <div className="text-xs text-gray-400">Target: {threshold}</div>
    </div>
    <div className={`font-mono text-sm ${color}`}>
      {value}
    </div>
  </div>
);

// ===== PERFORMANCE INFO COMPONENT =====

const PerformanceInfo = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    // Network Information
    if (navigator.connection) {
      setNetworkInfo({
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      });
    }

    // Memory Information (Chrome only)
    if (performance.memory) {
      setMemoryInfo({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      });
    }
  }, []);

  const formatBytes = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="text-xs text-gray-600 space-y-1">
      {networkInfo && (
        <div>
          Network: {networkInfo.effectiveType} | 
          {networkInfo.downlink}Mbps | 
          {networkInfo.rtt}ms RTT
        </div>
      )}
      
      {memoryInfo && (
        <div>
          Memory: {formatBytes(memoryInfo.used)} / {formatBytes(memoryInfo.total)}
        </div>
      )}
      
      <div>
        User Agent: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
      </div>
    </div>
  );
};

// ===== PERFORMANCE REPORTER HOOK =====

export const usePerformanceReporting = (options = {}) => {
  const [metrics, setMetrics] = useState({});
  
  const {
    enableReporting = true,
    analyticsEndpoint = '/api/analytics/performance',
    sampleRate = 1.0 // Report 100% of sessions by default
  } = options;

  const reportMetric = useCallback((metric) => {
    setMetrics(prev => ({
      ...prev,
      [metric.name]: metric
    }));

    // Sample-based reporting
    if (Math.random() > sampleRate) return;

    if (enableReporting) {
      // Report to your analytics service
      fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metric,
          url: window.location.href,
          timestamp: Date.now(),
          sessionId: sessionStorage.getItem('session-id') || 'unknown'
        })
      }).catch(console.warn);
    }
  }, [enableReporting, analyticsEndpoint, sampleRate]);

  useEffect(() => {
    getCLS(reportMetric);
    getFID(reportMetric);
    getFCP(reportMetric);
    getLCP(reportMetric);
    getTTFB(reportMetric);
  }, [reportMetric]);

  return { metrics, reportMetric };
};

// ===== PERFORMANCE ALERT COMPONENT =====

export const PerformanceAlert = ({ threshold = 3000, metric = 'LCP' }) => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMetric, setAlertMetric] = useState(null);

  const handleMetric = useCallback((metricData) => {
    if (metricData.name === metric && metricData.value > threshold) {
      setAlertMetric(metricData);
      setShowAlert(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShowAlert(false), 5000);
    }
  }, [metric, threshold]);

  useEffect(() => {
    if (metric === 'LCP') getLCP(handleMetric);
    if (metric === 'FID') getFID(handleMetric);
    if (metric === 'CLS') getCLS(handleMetric);
    if (metric === 'FCP') getFCP(handleMetric);
    if (metric === 'TTFB') getTTFB(handleMetric);
  }, [handleMetric, metric]);

  if (!showAlert || !alertMetric) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-2">
        <span>⚠️</span>
        <span>
          {metric} is slow: {Math.round(alertMetric.value)}ms (target: &lt;{threshold}ms)
        </span>
        <button
          onClick={() => setShowAlert(false)}
          className="ml-2 text-red-200 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default WebVitalsMonitor;
export { PerformanceDashboard, usePerformanceReporting, PerformanceAlert };