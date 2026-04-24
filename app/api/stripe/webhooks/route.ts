import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Stripe needs the raw body to verify the signature.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 500 });
  }
  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createServiceSupabase();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tier = (sub.items.data[0]?.price.lookup_key ?? "solo").toLowerCase();
      await admin
        .from("organizations")
        .update({
          subscription_tier: tier,
          subscription_status: sub.status,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await admin
        .from("organizations")
        .update({
          subscription_status: "canceled",
          subscription_tier: "trial",
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      // Reset period counter at billing boundary.
      await admin
        .from("organizations")
        .update({ pours_this_period: 0 })
        .eq("stripe_customer_id", inv.customer as string);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
