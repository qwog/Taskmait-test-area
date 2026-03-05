import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      return NextResponse.json(
        { error: "Invalid Stripe signature" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!customerId) break;

        // Retrieve the subscription to get the plan
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = mapPriceToPlan(priceId);

        await supabase
          .from("families")
          .update({
            stripe_customer_id: customerId,
            subscription_status: "active",
            subscription_plan: plan,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = mapStripeStatus(subscription.status);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = mapPriceToPlan(priceId);

        await supabase
          .from("families")
          .update({
            subscription_status: status,
            subscription_plan: plan,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("families")
          .update({
            subscription_status: "canceled",
            subscription_plan: "none",
          })
          .eq("stripe_customer_id", customerId);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapStripeStatus(
  stripeStatus: string
): "active" | "trialing" | "past_due" | "canceled" | "none" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

function mapPriceToPlan(priceId: string): "basic" | "premium" | "none" {
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID;

  if (priceId === premiumPriceId) return "premium";
  if (priceId === basicPriceId) return "basic";
  return "basic";
}
