import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { checkoutInputSchema } from './schema.js';
import * as billingService from './service.js';

export default async function billingRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /billing/checkout
   * Creates a Stripe Checkout session for plan upgrade.
   * Requires authentication.
   */
  app.post('/checkout', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);

    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(400).send({
        error: { code: 'NO_TENANT', message: 'No tenant associated with this user' },
      });
    }

    const body = checkoutInputSchema.parse(request.body);
    const result = await billingService.createCheckoutSession(
      tenantId,
      body.plan,
      body.successUrl,
      body.cancelUrl,
    );

    return reply.send(result);
  });

  /**
   * POST /billing/webhook
   * Stripe webhook handler. No auth required — uses Stripe signature verification.
   */
  app.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string | undefined;
    if (!signature) {
      return reply.status(400).send({
        error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header' },
      });
    }

    const payload = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    await billingService.handleWebhook(payload, signature);

    return reply.send({ received: true });
  });

  /**
   * GET /billing/portal
   * Creates a Stripe Billing Portal session for managing the subscription.
   * Requires authentication.
   */
  app.get('/portal', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);

    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(400).send({
        error: { code: 'NO_TENANT', message: 'No tenant associated with this user' },
      });
    }

    const result = await billingService.createPortalSession(tenantId);
    return reply.send(result);
  });

  /**
   * GET /billing/status
   * Returns the current subscription status for the authenticated user's tenant.
   * Requires authentication.
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);

    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(400).send({
        error: { code: 'NO_TENANT', message: 'No tenant associated with this user' },
      });
    }

    const result = await billingService.getSubscriptionStatus(tenantId);
    return reply.send(result);
  });
}
