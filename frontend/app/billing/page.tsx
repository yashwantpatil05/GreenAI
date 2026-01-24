"use client";

import { useEffect, useState } from "react";
import { Check, Zap, Building2, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/EmptyState";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  job_runs_limit: number;
  projects_limit: number;
  users_limit: number;
  overage_rate: number;
  features: string[];
};

type Usage = {
  job_runs: { used: number; limit: number; percentage: number };
  projects: { used: number; limit: number; percentage: number };
  users: { used: number; limit: number; percentage: number };
  subscription: { plan: string; status: string; started_at: string | null };
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  loading,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  onSelect: (planId: string) => void;
  loading: boolean;
}) {
  const isPro = plan.id === "pro";
  const isEnterprise = plan.id === "enterprise";

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all ${
        isPro
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border/60 bg-card"
      } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
            <Check className="h-3 w-3" /> Current Plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2">
          {plan.id === "starter" && <Zap className="h-5 w-5 text-amber-500" />}
          {plan.id === "pro" && <TrendingUp className="h-5 w-5 text-primary" />}
          {plan.id === "enterprise" && <Building2 className="h-5 w-5 text-purple-500" />}
          <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
        </div>
      </div>

      <div className="mb-6">
        {isEnterprise ? (
          <div className="text-3xl font-bold text-foreground">Custom</div>
        ) : (
          <>
            <span className="text-4xl font-bold text-foreground">{formatPrice(plan.price)}</span>
            <span className="text-muted-foreground">/month</span>
          </>
        )}
        {!isEnterprise && plan.overage_rate > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            + {formatPrice(plan.overage_rate)}/extra job run
          </p>
        )}
      </div>

      <ul className="mb-6 space-y-3">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan || loading}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
          isCurrentPlan
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : isPro
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "border border-border bg-background text-foreground hover:bg-accent"
        } disabled:opacity-50`}
        data-testid={`select-plan-${plan.id}`}
      >
        {isCurrentPlan ? "Current Plan" : isEnterprise ? "Contact Sales" : "Upgrade Now"}
      </button>
    </div>
  );
}

function UsageCard({
  title,
  used,
  limit,
  percentage,
  icon: Icon,
}: {
  title: string;
  used: number;
  limit: number;
  percentage: number;
  icon: any;
}) {
  const isOverLimit = limit > 0 && used > limit;
  const isNearLimit = percentage >= 80;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">
              {limit === -1 ? "Unlimited" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
            </div>
          </div>
        </div>
        {isOverLimit && (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        )}
      </div>

      {limit > 0 && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                isOverLimit
                  ? "bg-destructive"
                  : isNearLimit
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {percentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [plansRes, usageRes] = await Promise.all([
          apiFetch<{ plans: Plan[] }>("/billing/plans", {}, { token: token || undefined }),
          apiFetch<Usage>("/billing/usage", {}, { token: token || undefined }),
        ]);
        setPlans(plansRes.plans || []);
        setUsage(usageRes);
      } catch (e: any) {
        setError(e?.message || "Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const handleSelectPlan = async (planId: string) => {
    if (!token) return;

    if (planId === "enterprise") {
      window.open("mailto:sales@greenai.com?subject=Enterprise%20Plan%20Inquiry", "_blank");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create order
      const order = await apiFetch<{
        order_id: string;
        amount: number;
        currency: string;
        razorpay_key_id: string;
        plan: Plan;
      }>(
        "/billing/create-order",
        {
          method: "POST",
          body: JSON.stringify({ plan_id: planId }),
        },
        { token }
      );

      // Open Razorpay checkout
      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "GreenAI",
        description: `${order.plan.name} Plan Subscription`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            await apiFetch(
              "/billing/verify-payment",
              {
                method: "POST",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_id: planId,
                }),
              },
              { token }
            );

            // Reload usage data
            const newUsage = await apiFetch<Usage>("/billing/usage", {}, { token });
            setUsage(newUsage);
            alert("Subscription activated successfully!");
          } catch (e: any) {
            setError(e?.message || "Payment verification failed");
          }
        },
        prefill: {
          email: "",
        },
        theme: {
          color: "#10b981",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (e: any) {
      setError(e?.message || "Failed to initiate payment");
    } finally {
      setProcessing(false);
    }
  };

  if (!token) {
    return (
      <EmptyState
        title="You're not signed in"
        description="Sign in to manage your subscription and billing."
        actions={[{ label: "Go to Login", href: "/login" }]}
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription plan and monitor usage.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Current Usage */}
      {usage && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Current Usage</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <UsageCard
              title="Job Runs"
              used={usage.job_runs.used}
              limit={usage.job_runs.limit}
              percentage={usage.job_runs.percentage}
              icon={Zap}
            />
            <UsageCard
              title="Projects"
              used={usage.projects.used}
              limit={usage.projects.limit}
              percentage={usage.projects.percentage}
              icon={TrendingUp}
            />
            <UsageCard
              title="Team Members"
              used={usage.users.used}
              limit={usage.users.limit}
              percentage={usage.users.percentage}
              icon={Building2}
            />
          </div>
        </div>
      )}

      {/* Subscription Status */}
      {usage?.subscription && (
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current Plan</div>
              <div className="text-xl font-semibold text-foreground capitalize">
                {usage.subscription.plan || "Starter"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  usage.subscription.status === "active"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {usage.subscription.status || "Trial"}
              </span>
            </div>
            {usage.subscription.started_at && (
              <div>
                <div className="text-sm text-muted-foreground">Started</div>
                <div className="text-sm text-foreground">
                  {new Date(usage.subscription.started_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Choose Your Plan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={usage?.subscription?.plan === plan.id}
              onSelect={handleSelectPlan}
              loading={processing}
            />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <div className="font-medium text-foreground">What happens when I exceed my limits?</div>
            <div className="mt-1 text-sm text-muted-foreground">
              You'll be charged overage fees based on your plan's overage rate. You can upgrade anytime to avoid overage charges.
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground">Can I downgrade my plan?</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Yes, you can downgrade at any time. Changes take effect at the start of your next billing cycle.
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground">Do you offer refunds?</div>
            <div className="mt-1 text-sm text-muted-foreground">
              We offer a 14-day money-back guarantee for all new subscriptions. Contact support for assistance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
