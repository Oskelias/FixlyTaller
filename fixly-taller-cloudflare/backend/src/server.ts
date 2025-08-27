import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ type: ["application/json", "text/plain"] }));

// Salud
app.get("/health", (_req, res) => res.send("ok"));

// Webhook de Mercado Pago
app.post("/webhook", (req, res) => {
  const action = req.body?.action || req.query["action"];
  const type = req.body?.type || req.query["type"];
  const paymentId = req.body?.data?.id || req.query["data.id"];

  console.log("[WEBHOOK MP]", { action, type, paymentId, body: req.body, query: req.query });

  // SIEMPRE responder 200 OK, aunque no proceses nada aún
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Fixly backend running on port ${port}`);
});
