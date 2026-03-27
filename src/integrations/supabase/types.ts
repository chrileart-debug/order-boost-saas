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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage_history: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_history_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          is_active: boolean | null
          min_purchase: number | null
          type: string
          usage_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          is_active?: boolean | null
          min_purchase?: number | null
          type?: string
          usage_count?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          is_active?: boolean | null
          min_purchase?: number | null
          type?: string
          usage_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rules: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          is_active: boolean
          max_cep: string | null
          max_km: number | null
          min_cep: string | null
          min_km: number | null
          name: string
          priority: number
          type: string
          value: number
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          is_active?: boolean
          max_cep?: string | null
          max_km?: number | null
          min_cep?: string | null
          min_km?: number | null
          name?: string
          priority?: number
          type?: string
          value?: number
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_active?: boolean
          max_cep?: string | null
          max_km?: number | null
          min_cep?: string | null
          min_km?: number | null
          name?: string
          priority?: number
          type?: string
          value?: number
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address: Json | null
          base_fee: number | null
          cnpj: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_open: boolean | null
          km_extra_price: number | null
          km_included: number | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          niche: string | null
          onboarding_completed: boolean | null
          owner_id: string
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          base_fee?: number | null
          cnpj?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_open?: boolean | null
          km_extra_price?: number | null
          km_included?: number | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          niche?: string | null
          onboarding_completed?: boolean | null
          owner_id: string
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          base_fee?: number | null
          cnpj?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_open?: boolean | null
          km_extra_price?: number | null
          km_included?: number | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          niche?: string | null
          onboarding_completed?: boolean | null
          owner_id?: string
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      group_items: {
        Row: {
          created_at: string
          group_id: string
          id: string
          item_id: string
          max_quantity: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          item_id: string
          max_quantity?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          item_id?: string
          max_quantity?: number
          sort_order?: number
        }
        Relationships: []
      }
      item_library: {
        Row: {
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          is_available: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      order_item_options: {
        Row: {
          created_at: string
          id: string
          option_name: string
          option_price: number | null
          order_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_name?: string
          option_price?: number | null
          order_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_name?: string
          option_price?: number | null
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_text: string | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          discount: number | null
          establishment_id: string
          id: string
          lat: number | null
          lng: number | null
          payment_method: string | null
          shipping_fee: number | null
          status: string
          subtotal: number | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number | null
          establishment_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          payment_method?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number | null
          establishment_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          payment_method?: string | null
          shipping_fee?: number | null
          status?: string
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          product_id?: string
        }
        Relationships: []
      }
      product_option_groups: {
        Row: {
          created_at: string
          establishment_id: string | null
          id: string
          max_selection: number | null
          min_selection: number | null
          name: string
          product_id: string | null
          selection_type: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          max_selection?: number | null
          min_selection?: number | null
          name: string
          product_id?: string | null
          selection_type?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          max_selection?: number | null
          min_selection?: number | null
          name?: string
          product_id?: string | null
          selection_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price: number | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price?: number | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          order_index: number | null
          price: number
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          order_index?: number | null
          price?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          order_index?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
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
