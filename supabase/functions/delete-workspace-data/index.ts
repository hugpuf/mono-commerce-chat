import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletionRequest {
  workspaceId: string;
  deletionType: 'selective' | 'full';
  deletionScope: string[]; // table names to delete
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { workspaceId, deletionType, deletionScope }: DeletionRequest = await req.json();

    console.log('Deletion request:', { workspaceId, deletionType, deletionScope, userId: user.id });

    // Verify user has access to this workspace
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (profileError || !profile) {
      throw new Error('Unauthorized: User does not have access to this workspace');
    }

    // Create deletion request record
    const { data: deletionRequest, error: requestError } = await supabase
      .from('data_deletion_requests')
      .insert({
        workspace_id: workspaceId,
        requested_by: user.id,
        deletion_type: deletionType,
        deletion_scope: deletionScope,
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating deletion request:', requestError);
      throw new Error('Failed to create deletion request');
    }

    console.log('Created deletion request:', deletionRequest.id);

    // Perform deletion based on type and scope
    try {
      if (deletionType === 'full') {
        await performFullDeletion(supabase, workspaceId);
      } else {
        await performSelectiveDeletion(supabase, workspaceId, deletionScope);
      }

      // Mark deletion as completed
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', deletionRequest.id);

      // Log audit event
      await supabase
        .rpc('log_audit_event', {
          p_workspace_id: workspaceId,
          p_action: deletionType === 'full' ? 'workspace.deleted' : 'data.deleted',
          p_target_type: 'workspace',
          p_target_id: workspaceId,
          p_after_state: { deletion_type: deletionType, scope: deletionScope },
        });

      console.log('Deletion completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          deletionRequestId: deletionRequest.id,
          confirmationCode: deletionRequest.confirmation_code,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (deletionError) {
      console.error('Error during deletion:', deletionError);
      
      // Mark deletion as failed
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'failed',
          error_message: deletionError instanceof Error ? deletionError.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', deletionRequest.id);

      throw deletionError;
    }
  } catch (error) {
    console.error('Error in delete-workspace-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function performSelectiveDeletion(
  supabase: any,
  workspaceId: string,
  scope: string[]
) {
  console.log('Performing selective deletion for:', scope);

  // Define deletion order and corresponding tables
  const deletionMap: Record<string, string[]> = {
    'whatsapp': [
      'messages',
      'conversations',
      'whatsapp_webhook_events',
      'whatsapp_numbers',
      'whatsapp_accounts',
    ],
    'catalog': [
      'inventory_reservations',
      'products',
      'shopify_locations',
      'catalog_sources',
    ],
    'payment': ['payment_providers'],
    'orders': ['order_discounts', 'inventory_reservations'],
  };

  // Collect all tables to delete based on scope
  const tablesToDelete = new Set<string>();
  for (const category of scope) {
    const tables = deletionMap[category];
    if (tables) {
      tables.forEach(table => tablesToDelete.add(table));
    }
  }

  // Delete in order
  for (const table of tablesToDelete) {
    console.log(`Deleting from ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw new Error(`Failed to delete from ${table}: ${error.message}`);
    }
  }

  console.log('Selective deletion completed');
}

async function performFullDeletion(supabase: any, workspaceId: string) {
  console.log('Performing full deletion for workspace:', workspaceId);

  // Delete in order to respect foreign key constraints
  const deletionOrder = [
    'messages',
    'conversations',
    'whatsapp_webhook_events',
    'whatsapp_numbers',
    'whatsapp_accounts',
    'inventory_reservations',
    'order_discounts',
    'products',
    'shopify_locations',
    'catalog_sources',
    'payment_providers',
    'message_templates',
    'channel_policies',
    'data_deletion_requests',
    'audit_logs',
  ];

  for (const table of deletionOrder) {
    console.log(`Deleting from ${table}...`);
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('workspace_id', workspaceId);

      if (error && !error.message.includes('does not exist')) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables even if one fails
      }
    } catch (e) {
      console.error(`Exception deleting from ${table}:`, e);
      // Continue with other tables
    }
  }

  // Delete storage files
  try {
    const { data: files } = await supabase.storage
      .from('business-logos')
      .list(`${workspaceId}/`);

    if (files && files.length > 0) {
      const filePaths = files.map((file: any) => `${workspaceId}/${file.name}`);
      await supabase.storage.from('business-logos').remove(filePaths);
      console.log('Deleted storage files');
    }
  } catch (e) {
    console.error('Error deleting storage files:', e);
  }

  // Soft delete workspace
  const { error: workspaceError } = await supabase
    .from('workspaces')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', workspaceId);

  if (workspaceError) {
    console.error('Error soft deleting workspace:', workspaceError);
    throw new Error('Failed to delete workspace');
  }

  // Delete user profiles
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('workspace_id', workspaceId);

  if (profileError) {
    console.error('Error deleting user profiles:', profileError);
  }

  console.log('Full deletion completed');
}
