import express from "express";

const app = express();

// Para leer JSON del body
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Salud
app.get("/health", (_req, res) => res.send("ok"));

// Webhook de Mercado Pago
app.post("/webhook", (req, res) => {
  const action =
    (req.body?.action as string) || (req.query["action"] as string) || "";
  const topic =
    (req.body?.type as string) ||
    (req.query["topic"] as string) ||
    (req.query["type"] as string) ||
    "";
  const paymentId =
    req.body?.data?.id ||
    (req.query["data.id"] as string) ||
    (req.query["id"] as string) ||
    null;

  console.log("[MP WEBHOOK]", {
    action,
    topic,
    paymentId,
    query: req.query,
    body: req.body,
  });

  // SIEMPRE responder 200 para que MP no reintente
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on :${port}`));

