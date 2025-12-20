import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  company: string;
  phone: string;
  email: string;
  services: string[];
  projectDescription: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormData = await req.json();
    
    console.log("Received contact form submission:", formData);

    // Validate required fields
    if (!formData.name || !formData.email) {
      return new Response(
        JSON.stringify({ error: "Name und E-Mail sind erforderlich" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const servicesText = formData.services.length > 0 
      ? formData.services.join(", ") 
      : "Keine Services ausgewählt";

    // Send notification email to admin
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NextGen Smart Solutions <kontakt@nextgensmartsolution.de>",
        to: ["steven.pechtl@nextgensmartsolution.de"],
        subject: `Neue Kontaktanfrage von ${formData.name}`,
        html: `
          <h1>Neue Kontaktanfrage</h1>
          <h2>Kontaktdaten</h2>
          <ul>
            <li><strong>Name:</strong> ${formData.name}</li>
            <li><strong>Firma:</strong> ${formData.company || "Nicht angegeben"}</li>
            <li><strong>Telefon:</strong> ${formData.phone || "Nicht angegeben"}</li>
            <li><strong>E-Mail:</strong> ${formData.email}</li>
          </ul>
          <h2>Gewünschte Services</h2>
          <p>${servicesText}</p>
          <h2>Projektbeschreibung</h2>
          <p>${formData.projectDescription || "Keine Beschreibung angegeben"}</p>
        `,
      }),
    });

    console.log("Admin email response status:", adminEmailResponse.status);

    if (!adminEmailResponse.ok) {
      const errorData = await adminEmailResponse.text();
      console.error("Failed to send admin email:", errorData);
      throw new Error(`Failed to send admin email: ${errorData}`);
    }

    // Send confirmation email to customer
    const customerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NextGen Smart Solutions <kontakt@nextgensmartsolution.de>",
        to: [formData.email],
        subject: "Vielen Dank für Ihre Anfrage!",
        html: `
          <h1>Vielen Dank für Ihre Anfrage, ${formData.name}!</h1>
          <p>Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
          <h2>Ihre Anfrage im Überblick:</h2>
          <ul>
            <li><strong>Gewünschte Services:</strong> ${servicesText}</li>
            <li><strong>Projektbeschreibung:</strong> ${formData.projectDescription || "Keine Beschreibung angegeben"}</li>
          </ul>
          <p>Mit freundlichen Grüßen,<br>Ihr NextGen Smart Solutions Team</p>
        `,
      }),
    });

    console.log("Customer email response status:", customerEmailResponse.status);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-Mails erfolgreich gesendet" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
