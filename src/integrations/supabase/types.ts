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
          user_id: string
        }
        Insert: {
          created_at?: string
          design_id: string
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          design_id?: string
          id?: string
          quantity?: number
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
          id: string
          payment_status: string
          shipping_address: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status?: string
          shipping_address: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string
          shipping_address?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
