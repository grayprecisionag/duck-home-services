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
        order_id?: string;
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

  const eventId = payload.event_id;

  const payment =
    payload.data?.object?.payment;

  if (!eventId || !payment) {
    return NextResponse.json({
      received: true,
    });
  }

  if (payment.status !== "COMPLETED") {
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

  // Check whether this exact Square event
  // has already been processed.
  const {
    data: existingEvent,
    error: existingEventError,
  } = await supabaseAdmin
    .from("square_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEventError) {
    console.error(
      "Square event lookup failed:",
      existingEventError
    );

    return NextResponse.json(
      {
        error:
          "Webhook event lookup failed.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingEvent) {
    return NextResponse.json({
      received: true,
      duplicate: true,
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

  const {
    data: invoice,
    error: invoiceError,
  } = await supabaseAdmin
    .from("invoices")
    .select(`
      id,
      amount_cents,
      status,
      square_payment_id
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

  if (
    invoice.square_payment_id &&
    invoice.square_payment_id !== payment.id
  ) {
    console.error(
      "Invoice already has a different Square payment.",
      {
        invoiceId,
        existingPaymentId:
          invoice.square_payment_id,
        incomingPaymentId:
          payment.id,
      }
    );

    return NextResponse.json(
      {
        error:
          "Invoice already has a different Square payment.",
      },
      {
        status: 409,
      }
    );
  }

  /*
   * The invoice may already be paid if Square
   * retried after the invoice update succeeded
   * but before we recorded the event.
   */
  if (
    invoice.status !== "paid" ||
    invoice.square_payment_id !== payment.id
  ) {
    const { error: updateError } =
      await supabaseAdmin
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "square",
          payment_notes:
            `Paid online through Square. Payment ID: ${
              payment.id ?? "unknown"
            }`,
          square_payment_id:
            payment.id ?? null,
          square_order_id:
            payment.order_id ?? null,
        })
        .eq("id", invoice.id);

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
  }

  /*
   * Record the Square event only after the
   * invoice was successfully processed.
   */
  const { error: eventInsertError } =
    await supabaseAdmin
      .from("square_webhook_events")
      .insert({
        event_id: eventId,
        event_type:
          payload.type ?? "payment.updated",
        square_payment_id:
          payment.id ?? null,
        invoice_id: invoice.id,
      });

  /*
   * PostgreSQL 23505 means another copy of the
   * same webhook event was already recorded.
   * That's safe and can still return 200.
   */
  if (
    eventInsertError &&
    eventInsertError.code !== "23505"
  ) {
    console.error(
      "Failed to record Square webhook event:",
      eventInsertError
    );

    return NextResponse.json(
      {
        error:
          "Webhook event could not be recorded.",
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