import Stripe from 'stripe';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { sendEmail } from '../../config/email.js';
import { addonFeatures } from '../../config/plan-limits.js';

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
  // Apply a coupon to the one-time setup fee when the application carries a code
  // that is still valid (active + in window + targets this plan).
  let setupFee = Number(p.setup_fee);
  const couponCode = (appRow.coupon_code as string) || '';
  if (couponCode) {
    const { validateCode, applyPromoToSetupFee } = await import('../promo/service.js');
    const promo = await validateCode(couponCode);
    if (promo) setupFee = applyPromoToSetupFee(setupFee, plan, promo);
  }
  const setupCents = Math.round(setupFee * 100);

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
      // Application-driven (done-for-you) checkout → mark the 신청서 paid, then
      // AUTO-PROVISION the tenant + owner (b2bsmart-style) and email the owner
      // their first-login credentials. Idempotent (skips if already linked) and
      // best-effort (a provisioning failure leaves status='paid' for the super
      // admin to create the tenant manually — the webhook still returns 200).
      const applicationId = session.metadata?.applicationId;
      if (applicationId) {
        await prisma.$executeRawUnsafe(
          `UPDATE public.service_applications SET status = 'paid', updated_at = NOW() WHERE id = $1::uuid`,
          applicationId,
        );
        try {
          const apps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM public.service_applications WHERE id = $1::uuid`,
            applicationId,
          );
          const appRow = apps[0];
          if (appRow && !appRow.tenant_slug) {
            const { provisionTenantFromApplication } = await import('../tenants/service.js');
            const { slug, tempPassword, ownerEmail, tenant } = await provisionTenantFromApplication(appRow);
            // Attach the Stripe IDs so invoice/subscription webhooks find the tenant.
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: {
                stripeSubscriptionId: (session.subscription as string) ?? undefined,
                stripeCustomerId: (session.customer as string) ?? undefined,
              },
            }).catch(() => { /* non-fatal */ });
            await prisma.$executeRawUnsafe(
              `UPDATE public.service_applications SET status = 'converted', tenant_slug = $2, updated_at = NOW() WHERE id = $1::uuid`,
              applicationId,
              slug,
            );
            if (ownerEmail) {
              const loginUrl = `https://admin.truelight.app/t/${slug}/login`;
              const churchName = (appRow.church_name as string) || 'True Light';
              await sendEmail({
                to: ownerEmail,
                from: 'order',
                subject: `[TRUE LIGHT] ${churchName} 관리자 계정이 준비되었습니다`,
                html: `
                  <div style="font-family:Pretendard,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6">
                    <h2 style="color:#2563eb">가입이 완료되었습니다 🎉</h2>
                    <p><strong>${churchName}</strong> 님, 결제가 확인되어 관리자 계정이 생성되었습니다.<br/>아래 정보로 로그인하신 뒤 비밀번호를 변경해 주세요.</p>
                    <table style="margin:16px 0;font-size:14px">
                      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">로그인 주소</td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>
                      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">이메일</td><td>${ownerEmail}</td></tr>
                      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">임시 비밀번호</td><td style="font-family:monospace;font-weight:700">${tempPassword}</td></tr>
                    </table>
                    <p style="font-size:13px;color:#6b7280">로그인 후 <strong>초기 셋업</strong>에서 교회 정보를 입력해 주시면, 저희가 사이트를 제작해 오픈해 드립니다.</p>
                  </div>`,
              }).catch((err) => console.error('[email] owner welcome failed:', err));
            }
          }
        } catch (err) {
          console.error('[webhook] tenant auto-provision failed (left as paid for manual handling):', err);
        }
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
 * Sync a tenant's billable add-ons (features enabled ABOVE its plan) onto its
 * Stripe subscription as extra recurring subscription items. Reconciles: creates
 * items for newly-added add-ons, removes items for dropped ones. Add-on items are
 * tagged with metadata.dw_addon_feature so Stripe itself is the source of truth
 * (no extra table). Prorates immediately (this runs only on an explicit
 * super-admin "청구 반영" click, never on a toggle).
 *
 * Tenants WITHOUT an active Stripe subscription are display-only: returns
 * { synced:false, reason:'no_subscription' } and touches nothing (manual invoice).
 */
