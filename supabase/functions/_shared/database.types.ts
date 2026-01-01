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
      account_deletion_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string | null
          dead_lettered_at: string | null
          last_error: string | null
          last_error_at: string | null
          last_error_details: Json | null
          max_attempts: number
          next_run_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          dead_lettered_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_error_details?: Json | null
          max_attempts?: number
          next_run_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          dead_lettered_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_error_details?: Json | null
          max_attempts?: number
          next_run_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          game_mode: string
          is_active: boolean | null
          last_used_at: string | null
          note: string | null
          permissions: string[]
          token_hash: string
          token_id: string
          token_value: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          game_mode: string
          is_active?: boolean | null
          last_used_at?: string | null
          note?: string | null
          permissions?: string[]
          token_hash: string
          token_id?: string
          token_value?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          game_mode?: string
          is_active?: boolean | null
          last_used_at?: string | null
          note?: string | null
          permissions?: string[]
          token_hash?: string
          token_id?: string
          token_value?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      team_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          initiated_by: string | null
          target_user: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          initiated_by?: string | null
          target_user?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          initiated_by?: string | null
          target_user?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          game_mode: string
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          game_mode?: string
          joined_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          game_mode?: string
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          game_mode: string
          id: string
          join_code: string | null
          max_members: number | null
          members: Json | null
          name: string | null
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_mode?: string
          id?: string
          join_code?: string | null
          max_members?: number | null
          members?: Json | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_mode?: string
          id?: string
          join_code?: string | null
          max_members?: number | null
          members?: Json | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          enable_manual_task_fail: boolean | null
          hide_global_tasks: boolean | null
          hide_non_kappa_tasks: boolean | null
          hideout_primary_view: string | null
          items_hide_non_fir: boolean | null
          items_team_hide_all: boolean | null
          items_team_hide_hideout: boolean | null
          items_team_hide_non_fir: boolean | null
          locale_override: string | null
          map_team_hide_all: boolean | null
          needed_type_view: string | null
          neededitems_style: string | null
          streamer_mode: boolean | null
          task_map_view: string | null
          task_primary_view: string | null
          task_secondary_view: string | null
          task_team_hide_all: boolean | null
          task_trader_view: string | null
          task_user_view: string | null
          team_hide: Json | null
          updated_at: string | null
          use_automatic_level_calculation: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enable_manual_task_fail?: boolean | null
          hide_global_tasks?: boolean | null
          hide_non_kappa_tasks?: boolean | null
          hideout_primary_view?: string | null
          items_hide_non_fir?: boolean | null
          items_team_hide_all?: boolean | null
          items_team_hide_hideout?: boolean | null
          items_team_hide_non_fir?: boolean | null
          locale_override?: string | null
          map_team_hide_all?: boolean | null
          needed_type_view?: string | null
          neededitems_style?: string | null
          streamer_mode?: boolean | null
          task_map_view?: string | null
          task_primary_view?: string | null
          task_secondary_view?: string | null
          task_team_hide_all?: boolean | null
          task_trader_view?: string | null
          task_user_view?: string | null
          team_hide?: Json | null
          updated_at?: string | null
          use_automatic_level_calculation?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enable_manual_task_fail?: boolean | null
          hide_global_tasks?: boolean | null
          hide_non_kappa_tasks?: boolean | null
          hideout_primary_view?: string | null
          items_hide_non_fir?: boolean | null
          items_team_hide_all?: boolean | null
          items_team_hide_hideout?: boolean | null
          items_team_hide_non_fir?: boolean | null
          locale_override?: string | null
          map_team_hide_all?: boolean | null
          needed_type_view?: string | null
          neededitems_style?: string | null
          streamer_mode?: boolean | null
          task_map_view?: string | null
          task_primary_view?: string | null
          task_secondary_view?: string | null
          task_team_hide_all?: boolean | null
          task_trader_view?: string | null
          task_user_view?: string | null
          team_hide?: Json | null
          updated_at?: string | null
          use_automatic_level_calculation?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string | null
          current_game_mode: string | null
          game_edition: number | null
          pve_data: Json | null
          pvp_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_game_mode?: string | null
          game_edition?: number | null
          pve_data?: Json | null
          pvp_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_game_mode?: string | null
          game_edition?: number | null
          pve_data?: Json | null
          pvp_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_system: {
        Row: {
          api_tokens: string[] | null
          created_at: string | null
          is_admin: boolean
          pve_team_id: string | null
          pvp_team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_tokens?: string[] | null
          created_at?: string | null
          is_admin?: boolean
          pve_team_id?: string | null
          pvp_team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_tokens?: string[] | null
          created_at?: string | null
          is_admin?: boolean
          pve_team_id?: string | null
          pvp_team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_system_pve_team_id_fkey"
            columns: ["pve_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_system_team_id_fkey"
            columns: ["pvp_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transfer_team_ownership: {
        Args: {
          p_new_owner_id: string
          p_old_owner_id: string
          p_team_id: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
