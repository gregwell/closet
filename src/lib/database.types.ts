// Hand-written to match supabase/migrations/20260909132811_create_orders_and_order_items.sql
// and 20260909155518_order_schema_review_fixes.sql. Update by hand if the schema changes —
// no Supabase CLI project link is used in this project.
import type { ProductStatus } from "@/types";

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          user_id: string;
          store: string;
          order_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store: string;
          order_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store?: string;
          order_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          brand: string;
          type: string;
          price_cents: number;
          description: string | null;
          category: string | null;
          status: ProductStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          brand: string;
          type: string;
          price_cents: number;
          description?: string | null;
          category?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          brand?: string;
          type?: string;
          price_cents?: number;
          description?: string | null;
          category?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
