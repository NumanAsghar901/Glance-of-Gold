// Generated from the Supabase project. Regenerate after every migration.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          coupon_code: string | null
          ends_at: string | null
          id: number
          is_active: boolean
          link_url: string | null
          message: string
          sort: number
          starts_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          ends_at?: string | null
          id?: never
          is_active?: boolean
          link_url?: string | null
          message: string
          sort?: number
          starts_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          ends_at?: string | null
          id?: never
          is_active?: boolean
          link_url?: string | null
          message?: string
          sort?: number
          starts_at?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          cta_label: string | null
          cta_url: string | null
          heading: string | null
          id: number
          image_url: string
          is_active: boolean
          mobile_image_url: string | null
          sort: number
          subheading: string | null
        }
        Insert: {
          cta_label?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: never
          image_url: string
          is_active?: boolean
          mobile_image_url?: string | null
          sort?: number
          subheading?: string | null
        }
        Update: {
          cta_label?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: never
          image_url?: string
          is_active?: boolean
          mobile_image_url?: string | null
          sort?: number
          subheading?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: number
          created_at: string
          id: number
          order_id: number
          phone: string
        }
        Insert: {
          coupon_id: number
          created_at?: string
          id?: never
          order_id: number
          phone: string
        }
        Update: {
          coupon_id?: number
          created_at?: string
          id?: never
          order_id?: number
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
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
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at: string | null
          free_shipping: boolean
          id: number
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          once_per_phone: boolean
          starts_at: string | null
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          free_shipping?: boolean
          id?: never
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          once_per_phone?: boolean
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          free_shipping?: boolean
          id?: never
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          once_per_phone?: boolean
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      email_log: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: number
          kind: string
          order_id: number | null
          status: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          kind: string
          order_id?: number | null
          status?: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          kind?: string
          order_id?: number | null
          status?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_offer_products: {
        Row: {
          offer_id: number
          variant_id: number
        }
        Insert: {
          offer_id: number
          variant_id: number
        }
        Update: {
          offer_id?: number
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_offer_products_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "gift_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_offer_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_offers: {
        Row: {
          created_at: string
          ends_at: string | null
          id: number
          is_active: boolean
          min_items: number
          name: string
          starts_at: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: never
          is_active?: boolean
          min_items?: number
          name: string
          starts_at?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: never
          is_active?: boolean
          min_items?: number
          name?: string
          starts_at?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: number
          note: string | null
          order_id: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          note?: string | null
          order_id: number
          status: string
        }
        Update: {
          created_at?: string
          id?: never
          note?: string | null
          order_id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          image_url: string | null
          is_gift: boolean
          name: string
          order_id: number
          product_id: number | null
          qty: number
          unit_price: number
          variant_id: number | null
          variant_name: string | null
        }
        Insert: {
          id?: never
          image_url?: string | null
          is_gift?: boolean
          name: string
          order_id: number
          product_id?: number | null
          qty: number
          unit_price: number
          variant_id?: number | null
          variant_name?: string | null
        }
        Update: {
          id?: never
          image_url?: string | null
          is_gift?: boolean
          name?: string
          order_id?: number
          product_id?: number | null
          qty?: number
          unit_price?: number
          variant_id?: number | null
          variant_name?: string | null
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          address: string
          cancel_reason: string | null
          city: string
          coupon_code: string | null
          courier: string | null
          created_at: string
          customer_name: string
          discount: number
          email: string | null
          id: number
          landmark: string | null
          meta_event_id: string
          notes: string | null
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          province: string
          shipping_fee: number
          stock_released: boolean
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          whatsapp_confirmed_at: string | null
        }
        Insert: {
          access_token?: string
          address: string
          cancel_reason?: string | null
          city: string
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_name: string
          discount?: number
          email?: string | null
          id?: never
          landmark?: string | null
          meta_event_id?: string
          notes?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          province: string
          shipping_fee?: number
          stock_released?: boolean
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          whatsapp_confirmed_at?: string | null
        }
        Update: {
          access_token?: string
          address?: string
          cancel_reason?: string | null
          city?: string
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_name?: string
          discount?: number
          email?: string | null
          id?: never
          landmark?: string | null
          meta_event_id?: string
          notes?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          province?: string
          shipping_fee?: number
          stock_released?: boolean
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          whatsapp_confirmed_at?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          account_number: string | null
          account_title: string | null
          bank_name: string | null
          iban: string | null
          id: number
          instructions: string | null
          is_active: boolean
          method: Database["public"]["Enums"]["payment_method"]
          sort: number
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          iban?: string | null
          id?: never
          instructions?: string | null
          is_active?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          sort?: number
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          iban?: string | null
          id?: never
          instructions?: string | null
          is_active?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          sort?: number
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          created_at: string
          id: number
          order_id: number
          screenshot_path: string | null
          transaction_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          order_id: number
          screenshot_path?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          order_id?: number
          screenshot_path?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          blur_data_url: string | null
          id: number
          product_id: number
          sort: number
          url: string
        }
        Insert: {
          alt?: string
          blur_data_url?: string | null
          id?: never
          product_id: number
          sort?: number
          url: string
        }
        Update: {
          alt?: string
          blur_data_url?: string | null
          id?: never
          product_id?: number
          sort?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          design: string | null
          id: number
          is_active: boolean
          name: string
          price_override: number | null
          product_id: number
          size: string | null
          sku: string
          sort: number
          stock: number
        }
        Insert: {
          color?: string | null
          design?: string | null
          id?: never
          is_active?: boolean
          name?: string
          price_override?: number | null
          product_id: number
          size?: string | null
          sku: string
          sort?: number
          stock?: number
        }
        Update: {
          color?: string | null
          design?: string | null
          id?: never
          is_active?: boolean
          name?: string
          price_override?: number | null
          product_id?: number
          size?: string | null
          sku?: string
          sort?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_multiple: boolean
          category_id: number | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          is_featured: boolean
          is_sample: boolean
          material: string | null
          name: string
          option_label: string
          price: number
          rating_avg: number
          rating_count: number
          search: unknown
          slug: string
          sold_count: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          allow_multiple?: boolean
          category_id?: number | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          is_featured?: boolean
          is_sample?: boolean
          material?: string | null
          name: string
          option_label?: string
          price: number
          rating_avg?: number
          rating_count?: number
          search?: unknown
          slug: string
          sold_count?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allow_multiple?: boolean
          category_id?: number | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          is_featured?: boolean
          is_sample?: boolean
          material?: string | null
          name?: string
          option_label?: string
          price?: number
          rating_avg?: number
          rating_count?: number
          search?: unknown
          slug?: string
          sold_count?: number
          tags?: string[]
          updated_at?: string
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
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          city: string | null
          comment: string
          created_at: string
          id: number
          is_sample: boolean
          is_visible: boolean
          product_id: number
          rating: number
        }
        Insert: {
          author_name: string
          city?: string | null
          comment: string
          created_at?: string
          id?: never
          is_sample?: boolean
          is_visible?: boolean
          product_id: number
          rating: number
        }
        Update: {
          author_name?: string
          city?: string | null
          comment?: string
          created_at?: string
          id?: never
          is_sample?: boolean
          is_visible?: boolean
          product_id?: number
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: { Args: { payload: Json }; Returns: Json }
      search_products: {
        Args: { lim?: number; q: string }
        Returns: {
          category_id: number | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          is_featured: boolean
          is_sample: boolean
          material: string | null
          name: string
          price: number
          rating_avg: number
          rating_count: number
          search: unknown
          slug: string
          sold_count: number
          tags: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      discount_type: "percent" | "fixed"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_method: "cod" | "jazzcash" | "easypaisa" | "bank_transfer"
      payment_status:
        | "unpaid"
        | "awaiting_verification"
        | "paid"
        | "failed"
        | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Update"]

export type Enums<EnumName extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][EnumName]
