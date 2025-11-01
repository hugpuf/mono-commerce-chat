export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_sources: {
        Row: {
          access_token: string | null
          api_version: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          products_count: number | null
          provider: string
          provider_config: Json | null
          scopes: string[] | null
          shop_domain: string | null
          status: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
          webhook_subscriptions: Json | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          api_version?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          products_count?: number | null
          provider: string
          provider_config?: Json | null
          scopes?: string[] | null
          shop_domain?: string | null
          status?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          webhook_subscriptions?: Json | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          api_version?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          products_count?: number | null
          provider?: string
          provider_config?: Json | null
          scopes?: string[] | null
          shop_domain?: string | null
          status?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          webhook_subscriptions?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_policies: {
        Row: {
          allowed_consent_sources: string[] | null
          auto_convert_to_template: boolean | null
          auto_reply_first_touch: boolean | null
          auto_reply_out_of_hours: boolean | null
          auto_reply_sla_breach: boolean | null
          auto_reply_template_id: string | null
          block_marketing_without_consent: boolean | null
          consent_expiry_days: number | null
          created_at: string
          duplicate_purchase_lookback_hours: number | null
          enable_duplicate_guard: boolean | null
          enforce_24h_window: boolean | null
          fallback_template_id: string | null
          id: string
          rate_limit_burst_behavior: string | null
          rate_limit_per_minute: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowed_consent_sources?: string[] | null
          auto_convert_to_template?: boolean | null
          auto_reply_first_touch?: boolean | null
          auto_reply_out_of_hours?: boolean | null
          auto_reply_sla_breach?: boolean | null
          auto_reply_template_id?: string | null
          block_marketing_without_consent?: boolean | null
          consent_expiry_days?: number | null
          created_at?: string
          duplicate_purchase_lookback_hours?: number | null
          enable_duplicate_guard?: boolean | null
          enforce_24h_window?: boolean | null
          fallback_template_id?: string | null
          id?: string
          rate_limit_burst_behavior?: string | null
          rate_limit_per_minute?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowed_consent_sources?: string[] | null
          auto_convert_to_template?: boolean | null
          auto_reply_first_touch?: boolean | null
          auto_reply_out_of_hours?: boolean | null
          auto_reply_sla_breach?: boolean | null
          auto_reply_template_id?: string | null
          block_marketing_without_consent?: boolean | null
          consent_expiry_days?: number | null
          created_at?: string
          duplicate_purchase_lookback_hours?: number | null
          enable_duplicate_guard?: boolean | null
          enforce_24h_window?: boolean | null
          fallback_template_id?: string | null
          id?: string
          rate_limit_burst_behavior?: string | null
          rate_limit_per_minute?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_policies_auto_reply_template_id_fkey"
            columns: ["auto_reply_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_policies_fallback_template_id_fkey"
            columns: ["fallback_template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          cart_items: Json | null
          cart_total: number | null
          created_at: string
          customer_email: string | null
          customer_metadata: Json | null
          customer_name: string | null
          customer_phone: string
          id: string
          last_interaction_type: string | null
          last_message_at: string | null
          opt_in_date: string | null
          opt_in_status: string | null
          status: string
          updated_at: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          cart_items?: Json | null
          cart_total?: number | null
          created_at?: string
          customer_email?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          last_interaction_type?: string | null
          last_message_at?: string | null
          opt_in_date?: string | null
          opt_in_status?: string | null
          status?: string
          updated_at?: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          cart_items?: Json | null
          cart_total?: number | null
          created_at?: string
          customer_email?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          last_interaction_type?: string | null
          last_message_at?: string | null
          opt_in_date?: string | null
          opt_in_status?: string | null
          status?: string
          updated_at?: string
          whatsapp_account_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          created_at: string | null
          deletion_scope: Json
          deletion_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string | null
          deletion_scope?: Json
          deletion_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string | null
          deletion_scope?: Json
          deletion_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          catalog_source_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          products_deleted: number | null
          products_synced: number | null
          products_updated: number | null
          started_at: string
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          catalog_source_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          products_deleted?: number | null
          products_synced?: number | null
          products_updated?: number | null
          started_at?: string
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          catalog_source_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          products_deleted?: number | null
          products_synced?: number | null
          products_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_catalog_source_id_fkey"
            columns: ["catalog_source_id"]
            isOneToOne: false
            referencedRelation: "catalog_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          metadata: Json | null
          product_id: string
          quantity: number
          reserved_at: string | null
          reserved_by: string | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          product_id: string
          quantity: number
          reserved_at?: string | null
          reserved_by?: string | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          quantity?: number
          reserved_at?: string | null
          reserved_by?: string | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string
          last_synced_at: string | null
          meta_template_id: string | null
          name: string
          quality_score: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          variables_schema: Json | null
          whatsapp_template_id: string | null
          workspace_id: string
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name: string
          quality_score?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variables_schema?: Json | null
          whatsapp_template_id?: string | null
          workspace_id: string
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name?: string
          quality_score?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variables_schema?: Json | null
          whatsapp_template_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          error_message: string | null
          from_number: string
          id: string
          message_type: string
          metadata: Json | null
          status: string
          to_number: string
          updated_at: string
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          from_number: string
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          to_number: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          from_number?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          status?: string
          to_number?: string
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_discounts: {
        Row: {
          approved_by: string | null
          conversation_id: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          discounted_price: number
          id: string
          original_price: number
          product_id: string | null
          reason: string | null
          workspace_id: string
        }
        Insert: {
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discounted_price: number
          id?: string
          original_price: number
          product_id?: string | null
          reason?: string | null
          workspace_id: string
        }
        Update: {
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discounted_price?: number
          id?: string
          original_price?: number
          product_id?: string | null
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_discounts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          conversation_id: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          delivered_at: string | null
          id: string
          items: Json
          metadata: Json | null
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_link_expires_at: string | null
          payment_link_url: string | null
          payment_method: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping: number | null
          shipping_address: Json | null
          status: string
          subtotal: number
          tax: number | null
          total: number
          tracking_number: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          delivered_at?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: string
          subtotal: number
          tax?: number | null
          total: number
          tracking_number?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          delivered_at?: string | null
          id?: string
          items?: Json
          metadata?: Json | null
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: string
          subtotal?: number
          tax?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          account_id: string
          charges_enabled: boolean
          created_at: string
          id: string
          provider: string
          provider_config: Json | null
          status: string
          test_mode: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          charges_enabled?: boolean
          created_at?: string
          id?: string
          provider?: string
          provider_config?: Json | null
          status?: string
          test_mode?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          charges_enabled?: boolean
          created_at?: string
          id?: string
          provider?: string
          provider_config?: Json | null
          status?: string
          test_mode?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          catalog_source_id: string | null
          collection_ids: string[] | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          external_id: string | null
          handle: string | null
          id: string
          image_gallery: Json | null
          image_url: string | null
          inventory_by_location: Json | null
          is_variant: boolean
          metadata: Json | null
          parent_product_id: string | null
          price: number
          product_type: string | null
          shopify_inventory_item_id: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          sku: string
          status: string
          stock: number
          tags: string[] | null
          title: string
          updated_at: string
          variant_options: Json | null
          vendor: string | null
          workspace_id: string
        }
        Insert: {
          catalog_source_id?: string | null
          collection_ids?: string[] | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          handle?: string | null
          id?: string
          image_gallery?: Json | null
          image_url?: string | null
          inventory_by_location?: Json | null
          is_variant?: boolean
          metadata?: Json | null
          parent_product_id?: string | null
          price: number
          product_type?: string | null
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku: string
          status?: string
          stock?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          variant_options?: Json | null
          vendor?: string | null
          workspace_id: string
        }
        Update: {
          catalog_source_id?: string | null
          collection_ids?: string[] | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          handle?: string | null
          id?: string
          image_gallery?: Json | null
          image_url?: string | null
          inventory_by_location?: Json | null
          is_variant?: boolean
          metadata?: Json | null
          parent_product_id?: string | null
          price?: number
          product_type?: string | null
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sku?: string
          status?: string
          stock?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          variant_options?: Json | null
          vendor?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_catalog_source_id_fkey"
            columns: ["catalog_source_id"]
            isOneToOne: false
            referencedRelation: "catalog_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_locations: {
        Row: {
          address: Json | null
          catalog_source_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          shopify_location_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          address?: Json | null
          catalog_source_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          shopify_location_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          address?: Json | null
          catalog_source_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          shopify_location_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_locations_catalog_source_id_fkey"
            columns: ["catalog_source_id"]
            isOneToOne: false
            referencedRelation: "catalog_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_locations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          about_text: string | null
          access_token: string | null
          address: string | null
          app_secret: string | null
          business_hours: Json | null
          business_name: string | null
          category: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone_number: string
          phone_number_id: string
          status: string
          updated_at: string
          waba_id: string
          webhook_status: string | null
          webhook_verify_token: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          about_text?: string | null
          access_token?: string | null
          address?: string | null
          app_secret?: string | null
          business_hours?: Json | null
          business_name?: string | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone_number: string
          phone_number_id: string
          status?: string
          updated_at?: string
          waba_id: string
          webhook_status?: string | null
          webhook_verify_token: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          about_text?: string | null
          access_token?: string | null
          address?: string | null
          app_secret?: string | null
          business_hours?: Json | null
          business_name?: string | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone_number?: string
          phone_number_id?: string
          status?: string
          updated_at?: string
          waba_id?: string
          webhook_status?: string | null
          webhook_verify_token?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          assignment_rules: Json | null
          created_at: string
          daily_conversation_usage: number | null
          display_number: string
          fallback_locale: string | null
          id: string
          is_default: boolean | null
          is_flagged: boolean | null
          messaging_limit_tier: string | null
          phone_number_id: string
          profile_about: string | null
          profile_business_hours: Json | null
          profile_email: string | null
          profile_logo_url: string | null
          profile_website: string | null
          quality_rating: string | null
          quiet_hours_config: Json | null
          status: string
          updated_at: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Insert: {
          assignment_rules?: Json | null
          created_at?: string
          daily_conversation_usage?: number | null
          display_number: string
          fallback_locale?: string | null
          id?: string
          is_default?: boolean | null
          is_flagged?: boolean | null
          messaging_limit_tier?: string | null
          phone_number_id: string
          profile_about?: string | null
          profile_business_hours?: Json | null
          profile_email?: string | null
          profile_logo_url?: string | null
          profile_website?: string | null
          quality_rating?: string | null
          quiet_hours_config?: Json | null
          status?: string
          updated_at?: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Update: {
          assignment_rules?: Json | null
          created_at?: string
          daily_conversation_usage?: number | null
          display_number?: string
          fallback_locale?: string | null
          id?: string
          is_default?: boolean | null
          is_flagged?: boolean | null
          messaging_limit_tier?: string | null
          phone_number_id?: string
          profile_about?: string | null
          profile_business_hours?: Json | null
          profile_email?: string | null
          profile_logo_url?: string | null
          profile_website?: string | null
          quality_rating?: string | null
          quiet_hours_config?: Json | null
          status?: string
          updated_at?: string
          whatsapp_account_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_numbers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          delivery_status: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          last_retry_at: string | null
          payload: Json
          received_at: string
          response_code: number | null
          retry_count: number | null
          whatsapp_account_id: string | null
          workspace_id: string
        }
        Insert: {
          delivery_status?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          last_retry_at?: string | null
          payload: Json
          received_at?: string
          response_code?: number | null
          retry_count?: number | null
          whatsapp_account_id?: string | null
          workspace_id: string
        }
        Update: {
          delivery_status?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          last_retry_at?: string | null
          payload?: Json
          received_at?: string
          response_code?: number | null
          retry_count?: number | null
          whatsapp_account_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          business_address: string | null
          business_category: string | null
          business_description: string | null
          business_email: string | null
          business_hours: Json | null
          business_website: string | null
          company_name: string | null
          created_at: string
          data_retention_days: number | null
          deleted_at: string | null
          deletion_requested_at: string | null
          id: string
          locale: string | null
          logo_url: string | null
          media_ttl_days: number | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: Json | null
          business_website?: string | null
          company_name?: string | null
          created_at?: string
          data_retention_days?: number | null
          deleted_at?: string | null
          deletion_requested_at?: string | null
          id?: string
          locale?: string | null
          logo_url?: string | null
          media_ttl_days?: number | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_category?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: Json | null
          business_website?: string | null
          company_name?: string | null
          created_at?: string
          data_retention_days?: number | null
          deleted_at?: string | null
          deletion_requested_at?: string | null
          id?: string
          locale?: string | null
          logo_url?: string | null
          media_ttl_days?: number | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_reservations: { Args: never; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      log_audit_event: {
        Args: {
          p_action: string
          p_after_state?: Json
          p_before_state?: Json
          p_target_id?: string
          p_target_type: string
          p_workspace_id: string
        }
        Returns: string
      }
      products_search_text: {
        Args: { p: Database["public"]["Tables"]["products"]["Row"] }
        Returns: string
      }
      search_products: {
        Args: {
          category_filter?: string
          max_price_filter?: number
          result_limit?: number
          search_query: string
          workspace_uuid: string
        }
        Returns: {
          description: string
          id: string
          image_url: string
          price: number
          similarity_score: number
          sku: string
          stock: number
          title: string
          variant_options: Json
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
