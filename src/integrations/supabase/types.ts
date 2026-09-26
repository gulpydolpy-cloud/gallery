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
      achievements: {
        Row: {
          description: string
          emoji: string
          g_dollar_reward: number
          id: string
          is_admin_only: boolean
          name: string
        }
        Insert: {
          description: string
          emoji?: string
          g_dollar_reward?: number
          id: string
          is_admin_only?: boolean
          name: string
        }
        Update: {
          description?: string
          emoji?: string
          g_dollar_reward?: number
          id?: string
          is_admin_only?: boolean
          name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          bg_color: string
          created_at: string
          created_by: string
          id: string
          message: string
          text_color: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bg_color?: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bg_color?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_path: string | null
          parent_id: string | null
          sticker_path: string | null
          user_id: string
          video_id: string
          voice_duration: number | null
          voice_path: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
          parent_id?: string | null
          sticker_path?: string | null
          user_id: string
          video_id: string
          voice_duration?: number | null
          voice_path?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
          parent_id?: string | null
          sticker_path?: string | null
          user_id?: string
          video_id?: string
          voice_duration?: number | null
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reports: {
        Row: {
          conversation_id: string
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_path: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          is_group: boolean
          name: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      gift_events: {
        Row: {
          created_at: string
          gift_type_id: string
          id: string
          live_session_id: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          gift_type_id: string
          id?: string
          live_session_id?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          gift_type_id?: string
          id?: string
          live_session_id?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_events_gift_type_id_fkey"
            columns: ["gift_type_id"]
            isOneToOne: false
            referencedRelation: "gift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_types: {
        Row: {
          animation_key: string
          cooldown_seconds: number
          g_dollar_value: number
          icon_url: string | null
          id: string
          is_active: boolean
          max_per_live: number | null
          min_follower_count: number
          name: string
        }
        Insert: {
          animation_key: string
          cooldown_seconds?: number
          g_dollar_value: number
          icon_url?: string | null
          id: string
          is_active?: boolean
          max_per_live?: number | null
          min_follower_count?: number
          name: string
        }
        Update: {
          animation_key?: string
          cooldown_seconds?: number
          g_dollar_value?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean
          max_per_live?: number | null
          min_follower_count?: number
          name?: string
        }
        Relationships: []
      }
      group_reports: {
        Row: {
          conversation_id: string
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_kicks: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_kicks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role: string
          session_id: string
          slot: number
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id: string
          slot: number
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id?: string
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          ended_at: string | null
          host_id: string
          id: string
          like_count: number
          started_at: string
          status: string
          title: string
        }
        Insert: {
          ended_at?: string | null
          host_id: string
          id?: string
          like_count?: number
          started_at?: string
          status?: string
          title?: string
        }
        Update: {
          ended_at?: string | null
          host_id?: string
          id?: string
          like_count?: number
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_path: string | null
          sender_id: string
          sticker_path: string | null
          video_id: string | null
          voice_duration: number | null
          voice_path: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          sender_id: string
          sticker_path?: string | null
          video_id?: string | null
          voice_duration?: number | null
          voice_path?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          sender_id?: string
          sticker_path?: string | null
          video_id?: string | null
          voice_duration?: number | null
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
          wallet_balance: number
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
          wallet_balance?: number
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          status: string
          video_id: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          video_id: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      reposts: {
        Row: {
          created_at: string
          id: string
          note: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_packs: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          is_official: boolean
          name: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          is_official?: boolean
          name: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          is_official?: boolean
          name?: string
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string
          id: string
          pack_id: string
          sort: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          pack_id: string
          sort?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          pack_id?: string
          sort?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          displayed: boolean
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          displayed?: boolean
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          displayed?: boolean
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
      video_views: {
        Row: {
          last_viewed_at: string
          video_id: string
          viewer_id: string
        }
        Insert: {
          last_viewed_at?: string
          video_id: string
          viewer_id: string
        }
        Update: {
          last_viewed_at?: string
          video_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          boost_likes: number
          created_at: string
          description: string
          edit: Json
          hashtags: string[]
          id: string
          shares: number
          storage_path: string
          title: string
          user_id: string
          views: number
        }
        Insert: {
          boost_likes?: number
          created_at?: string
          description?: string
          edit?: Json
          hashtags?: string[]
          id?: string
          shares?: number
          storage_path: string
          title?: string
          user_id: string
          views?: number
        }
        Update: {
          boost_likes?: number
          created_at?: string
          description?: string
          edit?: Json
          hashtags?: string[]
          id?: string
          shares?: number
          storage_path?: string
          title?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_conversation_admin: {
        Args: { _conversation_id: string; _target: string }
        Returns: undefined
      }
      add_group_admin: {
        Args: { _conversation_id: string; _target: string }
        Returns: undefined
      }
      add_guest: {
        Args: { _session_id: string; _target: string }
        Returns: number
      }
      admin_boost: {
        Args: { _likes: number; _video_id: string; _views: number }
        Returns: undefined
      }
      admin_grant_badge: {
        Args: { _badge_id: string; _target: string }
        Returns: undefined
      }
      admin_revoke_badge: {
        Args: { _badge_id: string; _target: string }
        Returns: undefined
      }
      award_badge_internal: {
        Args: { _badge_id: string; _user_id: string }
        Returns: boolean
      }
      check_achievements: {
        Args: { _user_id: string }
        Returns: {
          badge_id: string
          g_dollar_reward: number
          name: string
        }[]
      }
      create_group: {
        Args: { _member_ids: string[]; _name: string }
        Returns: string
      }
      delete_group: { Args: { _conversation_id: string }; Returns: undefined }
      delete_live_chat_message: {
        Args: { _message_id: string }
        Returns: undefined
      }
      end_live: { Args: { _session_id: string }; Returns: undefined }
      get_email_for_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_shares: { Args: { _video_id: string }; Returns: undefined }
      increment_views: { Args: { _video_id: string }; Returns: undefined }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      is_conv_admin: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_privileged: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      join_live: { Args: { _session_id: string }; Returns: number }
      kick_group_member: {
        Args: { _conversation_id: string; _target: string }
        Returns: undefined
      }
      kick_participant: {
        Args: { _session_id: string; _target: string }
        Returns: undefined
      }
      leave_conversation: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      leave_group: { Args: { _conversation_id: string }; Returns: undefined }
      leave_live: { Args: { _session_id: string }; Returns: undefined }
      like_live: { Args: { _session_id: string }; Returns: number }
      register_view: { Args: { _video_id: string }; Returns: boolean }
      remove_conversation_admin: {
        Args: { _conversation_id: string; _target: string }
        Returns: undefined
      }
      remove_group_admin: {
        Args: { _conversation_id: string; _target: string }
        Returns: undefined
      }
      report_conversation: {
        Args: { _conversation_id: string; _details?: string; _reason: string }
        Returns: undefined
      }
      report_group: {
        Args: { _conversation_id: string; _details: string; _reason: string }
        Returns: undefined
      }
      send_gift: {
        Args: {
          _gift_type_id: string
          _live_session_id?: string
          _recipient_id: string
        }
        Returns: {
          animation_key: string
          new_balance: number
        }[]
      }
      send_live_chat: {
        Args: { _content: string; _session_id: string }
        Returns: string
      }
      send_live_gift: {
        Args: { _gift_type_id: string; _session_id: string }
        Returns: {
          animation_key: string
          recipient_count: number
        }[]
      }
      set_profile_badges: { Args: { _badge_ids: string[] }; Returns: undefined }
      start_live: { Args: { _title: string }; Returns: string }
      try_award_night_owl: {
        Args: { _local_hour: number }
        Returns: {
          badge_id: string
          g_dollar_reward: number
          name: string
        }[]
      }
      update_group_settings: {
        Args: {
          _avatar_path: string
          _conversation_id: string
          _description: string
          _name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
