/**
 * Email Performance Monitoring System
 * Tracks email delivery performance, identifies bottlenecks, and provides insights
 */

interface EmailMetrics {
  timestamp: number;
  email: string;
  templateName: string;
  renderTime: number;
  sendTime: number;
  totalTime: number;
  success: boolean;
  error?: string;
  attempt: number;
  fallbackUsed: boolean;
}

interface PerformanceStats {
  totalEmails: number;
  successfulEmails: number;
  failedEmails: number;
  averageRenderTime: number;
  averageSendTime: number;
  averageTotalTime: number;
  fallbackRate: number;
  errorTypes: Record<string, number>;
  slowEmails: EmailMetrics[];
}

class EmailPerformanceMonitor {
  private metrics: EmailMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 email metrics
  private readonly slowThreshold = 5000; // 5 seconds considered slow

  /**
   * Record email sending metrics
   */
  recordEmailMetrics(metrics: EmailMetrics): void {
    this.metrics.push(metrics);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log performance warnings
    this.checkPerformanceWarnings(metrics);
  }

  /**
   * Check for performance issues and log warnings
   */
  private checkPerformanceWarnings(metrics: EmailMetrics): void {
    const { totalTime, renderTime, sendTime, success, error, fallbackUsed } = metrics;

    // Slow email warning
    if (totalTime > this.slowThreshold) {
      console.warn(
        `⚠️ Slow email delivery: ${totalTime}ms (render: ${renderTime}ms, send: ${sendTime}ms) to ${metrics.email}`
      );
    }

    // Failure warning
    if (!success) {
      console.error(`❌ Email delivery failed to ${metrics.email}: ${error}`);
    }

    // Fallback usage warning
    if (fallbackUsed) {
      console.warn(`🔄 Fallback used for ${metrics.email} - enhanced template failed`);
    }

    // Render time warning (template issues)
    if (renderTime > 1000) {
      console.warn(`⚠️ Slow template rendering: ${renderTime}ms for ${metrics.templateName}`);
    }

    // Send time warning (SMTP issues)
    if (sendTime > 10000) {
      console.warn(`⚠️ Slow SMTP delivery: ${sendTime}ms to ${metrics.email}`);
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(timeRangeMinutes: number = 60): PerformanceStats {
    const cutoff = Date.now() - timeRangeMinutes * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalEmails: 0,
        successfulEmails: 0,
        failedEmails: 0,
        averageRenderTime: 0,
        averageSendTime: 0,
        averageTotalTime: 0,
        fallbackRate: 0,
        errorTypes: {},
        slowEmails: [],
      };
    }

    const successful = recentMetrics.filter(m => m.success);
    const failed = recentMetrics.filter(m => !m.success);
    const withFallback = recentMetrics.filter(m => m.fallbackUsed);
    const slowEmails = recentMetrics.filter(m => m.totalTime > this.slowThreshold);

    // Calculate averages
    const avgRenderTime = successful.reduce((sum, m) => sum + m.renderTime, 0) / successful.length || 0;
    const avgSendTime = successful.reduce((sum, m) => sum + m.sendTime, 0) / successful.length || 0;
    const avgTotalTime = successful.reduce((sum, m) => sum + m.totalTime, 0) / successful.length || 0;

    // Count error types
    const errorTypes: Record<string, number> = {};
    failed.forEach(m => {
      if (m.error) {
        const errorType = this.categorizeError(m.error);
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    });

    return {
      totalEmails: recentMetrics.length,
      successfulEmails: successful.length,
      failedEmails: failed.length,
      averageRenderTime: Math.round(avgRenderTime),
      averageSendTime: Math.round(avgSendTime),
      averageTotalTime: Math.round(avgTotalTime),
      fallbackRate: Math.round((withFallback.length / recentMetrics.length) * 100),
      errorTypes,
      slowEmails: slowEmails.slice(-10), // Last 10 slow emails
    };
  }

  /**
   * Categorize errors for better analysis
   */
  private categorizeError(error: string): string {
    if (error.includes('ETIMEDOUT') || error.includes('timeout')) return 'Timeout';
    if (error.includes('ECONNREFUSED')) return 'Connection Refused';
    if (error.includes('ENOTFOUND')) return 'DNS/Host Not Found';
    if (error.includes('Authentication')) return 'Authentication';
    if (error.includes('template')) return 'Template Error';
    if (error.includes('Invalid')) return 'Validation Error';
    return 'Other';
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRangeMinutes: number = 60): string {
    const stats = this.getPerformanceStats(timeRangeMinutes);
    
    if (stats.totalEmails === 0) {
      return '📊 No email metrics available for the specified time range.';
    }

    const successRate = Math.round((stats.successfulEmails / stats.totalEmails) * 100);
    
    let report = `📊 Email Performance Report (Last ${timeRangeMinutes} minutes)\n`;
    report += '=' .repeat(60) + '\n\n';
    
    report += `📈 Overall Statistics:\n`;
    report += `   • Total Emails: ${stats.totalEmails}\n`;
    report += `   • Success Rate: ${successRate}% (${stats.successfulEmails}/${stats.totalEmails})\n`;
    report += `   • Failed Emails: ${stats.failedEmails}\n`;
    report += `   • Fallback Usage: ${stats.fallbackRate}%\n\n`;
    
    report += `⏱️ Performance Metrics:\n`;
    report += `   • Average Render Time: ${stats.averageRenderTime}ms\n`;
    report += `   • Average Send Time: ${stats.averageSendTime}ms\n`;
    report += `   • Average Total Time: ${stats.averageTotalTime}ms\n\n`;
    
    if (Object.keys(stats.errorTypes).length > 0) {
      report += `❌ Error Breakdown:\n`;
      Object.entries(stats.errorTypes).forEach(([type, count]) => {
        report += `   • ${type}: ${count}\n`;
      });
      report += '\n';
    }
    
    if (stats.slowEmails.length > 0) {
      report += `🐌 Recent Slow Emails (>${this.slowThreshold}ms):\n`;
      stats.slowEmails.slice(-5).forEach(email => {
        report += `   • ${email.email}: ${email.totalTime}ms\n`;
      });
    }
    
    // Performance recommendations
    report += '\n💡 Recommendations:\n';
    if (stats.averageTotalTime > 3000) {
      report += '   • Email delivery is slow - check SMTP configuration\n';
    }
    if (stats.fallbackRate > 20) {
      report += '   • High fallback usage - check enhanced template system\n';
    }
    if (successRate < 95) {
      report += '   • Low success rate - investigate error patterns\n';
    }
    if (stats.averageRenderTime > 500) {
      report += '   • Slow template rendering - optimize templates\n';
    }
    
    return report;
  }

  /**
   * Get real-time performance status
   */
  getRealtimeStatus(): { status: 'healthy' | 'warning' | 'critical'; message: string } {
    const recentStats = this.getPerformanceStats(5); // Last 5 minutes
    
    if (recentStats.totalEmails === 0) {
      return { status: 'healthy', message: 'No recent email activity' };
    }
    
    const successRate = (recentStats.successfulEmails / recentStats.totalEmails) * 100;
    
    if (successRate < 80) {
      return { status: 'critical', message: `Low success rate: ${successRate.toFixed(1)}%` };
    }
    
    if (recentStats.averageTotalTime > 8000) {
      return { status: 'critical', message: `Very slow delivery: ${recentStats.averageTotalTime}ms avg` };
    }
    
    if (successRate < 95 || recentStats.averageTotalTime > 5000 || recentStats.fallbackRate > 30) {
      return { status: 'warning', message: 'Performance degraded - check logs' };
    }
    
    return { status: 'healthy', message: 'Email system performing well' };
  }
}

// Singleton instance
export const emailPerformanceMonitor = new EmailPerformanceMonitor();

// Export types for use in other modules
export type { EmailMetrics, PerformanceStats };
