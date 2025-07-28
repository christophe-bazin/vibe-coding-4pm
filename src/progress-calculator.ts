/**
 * Progress Calculator for Notion Vibe Coding
 * 
 * Calculates completion percentages and recommends status transitions
 * based on todo completion rates
 */

import { TodoStats } from './todo-manager.js';

export interface ProgressConfig {
  todoProgressionEnabled: boolean;
  autoProgressionThresholds: {
    inProgress: number;  // Percentage to trigger "In Progress"
    test: number;        // Percentage to trigger "Test"
  };
}

export interface ProgressRecommendation {
  currentStatus: string;
  recommendedStatus: string;
  shouldAutoProgress: boolean;
  reason: string;
  completionPercentage: number;
}

export class ProgressCalculator {
  private config: ProgressConfig;
  private validStatuses: string[];
  private transitions: Record<string, string[]>;

  constructor(
    config: ProgressConfig,
    validStatuses: string[],
    transitions: Record<string, string[]>
  ) {
    this.config = config;
    this.validStatuses = validStatuses;
    this.transitions = transitions;
  }

  /**
   * Calculate recommended status based on todo completion
   */
  calculateRecommendedStatus(
    currentStatus: string,
    todoStats: TodoStats
  ): ProgressRecommendation {
    const percentage = todoStats.percentage;
    
    if (!this.config.todoProgressionEnabled) {
      return {
        currentStatus,
        recommendedStatus: currentStatus,
        shouldAutoProgress: false,
        reason: "Todo progression is disabled in configuration",
        completionPercentage: percentage
      };
    }

    // Determine recommended status based on completion percentage
    const recommendedStatus = this.getRecommendedStatusByPercentage(
      currentStatus,
      percentage
    );

    const shouldAutoProgress = this.shouldAutoProgress(
      currentStatus,
      recommendedStatus
    );

    return {
      currentStatus,
      recommendedStatus,
      shouldAutoProgress,
      reason: this.getProgressionReason(currentStatus, recommendedStatus, percentage),
      completionPercentage: percentage
    };
  }

  /**
   * Get recommended status based on completion percentage
   */
  private getRecommendedStatusByPercentage(
    currentStatus: string,
    percentage: number
  ): string {
    // Special case: if no todos exist, maintain current status
    if (percentage === 0 && currentStatus !== "notStarted") {
      return currentStatus;
    }

    // Apply threshold rules
    if (percentage === 0) {
      return "notStarted";
    }

    if (percentage >= this.config.autoProgressionThresholds.test) {
      // 100% completion -> Test (never skip to Done)
      return "test";
    }

    if (percentage >= this.config.autoProgressionThresholds.inProgress) {
      // >0% completion -> In Progress
      return "inProgress";
    }

    // Default: maintain current status
    return currentStatus;
  }

  /**
   * Check if automatic progression should occur
   */
  private shouldAutoProgress(
    currentStatus: string,
    recommendedStatus: string
  ): boolean {
    // No change needed
    if (currentStatus === recommendedStatus) {
      return false;
    }

    // Check if transition is allowed
    const allowedTransitions = this.transitions[currentStatus] || [];
    if (!allowedTransitions.includes(recommendedStatus)) {
      return false;
    }

    // Never auto-progress to "Done" - always requires human validation
    if (recommendedStatus === "done") {
      return false;
    }

    return true;
  }

  /**
   * Get human-readable reason for progression recommendation
   */
  private getProgressionReason(
    currentStatus: string,
    recommendedStatus: string,
    percentage: number
  ): string {
    if (currentStatus === recommendedStatus) {
      return `Status remains "${currentStatus}" (${percentage}% complete)`;
    }

    if (recommendedStatus === "notStarted") {
      return `No todos completed yet (${percentage}%)`;
    }

    if (recommendedStatus === "inProgress") {
      return `Progress detected: ${percentage}% of todos completed`;
    }

    if (recommendedStatus === "test") {
      return `All todos completed (${percentage}%) - ready for testing`;
    }

    if (recommendedStatus === "done") {
      return `Task fully completed (${percentage}%) - requires human validation`;
    }

    return `Status change from "${currentStatus}" to "${recommendedStatus}" based on ${percentage}% completion`;
  }

