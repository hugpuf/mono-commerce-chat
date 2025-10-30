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
      catalog_sources: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          provider_config: Json | null
          status: string
          sync_error: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider: string
          provider_config?: Json | null
          status?: string
          sync_error?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          provider_config?: Json | null
          status?: string
          sync_error?: string | null
          updated_at?: string
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
      conversations: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_account_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_account_id?: string
          workspace_id?: string
        }
        Relationships: [
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
          name: string
          status: string
          updated_at: string
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
          name: string
          status?: string
          updated_at?: string
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
          name?: string
          status?: string
          updated_at?: string
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
          compare_at_price: number | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          image_gallery: Json | null
          image_url: string | null
          is_variant: boolean
          metadata: Json | null
          parent_product_id: string | null
          price: number
          sku: string
          status: string
          stock: number
          tags: string[] | null
          title: string
          updated_at: string
          variant_options: Json | null
          workspace_id: string
        }
        Insert: {
          catalog_source_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          image_gallery?: Json | null
          image_url?: string | null
          is_variant?: boolean
          metadata?: Json | null
          parent_product_id?: string | null
          price: number
          sku: string
          status?: string
          stock?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          variant_options?: Json | null
          workspace_id: string
        }
        Update: {
          catalog_source_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          image_gallery?: Json | null
          image_url?: string | null
          is_variant?: boolean
          metadata?: Json | null
          parent_product_id?: string | null
          price?: number
          sku?: string
          status?: string
          stock?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          variant_options?: Json | null
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
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