export interface AddonSyncResult {
  synced: boolean;
  reason?: string;
  interval?: 'month' | 'year';
  added: string[];
  removed: string[];
  active: { key: string; label: string; amountCents: number }[];
}

export async function syncTenantAddons(tenantId: string): Promise<AddonSyncResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, stripeSubscriptionId: true },
  });
  if (!tenant) throw new AppError('NOT_FOUND', 404, 'Tenant not found');

  const ovRows = await prisma.$queryRawUnsafe<{ feature_overrides: Record<string, unknown> | null }[]>(
    `SELECT feature_overrides FROM public.tenants WHERE id = $1::uuid`,
    tenantId,
  );
  const overrides = ovRows[0]?.feature_overrides ?? {};
  const desiredKeys = addonFeatures(tenant.plan, overrides);

  // à-la-carte prices for the desired add-ons.
  const priceRows = await prisma.$queryRawUnsafe<{ feature_key: string; label: string; monthly: number; yearly: number; is_active: boolean }[]>(
    `SELECT feature_key, label, monthly, yearly, is_active FROM public.feature_pricing`,
  );
  const priceByKey = new Map(priceRows.filter((r) => r.is_active).map((r) => [r.feature_key, r]));

  const empty: AddonSyncResult = { synced: false, added: [], removed: [], active: [] };
  if (!tenant.stripeSubscriptionId) return { ...empty, reason: 'no_subscription' };

  const s = requireStripe();
  let sub: Stripe.Subscription;
  try {
    sub = await s.subscriptions.retrieve(tenant.stripeSubscriptionId, { expand: ['items.data.price'] });
  } catch {
    return { ...empty, reason: 'subscription_missing' };
  }
  if (sub.status !== 'active' && sub.status !== 'trialing' && sub.status !== 'past_due') {
    return { ...empty, reason: `subscription_${sub.status}` };
  }

  // Base plan interval — the item WITHOUT our add-on tag drives month vs year.
  const baseItem = sub.items.data.find((i) => !i.metadata?.dw_addon_feature);
  const interval = (baseItem?.price?.recurring?.interval as 'month' | 'year' | undefined) ?? 'month';
  const existingAddons = sub.items.data.filter((i) => i.metadata?.dw_addon_feature);
  const existingByKey = new Map(existingAddons.map((i) => [i.metadata!.dw_addon_feature as string, i]));

  const added: string[] = [];
  const removed: string[] = [];

  // Add newly-desired add-ons.
  for (const key of desiredKeys) {
    if (existingByKey.has(key)) continue;
    const price = priceByKey.get(key);
    if (!price) continue; // no active price → skip (nothing to charge)
    // yearly price is $/month-equivalent, billed 12× on an annual sub.
    const perMonth = interval === 'year' ? Number(price.yearly) : Number(price.monthly);
    const unitAmount = Math.round((interval === 'year' ? perMonth * 12 : perMonth) * 100);
    if (unitAmount <= 0) continue;
    // Subscription-item price_data can't inline product_data (unlike Checkout), so
    // mint a Price (with an inline product) first, then attach it to the sub.
    const stripePrice = await s.prices.create({
      currency: 'usd',
      unit_amount: unitAmount,
      recurring: { interval },
      product_data: { name: `애드온: ${price.label}` },
    });
    await s.subscriptionItems.create({
      subscription: sub.id,
      price: stripePrice.id,
      quantity: 1,
      metadata: { dw_addon_feature: key },
      proration_behavior: 'create_prorations',
    });
    added.push(key);
  }

  // Remove add-ons no longer desired.
  const desiredSet = new Set(desiredKeys);
  for (const item of existingAddons) {
    const key = item.metadata!.dw_addon_feature as string;
    if (desiredSet.has(key)) continue;
    await s.subscriptionItems.del(item.id, { proration_behavior: 'create_prorations' });
    removed.push(key);
  }

  const active = desiredKeys
    .map((key) => {
      const price = priceByKey.get(key);
      if (!price) return null;
      const perMonth = interval === 'year' ? Number(price.yearly) : Number(price.monthly);
      return { key, label: price.label, amountCents: Math.round((interval === 'year' ? perMonth * 12 : perMonth) * 100) };
    })
    .filter((x): x is { key: string; label: string; amountCents: number } => x !== null);

  return { synced: true, interval, added, removed, active };
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
