import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Salud
app.get("/health", (_req, res) => res.send("ok"));

// Webhook de Mercado Pago (acá va el código)
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

  // Responder rápido para evitar reintentos
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

    const pago = await r.json();

    console.log("[DETALLE PAGO]", {
      id: pago.id,
      status: pago.status,
      status_detail: pago.status_detail,
      transaction_amount: pago.transaction_amount,
      payer_email: pago.payer?.email,
    });

    // TODO: guardarlo en tu DB
  } catch (e) {
    console.error("Error consultando MP:", e);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Fixly backend running on port ${port}`);
});
