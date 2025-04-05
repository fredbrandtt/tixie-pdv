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
  empresas: UserEmpresa[];
  created_at: string;
} 