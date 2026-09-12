import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

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

type InvoiceRecord = {
  id: string;
  amount_cents: number;
  status: string;
  square_payment_id: string | null;
};

export async function POST(request: Request) {
  const signature =
    request.headers.get("x-square-hmacsha256-signature");

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

  const signatureKey =
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  const webhookUrl =
    process.env.SQUARE_WEBHOOK_URL;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !signatureKey ||
    !webhookUrl ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      "Square webhook or Supabase server credentials are missing."
    );

    return NextResponse.json(
      {
        error: "Webhook configuration is incomplete.",
      },
      {
        status: 500,
      }
    );
  }

  const rawBody = await request.text();

  const expectedSignature = createHmac(
    "sha256",
    signatureKey
  )
    .update(webhookUrl + rawBody)
    .digest("base64");

  if (
    !signaturesMatch(
      signature,
      expectedSignature
    )
  ) {
    console.error(
      "Square webhook signature verification failed."
    );

    return NextResponse.json(
      {
        error: "Invalid Square signature.",
      },
      {
        status: 401,
      }
    );
  }

  let payload: SquareWebhookPayload;

  try {
    payload = JSON.parse(
      rawBody
    ) as SquareWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid webhook JSON.",
      },
      {
        status: 400,
      }
    );
  }

  const eventId = payload.event_id;
  const eventType = payload.type;

  if (!eventId || !eventType) {
    return NextResponse.json(
      {
        error: "Webhook event information is missing.",
      },
      {
        status: 400,
      }
    );
  }

  const supabaseAdmin =
    createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const { data: existingEvent } =
    await supabaseAdmin
      .from("square_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({
      received: true,
      duplicate: true,
    });
  }

  if (eventType !== "payment.updated") {
    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const payment =
    payload.data?.object?.payment;

  if (!payment) {
    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  if (payment.status !== "COMPLETED") {
    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const squarePaymentId = payment.id;

  if (!squarePaymentId) {
    return NextResponse.json(
      {
        error: "Square payment ID is missing.",
      },
      {
        status: 400,
      }
    );
  }

  const invoiceId =
    extractInvoiceId(payment.note);

  if (!invoiceId) {
    console.error(
      "Square payment does not contain a Duck Home Services invoice ID.",
      {
        eventId,
        squarePaymentId,
        note: payment.note,
      }
    );

    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const { data: invoiceData, error: invoiceError } =
    await supabaseAdmin
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
      "Failed to retrieve invoice:",
      invoiceError
    );

    return NextResponse.json(
      {
        error: "Could not retrieve invoice.",
      },
      {
        status: 500,
      }
    );
  }

  const invoice =
    invoiceData as InvoiceRecord | null;

  if (!invoice) {
    console.error(
      "Invoice from Square payment note was not found:",
      invoiceId
    );

    return NextResponse.json({
      received: true,
      ignored: true,
    });
  }

  const squareAmount =
    payment.amount_money?.amount;

  if (
    typeof squareAmount !== "number" ||
    squareAmount !== invoice.amount_cents
  ) {
    console.error(
      "Square payment amount does not match invoice.",
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
    invoice.square_payment_id !==
      squarePaymentId
  ) {
    console.error(
      "Invoice is already linked to a different Square payment.",
      {
        invoiceId,
        existingPaymentId:
          invoice.square_payment_id,
        incomingPaymentId:
          squarePaymentId,
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

  if (invoice.status !== "paid") {
    const { error: updateError } =
      await supabaseAdmin
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "square",
          payment_notes:
            `Square payment ID: ${squarePaymentId}`,
          square_payment_id:
            squarePaymentId,
          square_order_id:
            payment.order_id ?? null,
        })
        .eq("id", invoice.id);

    if (updateError) {
      console.error(
        "Failed to mark invoice paid:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Could not update the invoice.",
        },
        {
          status: 500,
        }
      );
    }
  }

  const { error: eventInsertError } =
    await supabaseAdmin
      .from("square_webhook_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        square_payment_id:
          squarePaymentId,
        invoice_id: invoice.id,
      });

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    console.error(
      "Failed to save Square webhook event:",
      eventInsertError
    );

    return NextResponse.json(
      {
        error:
          "Could not save webhook event.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    received: true,
    processed: true,
  });
}

function signaturesMatch(
  received: string,
  expected: string
) {
  const receivedBuffer =
    Buffer.from(received);

  const expectedBuffer =
    Buffer.from(expected);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function extractInvoiceId(
  note: string | undefined
) {
  if (!note) {
    return null;
  }

  const match = note.match(
    /Duck Home Services invoice:([0-9a-fA-F-]{36})/
  );

  return match?.[1] ?? null;
}