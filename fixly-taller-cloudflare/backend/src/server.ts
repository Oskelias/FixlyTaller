import express from "express";
import cors from "cors";
import { upsertPayment } from "./payments";

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

app.get("/health", (_req, res) => res.send("ok"));

app.post("/webhook", async (req, res) => {
  const paymentId =
    (req.body?.data?.id as string | undefined) ||
    (req.query["data.id"] as string | undefined) ||
    (req.query["id"] as string | undefined);

  console.log("[WEBHOOK MP] recibido:", {
    action: req.body?.action ?? req.query["action"],
    type: req.body?.type ?? req.query["type"],
    paymentId,
    query: req.query,
  });

  // Respondemos rápido
  res.sendStatus(200);
  if (!paymentId) return;

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("[MP API ERROR]", r.status, txt);
      return;
    }

    const pago: any = await r.json();
    console.log("[DETALLE PAGO]", { id: pago.id, status: pago.status, amount: pago.transaction_amount });

    await upsertPayment({
      mp_payment_id: pago.id,
      status: pago.status,
      status_detail: pago.status_detail,
      transaction_amount: pago.transaction_amount,
      currency_id: pago.currency_id,
      external_reference: pago.external_reference,
      payer_email: pago.payer?.email ?? null,
      live_mode: pago.live_mode,
      date_created: pago.date_created,
      date_approved: pago.date_approved,
      raw: pago
    });

    console.log("[DB] payment upserted", pago.id);
  } catch (e) {
    console.error("Error consultando/guardando MP:", e);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Fixly backend running on port ${port}`));
