import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-signature",
};

interface DocumentPayload {
  action: "create" | "update" | "delete" | "list" | "get-download-url";
  user_id?: string;
  document_id?: string;
  data?: {
    name?: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
    folder?: string;
    tags?: string[];
  };
  filters?: {
    folder?: string;
    file_type?: string;
    search?: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate n8n webhook requests
    const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    const signature = req.headers.get("x-n8n-signature");
    
    if (!n8nSecret || !signature || signature !== n8nSecret) {
      console.error("Unauthorized request - invalid or missing n8n signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DocumentPayload = await req.json();
    console.log("n8n-documents received:", JSON.stringify(payload));

    const { action, user_id, document_id, data, filters } = payload;

    let result;

    switch (action) {
      case "create": {
        if (!user_id || !data?.name || !data?.file_path) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: user_id, name, file_path" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: document, error } = await supabase
          .from("documents")
          .insert({
            user_id,
            name: data.name,
            file_path: data.file_path,
            file_type: data.file_type,
            file_size: data.file_size,
            folder: data.folder || "/",
            tags: data.tags || [],
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, document };
        console.log("Document created:", document.id);
        break;
      }

      case "update": {
        if (!document_id) {
          return new Response(
            JSON.stringify({ error: "Missing document_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (data?.name) updateData.name = data.name;
        if (data?.folder !== undefined) updateData.folder = data.folder;
        if (data?.tags) updateData.tags = data.tags;

        const { data: document, error } = await supabase
          .from("documents")
          .update(updateData)
          .eq("id", document_id)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, document };
        console.log("Document updated:", document_id);
        break;
      }

      case "delete": {
        if (!document_id) {
          return new Response(
            JSON.stringify({ error: "Missing document_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // First get the document to find the file path
        const { data: doc, error: fetchError } = await supabase
          .from("documents")
          .select("file_path")
          .eq("id", document_id)
          .single();

        if (fetchError) throw fetchError;

        // Delete from storage
        if (doc?.file_path) {
          const { error: storageError } = await supabase.storage
            .from("documents")
            .remove([doc.file_path]);
          
          if (storageError) {
            console.warn("Storage delete warning:", storageError.message);
          }
        }

        // Delete from database
        const { error } = await supabase
          .from("documents")
          .delete()
          .eq("id", document_id);

        if (error) throw error;
        result = { success: true, deleted: document_id };
        console.log("Document deleted:", document_id);
        break;
      }

      case "list": {
        let query = supabase.from("documents").select("*");

        if (user_id) {
          query = query.eq("user_id", user_id);
        }
        if (filters?.folder) {
          query = query.eq("folder", filters.folder);
        }
        if (filters?.file_type) {
          query = query.eq("file_type", filters.file_type);
        }
        if (filters?.search) {
          query = query.ilike("name", `%${filters.search}%`);
        }

        const { data: documents, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;
        result = { success: true, documents, count: documents.length };
        console.log("Listed documents:", documents.length);
        break;
      }

      case "get-download-url": {
        if (!document_id) {
          return new Response(
            JSON.stringify({ error: "Missing document_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Get document from database
        const { data: doc, error: fetchError } = await supabase
          .from("documents")
          .select("file_path, name")
          .eq("id", document_id)
          .single();

        if (fetchError) throw fetchError;

        // Generate signed URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

        if (urlError) throw urlError;

        result = { 
          success: true, 
          document_id, 
          name: doc.name,
          download_url: urlData.signedUrl,
          expires_in: 3600 
        };
        console.log("Generated download URL for:", document_id);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in n8n-documents:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
