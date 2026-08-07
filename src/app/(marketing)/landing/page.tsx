import { AiCoachSection } from "@/features/landing/components/ai-coach-section";
import { AiVisionSection } from "@/features/landing/components/ai-vision-section";
import { FaqSection } from "@/features/landing/components/faq-section";
import { FinalCtaSection } from "@/features/landing/components/final-cta-section";
import { HealthSystemSection } from "@/features/landing/components/health-system-section";
import { HeroSection } from "@/features/landing/components/hero-section";
import { HowItWorksSection } from "@/features/landing/components/how-it-works-section";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { PricingSection } from "@/features/landing/components/pricing-section";
import { ProblemSection } from "@/features/landing/components/problem-section";
import { ReportsSection } from "@/features/landing/components/reports-section";

/**
 * The NOVA landing page.
 *
 * A server component that composes the sections in narrative order: promise →
 * problem → mechanism → proof → price → objections → ask. Each section owns its
 * own client-side motion, so this file stays a table of contents.
 */
export default function LandingPage() {
  return (
    <main className="relative">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <AiCoachSection />
      <HealthSystemSection />
      <ReportsSection />
      <AiVisionSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
