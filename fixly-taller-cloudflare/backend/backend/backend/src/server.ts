import "dotenv/config";
import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Preference } from "mercadopago";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

app.post("/api/payments/create", async (req, res, next) => {
  try {
    const { title = "Plan Fixly", price = 1000, quantity = 1 } = req.body || {};
    const pref = new Preference(mp);
    const r = await pref.create({
      body: {
        items: [{ title, unit_price: Number(price), quantity }],
        back_urls: {
          success: `${process.env.FRONT_URL}/pago/success`,
          failure: `${process.env.FRONT_URL}/pago/failure`,
          pending: `${process.env.FRONT_URL}/pago/pending`
        },
        notification_url: process.env.MP_WEBHOOK_URL,
        auto_return: "approved"
      }
    });
    res.json({ id: r.id, init_point: r.init_point, sandbox_init_point: r.sandbox_init_point });
  } catch (e) { next(e); }
});

app.post("/api/payments/mp/webhook", (req, res) => {
  console.log("MP webhook:", req.body);
  res.sendStatus(200);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API escuchando en :${port}`));
