// Security audit and logging utilities for OTP system
// Ensures comprehensive logging without exposing sensitive data

import Redis from 'ioredis';
import { getRedis } from './redis';

// Security event types
export enum SecurityEventType {
  OTP_GENERATED = 'otp_generated',
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',
  OTP_FAILED = 'otp_failed',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  IP_BLOCKED = 'ip_blocked',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  email: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Security audit logger
export class SecurityAuditLogger {
  private redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = getRedis(redisUrl);
  }

  // Log security event (never logs actual OTP values)
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Create sanitized log entry
      const logEntry = {
        ...event,
        timestamp: event.timestamp.toISOString(),
        // Never log sensitive data
        sanitized: true,
      };

      // Store in Redis with expiry (30 days)
      const key = `security_log:${event.type}:${Date.now()}:${Math.random()
        .toString(36)
        .substring(2, 11)}`;
      await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(logEntry));

      // Console log for development (sanitized)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 Security Event [${event.severity.toUpperCase()}]:`, {
          type: event.type,
          email: this.maskEmail(event.email),
          ip: this.maskIP(event.ip),
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata,
        });
      }

      // Alert on high severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.alertHighSeverityEvent(event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // OTP generation event (never logs actual OTP)
  async logOTPGenerated(email: string, ip: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.OTP_GENERATED,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'low',
      metadata: {
        action: 'generate',
      },
    });
  }

  // OTP sent event
  async logOTPSent(
    email: string,
    ip: string,
    userAgent?: string,
    method: string = 'email'
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.OTP_SENT,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'low',
      metadata: {
        method,
        action: 'send',
      },
    });
  }

  // OTP verification success
  async logOTPVerified(email: string, ip: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.OTP_VERIFIED,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'low',
      metadata: {
        action: 'verify_success',
      },
    });
  }

  // OTP verification failure
  async logOTPFailed(
    email: string,
    ip: string,
    userAgent?: string,
    reason: string = 'invalid'
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.OTP_FAILED,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'medium',
      metadata: {
        reason,
        action: 'verify_failed',
      },
    });
  }

  // Rate limit hit
  async logRateLimitHit(
    email: string,
    ip: string,
    userAgent?: string,
    limitType: string = 'email'
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.RATE_LIMIT_HIT,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'medium',
      metadata: {
        limitType,
        action: 'rate_limit',
      },
    });
  }

  // Account locked
  async logAccountLocked(
    email: string,
    ip: string,
    userAgent?: string,
    reason: string = 'max_attempts'
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.ACCOUNT_LOCKED,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'high',
      metadata: {
        reason,
        action: 'lock_account',
      },
    });
  }

  // Suspicious activity detection
  async logSuspiciousActivity(
    email: string,
    ip: string,
    userAgent?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'high',
      metadata: {
        ...details,
        action: 'suspicious',
      },
    });
  }

  // IP blocked
  async logIPBlocked(ip: string, reason: string = 'rate_limit', userAgent?: string): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.IP_BLOCKED,
      email: 'system',
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'high',
      metadata: {
        reason,
        action: 'block_ip',
      },
    });
  }

  // Brute force attempt
  async logBruteForceAttempt(
    email: string,
    ip: string,
    userAgent?: string,
    attemptCount: number = 1
  ): Promise<void> {
    await this.logEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: attemptCount > 5 ? 'critical' : 'high',
      metadata: {
        attemptCount,
        action: 'brute_force',
      },
    });
  }

  // Get security events for analysis
  async getSecurityEvents(
    type?: SecurityEventType,
    email?: string,
    ip?: string,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    try {
      const pattern = type ? `security_log:${type}:*` : 'security_log:*';
      const keys = await this.redis.keys(pattern);

      const events: SecurityEvent[] = [];

      for (const key of keys.slice(0, limit)) {
        const data = await this.redis.get(key);
        if (data) {
          const event = JSON.parse(data);

          // Filter by email or IP if specified
          if (email && event.email !== email) continue;
          if (ip && event.ip !== ip) continue;

          events.push(event);
        }
      }

      // Sort by timestamp (newest first)
      return events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  // Analyze security patterns
  async analyzeSecurityPatterns(
    email: string,
    timeWindowMinutes: number = 60
  ): Promise<{
    riskScore: number;
    patterns: string[];
    recommendations: string[];
  }> {
    try {
      const events = await this.getSecurityEvents(undefined, email);
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

      const recentEvents = events.filter(event => new Date(event.timestamp) > cutoffTime);

      let riskScore = 0;
      const patterns: string[] = [];
      const recommendations: string[] = [];

      // Analyze patterns
      const failedAttempts = recentEvents.filter(
        e => e.type === SecurityEventType.OTP_FAILED
      ).length;
      const rateLimitHits = recentEvents.filter(
        e => e.type === SecurityEventType.RATE_LIMIT_HIT
      ).length;
      const suspiciousActivities = recentEvents.filter(
        e => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY
      ).length;

      // Calculate risk score
      riskScore += failedAttempts * 10;
      riskScore += rateLimitHits * 20;
      riskScore += suspiciousActivities * 30;

      // Identify patterns
      if (failedAttempts > 3) {
        patterns.push('Multiple failed OTP attempts');
        recommendations.push('Consider implementing additional verification steps');
      }

      if (rateLimitHits > 0) {
        patterns.push('Rate limiting triggered');
        recommendations.push('Monitor for automated attacks');
      }

      if (suspiciousActivities > 0) {
        patterns.push('Suspicious activity detected');
        recommendations.push('Review account activity and consider manual verification');
      }

      return {
        riskScore: Math.min(riskScore, 100), // Cap at 100
        patterns,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to analyze security patterns:', error);
      return {
        riskScore: 0,
        patterns: [],
        recommendations: [],
      };
    }
  }

  // Private utility methods
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  }

  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***.`;
    }
    return ip.substring(0, 8) + '***';
  }

  private async alertHighSeverityEvent(event: SecurityEvent): Promise<void> {
    // In production, this would send alerts to monitoring systems
    console.warn(`🚨 HIGH SEVERITY SECURITY EVENT:`, {
      type: event.type,
      email: this.maskEmail(event.email),
      ip: this.maskIP(event.ip),
      severity: event.severity,
      timestamp: event.timestamp.toISOString(),
    });

    // Store high-severity events in a separate key for immediate attention
    const alertKey = `security_alert:${event.type}:${Date.now()}`;
    await this.redis.setex(
      alertKey,
      7 * 24 * 60 * 60,
      JSON.stringify({
        ...event,
        alerted: true,
        timestamp: event.timestamp.toISOString(),
      })
    );
  }
}

// Singleton instance
export const securityAudit = new SecurityAuditLogger();
