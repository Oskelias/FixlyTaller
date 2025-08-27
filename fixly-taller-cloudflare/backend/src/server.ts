import fetch from "node-fetch";

app.post("/webhook", async (req, res) => {
  const paymentId =
    req.body?.data?.id || req.query["data.id"] || req.query["id"];

  console.log("[WEBHOOK MP] recibido:", paymentId);

  if (paymentId) {
    try {
      // Consultar detalle del pago
      const resp = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, // tu token de prueba o prod
          },
        }
      );
      const data = await resp.json();
      console.log("[DETALLE PAGO]", data);

      // acá podés guardar en tu DB: estado, monto, mail del comprador, etc.
    } catch (err) {
      console.error("Error al consultar el pago:", err);
    }
  }

  // Responder siempre 200
  res.sendStatus(200);
});
