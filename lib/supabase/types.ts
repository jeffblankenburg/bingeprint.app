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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      credits: {
        Row: {
          character: string | null
          created_at: string
          id: string
          order: number | null
          person_id: string
          role: Database["public"]["Enums"]["credit_role"]
          show_id: string
        }
        Insert: {
          character?: string | null
          created_at?: string
          id?: string
          order?: number | null
          person_id: string
          role: Database["public"]["Enums"]["credit_role"]
          show_id: string
        }
        Update: {
          character?: string | null
          created_at?: string
          id?: string
          order?: number | null
          person_id?: string
          role?: Database["public"]["Enums"]["credit_role"]
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          name: string | null
          overview: string | null
          runtime: number | null
          season_id: string | null
          season_number: number
          show_id: string
          still_path: string | null
          tmdb_id: number | null
          updated_at: string
          vote_average: number | null
          vote_count: number | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_number: number
          id?: string
          name?: string | null
          overview?: string | null
          runtime?: number | null
          season_id?: string | null
          season_number: number
          show_id: string
          still_path?: string | null
          tmdb_id?: number | null
          updated_at?: string
          vote_average?: number | null
          vote_count?: number | null
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_number?: number
          id?: string
          name?: string | null
          overview?: string | null
          runtime?: number | null
          season_id?: string | null
          season_number?: number
          show_id?: string
          still_path?: string | null
          tmdb_id?: number | null
          updated_at?: string
          vote_average?: number | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          tmdb_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tmdb_id: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tmdb_id?: number
        }
        Relationships: []
      }
      images: {
        Row: {
          aspect_ratio: number | null
          created_at: string
          file_path: string
          height: number | null
          id: string
          image_type: string
          show_id: string
          vote_average: number | null
          width: number | null
        }
        Insert: {
          aspect_ratio?: number | null
          created_at?: string
          file_path: string
          height?: number | null
          id?: string
          image_type: string
          show_id: string
          vote_average?: number | null
          width?: number | null
        }
        Update: {
          aspect_ratio?: number | null
          created_at?: string
          file_path?: string
          height?: number | null
          id?: string
          image_type?: string
          show_id?: string
          vote_average?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          created_at: string
          id: string
          logo_path: string | null
          name: string
          origin_country: string | null
          tmdb_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          logo_path?: string | null
          name: string
          origin_country?: string | null
          tmdb_id: number
        }
        Update: {
          created_at?: string
          id?: string
          logo_path?: string | null
          name?: string
          origin_country?: string | null
          tmdb_id?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          id: string
          imdb_id: string | null
          known_for_department: string | null
          name: string
          popularity: number | null
          profile_path: string | null
          synced_at: string
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imdb_id?: string | null
          known_for_department?: string | null
          name: string
          popularity?: number | null
          profile_path?: string | null
          synced_at?: string
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imdb_id?: string | null
          known_for_department?: string | null
          name?: string
          popularity?: number | null
          profile_path?: string | null
          synced_at?: string
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          onboarded_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_public?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      release_events: {
        Row: {
          created_at: string
          episode_id: string | null
          episode_number: number | null
          id: string
          kind: Database["public"]["Enums"]["release_event_kind"]
          release_date: string
          season_number: number | null
          show_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          episode_number?: number | null
          id?: string
          kind: Database["public"]["Enums"]["release_event_kind"]
          release_date: string
          season_number?: number | null
          show_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          episode_number?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["release_event_kind"]
          release_date?: string
          season_number?: number | null
          show_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_events_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_events_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          air_date: string | null
          created_at: string
          episode_count: number | null
          id: string
          name: string | null
          overview: string | null
          poster_path: string | null
          season_number: number
          show_id: string
          tmdb_id: number | null
          updated_at: string
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          name?: string | null
          overview?: string | null
          poster_path?: string | null
          season_number: number
          show_id: string
          tmdb_id?: number | null
          updated_at?: string
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          name?: string | null
          overview?: string | null
          poster_path?: string | null
          season_number?: number
          show_id?: string
          tmdb_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_genres: {
        Row: {
          genre_id: string
          show_id: string
        }
        Insert: {
          genre_id: string
          show_id: string
        }
        Update: {
          genre_id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_genres_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_networks: {
        Row: {
          network_id: string
          show_id: string
        }
        Insert: {
          network_id: string
          show_id: string
        }
        Update: {
          network_id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_networks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_networks_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_streaming: {
        Row: {
          offer_type: string
          region: string
          service_id: string
          show_id: string
        }
        Insert: {
          offer_type?: string
          region?: string
          service_id: string
          show_id: string
        }
        Update: {
          offer_type?: string
          region?: string
          service_id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_streaming_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "streaming_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_streaming_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          adult: boolean
          backdrop_path: string | null
          created_at: string
          details_synced_at: string | null
          episode_run_time: number | null
          first_air_date: string | null
          homepage: string | null
          id: string
          imdb_id: string | null
          in_production: boolean | null
          last_air_date: string | null
          name: string
          number_of_episodes: number | null
          number_of_seasons: number | null
          original_language: string | null
          original_name: string | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          show_type: string | null
          slug: string | null
          status: string | null
          synced_at: string
          tagline: string | null
          tmdb_id: number
          tvdb_id: number | null
          updated_at: string
          vote_average: number | null
          vote_count: number | null
        }
        Insert: {
          adult?: boolean
          backdrop_path?: string | null
          created_at?: string
          details_synced_at?: string | null
          episode_run_time?: number | null
          first_air_date?: string | null
          homepage?: string | null
          id?: string
          imdb_id?: string | null
          in_production?: boolean | null
          last_air_date?: string | null
          name: string
          number_of_episodes?: number | null
          number_of_seasons?: number | null
          original_language?: string | null
          original_name?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          show_type?: string | null
          slug?: string | null
          status?: string | null
          synced_at?: string
          tagline?: string | null
          tmdb_id: number
          tvdb_id?: number | null
          updated_at?: string
          vote_average?: number | null
          vote_count?: number | null
        }
        Update: {
          adult?: boolean
          backdrop_path?: string | null
          created_at?: string
          details_synced_at?: string | null
          episode_run_time?: number | null
          first_air_date?: string | null
          homepage?: string | null
          id?: string
          imdb_id?: string | null
          in_production?: boolean | null
          last_air_date?: string | null
          name?: string
          number_of_episodes?: number | null
          number_of_seasons?: number | null
          original_language?: string | null
          original_name?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          show_type?: string | null
          slug?: string | null
          status?: string | null
          synced_at?: string
          tagline?: string | null
          tmdb_id?: number
          tvdb_id?: number | null
          updated_at?: string
          vote_average?: number | null
          vote_count?: number | null
        }
        Relationships: []
      }
      streaming_services: {
        Row: {
          created_at: string
          id: string
          logo_path: string | null
          name: string
          tmdb_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          logo_path?: string | null
          name: string
          tmdb_id: number
        }
        Update: {
          created_at?: string
          id?: string
          logo_path?: string | null
          name?: string
          tmdb_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog_upsert_skeleton: { Args: { rows: Json }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      credit_role: "cast" | "creator" | "director" | "writer" | "producer"
      reaction: "loved" | "liked" | "not_for_me"
      recommendation_feedback_kind:
        | "interested"
        | "not_interested"
        | "already_watched"
        | "not_my_thing"
      release_event_kind:
        | "new_episode"
        | "season_premiere"
        | "premiere_announced"
        | "renewed"
        | "canceled"
        | "finale_approaching"
      show_status:
        | "want_to_watch"
        | "watching"
        | "watched"
        | "paused"
        | "abandoned"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      credit_role: ["cast", "creator", "director", "writer", "producer"],
      reaction: ["loved", "liked", "not_for_me"],
      recommendation_feedback_kind: [
        "interested",
        "not_interested",
        "already_watched",
        "not_my_thing",
      ],
      release_event_kind: [
        "new_episode",
        "season_premiere",
        "premiere_announced",
        "renewed",
        "canceled",
        "finale_approaching",
      ],
      show_status: [
        "want_to_watch",
        "watching",
        "watched",
        "paused",
        "abandoned",
      ],
    },
  },
} as const
