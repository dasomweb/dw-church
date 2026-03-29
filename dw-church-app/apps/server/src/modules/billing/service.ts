import Stripe from 'stripe';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const PLAN_PRICES: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
};

/**
 * Create a Stripe Checkout Session for a plan upgrade.
 */
function requireStripe(): Stripe {
  if (!stripe) throw new AppError('BILLING_NOT_CONFIGURED', 503, 'Stripe is not configured');
  return stripe;
}

export async function createCheckoutSession(
  tenantId: string,
  plan: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string }> {
  requireStripe();
  const priceId = PLAN_PRICES[plan];
  if (!priceId) {
    throw new AppError('INVALID_PLAN', 400, `Unknown plan: ${plan}`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  // Look up or create a Stripe customer for this tenant
  let stripeCustomerId = tenant.stripeCustomerId as string | null;

  if (!stripeCustomerId) {
    const customer = await requireStripe().customers.create({
      metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
      name: tenant.name,
    });
    stripeCustomerId = customer.id;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });
  }

  const session = await requireStripe().checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId, plan },
  });

  if (!session.url) {
    throw new AppError('STRIPE_ERROR', 500, 'Failed to create checkout session');
  }

  return { url: session.url };
}

/**
 * Handle incoming Stripe webhook events.
 */
export async function handleWebhook(
  payload: string | Buffer,
  signature: string,
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new AppError('CONFIG_ERROR', 500, 'Stripe webhook secret not configured');
  }

  let event: Stripe.Event;
  try {
    event = requireStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new AppError(
      'WEBHOOK_SIGNATURE_INVALID',
      400,
      `Webhook signature verification failed: ${(err as Error).message}`,
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      const plan = session.metadata?.plan;
      if (tenantId && plan) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan,
            stripeSubscriptionId: session.subscription as string,
          },
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { isActive: true },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      const status = subscription.status;
      await prisma.tenant.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          isActive: status === 'active' || status === 'trialing',
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      await prisma.tenant.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan: 'free', isActive: true },
      });
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }
}

/**
 * Create a Stripe Customer Portal session so the tenant can manage their subscription.
 */
export async function createPortalSession(
  tenantId: string,
  returnUrl?: string,
): Promise<{ url: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  const stripeCustomerId = tenant.stripeCustomerId as string | null;
  if (!stripeCustomerId) {
    throw new AppError(
      'NO_SUBSCRIPTION',
      400,
      'No billing account found. Please subscribe to a plan first.',
    );
  }

  const session = await requireStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });

  return { url: session.url };
}

/**
 * Get the current subscription status for a tenant.
 */
export async function getSubscriptionStatus(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      isActive: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!tenant) {
    throw new AppError('NOT_FOUND', 404, 'Tenant not found');
  }

  let subscriptionStatus: string | null = null;
  let currentPeriodEnd: string | null = null;

  if (tenant.stripeSubscriptionId) {
    try {
      const subscription = await requireStripe().subscriptions.retrieve(
        tenant.stripeSubscriptionId as string,
      );
      subscriptionStatus = subscription.status;
      currentPeriodEnd = new Date(
        subscription.current_period_end * 1000,
      ).toISOString();
    } catch {
      // Subscription may have been deleted
    }
  }

  return {
    tenantId: tenant.id,
    plan: tenant.plan,
    isActive: tenant.isActive,
    stripeCustomerId: tenant.stripeCustomerId,
    subscriptionStatus,
    currentPeriodEnd,
  };
}
