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
      combo_items: {
        Row: {
          child_product_id: string
          created_at: string
          id: string
          parent_product_id: string
          quantity: number
        }
        Insert: {
          child_product_id: string
          created_at?: string
          id?: string
          parent_product_id: string
          quantity?: number
        }
        Update: {
          child_product_id?: string
          created_at?: string
          id?: string
          parent_product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_child_product_id_fkey"
            columns: ["child_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      customer_carts: {
        Row: {
          created_at: string
          establishment_slug: string
          id: string
          items: Json
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_slug: string
          id?: string
          items?: Json
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_slug?: string
          id?: string
          items?: Json
          phone?: string
          updated_at?: string
        }
        Relationships: []
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
      driver_profiles: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string
          address_street: string | null
          cep: string | null
          cnh_category: string | null
          cnh_number: string | null
          created_at: string | null
          has_bag: boolean | null
          has_machine: boolean | null
          id: string
          is_onboarding_complete: boolean | null
          license_plate: string | null
          profile_photo_url: string | null
          rating_avg: number | null
          total_deliveries: number | null
          vehicle_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number: string
          address_street?: string | null
          cep?: string | null
          cnh_category?: string | null
          cnh_number?: string | null
          created_at?: string | null
          has_bag?: boolean | null
          has_machine?: boolean | null
          id: string
          is_onboarding_complete?: boolean | null
          license_plate?: string | null
          profile_photo_url?: string | null
          rating_avg?: number | null
          total_deliveries?: number | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string
          address_street?: string | null
          cep?: string | null
          cnh_category?: string | null
          cnh_number?: string | null
          created_at?: string | null
          has_bag?: boolean | null
          has_machine?: boolean | null
          id?: string
          is_onboarding_complete?: boolean | null
          license_plate?: string | null
          profile_photo_url?: string | null
          rating_avg?: number | null
          total_deliveries?: number | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_reviews: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          establishment_id: string
          id: string
          job_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          establishment_id: string
          id?: string
          job_id?: string | null
          rating?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          establishment_id?: string
          id?: string
          job_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_reviews: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          establishment_id: string
          id: string
          job_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          establishment_id: string
          id?: string
          job_id?: string | null
          rating?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          establishment_id?: string
          id?: string
          job_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "establishment_reviews_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_reviews_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: Json | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          base_fee: number | null
          cancel_at_period_end: boolean
          checkout_expires_at: string | null
          cnpj: string | null
          cover_url: string | null
          created_at: string
          current_checkout_id: string | null
          current_checkout_url: string | null
          id: string
          is_open: boolean | null
          km_extra_price: number | null
          km_included: number | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          niche: string | null
          notification_sound_url: string | null
          onboarding_completed: boolean | null
          operating_hours: Json | null
          owner_id: string
          plan_name: string
          plan_status: string
          push_notify_statuses: Json | null
          slug: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          base_fee?: number | null
          cancel_at_period_end?: boolean
          checkout_expires_at?: string | null
          cnpj?: string | null
          cover_url?: string | null
          created_at?: string
          current_checkout_id?: string | null
          current_checkout_url?: string | null
          id?: string
          is_open?: boolean | null
          km_extra_price?: number | null
          km_included?: number | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          niche?: string | null
          notification_sound_url?: string | null
          onboarding_completed?: boolean | null
          operating_hours?: Json | null
          owner_id: string
          plan_name?: string
          plan_status?: string
          push_notify_statuses?: Json | null
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          base_fee?: number | null
          cancel_at_period_end?: boolean
          checkout_expires_at?: string | null
          cnpj?: string | null
          cover_url?: string | null
          created_at?: string
          current_checkout_id?: string | null
          current_checkout_url?: string | null
          id?: string
          is_open?: boolean | null
          km_extra_price?: number | null
          km_included?: number | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          niche?: string | null
          notification_sound_url?: string | null
          onboarding_completed?: boolean | null
          operating_hours?: Json | null
          owner_id?: string
          plan_name?: string
          plan_status?: string
          push_notify_statuses?: Json | null
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      fleet_history: {
        Row: {
          driver_id: string | null
          establishment_id: string | null
          hired_at: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          driver_id?: string | null
          establishment_id?: string | null
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          driver_id?: string | null
          establishment_id?: string | null
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_history_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
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
      job_applications: {
        Row: {
          applied_at: string | null
          driver_id: string | null
          id: string
          job_id: string | null
          status: string | null
        }
        Insert: {
          applied_at?: string | null
          driver_id?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
        }
        Update: {
          applied_at?: string | null
          driver_id?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          bonus_value: number | null
          created_at: string | null
          description: string | null
          driver_id: string | null
          end_time: string | null
          establishment_id: string | null
          extended_minutes: number | null
          extension_confirmed: boolean | null
          fixed_value: number | null
          hiring_type: string | null
          id: string
          km_value: number | null
          payment_type: string | null
          requirements: Json | null
          shift_type: string | null
          start_time: string | null
          status: string | null
          title: string
        }
        Insert: {
          bonus_value?: number | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          end_time?: string | null
          establishment_id?: string | null
          extended_minutes?: number | null
          extension_confirmed?: boolean | null
          fixed_value?: number | null
          hiring_type?: string | null
          id?: string
          km_value?: number | null
          payment_type?: string | null
          requirements?: Json | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          title: string
        }
        Update: {
          bonus_value?: number | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          end_time?: string | null
          establishment_id?: string | null
          extended_minutes?: number | null
          extension_confirmed?: boolean | null
          fixed_value?: number | null
          hiring_type?: string | null
          id?: string
          km_value?: number | null
          payment_type?: string | null
          requirements?: Json | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
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
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
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
          driver_id: string | null
          establishment_id: string
          id: string
          lat: number | null
          lng: number | null
          observations: string | null
          payment_method: string | null
          shipping_fee: number | null
          started_at: string | null
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
          driver_id?: string | null
          establishment_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          observations?: string | null
          payment_method?: string | null
          shipping_fee?: number | null
          started_at?: string | null
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
          driver_id?: string | null
          establishment_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          observations?: string | null
          payment_method?: string | null
          shipping_fee?: number | null
          started_at?: string | null
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
      payments: {
        Row: {
          amount: number
          created_at: string
          establishment_id: string
          gateway_name: string
          gateway_transaction_id: string | null
          id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          establishment_id: string
          gateway_name?: string
          gateway_transaction_id?: string | null
          id?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          establishment_id?: string
          gateway_name?: string
          gateway_transaction_id?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_establishment_id_fkey"
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
          is_promo: boolean
          name: string
          order_index: number | null
          price: number
          promo_price: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_promo?: boolean
          name: string
          order_index?: number | null
          price?: number
          promo_price?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_promo?: boolean
          name?: string
          order_index?: number | null
          price?: number
          promo_price?: number | null
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
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          establishment_id: string | null
          id: string
          keys_auth: string
          keys_p256dh: string
          phone: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          establishment_id?: string | null
          id?: string
          keys_auth: string
          keys_p256dh: string
          phone?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          establishment_id?: string | null
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          phone?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          establishment_id: string
          gateway_name: string
          gateway_subscription_id: string | null
          id: string
          next_billing_date: string | null
          plan_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          gateway_name?: string
          gateway_subscription_id?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          gateway_name?: string
          gateway_subscription_id?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_job: {
        Args: { _application_id: string; _driver_id: string; _job_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transition_job_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "driver"
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
      app_role: ["owner", "driver"],
    },
  },
} as const
