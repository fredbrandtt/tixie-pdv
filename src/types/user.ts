export interface UserEmpresa {
  id: number;
  user_id: string;
  empresa_id: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  nome: string;
  is_super_admin: boolean;
  is_promoter?: boolean;
  companyId?: number;
  empresas: UserEmpresa[];
  created_at: string;
} 