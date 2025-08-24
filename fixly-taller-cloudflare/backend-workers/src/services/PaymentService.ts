import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

interface PaymentData {
  amount: number;
  description: string;
  email: string;
  workshopId: string;
  planType: 'pro' | 'enterprise';
}

interface Env {
  MERCADOPAGO_ACCESS_TOKEN: string;
  MERCADOPAGO_PUBLIC_KEY: string;
  DB: D1Database;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor(private env: Env) {
    this.client = new MercadoPagoConfig({
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: 'abc'
      }
    });
  }

  // Crear preferencia de pago para Argentina
  async createPaymentPreference(data: PaymentData) {
    try {
      const preference = new Preference(this.client);

      const preferenceData = {
        items: [
          {
            id: `fixly-${data.planType}`,
            title: `Fixly Taller - Plan ${data.planType.toUpperCase()}`,
            description: data.description,
            quantity: 1,
            unit_price: data.amount,
            currency_id: 'ARS' // Pesos argentinos
          }
        ],
        payer: {
          email: data.email
        },
        back_urls: {
          success: 'https://fixly-taller.com/payment/success',
          failure: 'https://fixly-taller.com/payment/failure',
          pending: 'https://fixly-taller.com/payment/pending'
        },
        auto_return: 'approved',
        notification_url: 'https://api.fixly-taller.com/api/webhooks/mercadopago',
        external_reference: data.workshopId,
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12 // Hasta 12 cuotas
        },
        metadata: {
          workshop_id: data.workshopId,
          plan_type: data.planType
        }
      };

      const result = await preference.create({
        body: preferenceData
      });

      // Guardar en base de datos
      await this.savePendingPayment(data.workshopId, result.id, data.amount, data.planType);

      return {
        preferenceId: result.id,
        initUrl: result.init_point,
        sandboxUrl: result.sandbox_init_point
      };

    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      throw new Error('No se pudo crear la preferencia de pago');
    }
  }

  // Verificar pago por ID
  async verifyPayment(paymentId: string) {
    try {
      const payment = new Payment(this.client);
      const result = await payment.get({ id: paymentId });

      return {
        id: result.id,
        status: result.status,
        statusDetail: result.status_detail,
        amount: result.transaction_amount,
        currency: result.currency_id,
        externalReference: result.external_reference,
        payerEmail: result.payer?.email,
        paymentMethod: result.payment_method_id,
        installments: result.installments
      };

    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new Error('No se pudo verificar el pago');
    }
  }

  // Manejar webhook de MercadoPago
  async handleWebhook(webhookData: any, headers: any, env: Env) {
    const { type, data } = webhookData;

    if (type === 'payment') {
      const paymentId = data.id;
      const paymentInfo = await this.verifyPayment(paymentId);

      if (paymentInfo.status === 'approved') {
        // Activar suscripción
        await this.activateSubscription(
          paymentInfo.externalReference,
          paymentInfo.amount,
          paymentId
        );

        // Enviar email de confirmación
        await this.sendConfirmationEmail(paymentInfo.payerEmail, paymentInfo);
      }

      return { status: 'processed', paymentId };
    }

    return { status: 'ignored' };
  }

  // Planes de precios para Argentina
  static getPlanPrices() {
    return {
      starter: {
        price: 0,
        currency: 'ARS',
        description: 'Plan Demo - 15 días gratis',
        features: ['2 usuarios máximo', '15 días de prueba', 'Soporte básico']
      },
      pro: {
        price: 19900,
        currency: 'ARS',
        description: 'Plan Pro - Mensual',
        features: ['5 usuarios', 'WhatsApp integrado', 'Reportes avanzados', 'Soporte premium']
      },
      enterprise: {
        price: 39900,
        currency: 'ARS',
        description: 'Plan Enterprise - Personalizado',
        features: ['Usuarios ilimitados', 'API completa', 'Soporte 24/7', 'Personalización']
      }
    };
  }

  private async savePendingPayment(workshopId: string, preferenceId: string, amount: number, planType: string) {
    const stmt = this.env.DB.prepare(`
      INSERT INTO payments (workshop_id, preference_id, amount, plan_type, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `);

    await stmt.bind(workshopId, preferenceId, amount, planType).run();
  }

  private async activateSubscription(workshopId: string, amount: number, paymentId: string) {
    // Activar suscripción en la base de datos
    const stmt = this.env.DB.prepare(`
      UPDATE subscriptions 
      SET status = 'active', 
          payment_id = ?,
          activated_at = datetime('now'),
          expires_at = datetime('now', '+1 month')
      WHERE workshop_id = ?
    `);

    await stmt.bind(paymentId, workshopId).run();

    // Actualizar estado del pago
    const paymentStmt = this.env.DB.prepare(`
      UPDATE payments 
      SET status = 'approved', payment_id = ?
      WHERE workshop_id = ? AND amount = ?
    `);

    await paymentStmt.bind(paymentId, workshopId, amount).run();
  }

  private async sendConfirmationEmail(email: string, paymentInfo: any) {
    // Implementar envío de email de confirmación
    console.log(`Enviando email de confirmación a ${email} por pago ${paymentInfo.id}`);
  }
}
