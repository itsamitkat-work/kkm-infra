export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  authz: {
    Tables: {
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      tenant_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          tenant_role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          tenant_role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          tenant_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["tenant_role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      tenant_roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          slug: string
          template_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          slug: string
          template_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          template_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      tenant_member_roles: {
        Row: {
          created_at: string
          tenant_role_id: string
          tenant_member_id: string
        }
        Insert: {
          created_at?: string
          tenant_role_id: string
          tenant_member_id: string
        }
        Update: {
          created_at?: string
          tenant_role_id?: string
          tenant_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_member_roles_role_id_fkey"
            columns: ["tenant_role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_permission_version: {
        Args: { p_tenant_member_id: string }
        Returns: undefined
      }
      check_permission_version: { Args: never; Returns: boolean }
      current_active_role: { Args: never; Returns: string }
      current_session_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      default_platform_tenant_id: { Args: never; Returns: string }
      has_permission: { Args: { p: string }; Returns: boolean }
      is_account_locked: { Args: never; Returns: boolean }
      is_session_valid: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          id: string
          normalized_unit_id: string | null
          normalized_value: number | null
          unit_id: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          id?: string
          normalized_unit_id?: string | null
          normalized_value?: number | null
          unit_id?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          id?: string
          normalized_unit_id?: string | null
          normalized_value?: number | null
          unit_id?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_values_normalized_unit_id_fkey"
            columns: ["normalized_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_values_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string | null
          data_type: string
          dimension: string | null
          display_name: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          dimension?: string | null
          display_name: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          dimension?: string | null
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      basic_rate_annotations: {
        Row: {
          basic_rate_id: string
          created_at: string | null
          id: string
          order_index: number | null
          raw_text: string
          type: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Insert: {
          basic_rate_id: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          raw_text: string
          type?: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Update: {
          basic_rate_id?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          raw_text?: string
          type?: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "basic_rate_annotations_basic_rate_id_fkey"
            columns: ["basic_rate_id"]
            isOneToOne: false
            referencedRelation: "basic_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      basic_rate_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      basic_rates: {
        Row: {
          basic_rate_type_id: string
          code: string
          created_at: string | null
          description: string
          id: string
          rate: number
          schedule_source_version_id: string
          status: Database["public"]["Enums"]["record_status"] | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          basic_rate_type_id: string
          code: string
          created_at?: string | null
          description: string
          id?: string
          rate: number
          schedule_source_version_id: string
          status?: Database["public"]["Enums"]["record_status"] | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          basic_rate_type_id?: string
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          rate?: number
          schedule_source_version_id?: string
          status?: Database["public"]["Enums"]["record_status"] | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "basic_rates_basic_rate_type_id_fkey"
            columns: ["basic_rate_type_id"]
            isOneToOne: false
            referencedRelation: "basic_rate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basic_rates_schedule_source_version_id_fkey"
            columns: ["schedule_source_version_id"]
            isOneToOne: false
            referencedRelation: "schedule_source_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_schedules: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          schedule_source_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          schedule_source_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          schedule_source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_schedules_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["schedule_source_id"]
          },
          {
            foreignKeyName: "client_schedules_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          addresses: Json
          contacts: Json
          created_at: string
          display_name: string
          full_name: string | null
          gstin: string | null
          id: string
          meta: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          addresses?: Json
          contacts?: Json
          created_at?: string
          display_name: string
          full_name?: string | null
          gstin?: string | null
          id?: string
          meta?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          addresses?: Json
          contacts?: Json
          created_at?: string
          display_name?: string
          full_name?: string | null
          gstin?: string | null
          id?: string
          meta?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      derived_units: {
        Row: {
          created_at: string | null
          denominator_unit_id: string | null
          display_name: string
          id: string
          multiplier: number | null
          name: string
          numerator_unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          denominator_unit_id?: string | null
          display_name: string
          id?: string
          multiplier?: number | null
          name: string
          numerator_unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          denominator_unit_id?: string | null
          display_name?: string
          id?: string
          multiplier?: number | null
          name?: string
          numerator_unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "derived_units_denominator_unit_id_fkey"
            columns: ["denominator_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_units_numerator_unit_id_fkey"
            columns: ["numerator_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          is_system_admin: boolean
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
          is_system_admin?: boolean
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
          is_system_admin?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          project_id: string
          schedule_source_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          project_id: string
          schedule_source_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          project_id?: string
          schedule_source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedules_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["schedule_source_id"]
          },
          {
            foreignKeyName: "project_schedules_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          meta: Json
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          meta?: Json
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          meta?: Json
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_item_annotations: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json
          order_index: number | null
          raw_text: string
          schedule_item_id: string
          type: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json
          order_index?: number | null
          raw_text: string
          schedule_item_id: string
          type?: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json
          order_index?: number | null
          raw_text?: string
          schedule_item_id?: string
          type?: Database["public"]["Enums"]["schedule_annotation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "schedule_item_annotations_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_item_annotations_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_item_attributes: {
        Row: {
          attribute_value_id: string
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          schedule_item_id: string
          source: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          updated_at: string | null
        }
        Insert: {
          attribute_value_id: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          schedule_item_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Update: {
          attribute_value_id?: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          schedule_item_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_item_attributes_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_item_attributes_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_item_attributes_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_item_rates: {
        Row: {
          context: string
          created_at: string | null
          id: string
          label: string | null
          order_index: number | null
          rate: number
          rate_display: string | null
          schedule_item_id: string
        }
        Insert: {
          context: string
          created_at?: string | null
          id?: string
          label?: string | null
          order_index?: number | null
          rate: number
          rate_display?: string | null
          schedule_item_id: string
        }
        Update: {
          context?: string
          created_at?: string | null
          id?: string
          label?: string | null
          order_index?: number | null
          rate?: number
          rate_display?: string | null
          schedule_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_item_rates_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_item_rates_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          code: string
          created_at: string | null
          derived_unit_id: string | null
          description: string
          id: string
          ingestion_batch_id: string | null
          item_type: string | null
          node_type: Database["public"]["Enums"]["schedule_node_type"]
          order_index: number | null
          parent_item_id: string | null
          path: unknown
          rate: number | null
          schedule_source_version_id: string
          search_vector: unknown
          slug: string
          source_page_number: number | null
          status: Database["public"]["Enums"]["record_status"] | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          derived_unit_id?: string | null
          description: string
          id?: string
          ingestion_batch_id?: string | null
          item_type?: string | null
          node_type: Database["public"]["Enums"]["schedule_node_type"]
          order_index?: number | null
          parent_item_id?: string | null
          path: unknown
          rate?: number | null
          schedule_source_version_id: string
          search_vector?: unknown
          slug: string
          source_page_number?: number | null
          status?: Database["public"]["Enums"]["record_status"] | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          derived_unit_id?: string | null
          description?: string
          id?: string
          ingestion_batch_id?: string | null
          item_type?: string | null
          node_type?: Database["public"]["Enums"]["schedule_node_type"]
          order_index?: number | null
          parent_item_id?: string | null
          path?: unknown
          rate?: number | null
          schedule_source_version_id?: string
          search_vector?: unknown
          slug?: string
          source_page_number?: number | null
          status?: Database["public"]["Enums"]["record_status"] | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_derived_unit_id_fkey"
            columns: ["derived_unit_id"]
            isOneToOne: false
            referencedRelation: "derived_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_schedule_source_version_id_fkey"
            columns: ["schedule_source_version_id"]
            isOneToOne: false
            referencedRelation: "schedule_source_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_source_versions: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          metadata: Json | null
          name: string
          region: string | null
          schedule_source_id: string
          sort_order: number | null
          status: Database["public"]["Enums"]["record_status"] | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          metadata?: Json | null
          name: string
          region?: string | null
          schedule_source_id: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          metadata?: Json | null
          name?: string
          region?: string | null
          schedule_source_id?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_source_versions_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["schedule_source_id"]
          },
          {
            foreignKeyName: "schedule_source_versions_schedule_source_id_fkey"
            columns: ["schedule_source_id"]
            isOneToOne: false
            referencedRelation: "schedule_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_sources: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"] | null
          type: Database["public"]["Enums"]["schedule_source_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"] | null
          type?: Database["public"]["Enums"]["schedule_source_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"] | null
          type?: Database["public"]["Enums"]["schedule_source_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          active_role_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          permission_version: number
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          permission_version?: number
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          permission_version?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          logo_icon_url: string | null
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          logo_icon_url?: string | null
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          logo_icon_url?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          conversion_factor: number
          created_at: string | null
          dimension: string
          display_name: string
          id: string
          is_base: boolean | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor: number
          created_at?: string | null
          dimension: string
          display_name: string
          id?: string
          is_base?: boolean | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          dimension?: string
          display_name?: string
          id?: string
          is_base?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      schedule_items_tree: {
        Row: {
          code: string | null
          created_at: string | null
          depth: number | null
          derived_unit_display_name: string | null
          derived_unit_id: string | null
          derived_unit_name: string | null
          description: string | null
          id: string | null
          ingestion_batch_id: string | null
          item_type: string | null
          node_type: Database["public"]["Enums"]["schedule_node_type"] | null
          order_index: number | null
          parent_code: string | null
          parent_description: string | null
          parent_item_id: string | null
          path: unknown
          path_text: string | null
          rate: number | null
          root_item_id: string | null
          schedule_source_display_name: string | null
          schedule_source_id: string | null
          schedule_source_name: string | null
          schedule_source_version_id: string | null
          slug: string | null
          source_page_number: number | null
          source_version_display_name: string | null
          source_version_name: string | null
          source_version_year: number | null
          status: Database["public"]["Enums"]["record_status"] | null
          unit_display_name: string | null
          unit_id: string | null
          unit_symbol: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_derived_unit_id_fkey"
            columns: ["derived_unit_id"]
            isOneToOne: false
            referencedRelation: "derived_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_schedule_source_version_id_fkey"
            columns: ["schedule_source_version_id"]
            isOneToOne: false
            referencedRelation: "schedule_source_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_risk_event_service: {
        Args: {
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_tenant_id: string
          p_user_id: string
        }
        Returns: number
      }
      bind_auth_session_service: {
        Args: {
          p_device_fingerprint?: string
          p_expires_at: string
          p_ip_address?: unknown
          p_refresh_token_hash: string
          p_session_id: string
          p_tenant_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      check_user_permission: {
        Args: {
          p_permission_key: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      client_policy_ok: {
        Args: { p_action: string; p_client_id: string }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      default_platform_tenant_id: { Args: never; Returns: string }
      get_basic_rate_distinct_units: { Args: never; Returns: string[] }
      get_pending_security_alerts: {
        Args: { p_limit?: number }
        Returns: {
          alert_at: string
          alert_id: string
          channel: string
          event_at: string
          event_type: string
          ip_address: unknown
          metadata: Json
          recipient: string
          security_event_id: string
          severity: string
          status: string
          tenant_id: string
          user_id: string
        }[]
      }
      get_schedule_tree_children: {
        Args: { p_parent_item_id: string; p_schedule_source_version_id: string }
        Returns: {
          annotations: Json
          code: string
          depth: number
          description: string
          has_children: boolean
          id: string
          node_type: Database["public"]["Enums"]["schedule_node_type"]
          order_index: number
          parent_item_id: string
          path_slug: string
          rate: number
          rates: Json
          unit_symbol: string
        }[]
      }
      get_schedule_tree_roots: {
        Args: { p_schedule_source_version_id: string }
        Returns: {
          annotations: Json
          code: string
          depth: number
          description: string
          has_children: boolean
          id: string
          node_type: Database["public"]["Enums"]["schedule_node_type"]
          order_index: number
          parent_item_id: string
          path_slug: string
          rate: number
          rates: Json
          unit_symbol: string
        }[]
      }
      handle_token_refresh_service: {
        Args: {
          p_incoming_token_hash: string
          p_new_token_hash: string
          p_session_id: string
        }
        Returns: boolean
      }
      list_clients: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_dir?: string
          p_status?: string[]
        }
        Returns: {
          addresses: Json
          contacts: Json
          created_at: string
          default_schedule_display_name: string
          default_schedule_source_id: string
          display_name: string
          full_name: string
          gstin: string
          id: string
          meta: Json
          status: string
          tenant_id: string
          total_count: number
          updated_at: string
        }[]
      }
      list_my_switchable_tenants: {
        Args: never
        Returns: {
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      list_projects: {
        Args: {
          p_amount_max?: number
          p_amount_min?: number
          p_doc_from?: string
          p_doc_to?: string
          p_dos_from?: string
          p_dos_to?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_dir?: string
          p_status?: string[]
        }
        Returns: {
          code: string
          created_at: string
          default_schedule_display_name: string
          default_schedule_source_id: string
          id: string
          meta: Json
          name: string
          status: string
          tenant_id: string
          total_count: number
          updated_at: string
        }[]
      }
      log_security_event_service: {
        Args: {
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_severity: string
          p_tenant_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      mark_security_alert_status: {
        Args: { p_alert_id: string; p_recipient?: string; p_status: string }
        Returns: Json
      }
      project_policy_ok: {
        Args: { p_action: string; p_project_id: string }
        Returns: boolean
      }
      revoke_user_sessions_service: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      schedule_item_path_slug: { Args: { p_item_id: string }; Returns: string }
      schedule_item_path_slug_sort_key: {
        Args: { p_path_slug: string }
        Returns: number[]
      }
      search_schedule_tree: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query: string
          p_schedule_source_version_id: string
        }
        Returns: {
          ancestor_ids: string[]
          annotations: Json
          code: string
          depth: number
          description: string
          has_children: boolean
          id: string
          node_type: Database["public"]["Enums"]["schedule_node_type"]
          order_index: number
          parent_item_id: string
          path_slug: string
          rate: number
          rates: Json
          unit_symbol: string
        }[]
      }
      set_default_client_schedule: {
        Args: { p_client_id: string; p_schedule_source_id: string }
        Returns: undefined
      }
      set_default_project_schedule: {
        Args: { p_project_id: string; p_schedule_source_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      switch_active_role: {
        Args: { p_role_slug: string; p_tenant_id: string; p_user_id: string }
        Returns: {
          active_role_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          permission_version: number
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tenant_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_tenant_member_roles: {
        Args: {
          p_active_role_slug?: string
          p_avatar_url?: string
          p_display_name?: string
          p_role_slugs: string[]
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          active_role_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          permission_version: number
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tenant_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      text2ltree: { Args: { "": string }; Returns: unknown }
      touch_auth_session_service: {
        Args: { p_session_id: string; p_tenant_id?: string }
        Returns: Json
      }
      uuid_to_short_id: { Args: { uid: string }; Returns: string }
    }
    Enums: {
      record_status: "active" | "inactive" | "deprecated"
      schedule_annotation_type: "note" | "remark" | "condition" | "reference"
      schedule_node_type: "section" | "group" | "item"
      schedule_source_type: "govt" | "private"
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
  authz: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      record_status: ["active", "inactive", "deprecated"],
      schedule_annotation_type: ["note", "remark", "condition", "reference"],
      schedule_node_type: ["section", "group", "item"],
      schedule_source_type: ["govt", "private"],
    },
  },
} as const

