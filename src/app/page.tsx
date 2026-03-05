import Link from "next/link";
import { Heart, MessageSquare, Shield, Bell, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">CheckMate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Peace of mind for your
            <span className="text-teal-600"> loved ones</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            CheckMate uses AI-powered daily check-ins via SMS to keep your elderly
            family members connected, safe, and cared for — no app download required.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg">
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              How CheckMate works
            </h2>
            <p className="mt-4 text-gray-600">
              Simple, warm, and effective check-ins for your family
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" id="how-it-works">
            <FeatureCard
              icon={MessageSquare}
              title="Daily SMS Check-ins"
              description="Your elder receives a friendly text message at their preferred time. No apps to download or learn."
            />
            <FeatureCard
              icon={Heart}
              title="AI-Powered Conversations"
              description="Our AI engages warmly, asks about their day, and understands their responses with empathy."
            />
            <FeatureCard
              icon={Shield}
              title="Smart Detection"
              description="AI analyzes responses for concerning patterns — mood changes, health keywords, missed check-ins."
            />
            <FeatureCard
              icon={Bell}
              title="Instant Alerts"
              description="Family members get immediate notifications when something needs attention. Never miss a concern."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="mt-4 text-gray-600">
              Start with a free trial. No credit card required.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
            <PricingCard
              name="Basic"
              price="$9.99"
              description="Perfect for one elder"
              features={[
                "1 elder check-in",
                "Daily SMS check-ins",
                "AI conversation analysis",
                "Family dashboard",
                "Email escalation alerts",
              ]}
            />
            <PricingCard
              name="Premium"
              price="$24.99"
              description="For the whole family"
              features={[
                "Up to 5 elder check-ins",
                "Twice daily check-ins",
                "Priority AI analysis",
                "SMS + email alerts",
                "Daily summary reports",
                "Custom check-in questions",
              ]}
              highlighted
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CheckMate</span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} CheckMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
        <Icon className="h-6 w-6 text-teal-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-8 ${
        highlighted
          ? "border-teal-200 bg-teal-50 ring-2 ring-teal-600"
          : "border-gray-200 bg-white"
      }`}
    >
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <p className="mt-4">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-500">/month</span>
      </p>
      <Link href="/signup">
        <Button
          className="mt-6 w-full"
          variant={highlighted ? "default" : "outline"}
        >
          Start free trial
        </Button>
      </Link>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
