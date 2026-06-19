import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { updatePromoSchema, validatePromoSchema } from './schema.js';
import { applyPromoToSetupFee } from './service.js';
import * as svc from './service.js';

export async function promoRoutes(app: FastifyInstance) {
  // Public — validate a coupon code at /apply. Returns the discount + which
  // plans it applies to so the form can show the discounted setup fee.
  app.post('/promo/validate', async (request, reply) => {
    const { code } = validatePromoSchema.parse(request.body);
    const promo = await svc.validateCode(code);
    if (!promo) {
      return reply.status(404).send({ error: { code: 'INVALID_COUPON', message: '사용할 수 없는 쿠폰 코드입니다.' } });
    }
    return reply.send({
      data: {
        code: promo.code,
        label: promo.label,
        discountPercent: Number(promo.discount_percent) || 0,
        targetPlans: (promo.target_plans as string[]) || [],
        endsAt: promo.ends_at,
      },
    });
  });

  app.get('/admin/promo', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    const promo = await svc.getPromo();
    return reply.send({ data: promo });
  });

  app.put('/admin/promo', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = updatePromoSchema.parse(request.body);
    const promo = await svc.updatePromo(input);
    return reply.send({ data: promo });
  });
}

export { applyPromoToSetupFee };
