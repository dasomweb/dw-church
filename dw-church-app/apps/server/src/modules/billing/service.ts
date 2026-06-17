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

const MARKETING_ORIGIN = process.env.MARKETING_ORIGIN || 'https://truelight.app';

/**
 * Application checkout — the done-for-you payment path. Builds a Stripe Checkout
 * Session DYNAMICALLY from plan_pricing (the super-admin's single source of
 * truth), so NO products/prices need to be created in the Stripe dashboard.
 * One charge covers the recurring subscription + the one-time setup fee.
 * Used by the super-admin "결제 링크 자동 생성" on a 신청서.
 */
export async function createApplicationCheckout(
  applicationId: string,
  period: 'monthly' | 'yearly',
): Promise<{ url: string }> {
  requireStripe();
  const apps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM public.service_applications WHERE id = $1::uuid`,
    applicationId,
  );
  const appRow = apps[0];
  if (!appRow) throw new AppError('NOT_FOUND', 404, 'Application not found');

  const plan = (appRow.plan as string) || 'basic';
  const prices = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM public.plan_pricing WHERE plan_key = $1`,
    plan,
  );
  const p = prices[0];
  if (!p) throw new AppError('INVALID_PLAN', 400, `No pricing configured for plan: ${plan}`);

  const yearly = period === 'yearly';
  const perMonth = Number(yearly ? p.yearly : p.monthly); // $/month
  // Annual plan bills 12× the per-month-equivalent once a year.
  const recurringAmountCents = Math.round((yearly ? perMonth * 12 : perMonth) * 100);
  const setupCents = Math.round(Number(p.setup_fee) * 100);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `TRUE LIGHT ${p.label as string} (${yearly ? '연' : '월'} 구독)` },
        unit_amount: recurringAmountCents,
        recurring: { interval: yearly ? 'year' : 'month' },
      },
      quantity: 1,
    },
  ];
  if (setupCents > 0) {
    // One-time setup fee — billed on the first invoice alongside the subscription.
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: `TRUE LIGHT ${p.label as string} 셋업비 (1회)` },
        unit_amount: setupCents,
      },
      quantity: 1,
    });
  }

  const session = await requireStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: (appRow.email as string) || undefined,
    line_items: lineItems,
    success_url: `${MARKETING_ORIGIN}/apply?paid=1`,
    cancel_url: `${MARKETING_ORIGIN}/apply`,
    metadata: { applicationId, plan, period },
  });
  if (!session.url) throw new AppError('STRIPE_ERROR', 500, 'Failed to create checkout session');
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
      // Application-driven (done-for-you) checkout → mark the 신청서 paid so the
      // super admin can proceed to build the site.
      const applicationId = session.metadata?.applicationId;
      if (applicationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE public.service_applications SET status = 'paid', updated_at = NOW() WHERE id = $1::uuid`,
          applicationId,
        );
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

export interface BillingInfo {
  plan: string;
  isActive: boolean;
  hasStripeCustomer: boolean;
  subscription: {
    status: string;
    interval: 'month' | 'year' | null;
    amountCents: number;
    currency: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    productName: string | null;
  } | null;
  invoices: Array<{
    id: string;
    date: string;
    description: string;
    status: string;
    amountCents: number;
    currency: string;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
  }>;
}

/**
 * Combined billing info for the Billing page — current plan + recent invoices
 * in one round trip. Stripe API is the source of truth (DB just stores ids).
 */
export async function getBillingInfo(tenantId: string): Promise<BillingInfo> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      isActive: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!tenant) throw new AppError('NOT_FOUND', 404, 'Tenant not found');

  const out: BillingInfo = {
    plan: tenant.plan,
    isActive: tenant.isActive,
    hasStripeCustomer: !!tenant.stripeCustomerId,
    subscription: null,
    invoices: [],
  };

  if (!tenant.stripeCustomerId || !stripe) return out;

  // Subscription details
  if (tenant.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        tenant.stripeSubscriptionId as string,
        { expand: ['items.data.price.product'] },
      );
      const item = sub.items.data[0];
      const price = item?.price;
      const product = price?.product as Stripe.Product | undefined;
      out.subscription = {
        status: sub.status,
        interval: (price?.recurring?.interval as 'month' | 'year' | undefined) ?? null,
        amountCents: price?.unit_amount ?? 0,
        currency: (price?.currency ?? 'usd').toUpperCase(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        productName: product?.name ?? null,
      };
    } catch {
      // Subscription may have been deleted on Stripe — keep subscription = null
    }
  }

  // Recent invoices
  try {
    const invoices = await stripe.invoices.list({
      customer: tenant.stripeCustomerId as string,
      limit: 12,
    });
    out.invoices = invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      description: inv.lines.data[0]?.description ?? `Invoice ${inv.number ?? inv.id}`,
      status: inv.status ?? 'unknown',
      amountCents: inv.amount_paid || inv.amount_due || inv.total || 0,
      currency: (inv.currency ?? 'usd').toUpperCase(),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
    }));
  } catch {
    // Listing may fail; leave invoices empty
  }

  return out;
}
