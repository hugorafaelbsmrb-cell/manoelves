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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_items: {
        Row: {
          appointment_id: string
          duration_minutes: number
          id: string
          price_cents: number
          service_id: string
        }
        Insert: {
          appointment_id: string
          duration_minutes: number
          id?: string
          price_cents: number
          service_id: string
        }
        Update: {
          appointment_id?: string
          duration_minutes?: number
          id?: string
          price_cents?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          barber_id: string
          client_email: string | null
          client_name: string
          client_whatsapp: string
          combo_id: string | null
          created_at: string
          end_at: string
          id: string
          notes: string | null
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          total_cents: number
          updated_at: string
        }
        Insert: {
          barber_id: string
          client_email?: string | null
          client_name: string
          client_whatsapp: string
          combo_id?: string | null
          created_at?: string
          end_at: string
          id?: string
          notes?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total_cents?: number
          updated_at?: string
        }
        Update: {
          barber_id?: string
          client_email?: string | null
          client_name?: string
          client_whatsapp?: string
          combo_id?: string | null
          created_at?: string
          end_at?: string
          id?: string
          notes?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          no_show_deposit_cents: number
          no_show_protection: boolean
          phone: string | null
          pix_key: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          no_show_deposit_cents?: number
          no_show_protection?: boolean
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          no_show_deposit_cents?: number
          no_show_protection?: boolean
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buffer_settings: {
        Row: {
          barber_id: string
          buffer_minutes: number
        }
        Insert: {
          barber_id: string
          buffer_minutes?: number
        }
        Update: {
          barber_id?: string
          buffer_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "buffer_settings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          phone?: string
        }
        Relationships: []
      }
      combo_services: {
        Row: {
          combo_id: string
          service_id: string
        }
        Insert: {
          combo_id: string
          service_id: string
        }
        Update: {
          combo_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_services_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          barber_id: string
          product_pct: number
          service_pct: number
        }
        Insert: {
          barber_id: string
          product_pct?: number
          service_pct?: number
        }
        Update: {
          barber_id?: string
          product_pct?: number
          service_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          id: string
          mp_access_token: string | null
          mp_public_key: string | null
          mp_webhook_secret: string | null
          sighor_api_key: string | null
          uazapi_token: string | null
          uazapi_url: string | null
          updated_at: string
          whatsapp_phone_id: string | null
          whatsapp_token: string | null
        }
        Insert: {
          id?: string
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          sighor_api_key?: string | null
          uazapi_token?: string | null
          uazapi_url?: string | null
          updated_at?: string
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
        }
        Update: {
          id?: string
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          sighor_api_key?: string | null
          uazapi_token?: string | null
          uazapi_url?: string | null
          updated_at?: string
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          payload: string
          to_name: string | null
          to_phone: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["message_kind"]
          payload: string
          to_name?: string | null
          to_phone: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          payload?: string
          to_name?: string | null
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          description: string
          id: string
          kind: string
          order_id: string
          qty: number
          ref_id: string
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          description: string
          id?: string
          kind: string
          order_id: string
          qty?: number
          ref_id: string
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          description?: string
          id?: string
          kind?: string
          order_id?: string
          qty?: number
          ref_id?: string
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          appointment_id: string | null
          barber_id: string
          client_name: string
          client_whatsapp: string | null
          closed_at: string | null
          created_at: string
          id: string
          invoice_number: string | null
          mp_init_point: string | null
          mp_payment_id: string | null
          mp_payment_pix_id: string | null
          mp_preference_id: string | null
          payment_status: string | null
          pix_code: string | null
          pix_qr_base64: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          barber_id: string
          client_name: string
          client_whatsapp?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          invoice_number?: string | null
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_payment_pix_id?: string | null
          mp_preference_id?: string | null
          payment_status?: string | null
          pix_code?: string | null
          pix_qr_base64?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string
          client_name?: string
          client_whatsapp?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          invoice_number?: string | null
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_payment_pix_id?: string | null
          mp_preference_id?: string | null
          payment_status?: string | null
          pix_code?: string | null
          pix_qr_base64?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          barber_amount_cents: number
          barber_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          owner_amount_cents: number
          paid_at: string
          total_cents: number
        }
        Insert: {
          barber_amount_cents?: number
          barber_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          owner_amount_cents?: number
          paid_at?: string
          total_cents: number
        }
        Update: {
          barber_amount_cents?: number
          barber_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          owner_amount_cents?: number
          paid_at?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_cents: number
          created_at: string
          id: string
          is_active: boolean
          is_internal_use: boolean
          low_stock_alert: number
          name: string
          price_cents: number
          stock: number
          updated_at: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal_use?: boolean
          low_stock_alert?: number
          name: string
          price_cents: number
          stock?: number
          updated_at?: string
        }
        Update: {
          cost_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal_use?: boolean
          low_stock_alert?: number
          name?: string
          price_cents?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          monthly_price_cents: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          client_name: string
          client_whatsapp: string
          created_at: string
          credits_remaining: number
          id: string
          is_active: boolean
          monthly_price_cents: number
          mp_init_point: string | null
          mp_preapproval_id: string | null
          mp_status: string | null
          next_charge_at: string
          plan_name: string
        }
        Insert: {
          client_name: string
          client_whatsapp: string
          created_at?: string
          credits_remaining?: number
          id?: string
          is_active?: boolean
          monthly_price_cents: number
          mp_init_point?: string | null
          mp_preapproval_id?: string | null
          mp_status?: string | null
          next_charge_at: string
          plan_name: string
        }
        Update: {
          client_name?: string
          client_whatsapp?: string
          created_at?: string
          credits_remaining?: number
          id?: string
          is_active?: boolean
          monthly_price_cents?: number
          mp_init_point?: string | null
          mp_preapproval_id?: string | null
          mp_status?: string | null
          next_charge_at?: string
          plan_name?: string
        }
        Relationships: []
      }
      time_off: {
        Row: {
          barber_id: string
          end_at: string
          id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          barber_id: string
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
        }
        Update: {
          barber_id?: string
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          barber_id: string
          client_name: string
          client_whatsapp: string
          created_at: string
          id: string
          notified_at: string | null
          preferred_period: string | null
        }
        Insert: {
          barber_id: string
          client_name: string
          client_whatsapp: string
          created_at?: string
          id?: string
          notified_at?: string | null
          preferred_period?: string | null
        }
        Update: {
          barber_id?: string
          client_name?: string
          client_whatsapp?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          preferred_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          barber_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          barber_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          barber_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "barber"
      appointment_status:
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      message_kind:
        | "confirmation"
        | "reminder_24h"
        | "reminder_2h"
        | "reengagement"
        | "waitlist"
        | "subscription"
        | "pix"
      order_status: "open" | "closed" | "cancelled"
      payment_method: "pix" | "card" | "cash"
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
    Enums: {
      app_role: ["owner", "barber"],
      appointment_status: [
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      message_kind: [
        "confirmation",
        "reminder_24h",
        "reminder_2h",
        "reengagement",
        "waitlist",
        "subscription",
        "pix",
      ],
      order_status: ["open", "closed", "cancelled"],
      payment_method: ["pix", "card", "cash"],
    },
  },
} as const
