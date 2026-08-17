export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_preferences: {
        Row: {
          user_id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      venues: {
        Row: {
          id: string;
          provider: string;
          provider_venue_id: string | null;
          name: string;
          city: string | null;
          state: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          provider_venue_id?: string | null;
          name: string;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_venue_id?: string | null;
          name?: string;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      events: {
        Row: {
          id: string;
          provider: string;
          provider_event_id: string;
          name: string;
          description: string | null;
          event_date: string | null;
          event_time: string | null;
          timezone: string | null;
          venue_id: string | null;
          venue_name: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          image_url: string | null;
          ticket_url: string | null;
          starting_price: number | null;
          currency: string | null;
          category: string | null;
          subcategory: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          provider_event_id: string;
          name: string;
          description?: string | null;
          event_date?: string | null;
          event_time?: string | null;
          timezone?: string | null;
          venue_id?: string | null;
          venue_name?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          image_url?: string | null;
          ticket_url?: string | null;
          starting_price?: number | null;
          currency?: string | null;
          category?: string | null;
          subcategory?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_event_id?: string;
          name?: string;
          description?: string | null;
          event_date?: string | null;
          event_time?: string | null;
          timezone?: string | null;
          venue_id?: string | null;
          venue_name?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          image_url?: string | null;
          ticket_url?: string | null;
          starting_price?: number | null;
          currency?: string | null;
          category?: string | null;
          subcategory?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };

      saved_events: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          saved_price: number | null;
          notify: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          saved_price?: number | null;
          notify?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          saved_price?: number | null;
          notify?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
