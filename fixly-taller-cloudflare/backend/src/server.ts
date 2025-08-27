import express from "express";
import cors from "cors";
import { pool } from "./db";               // <-- importa la DB
import { upsertPayment } from "./payments"; // <-- si ya creaste payments.ts

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Health
app.get("/health", (_req, res) => res.send("ok"));

// TEST de base de datos  ------------------------------
app.get("/dbtest", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ db_time: r.rows[0].now });
  } catch (e) {
    console.error("DB error:", e);
    res.status(500).json({ error: "No se pudo conectar a la DB" });
  }
});
// -----------------------------------------------------

// Webhook de Mercado Pago -----------------------------
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

  // Responder rápido para que MP no reintente
  res.sendStatus(200);
  if (!paymentId) return;

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!r.ok) {
      console.error("[MP API ERROR]", r.status, await r.text());
      return;
    }

    const pago: any = await r.json();
    console.log("[DETALLE PAGO]", {
      id: pago.id,
      status: pago.status,
      amount: pago.transaction_amount,
      payer: pago.payer?.email,
    });

    // (Opcional) guardar en DB si ya tenés payments.ts
    // await upsertPayment({
    //   mp_payment_id: pago.id,
    //   status: pago.status,
    //   status_detail: pago.status_detail,
    //   transaction_amount: pago.transaction_amount,
    //   currency_id: pago.currency_id,
    //   external_reference: pago.external_reference,
    //   payer_email: pago.payer?.email ?? null,
    //   live_mode: pago.live_mode,
    //   date_created: pago.date_created,
    //   date_approved: pago.date_approved,
    //   raw: pago
    // });
    // console.log("[DB] payment upserted", pago.id);

  } catch (e) {
    console.error("Error consultando MP:", e);
  }
});
// -----------------------------------------------------

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Fixly backend running on port ${port}`));
import express from "express";
import cors from "cors";
import { pool } from "./db";  // <- importa la conexión

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

app.get("/health", (_req, res) => res.send("ok"));

// ✅ TEST de DB
app.get("/dbtest", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ db_time: r.rows[0].now });
  } catch (e) {
    console.error("DB error:", e);
    res.status(500).json({ error: "No se pudo conectar a la DB" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Fixly backend running on port ${port}`));


