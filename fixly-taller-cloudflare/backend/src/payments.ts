import { pool } from "./db";

export type PaymentRow = {
  mp_payment_id: number;
  status?: string | null;
  status_detail?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  live_mode?: boolean | null;
  date_created?: string | null;
  date_approved?: string | null;
  raw: any;
};

export async function upsertPayment(p: PaymentRow) {
  const q = `
    CREATE TABLE IF NOT EXISTS payments (
      id bigserial PRIMARY KEY,
      mp_payment_id bigint UNIQUE NOT NULL,
      status text,
      status_detail text,
      transaction_amount numeric(12,2),
      currency_id text,
      external_reference text,
      payer_email text,
      live_mode boolean,
      date_created timestamptz,
      date_approved timestamptz,
      raw jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO payments (
      mp_payment_id, status, status_detail, transaction_amount, currency_id,
      external_reference, payer_email, live_mode, date_created, date_approved, raw, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now()
    )
    ON CONFLICT (mp_payment_id) DO UPDATE SET
      status = EXCLUDED.status,
      status_detail = EXCLUDED.status_detail,
      transaction_amount = EXCLUDED.transaction_amount,
      currency_id = EXCLUDED.currency_id,
      external_reference = EXCLUDED.external_reference,
      payer_email = EXCLUDED.payer_email,
      live_mode = EXCLUDED.live_mode,
      date_created = EXCLUDED.date_created,
      date_approved = EXCLUDED.date_approved,
      raw = EXCLUDED.raw,
      updated_at = now()
    RETURNING *;
  `;

  const values = [
    p.mp_payment_id,
    p.status ?? null,
    p.status_detail ?? null,
    p.transaction_amount ?? null,
    p.currency_id ?? null,
    p.external_reference ?? null,
    p.payer_email ?? null,
    p.live_mode ?? null,
    p.date_created ? new Date(p.date_created) : null,
    p.date_approved ? new Date(p.date_approved) : null,
    p.raw
  ];

  // Ejecuta CREATE TABLE + UPSERT en una sola llamada
  const res = await pool.query(q, values);
  return res.rows[0];
}

