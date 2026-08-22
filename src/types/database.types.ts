/**
 * Tipos de la base de datos, escritos a mano a partir de las migraciones en
 * `supabase/migrations/` porque este entorno no tiene Docker para levantar
 * el stack local ni un proyecto Supabase enlazado todavía.
 *
 * EN CUANTO se enlace un proyecto real, regenerar y reemplazar este archivo
 * por completo con:
 *
 *   pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
 *
 * La forma sigue exactamente la que produce esa CLI (Row/Insert/Update por
 * tabla + Functions), para que el reemplazo no requiera tocar ningún import.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          nombre: string
          slug: string
          dominio_correo: string
          tenant_idp: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          dominio_correo: string
          tenant_idp?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          nombre: string
          email: string
          color_avatar: string | null
          rol: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id: string
          org_id: string
          nombre: string
          email: string
          color_avatar?: string | null
          rol?: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          rol: string
          recurso: string
          accion: string
          permitido: boolean
        }
        Insert: {
          rol: string
          recurso: string
          accion: string
          permitido?: boolean
        }
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>
        Relationships: []
      }
      trusted_devices: {
        Row: {
          id: string
          profile_id: string
          token_hash: string
          creado_en: string
          expira_en: string
        }
        Insert: {
          id?: string
          profile_id: string
          token_hash: string
          creado_en?: string
          expira_en: string
        }
        Update: Partial<Database["public"]["Tables"]["trusted_devices"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "trusted_devices_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          id: string
          profile_id: string
          code_hash: string
          usado_en: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          profile_id: string
          code_hash: string
          usado_en?: string | null
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["mfa_backup_codes"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "mfa_backup_codes_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          id: string
          org_id: string
          nombre: string
          multiplicador: number
          umbral_puntos: number
          orden: number
        }
        Insert: {
          id?: string
          org_id: string
          nombre: string
          multiplicador?: number
          umbral_puntos?: number
          orden: number
        }
        Update: Partial<Database["public"]["Tables"]["tiers"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "tiers_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          id: string
          org_id: string
          nombre: string
          email: string
          tier_id: string | null
          saldo_puntos: number
          fecha_alta: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          nombre: string
          email: string
          tier_id?: string | null
          saldo_puntos?: number
          fecha_alta?: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tier_id_fkey"
            columns: ["tier_id"]
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          id: string
          org_id: string
          member_id: string
          tipo: string
          puntos: number
          origen: string | null
          workflow_run_id: string | null
          expira_en: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          tipo: string
          puntos: number
          origen?: string | null
          workflow_run_id?: string | null
          expira_en?: string | null
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["points_ledger"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "points_ledger_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          id: string
          org_id: string
          member_id: string | null
          codigo: string
          tipo: string
          valor: number | null
          vigente_desde: string
          vigente_hasta: string | null
          estado: string
          workflow_run_id: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id?: string | null
          codigo: string
          tipo: string
          valor?: number | null
          vigente_desde?: string
          vigente_hasta?: string | null
          estado?: string
          workflow_run_id?: string | null
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["coupons"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "coupons_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          id: string
          org_id: string
          member_id: string
          nombre: string
          definicion: Json
          progreso: number
          meta: number
          premio: Json
          estado: string
          workflow_run_id: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          nombre: string
          definicion?: Json
          progreso?: number
          meta: number
          premio?: Json
          estado?: string
          workflow_run_id?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "challenges_member_id_fkey"
            columns: ["member_id"]
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          id: string
          org_id: string
          nombre: string
          descripcion: string | null
          condiciones: Json
          conteo_estimado: number | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          nombre: string
          descripcion?: string | null
          condiciones?: Json
          conteo_estimado?: number | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["segments"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "segments_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          id: string
          org_id: string
          nombre: string
          descripcion: string | null
          estado: string
          version_actual: number
          creado_por: string | null
          actualizado_por: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          org_id: string
          nombre: string
          descripcion?: string | null
          estado?: string
          version_actual?: number
          creado_por?: string | null
          actualizado_por?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["workflows"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          id: string
          workflow_id: string
          version: number
          grafo: Json
          autor_id: string | null
          nota: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          workflow_id: string
          version: number
          grafo: Json
          autor_id?: string | null
          nota?: string | null
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["workflow_versions"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          id: string
          workflow_id: string
          tipo: string
          etiqueta: string
          posicion_x: number
          posicion_y: number
          config: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          workflow_id: string
          tipo: string
          etiqueta: string
          posicion_x?: number
          posicion_y?: number
          config?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["workflow_nodes"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          id: string
          workflow_id: string
          source_node_id: string
          source_port: string
          target_node_id: string
          creado_en: string
        }
        Insert: {
          id?: string
          workflow_id: string
          source_node_id: string
          source_port?: string
          target_node_id: string
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["workflow_edges"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          workflow_version: number
          tipo: string
          estado: string
          resumen: Json
          iniciado_en: string
          finalizado_en: string | null
        }
        Insert: {
          id?: string
          workflow_id: string
          workflow_version: number
          tipo: string
          estado?: string
          resumen?: Json
          iniciado_en?: string
          finalizado_en?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["workflow_runs"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          id: string
          workflow_run_id: string
          node_id: string
          port: string | null
          conteo_entrada: number | null
          conteo_salida: number | null
          creado_en: string
        }
        Insert: {
          id?: string
          workflow_run_id: string
          node_id: string
          port?: string | null
          conteo_entrada?: number | null
          conteo_salida?: number | null
          creado_en?: string
        }
        Update: Partial<Database["public"]["Tables"]["workflow_run_steps"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_steps_node_id_fkey"
            columns: ["node_id"]
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      current_org_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
