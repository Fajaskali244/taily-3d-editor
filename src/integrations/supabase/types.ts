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
      cart_items: {
        Row: {
          created_at: string
          design_id: string
          id: string
          quantity: number
          snapshot: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          quantity?: number
          snapshot?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          quantity?: number
          snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          created_at: string | null
          glb_path: string
          height_mm: number | null
          id: string
          kind: Database["public"]["Enums"]["catalog_item_kind"]
          name: string
          price: number
          slug: string | null
          tags: string[] | null
          thumbnail: string
          thumbnail_path: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          glb_path: string
          height_mm?: number | null
          id?: string
          kind: Database["public"]["Enums"]["catalog_item_kind"]
          name: string
          price: number
          slug?: string | null
          tags?: string[] | null
          thumbnail: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          glb_path?: string
          height_mm?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["catalog_item_kind"]
          name?: string
          price?: number
          slug?: string | null
          tags?: string[] | null
          thumbnail?: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_thumbnails: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      designs: {
        Row: {
          created_at: string
          id: string
          is_published: boolean | null
          name: string
          params: Json
          preview_url: string | null
          product_id: string | null
          published_at: string | null
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean | null
          name: string
          params?: Json
          preview_url?: string | null
          product_id?: string | null
          published_at?: string | null
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean | null
          name?: string
          params?: Json
          preview_url?: string | null
          product_id?: string | null
          published_at?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      events_analytics: {
        Row: {
          design_id: string | null
          event: string
          id: number
          order_id: string | null
          props: Json | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          design_id?: string | null
          event: string
          id?: number
          order_id?: string | null
          props?: Json | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          design_id?: string | null
          event?: string
          id?: number
          order_id?: string | null
          props?: Json | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          payload?: Json
          updated_at?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          payload?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      generation_tasks: {
        Row: {
          created_at: string | null
          design_id: string | null
          error: Json | null
          finished_at: string | null
          id: string
          input_image_urls: string[] | null
          meshy_task_id: string | null
          mode: string
          model_fbx_url: string | null
          model_glb_url: string | null
          model_usdz_url: string | null
          progress: number | null
          prompt: string | null
          requested_ai_model: string | null
          requested_polycount: number | null
          requested_should_remesh: boolean | null
          requested_should_texture: boolean | null
          source: Database["public"]["Enums"]["generation_source"]
          started_at: string | null
          status: Database["public"]["Enums"]["generation_status"]
          texture_urls: Json | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          design_id?: string | null
          error?: Json | null
          finished_at?: string | null
          id?: string
          input_image_urls?: string[] | null
          meshy_task_id?: string | null
          mode: string
          model_fbx_url?: string | null
          model_glb_url?: string | null
          model_usdz_url?: string | null
          progress?: number | null
          prompt?: string | null
          requested_ai_model?: string | null
          requested_polycount?: number | null
          requested_should_remesh?: boolean | null
          requested_should_texture?: boolean | null
          source: Database["public"]["Enums"]["generation_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          texture_urls?: Json | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          design_id?: string | null
          error?: Json | null
          finished_at?: string | null
          id?: string
          input_image_urls?: string[] | null
          meshy_task_id?: string | null
          mode?: string
          model_fbx_url?: string | null
          model_glb_url?: string | null
          model_usdz_url?: string | null
          progress?: number | null
          prompt?: string | null
          requested_ai_model?: string | null
          requested_polycount?: number | null
          requested_should_remesh?: boolean | null
          requested_should_texture?: boolean | null
          source?: Database["public"]["Enums"]["generation_source"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          texture_urls?: Json | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_tasks_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          design_id: string
          id: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
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
          created_at: string
          discount_total: number | null
          fulfillment_status: string | null
          grand_total: number | null
          id: string
          idempotency_key: string | null
          payment_method: string | null
          payment_status: string
          shipping_address: string | null
          shipping_address_id: string | null
          shipping_cost: number | null
          subtotal: number | null
          tax_total: number | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_total?: number | null
          fulfillment_status?: string | null
          grand_total?: number | null
          id?: string
          idempotency_key?: string | null
          payment_method?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          subtotal?: number | null
          tax_total?: number | null
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_total?: number | null
          fulfillment_status?: string | null
          grand_total?: number | null
          id?: string
          idempotency_key?: string | null
          payment_method?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          subtotal?: number | null
          tax_total?: number | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "shipping_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor: string
          event: string
          id: number
          order_id: string
          payload: Json | null
          ts: string | null
        }
        Insert: {
          actor: string
          event: string
          id?: number
          order_id: string
          payload?: Json | null
          ts?: string | null
        }
        Update: {
          actor?: string
          event?: string
          id?: number
          order_id?: string
          payload?: Json | null
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          note: string | null
          order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          note?: string | null
          order_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          note?: string | null
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          base_price: number
          color: string | null
          created_at: string | null
          id: string
          material: string | null
          name: string
          product_id: string | null
          ready_to_ship: boolean | null
          sku: string
          weight_grams: number | null
        }
        Insert: {
          base_price: number
          color?: string | null
          created_at?: string | null
          id?: string
          material?: string | null
          name: string
          product_id?: string | null
          ready_to_ship?: boolean | null
          sku: string
          weight_grams?: number | null
        }
        Update: {
          base_price?: number
          color?: string | null
          created_at?: string | null
          id?: string
          material?: string | null
          name?: string
          product_id?: string | null
          ready_to_ship?: boolean | null
          sku?: string
          weight_grams?: number | null
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
          created_at: string | null
          default_price: number
          description: string | null
          id: string
          max_chars: number | null
          min_thickness_mm: number | null
          name: string
          slug: string
          status: string | null
          template_3d_url: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_price: number
          description?: string | null
          id?: string
          max_chars?: number | null
          min_thickness_mm?: number | null
          name: string
          slug: string
          status?: string | null
          template_3d_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_price?: number
          description?: string | null
          id?: string
          max_chars?: number | null
          min_thickness_mm?: number | null
          name?: string
          slug?: string
          status?: string | null
          template_3d_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reference_designs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          params: Json | null
          preview_url: string
          product_id: string | null
          slug: string
          tags: string[] | null
          thumb_url: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          params?: Json | null
          preview_url: string
          product_id?: string | null
          slug: string
          tags?: string[] | null
          thumb_url?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          params?: Json | null
          preview_url?: string
          product_id?: string | null
          slug?: string
          tags?: string[] | null
          thumb_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_designs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_addresses: {
        Row: {
          address1: string
          address2: string | null
          city: string
          country: string
          created_at: string | null
          id: string
          is_default: boolean
          phone: string
          postal_code: string
          province: string
          recipient: string
          user_id: string
        }
        Insert: {
          address1: string
          address2?: string | null
          city: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          phone: string
          postal_code: string
          province: string
          recipient: string
          user_id: string
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          phone?: string
          postal_code?: string
          province?: string
          recipient?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_reference_designs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_featured: boolean | null
          preview_url: string | null
          slug: string | null
          tags: string[] | null
          thumb_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_featured?: boolean | null
          preview_url?: string | null
          slug?: string | null
          tags?: string[] | null
          thumb_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_featured?: boolean | null
          preview_url?: string | null
          slug?: string | null
          tags?: string[] | null
          thumb_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_catalog_items: {
        Args: never
        Returns: {
          created_at: string
          glb_path: string
          height_mm: number
          id: string
          kind: string
          name: string
          price: number
          slug: string
          tags: string[]
          thumbnail: string
          updated_at: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      catalog_item_kind: "keyring" | "bead" | "charm"
      generation_source: "image" | "text" | "multi-image"
      generation_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "SUCCEEDED"
        | "FAILED"
        | "DELETED"
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
      app_role: ["admin", "user"],
      catalog_item_kind: ["keyring", "bead", "charm"],
      generation_source: ["image", "text", "multi-image"],
      generation_status: [
        "PENDING",
        "IN_PROGRESS",
        "SUCCEEDED",
        "FAILED",
        "DELETED",
      ],
    },
  },
} as const
