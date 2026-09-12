import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

type CustomerRecord = {
  id: string;
};

type InvoiceRecord = {
  id: string;
  customer_id: string;
  description: string;
  amount_cents: number;
  status: string;
};

type SquarePaymentLinkResponse = {
  payment_link?: {
    id?: string;
    order_id?: string;
    url?: string;
  };
  errors?: Array<{
    category?: string;
    code?: string;
    detail?: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const { invoiceId } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return NextResponse.redirect(
      new URL("/login", request.url),
      303
    );
  }

  const { data: customerData } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  const customer =
    customerData as CustomerRecord | null;

  if (!customer) {
    return NextResponse.redirect(
      new URL("/customer", request.url),
      303
    );
  }

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select(`
      id,
      customer_id,
      description,
      amount_cents,
      status
    `)
    .eq("id", invoiceId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  const invoice =
    invoiceData as InvoiceRecord | null;

  if (!invoice) {
    return NextResponse.redirect(
      new URL("/customer", request.url),
      303
    );
  }

  if (invoice.status === "paid") {
    return NextResponse.redirect(
      new URL(
        `/customer/invoices/${invoice.id}`,
        request.url
      ),
      303
    );
  }

  if (invoice.amount_cents <= 0) {
    return new Response(
      "This invoice does not have a valid payment amount.",
      {
        status: 400,
      }
    );
  }

  const squareAccessToken =
    process.env.SQUARE_ACCESS_TOKEN;

  const squareLocationId =
    process.env.SQUARE_LOCATION_ID;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !squareAccessToken ||
    !squareLocationId ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      "Square or Supabase server credentials are missing."
    );

    return new Response(
      "Payment setup is incomplete.",
      {
        status: 500,
      }
    );
  }

  const squareResponse = await fetch(
    "https://connect.squareupsandbox.com/v2/online-checkout/payment-links",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${squareAccessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2026-08-19",
      },
      body: JSON.stringify({
        idempotency_key: randomUUID(),

        quick_pay: {
          name: invoice.description,
          price_money: {
            amount: invoice.amount_cents,
            currency: "USD",
          },
          location_id: squareLocationId,
        },

        payment_note:
          `Duck Home Services invoice:${invoice.id}`,
      }),
    }
  );

  const squareData =
    (await squareResponse.json()) as SquarePaymentLinkResponse;

  if (!squareResponse.ok) {
    console.error(
      "Square CreatePaymentLink error:",
      squareData.errors
    );

    return new Response(
      "Square could not create the payment checkout.",
      {
        status: 500,
      }
    );
  }

  const paymentLink =
    squareData.payment_link;

  const checkoutUrl =
    paymentLink?.url;

  if (!checkoutUrl) {
    console.error(
      "Square did not return a checkout URL:",
      squareData
    );

    return new Response(
      "Square did not return a payment link.",
      {
        status: 500,
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

  const { error: updateError } =
    await supabaseAdmin
      .from("invoices")
      .update({
        square_payment_link_id:
          paymentLink?.id ?? null,
        square_order_id:
          paymentLink?.order_id ?? null,
      })
      .eq("id", invoice.id)
      .eq("status", "unpaid");

  if (updateError) {
    console.error(
      "Failed to save Square checkout details:",
      updateError
    );

    return new Response(
      "The Square checkout was created, but its details could not be saved.",
      {
        status: 500,
      }
    );
  }

  return NextResponse.redirect(
    checkoutUrl,
    303
  );
}