  /**
   * Analyze todo distribution for insights
   */
  analyzeProgressDistribution(todoStats: TodoStats): {
    insights: string[];
    recommendations: string[];
    blockers: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const blockers: string[] = [];

    // Basic completion insights
    if (todoStats.total === 0) {
      insights.push("No todos found in this task");
      recommendations.push("Consider breaking down the task into actionable todos");
    } else {
      insights.push(`${todoStats.completed}/${todoStats.total} todos completed (${todoStats.percentage}%)`);
    }

    // Progress insights
    if (todoStats.percentage === 0 && todoStats.total > 0) {
      insights.push("Task not yet started");
      recommendations.push(`Begin with: ${todoStats.nextTodos.slice(0, 1).join('')}`);
    } else if (todoStats.percentage > 0 && todoStats.percentage < 50) {
      insights.push("Task in early progress");
      recommendations.push("Continue with next priority todos");
    } else if (todoStats.percentage >= 50 && todoStats.percentage < 100) {
      insights.push("Task more than halfway complete");
      recommendations.push("Focus on completing remaining todos");
    } else if (todoStats.percentage === 100) {
      insights.push("All todos completed");
      recommendations.push("Ready for testing and validation");
    }

    // Next actions
    if (todoStats.nextTodos.length > 0) {
      const nextCount = Math.min(3, todoStats.nextTodos.length);
      insights.push(`Next ${nextCount} todo(s): ${todoStats.nextTodos.slice(0, nextCount).join(', ')}`);
    }

    // Potential blockers
    if (todoStats.total > 10) {
      blockers.push("Large number of todos might indicate task complexity");
      recommendations.push("Consider breaking into smaller sub-tasks");
    }

    if (todoStats.percentage === 0 && todoStats.total > 5) {
      blockers.push("Many todos but no progress yet");
      recommendations.push("Start with the most critical or foundational todos");
    }

    return {
      insights,
      recommendations,
      blockers
    };
  }

  /**
   * Calculate velocity and estimated completion
   */
  calculateVelocityMetrics(
    todoStats: TodoStats,
    timeElapsed?: number // in hours
  ): {
    velocity?: number; // todos per hour
    estimatedCompletion?: number; // hours remaining
    trend: 'accelerating' | 'steady' | 'slowing' | 'unknown';
  } {
    if (!timeElapsed || timeElapsed <= 0) {
      return { trend: 'unknown' };
    }

    const velocity = todoStats.completed / timeElapsed;
    const remainingTodos = todoStats.total - todoStats.completed;
    const estimatedCompletion = velocity > 0 ? remainingTodos / velocity : undefined;

    // Simple trend analysis would require historical data
    // For now, return a basic assessment
    let trend: 'accelerating' | 'steady' | 'slowing' | 'unknown' = 'unknown';
    
    if (velocity > 1) {
      trend = 'accelerating';
    } else if (velocity > 0.5) {
      trend = 'steady';
    } else if (velocity > 0) {
      trend = 'slowing';
    }

    return {
      velocity,
      estimatedCompletion,
      trend
    };
  }

  /**
   * Generate progress summary for reporting
   */
  generateProgressSummary(
    currentStatus: string,
    todoStats: TodoStats,
    recommendation: ProgressRecommendation
  ): string {
    const lines: string[] = [];

    // Status and completion
    lines.push(`📊 **Task Status:** ${currentStatus}`);
    lines.push(`✅ **Progress:** ${todoStats.completed}/${todoStats.total} todos (${todoStats.percentage}%)`);

    // Recommendation
    if (recommendation.shouldAutoProgress) {
      lines.push(`🚀 **Recommended:** Auto-progress to "${recommendation.recommendedStatus}"`);
    } else if (recommendation.recommendedStatus !== currentStatus) {
      lines.push(`💡 **Suggested:** Consider moving to "${recommendation.recommendedStatus}"`);
    } else {
      lines.push(`✨ **Status:** No change needed`);
    }

    // Next actions
    if (todoStats.nextTodos.length > 0) {
      lines.push(`📋 **Next:** ${todoStats.nextTodos.slice(0, 2).join(', ')}`);
    }

    // Reason
    lines.push(`💬 **Reason:** ${recommendation.reason}`);

    return lines.join('\n');
  }
}