import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SquareWebhookPayload = {
  type?: string;
  event_id?: string;
  data?: {
    object?: {
      payment?: {
        id?: string;
        status?: string;
        note?: string;
        amount_money?: {
          amount?: number;
          currency?: string;
        };
      };
    };
  };
};

function isValidSquareSignature({
  signature,
  body,
  notificationUrl,
  signatureKey,
}: {
  signature: string;
  body: string;
  notificationUrl: string;
  signatureKey: string;
}) {
  const payload = notificationUrl + body;

  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(payload)
    .digest("base64");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

export async function POST(request: Request) {
  const signature =
    request.headers.get(
      "x-square-hmacsha256-signature"
    );

  const signatureKey =
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  const notificationUrl =
    process.env.SQUARE_WEBHOOK_URL;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !signatureKey ||
    !notificationUrl ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      "Webhook environment variables are missing."
    );

    return NextResponse.json(
      {
        error:
          "Webhook configuration is incomplete.",
      },
      {
        status: 500,
      }
    );
  }

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing Square signature.",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.text();

  const validSignature =
    isValidSquareSignature({
      signature,
      body,
      notificationUrl,
      signatureKey,
    });

  if (!validSignature) {
    console.error(
      "Invalid Square webhook signature."
    );

    return NextResponse.json(
      {
        error: "Invalid signature.",
      },
      {
        status: 401,
      }
    );
  }

  let payload: SquareWebhookPayload;

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON.",
      },
      {
        status: 400,
      }
    );
  }

  if (payload.type !== "payment.updated") {
    return NextResponse.json({
      received: true,
    });
  }

  const payment =
    payload.data?.object?.payment;

  if (!payment) {
    return NextResponse.json({
      received: true,
    });
  }

  if (payment.status !== "COMPLETED") {
    return NextResponse.json({
      received: true,
    });
  }

  const note = payment.note ?? "";

  const invoicePrefix =
    "Duck Home Services invoice:";

  if (!note.startsWith(invoicePrefix)) {
    return NextResponse.json({
      received: true,
    });
  }

  const invoiceId = note
    .slice(invoicePrefix.length)
    .trim();

  if (!invoiceId) {
    return NextResponse.json({
      received: true,
    });
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: invoice, error: invoiceError } =
    await supabaseAdmin
      .from("invoices")
      .select(`
        id,
        amount_cents,
        status
      `)
      .eq("id", invoiceId)
      .maybeSingle();

  if (invoiceError) {
    console.error(
      "Invoice lookup failed:",
      invoiceError
    );

    return NextResponse.json(
      {
        error: "Invoice lookup failed.",
      },
      {
        status: 500,
      }
    );
  }

  if (!invoice) {
    console.error(
      "Square payment referenced unknown invoice:",
      invoiceId
    );

    return NextResponse.json({
      received: true,
    });
  }

  if (invoice.status === "paid") {
    return NextResponse.json({
      received: true,
    });
  }

  const squareAmount =
    payment.amount_money?.amount;

  if (
    typeof squareAmount !== "number" ||
    squareAmount !== invoice.amount_cents
  ) {
    console.error(
      "Square payment amount did not match invoice.",
      {
        invoiceId,
        expected: invoice.amount_cents,
        received: squareAmount,
      }
    );

    return NextResponse.json(
      {
        error: "Payment amount mismatch.",
      },
      {
        status: 400,
      }
    );
  }

  const { error: updateError } =
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "other",
        payment_notes:
          `Paid online through Square. Square payment ID: ${payment.id ?? "unknown"}`,
      })
      .eq("id", invoice.id)
      .eq("status", "unpaid");

  if (updateError) {
    console.error(
      "Invoice payment update failed:",
      updateError
    );

    return NextResponse.json(
      {
        error:
          "Invoice payment update failed.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    received: true,
  });
}