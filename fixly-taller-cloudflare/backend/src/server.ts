const r = await pref.create({
  body: {
    items: [{
      id: "plan-fixly",                     // ← agregado (requerido por los tipos)
      title: String(title),
      quantity: Number(quantity) || 1,
      unit_price: Number(price) || 1000,
      currency_id: "ARS"                    // o "USD" según prefieras
    }],
    back_urls: {
      success: `${process.env.FRONT_URL}/pago/success`,
      failure: `${process.env.FRONT_URL}/pago/failure`,
      pending: `${process.env.FRONT_URL}/pago/pending`,
    },
    notification_url: process.env.MP_WEBHOOK_URL, // puede quedar undefined si no lo seteaste
    auto_return: "approved",
  },
});
