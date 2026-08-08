import "server-only";

/**
 * What the rest of the app imports when it needs the AI gate.
 *
 * A barrel rather than direct paths so every call site reads the same, and so
 * the repository underneath stays private: nothing outside this folder should
 * be able to move a counter without going through the plan check that comes
 * with it.
 */
export {
  getUserUsage,
  checkCoachLimit,
  checkFoodAnalysisLimit,
  checkAppearanceLimit,
  consumeCoachMessage,
  consumeFoodAnalysis,
  consumeAppearanceAnalysis,
  refundCoachMessage,
  refundFoodAnalysis,
  refundAppearanceAnalysis,
  resetMonthlyUsage,
  type UsageContext,
} from "@/features/usage/server/usage.service";
