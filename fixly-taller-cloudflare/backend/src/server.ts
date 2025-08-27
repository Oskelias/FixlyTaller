import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db";
// import { upsertPayment } from "./payments";

const app = express();
app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Salud
app.get("/health", (_req, res) => res.send("ok"));

// Test de DB
app.get("/dbtest", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ db_time: r.rows[0].now });
  } catch (e: any) {
    console.error("DB error:", e);
    res
      .status(500)
      .json({ error: "No se pudo conectar a la DB", detail: e?.message });
  }
});

// Webhook de Mercado Pago
app.post("/webhook", async (req, res) => {
  const paymentId =
    (req.body?.data?.id as string | undefined) ||
    (req.query["data.id"] as string | undefined) ||
    (req.query["id"] as string | undefined);

  const action =
    (req.body?.action as string | undefined) ||
    (req.query["action"] as string | undefined);
  const type =
    (req.body?.type as string | undefined) ||
    (req.query["type"] as string | undefined);

  console.log("[WEBHOOK MP] recibido:", { action, type, paymentId, query: req.query });

  res.sendStatus(200); // responder rápido

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
    console.log("[DETALLE PAGO]", {
      id: pago.id,
      status: pago.status,
      status_detail: pago.status_detail,
      amount: pago.transaction_amount,
      currency: pago.currency_id,
      payer: pago.payer?.email,
      external_reference: pago.external_reference,
      live_mode: pago.live_mode,
    });

    // opcional: guardar en DB
  } catch (e) {
    console.error("Error consultando MP:", e);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Fixly backend running on port ${port}`));
